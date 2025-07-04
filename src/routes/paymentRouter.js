const express = require('express');
const multer = require('multer');
const { authenticateToken } = require('../middlewares/authMiddleware');
const { body } = require('express-validator');
const paymentController = require('../controllers/paymentController');

const router = express.Router();

// Configuração do multer para processar o upload de arquivos como buffer
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Rota para registrar o pagamento
router.post('/upload-payment',
    authenticateToken,
    upload.single('comprovante_pagamento'),
    [
        body("value_paid").isDecimal({ min: 0 }).withMessage("O valor pago deve ser um número decimal positivo."),
        body("registration_details_id").notEmpty().withMessage("O ID dos detalhes de inscrição é obrigatório."),
    ],
    paymentController.uploadPayment
);

module.exports = router;
