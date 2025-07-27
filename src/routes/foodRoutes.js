require("dotenv").config();
const express = require("express");
const { body } = require("express-validator");
const foodController = require("../controllers/foodController");

const router = express.Router();

const tipoRefeicaoEnum = ["CAFE", "ALMOCO", "JANTA"];
const diaSemanaEnum = ["SEXTA", "SABADO", "DOMINGO"];

// Rota PUT para atualização de preços
router.put(
  "/meal-prices",
  [
    body("meals").isArray().withMessage("Deve ser um array de refeições"),
    body("meals.*.tipo")
      .exists().withMessage("O campo 'tipo' é obrigatório")
      .isIn(tipoRefeicaoEnum).withMessage("Tipo de refeição inválido"),
    body("meals.*.dia")
      .exists().withMessage("O campo 'dia' é obrigatório")
      .isIn(diaSemanaEnum).withMessage("Dia da semana inválido"),
    body("meals.*.valor")
      .exists().withMessage("O campo 'valor' é obrigatório")
      .isFloat({ min: 0 }).withMessage("O valor deve ser um número positivo"),
    body("meals.*.quantidadeVendida")
      .optional()
      .isInt({ min: 0 }).withMessage("Quantidade deve ser um inteiro positivo")
  ],
  foodController.updateMealPrices
);

// Rota GET para obter os preços
router.get("/meal-prices", foodController.melPrices);

router.post(
  '/meal-tickets',
  [
    body('tickets').isArray().withMessage('Deve ser um array de tickets'),
    body('tickets.*.refeicaoId').isString().notEmpty(),
    body('tickets.*.mealType').isString().notEmpty(),
    body('tickets.*.day').isString().notEmpty(),
    body('tickets.*.value').isNumeric(),
    body('tickets.*.paymentMethod').isString().notEmpty()
  ],
  foodController.createMealTickets
);

router.post('/verify-ticket/:id',
  [
    param("id")
  ],
  foodController.verifyTicket
)

module.exports = router;