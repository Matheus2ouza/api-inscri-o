const xlsx = require("xlsx");
const { validationResult } = require("express-validator");
const registerService = require("../services/registerService");

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
    console.log("Regras do evento carregadas:", rulesEvent);
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

    for (let index = 0; index < jsonData.length; index++) {
      const item = jsonData[index];
      const linhaExcel = index + 5;

      const nameLine = item["Nome Completo"];
      const dateBirthLine = item["Data de nascimento"];
      const sexLine = item["Sexo"];
      const registrationType = item["Tipo de Inscrição"];

      const dateFormatted = dateBirthLine ? excelSerialDateToJSDate(dateBirthLine) : null;

      console.log(`Linha ${linhaExcel}:`, item);
      console.log(dateBirthLine)
      console.log(dateFormatted)


      const emptyFields = [
        { valor: nameLine, mensagem: "Campo 'Nome Completo' está vazio." },
        { valor: dateBirthLine, mensagem: "Campo 'Data de nascimento' está vazio." },
        { valor: sexLine, mensagem: "Campo 'Sexo' está vazio." },
        { valor: registrationType, mensagem: "Campo 'Tipo de Inscrição' está vazio." },
      ];

      emptyFields.forEach(({ valor, mensagem }) => {
        if (!valor) {
          console.warn(`Linha ${linhaExcel} - ${mensagem}`);
          lineError.push({ line: linhaExcel, message: mensagem });
        }
      });

      // Validação do nome
      if (nameLine) {
        const regexFirstNameLastName = /^[A-Za-zÀ-ÖØ-öø-ÿ]+(?: [A-Za-zÀ-ÖØ-öø-ÿ]+)+$/;
        const regexCharacters = /[^A-Za-zÀ-ÖØ-öø-ÿ\s]/;

        if (!regexFirstNameLastName.test(nameLine) || regexCharacters.test(nameLine)) {
          console.warn(`Linha ${linhaExcel} - Nome inválido:`, nameLine);
          lineError.push({
            line: linhaExcel,
            message: "A coluna do nome tem que ser o nome e o sobrenome, sem caracteres especiais",
          });
        }

        try {
          const nameVerification = await registerService.nameVerification(nameLine.toLowerCase(), userId);
          if (nameVerification?.exists) {
            console.warn(`Linha ${linhaExcel} - Nome duplicado:`, nameLine);
            lineError.push({ line: linhaExcel, message: "Nome já cadastrado." });
          }
        } catch (err) {
          console.error(`Linha ${linhaExcel} - Erro ao verificar nome duplicado:`, err);
        }
      }

      // Validação de data
      if (dateBirthLine) {
        const isValidDate = dateFormatted instanceof Date && !isNaN(dateFormatted.getTime());

        if (!isValidDate) {
          console.warn(`Linha ${linhaExcel} - Data inválida:`, dateBirthLine);
          lineError.push({
            line: linhaExcel,
            message: "Data de nascimento inválida. Use uma data válida: DD/MM/AAAA.",
          });
        } else {
          const age = calculateAge(dateFormatted);
          if (age === null || rulesEvent.min_age > age || age > rulesEvent.max_age) {
            console.warn(`Linha ${linhaExcel} - Idade fora da faixa:`, age);
            lineError.push({ line: linhaExcel, message: "Idade fora da faixa etária esperada" });
          }
        }
      }

      // Validação de sexo
      if (sexLine) {
        const sex = sexLine.toLowerCase();

        if (sex === "masculino" && !rulesEvent.allow_male) {
          console.warn(`Linha ${linhaExcel} - Sexo masculino não permitido`);
          lineError.push({ line: linhaExcel, message: "Sexo masculino não é permitido." });
        }

        if (sex === "feminino" && !rulesEvent.allow_female) {
          console.warn(`Linha ${linhaExcel} - Sexo feminino não permitido`);
          lineError.push({ line: linhaExcel, message: "Sexo feminino não é permitido." });
        }
      }

      // Validação do tipo de inscrição
      if (registrationType) {
        const tipoInscricaoValido = rulesEvent.tipos_inscricao.some(
          tipo => tipo.descricao.trim().toLowerCase() === registrationType.trim().toLowerCase()
        );

        if (!tipoInscricaoValido) {
          console.warn(`Linha ${linhaExcel} - Tipo de inscrição inválido:`, registrationType);
          lineError.push({
            line: linhaExcel,
            message: `Tipo de inscrição "${registrationType}" não é válido para este evento.`
          });
        }
      }

      // Se nenhuma validação falhou para esta linha, adiciona aos participantes
      if (!lineError.some(error => error.line === linhaExcel)) {
        const age = dateBirthLine ? calculateAge(dateBirthLine) : null;
        participants.push({
          nome_completo: nameLine?.trim(),
          idade: age,
          tipo_inscricao: registrationType?.trim(),
          sexo: sexLine?.trim()?.toLowerCase()
        });

        console.log(`Linha ${linhaExcel} adicionada ao participants`);
      }
    }

    if (lineError.length > 0) {
      console.log("Erros encontrados no processamento:", lineError);
      return res.status(400).json({
        message: "Erro de validação nos dados do arquivo.",
        errors: lineError,
      });
    }

    console.log("Participantes válidos:", participants);
    return res.status(200).json({
      message: "Arquivo processado com sucesso.",
      participantes: participants,
      rulesEvent,
    });
  } catch (error) {
    console.error("Erro ao processar o arquivo Excel:", error);
    return res.status(500).json({ message: "Erro ao processar o arquivo Excel." });
  }
};



exports.confirmRegister = async (req, res) => { };
