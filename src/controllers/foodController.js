const { validationResult } = require("express-validator");
const foodService = require('../services/foodService')

exports.configValuesFood = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Dados inválidos. Verifique os campos e tente novamente.',
    });
  }

  const { tipo, dia, valor } = req.body;

  try{
    const result = await foodService.foodDataService(tipo, dia, valor)

    return res.status(200).json({
      success: true,
      message: "Dados recebidos com sucesso.",
      data: result
    });
  } catch (error) {
    console.log(`[foodController] Erro ao tentar registrar os valores das refeições: ${error}`)
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    })
  }
};
