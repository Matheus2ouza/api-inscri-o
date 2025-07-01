const { validationResult } = require('express-validator');
const authService = require('../services/authService')

exports.login = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    console.warn('[ConfigurationParking] Dados inválidos na requisição:', errors.array());
    return res.status(400).json({
      success: false,
      message: 'Erro de validação',
      fields: errors.array().reduce((acc, err) => {
        acc[err.path] = err.msg;
        return acc;
      }, {}),
    });
  }

  const { locality, password } = req.body;
  try {

    const {accessToken, role} = await authService.loginService(locality, password)

    return res.status(200).json({
      success: true,
      role: role,
      accessToken: accessToken
    })

  } catch (error) {
    console.error("Erro ao realizar login:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Erro desconhecido"
    });
  }
}