const express = require("express");
const multer = require("multer");
const { authenticateToken } = require("../middlewares/authMiddleware");
const registerController = require("../controllers/registerController");
const { body } = require("express-validator");

const registerRoutes = express.Router();

// Configuração do multer
const storage = multer.memoryStorage(); // 👈 armazena o arquivo na memória
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// Rota de upload do arquivo
registerRoutes.post(
  "/upload-file",
  authenticateToken,
  upload.single("file"),
  [
    body("eventSelectedId").notEmpty().withMessage("O ID do evento é obrigatório."),
    body("responsible").notEmpty().withMessage("O responsável é obrigatório."),
  ],
  registerController.uploadFile
);

// Outra rota de exemplo (sem detalhes aqui)
registerRoutes.post(
  "/confirm-register",
  [
    body("eventSelectedId").notEmpty().withMessage("O ID do evento selecionado é obrigatório."),
    body("uniqueId").notEmpty().withMessage("O uniqueId é obrigatório."),
  ],
  authenticateToken,
  registerController.confirmRegister
);

module.exports = registerRoutes;
