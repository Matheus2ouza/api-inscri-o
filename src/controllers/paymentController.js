const { validationResult } = require("express-validator");
const paymentService = require("../services/paymentServices.js");

exports.uploadPayment = async (req, res) => {
  const { valor_pago, cidade } = req.body;
  const comprovante_pagamento = req.file ? req.file.buffer : null; // Não precisa mais converter para base64
  const tipo_arquivo = req.file ? req.file.mimetype : null; // Tipo do arquivo

  // Verifica se o comprovante foi carregado
  if (!comprovante_pagamento) {
    console.warn('Comprovante de pagamento não fornecido.');
    return res.status(400).json({ message: 'Comprovante de pagamento é obrigatório.' });
  }

  if (!tipo_arquivo) {
    console.warn('Tipo de arquivo não fornecido.');
    return res.status(400).json({ message: 'Tipo de arquivo é obrigatório.' });
  }

}