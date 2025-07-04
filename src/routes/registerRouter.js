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
registerRoutes.post("/register-group",
  authenticateToken,
  upload.single("file"),
  [
    body("eventSelectedId").notEmpty().withMessage("O ID do evento é obrigatório."),
    body("responsible").notEmpty().withMessage("O responsável é obrigatório."),
  ],
  registerController.uploadFile
);

registerRoutes.post("/confirm-group",
  [
    body("eventSelectedId").notEmpty().withMessage("O ID do evento selecionado é obrigatório."),
    body("uniqueId").notEmpty().withMessage("O uniqueId é obrigatório."),
  ],
  authenticateToken,
  registerController.confirmRegisterGroup
);

registerRoutes.post("/register-unique",
  [
    body("eventSelectedId").notEmpty().withMessage("O ID do evento selecionado é obrigatório."),
    body("name").notEmpty().withMessage("O nome é obrigatório."),
    body("responsible").notEmpty().withMessage("O responsável é obrigatório."),
    body("dateBirth").notEmpty().withMessage("A data de nascimento é obrigatória."),
    body("typeInscription").notEmpty().withMessage("O tipo de inscrição é obrigatório."),
    body("gender").notEmpty().withMessage("O sexo é obrigatório."),
  ],
  authenticateToken,
  registerController.registerUnique
);

registerRoutes.post("/confirm-unique",
  [
    body("eventSelectedId").notEmpty().withMessage("O ID do evento selecionado é obrigatório."),
    body("uniqueId").notEmpty().withMessage("O uniqueId é obrigatório."),
  ],
  authenticateToken,
  registerController.confirmRegisterUnique
);

registerRoutes.get("/list-register",
  authenticateToken,
  registerController.listRegister
);

module.exports = registerRoutes;
