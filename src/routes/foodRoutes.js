require("dotenv").config();
const express = require("express");
const { body } = require("express-validator");
const foodController = require("../controllers/foodController");
const authMiddleware = require('../middlewares/authMiddleware')

const router = express.Router();

const tipoRefeicaoEnum = ["CAFE", "ALMOCO", "JANTA"];
const diaSemanaEnum = ["SEXTA", "SABADO", "DOMINGO"];

const { body } = require("express-validator");

const { validationResult } = require("express-validator");

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

router.get(`/meal-prices`, foodController.melPrices)

module.exports = router;
