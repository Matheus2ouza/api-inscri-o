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

      // Variável para armazenar os nomes
      const inscriptionData = [];

      // Loop através dos dados para extrair os nomes
      jsonData.forEach(row => {
        const name = row["Nome completo"];  // Acessa a coluna que contém o nome
        const age = row["Idade"];

        if (name) {
          inscriptionData.push(name);  // Adiciona o nome à lista de nomes
        }

        if(age) {
          inscriptionData.push(age)
        }
      });

      const inscriptionCount = {
        normal: 0,
        participação: 0,
        serviço: 0
      };

      // Loop através dos dados para extrair os nomes
      jsonData.forEach(row => {
        const type = row["Tipo de Inscrição"];

        if(type) {
          const lowerCaseType = type.toLowerCase().trim();
          if(inscriptionCount[lowerCaseType] !== undefined) {
            inscriptionCount[lowerCaseType] +=1
          }
        };
      })

      // Retorna o JSON com os dados da planilha e a contagem dos tipos de inscrição
      return res.status(201).json({
        body: jsonData,
        inscriptionData: inscriptionData,
        inscriptionCount: inscriptionCount, // Inclui a contagem no JSON
        message: "Arquivo convertido para JSON"
      });

    } catch (error) {
      console.log("Erro interno no servidor", error);
      return res.status(500).json({ message: "Erro interno no servidor" });
    }
  }
);

module.exports = registerRoutes;
