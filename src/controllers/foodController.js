const { validationResult } = require("express-validator");
const foodService = require('../services/foodService')

exports.updateMealPrices = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Dados inválidos",
      errors: errors.array()
    });
  }

  try {
    const { meals } = req.body;
    const result = await foodService.updateOrCreateMeals(meals);

    return res.status(200).json({
      success: true,
      message: 'Preços atualizados com sucesso!',
      data: result
    });
  } catch (error) {
    console.error('[updateMealPrices]', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao atualizar preços'
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
      message: 'Dados de alimentação encontrados',
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