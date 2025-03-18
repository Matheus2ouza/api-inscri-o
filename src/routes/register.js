const express = require("express");
const rateLimit = require("express-rate-limit");
const multer = require("multer");
const xlsx = require("xlsx");
const path = require("path");
const { PrismaClient } = require('@prisma/client');
const { max } = require("moment-timezone");
const { body } = require("express-validator");
const { error } = require("console");
const prisma = new PrismaClient();

const registerRoutes = express.Router();

// Configuração do multer para armazenamento temporário do arquivo
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, '../public/uploads/'); //Diretorio para guardar o arquivo
  },
  filename: function (req, file, cb) {
    cb(null, Date.now(), path.extname(file.originalname));
  }
});

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: { message: "Muitas de envio. Tente novamente mais tarde"}
})

const upload = multer({storage: storage, limits: { fieldSize: 10 * 1024 * 1024 } });

registerRoutes.post(
  "/upload-file",
  uploadLimiter,
  upload.single("file"),
  async (req, res) => {
    try {
      if(!req.file) {
        return res.status(400).json({message: "Nenhum arquivo enviado."})
      }
  
      // Lê o arquivo Excel usando a biblioteca xlsx
      const filePath = path.join(__dirname, 'uploads', req.file.filename);
      const workbook = xlsx.readFile(filePath);
  
      // Seleciona a primeira planilha do arquivo
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
  
      // Converte os dados da planilha para JSON
      const jsonData = xlsx.utils.sheet_to_json(worksheet);
  
      return res.status(201).json({
        body: jsonData,
        message: "Arquivo convertido para JSON"
      });

    } catch(error) {
      console.log("Erro interno no servidor", error);
      return res.status(500).json({ message: "Erro interno no servidor" });
    }
  }
)

module.exports = registerRoutes