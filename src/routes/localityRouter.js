
const express = require('express');
const { body } = require('express-validator');
const { authorizeRole, authenticateToken } = require('../middlewares/authMiddleware')
const localityController = require('../controllers/localityController')

const router = express.Router();

router.get('/ListLocality', authenticateToken, authorizeRole("admin"), localityController.listLocality)

router.post('/activeLocality',
  [
    body('localityId')
      .notEmpty().withMessage('Id da localidade é obrigatório'),

    body('password')
      .notEmpty().withMessage('Senha é obrigatória')
      .isString().withMessage('Senha deve ser uma string')
      .isLength({ min: 6 }).withMessage('Senha deve ter no mínimo 6 caracteres'),

    body('status')
      .notEmpty().withMessage('Status é obrigatório')
      .isBoolean().withMessage('Status deve ser true ou false')
  ],
  authenticateToken,
  authorizeRole("admin"),
  localityController.activeLocality
);

router.post('/deactivated',
  [
    body('localityId')
      .notEmpty().withMessage('Id da localidade é obrigatório'),
  ],
  authenticateToken,
  authorizeRole("admin"),
  localityController.deactivated
)


module.exports = router