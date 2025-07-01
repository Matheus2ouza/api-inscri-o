require("dotenv").config();
const express = require("express");
const { body, validationResult } = require("express-validator");
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { generateTokenAuth, authenticateToken, authorizeRole } = require("../middlewares/authMiddleware")
const { generateTokenEmail } = require("../utils/tokenConfig");
const {createHash, verifyPassword} = require("../utils/hashConfig");
const { sendVerifyEmail } = require("./notification")
const jwt = require('jsonwebtoken');
const rateLimit = require("express-rate-limit");

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
    loginLimiter, // 🔥 Adiciona proteção contra brute-force
    [
        body("locality").isString().withMessage("User não encontrado"),
        body("password").isString().withMessage("Password não encontrado")
    ],
    async (req, res) => {
        try {
            const { locality, password } = req.body;

            // Verificação da localidade
            const verificationLocality = await prisma.localidades.findFirst({
                where: { nome: locality },
                select: { id: true, nome: true, role: true, status: true }
            });

            if (!verificationLocality) { 
                return res.status(404).json({ message: "Usuário não encontrado" });
            }

            if (!verificationLocality.status) {
                return res.status(403).json({ message: "Localidade inativa" });
            }

            // Verifica se há autenticação vinculada
            const verificationPassword = await prisma.autenticacao_localidades.findFirst({
                where: { localidade_id: verificationLocality.id }
            });

            if (!verificationPassword) {
                return res.status(401).json({ message: "Nenhuma autenticação encontrada" });
            }

            // Verifica senha usando bcrypt
            const matchPassword = await verifyPassword(password, verificationPassword.salt, verificationPassword.senha_hash);

            if (!matchPassword) {
                return res.status(401).json({ message: "Senha incorreta" });
            }

            // Gera tokens
            const { accessToken } = generateTokenAuth({
                id: verificationLocality.id,
                nome: verificationLocality.nome,
                role: verificationLocality.role
            });

            return res.status(200).json({ 
                message: "Login realizado com sucesso!",
                accessToken: accessToken,
                role: verificationLocality.role
            });

        } catch (error) {
            console.error("Erro ao realizar login:", error);
            return res.status(500).json({ message: "Erro interno no servidor" });
        }
    }
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