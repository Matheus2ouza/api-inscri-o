const express = require("express");
const rateLimit = require("express-rate-limit");
const multer = require("multer");
const xlsx = require("xlsx");
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const registerRoutes = express.Router();

// Configuração do multer para armazenar o arquivo na memória
const storage = multer.memoryStorage();

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: { message: "Muitas tentativas de envio. Tente novamente mais tarde" }
});

function calculateAge(birthDate) {
  if (typeof birthDate !== "string") {
    console.error(`Invalid birthDate:`, birthDate);
    return null; // Retorna nulo se não for uma string
  }

  // Converte o formato DD/MM/YYYY para YYYY-MM-DD
  const [day, month, year] = birthDate.split("/"); 
  if (!day || !month || !year) {
    console.error(`Invalid date format: ${birthDate}`);
    return null; // Retorna nulo se o formato estiver errado
  }
  
  const formattedDate = `${year}-${month}-${day}`; 
  const today = new Date();
  const birth = new Date(formattedDate);

  if (isNaN(birth.getTime())) {
    console.error(`Invalid Date object: ${formattedDate}`);
    return null; // Retorna nulo se não for uma data válida
  }

  let age = today.getFullYear() - birth.getFullYear();
  const currentMonth = today.getMonth();
  const birthMonth = birth.getMonth();

  // Ajuste para não contar o aniversário antes da data atual
  if (currentMonth < birthMonth || (currentMonth === birthMonth && today.getDate() < birth.getDate())) {
    age--;
  }

  return age;
}


const upload = multer({ storage: storage, limits: { fileSize: 10 * 1024 * 1024 } });

registerRoutes.post(
  "/upload-file",
  uploadLimiter,
  upload.single("file"),  // "file" deve ser o mesmo nome usado no frontend
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Nenhum arquivo enviado." });
      }

      console.log("Arquivo recebido:", req.file); // Verifica os detalhes do arquivo

      // Lê o arquivo Excel a partir da memória
      const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });

      // Seleciona a primeira planilha do arquivo
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      // Converte os dados da planilha para JSON
      const jsonData = xlsx.utils.sheet_to_json(worksheet);

      const inscriptionData = {};

      // Loop para usar a função dentro do seu JSON
      jsonData.forEach(row => {
        const name = row["Nome completo"];
        const birthDate = row["Data de nascimento"];

        console.log(birthDate);
        console.log(typeof birthDate);
        inscriptionData[name] = {
          name: name
        };
      });

      // Retornar os resultados com os dados de inscrição e total
      return res.status(200).json({
        status: "success",
        message: "Arquivo convertido para JSON com sucesso",
        data: {
          list: inscriptionData,
        }
      });


    } catch (error) {
      console.log("Erro interno no servidor", error);
      return res.status(500).json({ message: "Erro interno no servidor" });
    }
  }
);

module.exports = registerRoutes;
