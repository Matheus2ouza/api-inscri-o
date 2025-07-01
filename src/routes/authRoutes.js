require("dotenv").config();
const express = require("express");
const { body, validationResult } = require("express-validator");
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { generateTokenAuth, authenticateToken, authorizeRole } = require("../middlewares/authMiddleware")
const jwt = require('jsonwebtoken');
const rateLimit = require("express-rate-limit");
const authController = require("../controllers/authController");

const registerRoutes = express.Router();


const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 10, // Máximo de 5 tentativas falhas
    message: { message: "Muitas tentativas de login. Tente novamente mais tarde." }
});

/**
 * Rota para Login
 */
registerRoutes.post("/login",
    loginLimiter,
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


/**
 * Rota para atualizar o accessToken
 */
registerRoutes.post('/refresh-token', async (req, res) => {
    try {
        console.log("🔄 Rota /refresh-token acessada");

        const refreshToken = req.cookies.refreshToken; // 🔥 Pegando o refreshToken do cookie
        console.log("📌 Token recebido do cookie:", refreshToken);

        if (!refreshToken) {
            console.warn("⚠️ Nenhum refreshToken fornecido!");
            return res.status(401).json({ message: "Token de atualização não fornecido" });
        }

        let decoded;
        try {
            decoded = jwt.verify(refreshToken, process.env.JWT_SECRET_REFRESH);
            console.log("✅ Token decodificado com sucesso:", decoded);
        } catch (err) {
            console.error("❌ Erro ao decodificar o refreshToken:", err.message);
            return res.status(403).json({ message: "Token de atualização inválido ou expirado" });
        }

        const locality = await prisma.localidades.findFirst({
            where: { id: decoded.id }
        });

        console.log("📌 Localidade encontrada no banco de dados:", locality);

        if (!locality) {
            console.warn("⚠️ Localidade não encontrada!");
            return res.status(403).json({ message: "Localidade não encontrada" });
        }

        const newAccessToken = jwt.sign(
            { id: locality.id, nome: locality.nome, role: locality.role },
            process.env.JWT_SECRET_AUTH,
            { expiresIn: "2h" }
        );

        console.log("✅ Novo accessToken gerado:", newAccessToken);

        return res.json({ accessToken: newAccessToken });

    } catch (error) {
        console.error("❌ Erro inesperado ao atualizar token:", error);
        return res.status(500).json({ message: "Erro interno no servidor ao atualizar token" });
    }
});

module.exports = registerRoutes;