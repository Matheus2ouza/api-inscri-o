const express = require("express");
const rateLimit = require("express-rate-limit");
const multer = require("multer");
const xlsx = require("xlsx");
const { PrismaClient } = require('@prisma/client');
const { authenticateToken } = require("../middlewares/authMiddleware");
const prisma = new PrismaClient();
const { v4: uuidv4 } = require("uuid");
const { redis } = require("../lib/redis");
const { rows } = require("pg/lib/defaults");

const registerRoutes = express.Router();

// Configuração do multer para armazenar o arquivo na memória
const storage = multer.memoryStorage();

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: { message: "Muitas tentativas de envio. Tente novamente mais tarde" }
});

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

const upload = multer({ storage: storage, limits: { fileSize: 10 * 1024 * 1024 } });

registerRoutes.post(
  "/upload-file",
  authenticateToken,
  uploadLimiter,
  upload.single("file"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Nenhum arquivo enviado." });
      }

      const user = req.user;
      console.log(user);

      const eventSelected = req.body.eventSelectd;
      console.log(eventSelected);

      const responsible = req.body.responsible;
      console.log(responsible);

      if (!eventSelected || !responsible) {
        return res.status(400).json({ message: "Required fields are missing or invalid." })
      };

      // Lê o arquivo Excel a partir da memória
      const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });

      // Seleciona a primeira planilha do arquivo
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      // Converte os dados da planilha para JSON
      const jsonData = xlsx.utils.sheet_to_json(worksheet, {
        range: 2, // Começa a ler a partir da terceira linha (índice 2)
        defval: null, // Define valor padrão para células vazias,
        
      }).slice(1); //Ignora a 4 linha (índice 3)

      // Funções auxiliares de log
      function logError(message) {
        console.error(`[ERRO] ${message}:`);
      }

      function logWarn(message) {
        console.warn(`[AVISO] ${message}:`);
      }

      const inscriptionType = await prisma.tipo_inscricao.findMany({
        where: {
          evento_id: Number(eventSelected),
        },
      });

      // Cria um Set com os tipos de inscrição válidos
      const validInscriptionTypes = new Set(
        inscriptionType.map(item => item.descricao.trim().toUpperCase())
      );

      const errors = {};

      const missingData = []; //array para armazenar linhas com dados ausentes
      const invalidNames = []; //array para armazenar nomes inválidos
      const invalidBirthDates = []; //array para armazenar datas de nascimento inválidas

      const seenNames = new Set();

      jsonData.forEach((item, index) => {
        const fullName = item["Nome Completo"]?.trim();
        const birthDateRaw = item["Data de nascimento"];
        const gender  = item["Sexo"]?.trim();
        const registrationType  = item["Tipo de Inscrição"]?.trim().toUpperCase();

        // Verifica se tem alguma célula vazia
        const missingFields = [];
        if (!fullName) missingFields.push("Nome Completo");
        if (!birthDateRaw) missingFields.push("Data de nascimento");
        if (!gender) missingFields.push("Sexo");
        if (!registrationType ) missingFields.push("Tipo de Inscrição");

        // Caso encontre algum campo obrigatório vazio, adiciona ao array de erros
        if (!fullName || !birthDateRaw || !gender || !registrationType) {
          logWarn(`Linha ${index + 5}, Campos obrigatórios ausentes: ${missingFields.join(", ")}`);
          missingData.push({
            row: index + 5,
            field: missingFields
          });
        }

        if(fullName) {

          // Regex para verificar se o nome está no formato correto
          const nameRegex = /^[A-Za-zÀ-ÿ]+(?: [A-Za-zÀ-ÿ]+)+$/;

          const isValidName = nameRegex.test(fullName) // Verifica se o nome está no formato correto
          const isDuplicated = seenNames.has(fullName); // Verifica se o nome já foi visto
          
          if(!isValidName || isDuplicated) {
            logWarn(`Linha ${index + 5}, Nome inválido ou duplicado: ${fullName}`);
            invalidNames.push({
              row: index + 5,
              name: fullName
            });
          }

          seenNames.add(fullName);
        }

        const birthDate = excelSerialDateToJSDate(birthDateRaw)
        console.log(birthDate)

        const age = calculateAge(birthDate);

        if(age === null, age < 0 || age > 120) {
          logWarn(`Linha ${index + 5}, Data de nascimento inválida: ${birthDate}`);
          invalidBirthDates.push({
            row: index + 5,
            field: birthDate
          });
        }
      });

      if (missingData.length > 0) {
        errors.missingData = missingData;
      }

      if(invalidNames.length > 0) {
        errors.invalidNames = invalidNames;
      }

      if (invalidBirthDates.length > 0) {
        errors.invalidBirthDates = invalidBirthDates;
      }

      return res.status(200).json({
        message: "Arquivo processado com sucesso.",
        errors
      });

    } catch (error) {
      console.log("Erro interno no servidor", error);
      return res.status(500).json({ message: "Erro interno no servidor" });
    }
  }
);

registerRoutes.post(
  "/confirm-register",
  authenticateToken,
  uploadLimiter,
  async (req, res) =>{

  }
);

module.exports = registerRoutes;
