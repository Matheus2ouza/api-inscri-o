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