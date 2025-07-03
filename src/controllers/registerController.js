const xlsx = require("xlsx");
const { validationResult } = require("express-validator");
const registerService = require("../services/registerService");


function excelSerialDateToJSDate(serial) {
  const excelEpoch = new Date(1899, 11, 30); // Excel começa em 30/12/1899
  return new Date(excelEpoch.getTime() + serial * 86400000); // Multiplica pelos ms de um dia
}

// Função para calcular a idade
function calculateAge(birthDate) {
  // Se for número, converte do formato Excel
  if (typeof birthDate === "number") {
    birthDate = excelSerialDateToJSDate(birthDate);
  } else {
    console.error(`Invalid birthDate type: ${typeof birthDate}`);
    return null;
  }

  if (!(birthDate instanceof Date) || isNaN(birthDate)) {
    console.error(`Invalid birthDate:`, birthDate);
    return null;
  }

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const currentMonth = today.getMonth();
  const birthMonth = birthDate.getMonth();

  // Ajuste para não contar o aniversário antes da data atual
  if (currentMonth < birthMonth || (currentMonth === birthMonth && today.getDate() < birthDate.getDate())) {
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

    const workbook = xlsx.read(fileBuffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    const jsonData = xlsx.utils.sheet_to_json(sheet, {
      header: 1,
      range: 2,
    });

    const headers = jsonData[0];
    const dataRows = jsonData.slice(2);

    const lineError = [];
    const participantes = [];

    dataRows.forEach((row, index) => {
      const lineNumber = index + 5;

      const participante = {};
      headers.forEach((key, i) => {
        participante[key] = row[i];
      });

      const fullname = participante["Nome Completo"]?.trim();
      const birthDate = participante["Data de nascimento"];
      const gender = participante["Sexo"]?.trim();
      const registrationType = participante["Tipo de inscrição"]?.trim();

      if (!fullname || !birthDate || !gender || !registrationType) {
        lineError.push({
          line: lineNumber,
          error: "Campos obrigatórios ausentes",
        });
        return;
      }

      const regexName = /^[A-Za-zÀ-ÖØ-öø-ÿ]+(?: [A-Za-zÀ-ÖØ-öø-ÿ]+)+$/;
      if (!regexName.test(fullname)) {
        lineError.push({
          line: lineNumber,
          error: "Nome fora do formato esperado (Nome e Sobrenome, sem caracteres especiais)",
        });
      }

      const age = calculateAge(birthDate);
      if (age === null) {
        lineError.push({
          line: lineNumber,
          error: "Data de nascimento inválida",
        });
      } else if (age < rulesEvent.min_age || age > rulesEvent.max_age) {
        lineError.push({
          line: lineNumber,
          error: `Idade fora do intervalo permitido (${rulesEvent.min_age} - ${rulesEvent.max_age})`,
        });
      }

      const genderNormalized = gender.toLowerCase();
      const isMale = genderNormalized === "masculino" || genderNormalized === "m";
      const isFemale = genderNormalized === "feminino" || genderNormalized === "f";

      if (!rulesEvent.allow_male && isMale) {
        lineError.push({
          line: lineNumber,
          error: "Sexo masculino não permitido para este evento",
        });
      }

      if (!rulesEvent.allow_female && isFemale) {
        lineError.push({
          line: lineNumber,
          error: "Sexo feminino não permitido para este evento",
        });
      }

      const isValidType = rulesEvent.tipos_inscricao.some(t => t.descricao === registrationType);
      if (!isValidType) {
        lineError.push({
          line: lineNumber,
          error: `Tipo de inscrição inválido: "${registrationType}"`,
        });
      }

      participantes.push(participante);
    });

    if (lineError.length > 0) {
      return res.status(400).json({
        message: "Erros de validação encontrados no arquivo.",
        errors: lineError,
      });
    }

    // Calcular total com base nos tipos de inscrição e valor
    let total = 0;
    participantes.forEach(p => {
      const tipo = rulesEvent.tipos_inscricao.find(t => t.descricao === p["Tipo de inscrição"]);
      total += tipo?.valor || 0;
    });

    return res.status(200).json({ data: participantes, total });
  } catch (error) {
    console.error("Erro ao processar o arquivo Excel:", error);
    return res.status(500).json({ message: "Erro ao processar o arquivo Excel." });
  }
};

exports.confirmRegister = async (req, res) => {
}