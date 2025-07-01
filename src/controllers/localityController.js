const { validationResult } = require('express-validator');
const localityService = require('../services/localityService')

exports.listLocality = async (req, res) => {
  try {
    const list = await localityService.listLocality()

    return res.status(200).json({
      success: true,
      data: list
    })
  }catch (error) {
    console.log("[LocalityController] Erro ao buscar a lista de localidades:", error)
    return res.status(400).json({
      success: false,
      message: 'Erro ao tentar buscar a lista de localidades'
    })
  }
}

exports.activeLocality = async (req, res) => {
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

  const { localityId, password, status } = req.body;

  try {
    await localityService.activeLocality(localityId, password, status);

    return res.status(200).json({
      success: true,
      message: 'Localidade ativada com sucesso'
    });
  } catch (error) {
    console.error('[localityController] Erro ao tentar ativar a localidade:', error);

    return res.status(400).json({
      success: false,
      message: error.message || 'Erro ao ativar a localidade'
    });
  }
};
