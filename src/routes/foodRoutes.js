require("dotenv").config();
const express = require("express");
const { body } = require("express-validator");
const foodController = require("../controllers/foodController");

const router = express.Router();

const tipoRefeicaoEnum = ["CAFE", "ALMOCO", "JANTA"];
const diaSemanaEnum = ["SEXTA", "SABADO", "DOMINGO"];

router.post(
  "/config-values",
  [
    body("tipo")
      .exists().withMessage("O campo 'tipo' é obrigatório.")
      .isIn(tipoRefeicaoEnum).withMessage("Tipo de refeição inválido."),

    body("dia")
      .exists().withMessage("O campo 'dia' é obrigatório.")
      .isIn(diaSemanaEnum).withMessage("Dia da semana inválido."),

    body("quantidadeVendida")
      .optional()
      .isInt({ min: 0 }).withMessage("A quantidade deve ser um número inteiro positivo."),
  ],
  foodController.configValuesFood
);

module.exports = router;
