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

    const jsonData = xlsx.utils.sheet_to_json(worksheet, {
      range: 2,
      defval: null,
    });

    const lineError = [];
    const participantes = [];

jsonData.forEach((item, index) => {
  const linhaExcel = index + 4; // linha real no Excel
  const nome = item["Nome Completo"];
  const nascimento = item["Data de nascimento"];
  const sexo = item["Sexo"];
  const tipoInscricao = item["Tipo de Inscrição"];

  const emptyFields = [
    { valor: nome, mensagem: "Campo 'Nome Completo' está vazio." },
    { valor: nascimento, mensagem: "Campo 'Data de nascimento' está vazio." },
    { valor: sexo, mensagem: "Campo 'Sexo' está vazio." },
    { valor: tipoInscricao, mensagem: "Campo 'Tipo de Inscrição' está vazio." },
  ];

  emptyFields.forEach(({ valor, mensagem }) => {
    if (!valor) {
      lineError.push({ line: linhaExcel, message: mensagem });
    }
  });

  const age = calculateAge(nascimento);
  if (age === null || rulesEvent.min_age > age || age > rulesEvent.max_age) {
    lineError.push({ line: linhaExcel, message: "Idade fora da faixa etária do" });
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
      participantes: jsonData,
      rulesEvent,
    });
  } catch (error) {
    console.error("Erro ao processar o arquivo Excel:", error);
    return res.status(500).json({ message: "Erro ao processar o arquivo Excel." });
  }
};

exports.confirmRegister = async (req, res) => {};
