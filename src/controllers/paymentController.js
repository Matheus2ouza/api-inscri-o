const { validationResult } = require("express-validator");
const paymentService = require("../services/paymentServices.js");

exports.uploadPayment = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Erro de validação',
      fields: errors.array().reduce((acc, err) => {
        acc[err.path] = err.msg;
        return acc;
      }, {}),
    });
  }

  const comprovante_pagamento = req.file ? req.file.buffer : null;
  const tipo_arquivo = req.file ? req.file.mimetype : null;

  // Verifica se o comprovante foi carregado
  if (!comprovante_pagamento) {
    console.warn('Comprovante de pagamento não fornecido.');
    return res.status(400).json({ success: false, message: 'Comprovante de pagamento é obrigatório.' });
  }

  if (!tipo_arquivo) {
    console.warn('Tipo de arquivo não fornecido.');
    return res.status(400).json({ success: false, message: 'Tipo de arquivo é obrigatório.' });
  }

  const { valuePaid, registrationDetailsId } = req.body;
  const userId = req.user.id;
  const datePayment = new Date()

  try {
    const result = await paymentService.registerPayment(
      userId,
      Number(registrationDetailsId),
      valuePaid,
      datePayment,
      comprovante_pagamento,
      tipo_arquivo
    );

    const data = {
      id: result.id,
      receipt: `data:${tipo_arquivo};base64,${result.comprovante_imagem}`,
      type: tipo_arquivo,
      date: datePayment.toLocaleDateString('pt-BR'),
      amount: Number(valuePaid)
    }

    return res.status(201).json({
      success: true,
      message: 'Pagamento registrado com sucesso',
      data: data,
    });

  } catch (error) {
    console.error('Erro ao registrar pagamento:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao registrar pagamento',
      error: error.message,
    });
  }
}