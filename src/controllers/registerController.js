const xlsx = require("xlsx");

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
  try {
    const fileBuffer = req.file?.buffer;

    if (!fileBuffer) {
      return res.status(400).json({ message: "Arquivo não enviado corretamente." });
    }

    // Lê o arquivo Excel da memória
    const workbook = xlsx.read(fileBuffer, { type: "buffer" });

    // Pega a primeira aba (sheet)
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    // Converte a aba em JSON
    const jsonData = xlsx.utils.sheet_to_json(sheet);

    return res.status(200).json({ data: jsonData });
  } catch (error) {
    console.error("Erro ao processar o arquivo Excel:", error);
    return res.status(500).json({ message: "Erro ao processar o arquivo Excel." });
  }
};

exports.confirmRegister = async (req, res) => {
  async (req, res) => {
    const user = req.user;

    const { eventId, responsible, uuid } = req.body;

    if (!eventId || !responsible || !uuid) {
      return res.status(400).json({ message: "Campos obrigatórios estão ausentes ou são inválidos." });
    }

    const key = `inscription:${eventId}:${user.id}:${uuid}`;

    const registerData = await redis.get(key);

    if (!registerData) {
      return res.status(404).json({ message: "Dados de inscrição não encontrados ou expirados." });
    }

    const parsedData = JSON.parse(registerData);


  }
}