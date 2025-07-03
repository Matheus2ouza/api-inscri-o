const xlsx = require("xlsx");
const { validationResult } = require("express-validator");
const registerService = require("../services/registerService");
const { redis } = require("../lib/redis");
const { v4: uuidv4 } = require('uuid');

function excelSerialDateToJSDate(serial) {
  const excelEpoch = new Date(1899, 11, 30);
  return new Date(excelEpoch.getTime() + serial * 86400000);
}

function calculateAge(birthDate) {
  if (typeof birthDate === "number") {
    birthDate = excelSerialDateToJSDate(birthDate);
  } else {
    return null;
  }

  if (!(birthDate instanceof Date) || isNaN(birthDate)) {
    return null;
  }

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();

  if (
    today.getMonth() < birthDate.getMonth() ||
    (today.getMonth() === birthDate.getMonth() &&
      today.getDate() < birthDate.getDate())
  ) {
    age--;
  }

  return age;
}

exports.uploadFile = async (req, res) => {
  const uniqueId = uuidv4();
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Erro de validação',
      fields: errors.array().reduce((acc, err) => {
        acc[err.path] = err.msg;
        return acc;
      }, {}),
    });
  }

  const { eventSelectedId, responsible } = req.body;
  const userId = req.user.id;

  let rulesEvent;
  try {
    rulesEvent = await registerService.rulesEvent(Number(eventSelectedId));
  } catch (err) {
    console.error("Erro ao obter regras do evento:", err);
    return res.status(400).json({ message: "Erro ao obter regras do evento." });
  }

  try {
    const fileBuffer = req.file?.buffer;
    if (!fileBuffer) {
      return res.status(400).json({ message: "Arquivo não enviado corretamente." });
    }

    const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    const headers = xlsx.utils.sheet_to_json(worksheet, {
      range: 2,
      header: 1,
    })[0];
    console.log("Cabeçalhos capturados:", headers);

    const jsonData = xlsx.utils.sheet_to_json(worksheet, {
      range: 4,
      header: headers,
      defval: null,
    });
    console.log("Dados extraídos do Excel:", jsonData);

    const lineError = [];
    const participants = [];
    let outstandingBalance = 0;

    for (let index = 0; index < jsonData.length; index++) {
      const item = jsonData[index];
      const linhaExcel = index + 5;

      const nameLine = item["Nome Completo"];
      const dateBirthLine = item["Data de nascimento"];
      const sexLine = item["Sexo"];
      const registrationType = item["Tipo de Inscrição"];

      let sex = sexLine.trim().toLowerCase();
      console.log(`Linha ${linhaExcel}:`, item);

      const emptyFields = [
        { valor: nameLine, mensagem: "Campo 'Nome Completo' está vazio." },
        { valor: dateBirthLine, mensagem: "Campo 'Data de nascimento' está vazio." },
        { valor: sexLine, mensagem: "Campo 'Sexo' está vazio." },
        { valor: registrationType, mensagem: "Campo 'Tipo de Inscrição' está vazio." },
      ];

      let hasEmpty = false;

      emptyFields.forEach(({ valor, mensagem }) => {
        if (!valor) {
          console.warn(`Linha ${linhaExcel} - ${mensagem}`);
          lineError.push({ line: linhaExcel, message: mensagem });
          hasEmpty = true;
        }
      });

      if (hasEmpty) continue;

      // Validação do nome
      const regexFirstNameLastName = /^[A-Za-zÀ-ÖØ-öø-ÿ]+(?: [A-Za-zÀ-ÖØ-öø-ÿ]+)+$/;
      const regexCharacters = /[^A-Za-zÀ-ÖØ-öø-ÿ\s]/;

      if (!regexFirstNameLastName.test(nameLine) || regexCharacters.test(nameLine)) {
        console.warn(`Linha ${linhaExcel} - Nome inválido:`, nameLine);
        lineError.push({
          line: linhaExcel,
          message: "A coluna do nome tem que ser o nome e o sobrenome, sem caracteres especiais",
        });
        continue;
      }

      try {
        const nameVerification = await registerService.nameVerification(nameLine.toLowerCase(), userId);
        if (nameVerification?.exists) {
          console.warn(`Linha ${linhaExcel} - Nome duplicado:`, nameLine);
          lineError.push({ line: linhaExcel, message: "Nome já cadastrado." });
          continue;
        }
      } catch (err) {
        console.error(`Linha ${linhaExcel} - Erro ao verificar nome duplicado:`, err);
      }

      // Validação de data
      const dateFormatted = excelSerialDateToJSDate(dateBirthLine);
      const isValidDate = dateFormatted instanceof Date && !isNaN(dateFormatted.getTime());

      if (!isValidDate) {
        console.warn(`Linha ${linhaExcel} - Data inválida:`, dateBirthLine);
        lineError.push({
          line: linhaExcel,
          message: "Data de nascimento inválida. Use uma data válida: DD/MM/AAAA.",
        });
        continue;
      }

      const age = calculateAge(dateBirthLine);
      console.log(`Linha ${linhaExcel} - Idade calculada:`, age);
      if (rulesEvent.min_age > age || age > rulesEvent.max_age) {
        console.warn(`Linha ${linhaExcel} - Idade fora do intervalo permitido:`, age);
        lineError.push({
          line: linhaExcel,
          message: `Idade deve estar entre ${rulesEvent.min_age} e ${rulesEvent.max_age} anos.`,
        });
        continue;
      }

      // Validação de sexo
      if (sexLine) {
        console.log(sex, `Linha ${linhaExcel} - Sexo informado`);

        if (sex === "masculino") {
          if (!rulesEvent.allow_male) {
            console.warn(`Linha ${linhaExcel} - Sexo masculino não permitido`);
            lineError.push({ line: linhaExcel, message: "Sexo masculino não é permitido." });
            continue;
          }
        } else if (sex === "feminino") {
          if (!rulesEvent.allow_female) {
            console.warn(`Linha ${linhaExcel} - Sexo feminino não permitido`);
            lineError.push({ line: linhaExcel, message: "Sexo feminino não é permitido." });
            continue;
          }
        } else {
          // Caso o sexo não seja nem "masculino" nem "feminino"
          console.warn(`Linha ${linhaExcel} - Sexo inválido:`, sexLine);
          lineError.push({
            line: linhaExcel,
            message: "Sexo inválido. Deve ser exatamente 'Masculino' ou 'Feminino'.",
          });
          continue;
        }
      }

      // Validação do tipo de inscrição
      const tipoInscricaoValido = rulesEvent.tipos_inscricao.some(
        tipo => tipo.descricao.trim().toLowerCase() === registrationType.trim().toLowerCase()
      );

      if (!tipoInscricaoValido) {
        console.warn(`Linha ${linhaExcel} - Tipo de inscrição inválido:`, registrationType);
        lineError.push({
          line: linhaExcel,
          message: `Tipo de inscrição "${registrationType}" não é válido para este evento.`,
        });
        continue;
      }

      // Encontrar o tipo de inscrição correspondente
      const tipoInscricaoObj = rulesEvent.tipos_inscricao.find(
        tipo => tipo.descricao.trim().toLowerCase() === registrationType.trim().toLowerCase()
      );

      if (tipoInscricaoObj?.valor) {
        outstandingBalance += parseFloat(tipoInscricaoObj.valor); // soma o valor ao saldo
      }

      // Participante válido
      participants.push({
        nome_completo: nameLine.trim(),
        idade: age,
        tipo_inscricao_id: tipoInscricaoObj.id,
        tipo_inscricao: registrationType.trim(),
        sexo: sex,
      });

      console.log(`Linha ${linhaExcel} adicionada ao participants`);
    }

    if (lineError.length > 0) {
      console.log("Erros encontrados no processamento:", lineError);
      return res.status(400).json({
        message: "Erro de validação nos dados do arquivo.",
        errors: lineError,
      });
    }

    const data = {
      responsible: responsible,
      outstandingBalance: outstandingBalance,
      totalparticipants: participants.length,
      participants: participants,
    }

    const cacheKey = `register:${userId}:${eventSelectedId}:${uniqueId}`;
    await redis.set(cacheKey, JSON.stringify(data), { ex: 3600 });

    return res.status(200).json({
      message: "Arquivo processado com sucesso.",
      participants: participants,
      typeInscription: rulesEvent.tipos_inscricao,
      outstandingBalance: outstandingBalance,
      uniqueId: uniqueId,
    });
  } catch (error) {
    console.error("Erro ao processar o arquivo Excel:", error);
    return res.status(500).json({ message: "Erro ao processar o arquivo Excel." });
  }
};

exports.confirmRegister = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Erro de validação',
      fields: errors.array().reduce((acc, err) => {
        acc[err.path] = err.msg;
        return acc;
      }, {}),
    });
  }

  const { eventSelectedId, uniqueId } = req.body;
  const userId = req.user.id;

  const cacheKey = `register:${userId}:${eventSelectedId}:${uniqueId}`;
  const cachedData = await redis.get(cacheKey);

  if (!cachedData) {
    console.warn("Dados não encontrados no cache.");
    return res.status(404).json({ message: "Dados não encontrados no cache ou expirados." });
  }

  const data = JSON.parse(cachedData);
  console.log("Dados recuperados do cache:", data);

  try{
    const result = await registerService.register(data, eventSelectedId, userId)

    console.log("Registro realizado com sucesso:", result);

    // Limpa o cache após o registro bem-sucedido
    await redis.del(cacheKey);

    return res.status(200).json({
      success: true,
      message: "Registro realizado com sucesso.",
      data: result,
    });
  } catch (error) {
    console.error("Erro ao confirmar registro:", error);
    return res.status(500).json({ message: "Erro ao confirmar registro." });
  }
};
