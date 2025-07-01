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

    const verifiedLocation = await authService.loginService(locality, password)

    const { accessToken } = generateTokenAuth({
      id: verifiedLocation.id,
      locality: verifiedLocation.nome,
      role: verifiedLocation.role
    })

    return res.status(200).json({
      success: true,
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