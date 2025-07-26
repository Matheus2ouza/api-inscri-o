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

  const { data } = req.body;

  try{
    const result = await foodService.foodDataService(data)

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

exports.melPrices = async (req, res) => {
  try{
    const prices = await foodService.melPrices()

    if(!prices) {
      return res.status(404).json({
        success: false,
        message: 'Nenhum dados de alimentação'
      });
    }

    return res.status(201).json({
      success: true,
      message: 'DAdos de alimentação encontrados',
      data: prices
    })
  } catch (error) {
    console.log(`[FoodController] Erro ao tentar buscar os valores: ${error}`);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    })
  }
}