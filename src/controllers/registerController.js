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
  } catch (err) {
    return res.status(400).json({ message: "Erro ao obter regras do evento." });
  }

  try {
    const fileBuffer = req.file?.buffer;

    if (!fileBuffer) {
      return res.status(400).json({ message: "Arquivo não enviado corretamente." });
    }

    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Captura os cabeçalhos da linha 3 (índice 2)
    const headers = xlsx.utils.sheet_to_json(worksheet, {
      range: 2,
      header: 1,
    })[0];

    // Lê os dados a partir da linha 5 (índice 4), com os headers corretos
    const jsonData = xlsx.utils.sheet_to_json(worksheet, {
      range: 4,
      header: headers,
      defval: null,
    });

    const lineError = [];
    const participants = [];

    jsonData.forEach((item, index) => {
      const linhaExcel = index + 5;
      const nameLine = item["Nome Completo"];
      const dateBirthLine = item["Data de nascimento"];
      const sexLine = item["Sexo"];
      const registrationType = item["Tipo de Inscrição"];

      const emptyFields = [
        { valor: nameLine, mensagem: "Campo 'Nome Completo' está vazio." },
        { valor: dateBirthLine, mensagem: "Campo 'Data de nascimento' está vazio." },
        { valor: sexLine, mensagem: "Campo 'Sexo' está vazio." },
        { valor: registrationType, mensagem: "Campo 'Tipo de Inscrição' está vazio." },
      ];

      emptyFields.forEach(({ valor, mensagem }) => {
        if (!valor) {
          lineError.push({ line: linhaExcel, message: mensagem });
        }
      });

      if (nameLine) {
        const regexFirstNameLastName = /^[A-Za-zÀ-ÖØ-öø-ÿ]+(?: [A-Za-zÀ-ÖØ-öø-ÿ]+)+$/;
        const regexCharacters = /[^A-Za-zÀ-ÖØ-öø-ÿ\s]/;
        
        if (!regexFirstNameLastName.test(nameLine) || regexCharacters.test(nameLine)) {
          console.error("Nome inválido:", nameLine);
          lineError.push({ line: linhaExcel, message: "A coluna do nome tem que ser o nome e o sobrenome, sem caracteres especiais" });
        }
      }

      // Verifica nome duplicado no banco
      if (nameLine) {
        registerService.nameVerification(nameLine.toLowerCase(), userId)
          .then(nameVerification => {
            if (nameVerification?.exists) {
              lineError.push({ line: linhaExcel, message: "Nome já cadastrado." });
            }
          })
          .catch(err => {
            console.error("Erro na verificação do nome:", err);
          });
      }

      const regexData = /^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/;
      if (dateBirthLine && !regexData.test(dateBirthLine)) {
        console.error("Data de nascimento inválida:", dateBirthLine);
        lineError.push({ line: linhaExcel, message: "Data de nascimento inválida. Use o formato DD/MM/AAAA." });
      }

      const age = calculateAge(dateBirthLine);
      if (age === null || rulesEvent.min_age > age || age > rulesEvent.max_age) {
        console.error("Idade fora da faixa etária esperada:", age);
        lineError.push({ line: linhaExcel, message: "Idade fora da faixa etária esperada" });
      }

      if (sexLine) {
        const sex = sexLine.toLowerCase();

        if (sex === "masculino" && !rulesEvent.allow_male) {
          lineError.push({ line: linhaExcel, message: "Sexo masculino não é permitido." });
        }

        if (sex === "feminino" && !rulesEvent.allow_female) {
          lineError.push({ line: linhaExcel, message: "Sexo feminino não é permitido." });
        }
      }

      const tipoInscricaoValido = registrationType &&
        rulesEvent.tipos_inscricao.some(
          tipo => tipo.descricao.trim().toLowerCase() === registrationType.trim().toLowerCase()
        );

      if (!tipoInscricaoValido) {
        lineError.push({
          line: linhaExcel,
          message: `Tipo de inscrição "${registrationType}" não é válido para este evento.`
        });
      }

      if (!lineError.some(error => error.line === linhaExcel)) {
        participants.push({
          nome_completo: nameLine.trim(),
          idade: age,
          tipo_inscricao: registrationType.trim(),
          sexo: sexLine.trim().toLowerCase()
        });
      }
    });

    if (lineError.length > 0) {
      return res.status(400).json({
        message: "Erro de validação nos dados do arquivo.",
        errors: lineError
      });
    }

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
