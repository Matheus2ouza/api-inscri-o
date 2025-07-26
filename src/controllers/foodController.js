const { validationResult } = require("express-validator");
const foodService = require('../services/foodService')

exports.configValuesFood = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Dados inválidos.",
      errors: errors.array()
    });
  }

  const dados = req.body;

  try {
    const result = await foodService.createMultipleRefeicoes(dados);

    return res.status(201).json({
      success: true,
      message: 'Refeições criadas com sucesso!',
      count: result.count
    });
  } catch (error) {
    console.error('[configValuesFood]', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao criar refeições'
    });
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