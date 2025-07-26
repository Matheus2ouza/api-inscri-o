require("dotenv").config();
const express = require("express");
const { body } = require("express-validator");
const foodController = require("../controllers/foodController");
const authMiddleware = require('../middlewares/authMiddleware')

const router = express.Router();

const tipoRefeicaoEnum = ["CAFE", "ALMOCO", "JANTA"];
const diaSemanaEnum = ["SEXTA", "SABADO", "DOMINGO"];

const { body } = require("express-validator");

router.post(
  "/config-values",
  [
    body("*.tipo")
      .exists().withMessage("O campo 'tipo' é obrigatório.")
      .isIn(tipoRefeicaoEnum).withMessage("Tipo de refeição inválido."),

    body("*.dia")
      .exists().withMessage("O campo 'dia' é obrigatório.")
      .isIn(diaSemanaEnum).withMessage("Dia da semana inválido."),

    body("*.valor")
      .exists().withMessage("O campo 'valor' é obrigatório.")
      .isFloat({ min: 0 }).withMessage("O valor deve ser um número positivo."),

    body("*.quantidadeVendida")
      .optional()
      .isInt({ min: 0 }).withMessage("A quantidade deve ser um número inteiro positivo.")
  ],
  foodController.configValuesFood
);



router.get(`/meal-prices`, foodController.melPrices)

module.exports = router;
