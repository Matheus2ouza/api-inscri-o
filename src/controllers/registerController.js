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

    // Lê o arquivo Excel a partir da memória
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });

    // Seleciona a primeira planilha do arquivo
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Converte os dados da planilha para JSON
    const jsonData = xlsx.utils.sheet_to_json(worksheet, {
      range: 2, // Começa a ler a partir da terceira linha (índice 2)
      defval: null, // Define valor padrão para células vazias,

    })

    const lineError = [];
    const participantes = [];

    jsonData.forEach((item, index) => {
      const nome = item["Nome Completo"];
      const nascimento = item["Data de nascimento"];
      const sexo = item["Sexo"];
      const tipoInscricao = item["Tipo de Inscrição"];

      if(!nome || !nascimento || !sexo || !tipoInscricao) {
        lineError.push(index + 5);
        return;
      }
      
    });


    if(lineError.length > 0) {
      return res.status(400).json({
        message: "Erro de validação nos dados do arquivo.",
        errors: lineError
      });
    }

    return res.status(200).json({
      message: "Arquivo processado com sucesso.",
      participantes: jsonData,
      rulesEvent,
    });
  } catch (error) {
    console.error("Erro ao processar o arquivo Excel:", error);
    return res.status(500).json({ message: "Erro ao processar o arquivo Excel." });
  }
};

exports.confirmRegister = async (req, res) => {
}