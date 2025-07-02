require("dotenv").config();
const express = require("express");
const { body, validationResult } = require("express-validator");
const { generateTokenAuth, authenticateToken, authorizeRole } = require("../middlewares/authMiddleware")
const authController = require("../controllers/authController");

const registerRoutes = express.Router();

/**
 * Rota para Login
 */
registerRoutes.post("/login",
    [
        body("locality").isString().withMessage("Localidade não encontrado"),
        body("password").isString().withMessage("Password não encontrado")
    ], authController.login
);

/**
 * Rota para verificar se o accessToken é valido
 */
registerRoutes.get('/verify-token', authenticateToken, async (req, res) => {
    res.set({
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        "Pragma": "no-cache",
        "Expires": "0"
    });

    // Adicione os dados do usuário retornados do token
    res.status(200).json({
        message: "Token válido",
        id: req.user.id,
        nome: req.user.nome,
        role: req.user.role
    });
});


module.exports = registerRoutes;