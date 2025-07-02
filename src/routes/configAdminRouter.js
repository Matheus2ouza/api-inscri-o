const express = require("express");
const { body } = require("express-validator");


const router = express.router();

router.post('/configEvent',
  body('eventId').notEmpty().withMessage("O id do evento é obrigatorio"),
  body('typeInscription').notEmpty().withMessage("o tipo de inscrição")
)