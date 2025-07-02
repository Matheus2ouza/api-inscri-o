const express = require("express");
const multer = require("multer");
const { authenticateToken } = require("../middlewares/authMiddleware");
const registerController = require("../controllers/registerController");

const registerRoutes = express.Router();

// Configuração do multer
const multer = require("multer");
const storage = multer.memoryStorage(); // 👈 armazena o arquivo na memória
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// Rota de upload do arquivo
registerRoutes.post(
  "/upload-file",
  authenticateToken,
  upload.single("file"),
  registerController.uploadFile
);

// Outra rota de exemplo (sem detalhes aqui)
registerRoutes.post(
  "/confirm-register",
  authenticateToken,
  registerController.confirmRegister
);

module.exports = registerRoutes;
