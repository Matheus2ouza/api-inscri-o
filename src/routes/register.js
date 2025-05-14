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

      // Lê o arquivo Excel a partir da memória
      const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });

      // Seleciona a primeira planilha do arquivo
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      // Converte os dados da planilha para JSON
      const jsonData = xlsx.utils.sheet_to_json(worksheet);

      // Funções auxiliares de log
      function logError(context, error) {
        console.error(`[ERRO] ${context}:`, error);
      }

      function logWarn(context, warning) {
        console.warn(`[AVISO] ${context}:`, warning);
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

      const formattedData = [];
      const duplicatedRecords = [];
      const seenNames = new Set();  // Para armazenar os nomes que já foram vistos

      jsonData.forEach(item => {
        const rawType = String(item["Tipo de Inscrição"] || "").trim().toUpperCase();
        const isValidType = validInscriptionTypes.has(rawType);

        const rawBirthDate = item["Data de nascimento"];
        const idade = calculateAge(rawBirthDate);

        const nome = String(item["Nome completo"] || "").trim();

        const newItem = {
          nome,
          sexo: String(item["Sexo"] || "").trim(),
          tipoInscricao: rawType,
          tipoInscricaoValido: isValidType,
          idade,
        };

        if (seenNames.has(nome.toUpperCase())) {
          duplicatedRecords.push(newItem); // Adiciona o objeto completo de duplicado
        } else {
          seenNames.add(nome.toUpperCase());
          formattedData.push(newItem);  // Adiciona ao array de dados formatados
        }
      });

      return res.status(200).json({
        message: "Arquivo processado com sucesso.",
        data: formattedData,
        duplicatedRecords: duplicatedRecords,
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
