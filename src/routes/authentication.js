require("dotenv").config();
const express = require("express");
const { body, validationResult } = require("express-validator");
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { generateTokenAuth, authenticateToken } = require("../middlewares/authMiddleware")
const { generateTokenEmail } = require("../utils/tokenConfig");
const {createHash, verifyPassword} = require("../utils/hashConfig");
const { sendVerifyEmail } = require("../routes/notification")
const jwt = require('jsonwebtoken');
const rateLimit = require("express-rate-limit");

const registerRoutes = express.Router();


const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // Máximo de 5 tentativas falhas
    message: { message: "Muitas tentativas de login. Tente novamente mais tarde." }
});

/**
 * Rota para Login
 */
registerRoutes.post(
    "/login",
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
            const { accessToken, refreshToken } = generateTokenAuth({
                id: verificationLocality.id,
                nome: verificationLocality.nome,
                role: verificationLocality.role
            });

            const isProduction = process.env.NODE_ENV === "production"; 

            res.cookie("refreshToken", refreshToken, {
                httpOnly: true,
                secure: isProduction,   // ✅ HTTPS apenas em produção
                sameSite: isProduction ? "None" : "Lax",  // None para cross-site, Lax para localhost
            });
            

            // 🔥 Log para verificar se o cookie foi enviado
            console.log("RefreshToken enviado para o cookie:", refreshToken);

            return res.status(200).json({ 
                message: "Login realizado com sucesso!",
                accessToken: accessToken
            });

        } catch (error) {
            console.error("Erro ao realizar login:", error);
            return res.status(500).json({ message: "Erro interno no servidor" });
        }
    }
);

/**
 * Rota para registrar o Usuario
 */
registerRoutes.post(
    "/register",
    [
        body("locality").isString().withMessage("Localidade não encontrada"),
        body("email").isEmail().withMessage("Email inválido"),
        body("password").isLength({ min: 10 }).withMessage("A senha deve ter pelo menos 10 caracteres")
    ],
    async (req, res) => {
        try {
            const { locality, email, password } = req.body;

            console.log(locality, email, password);

            // Verifica se a localidade existe
            const localityResult = await prisma.localidades.findFirst({
                where: { nome: locality }
            });

            if (!localityResult) {
                return res.status(400).json({ message: "Localidade não encontrada" });
            }

            // Verifica se o email já está registrado
            const existingEmail = await prisma.email_verification.findUnique({
                where: { email }
            });

            if (existingEmail) {
                console.log(`${email} já existe no banco de dados`);
                return res.status(400).json({ message: `${email} já existe no banco de dados` });
            }

            // Gera um token JWT válido por 48h usando a função externa
            const token = generateTokenEmail({ email });

            // Insere o e-mail e o token no banco de dados
            await prisma.email_verification.create({
                data: {
                    localidade_id: localityResult.id,
                    email,
                    token
                }
            });

            const { hash, salt} = createHash(password)

            // Insere os dados de autenticação no banco
            await prisma.autenticacao_localidades.create({
                data: {
                    localidade_id: localityResult.id,
                    senha_hash: hash,
                    salt: salt,
                    algoritmo: 'bcrypt',
                    data_atualizacao: new Date()
                }
            });

            // Envia o e-mail de verificação
            await sendVerifyEmail(token, email, localityResult.nome);

            res.status(201).json({ message: "Registro realizado com sucesso. Verifique seu e-mail para confirmar." });

        } catch (error) {
            console.error("Erro ao registrar:", error);
            res.status(500).json({ message: "Erro interno do servidor" });
        }
    }
);

/**
 * Rota para autenticar o email
*/
registerRoutes.post("/verify-email", async (req, res) => {
    try {
        const { token } = req.body;

        console.log("Recebendo solicitação para verificar e-mail...");
        console.log("Token recebido:", token);

        if (!token) {
            console.log("Erro: Token não fornecido.");
            return res.status(400).json({ message: "Token não fornecido." });
        }

        // Busca o registro de verificação pelo token
        const verification = await prisma.email_verification.findFirst({
            where: { token }
        });

        console.log("Resultado da busca na tabela email_verification:", verification);

        if (!verification) {
            console.log("Erro: Token inválido.");
            return res.status(400).json({ message: "Token inválido." });
        }

        // Verifica se o e-mail já foi confirmado anteriormente
        if (verification.status) {
            console.log("Erro: Token já foi utilizado anteriormente.");
            return res.status(402).json({ message: "Token já foi utilizado." });
        }

        try {
            console.log("Verificando token JWT...");
            const decoded = jwt.verify(token, process.env.SECRET_KEY_EMAIL);
            console.log("Token decodificado com sucesso:", decoded);

            // Atualiza o status da verificação para true
            await prisma.email_verification.update({
                where: { id: verification.id }, // Usa `id` como chave única
                data: { status: true }
            });

            console.log("Status da verificação atualizado para true.");

            // Atualiza o status da localidade para true
            await prisma.localidades.update({
                where: { id: verification.localidade_id },
                data: { status: true }
            });

            console.log("Status da localidade atualizado para true.");

            return res.status(200).json({ message: "E-mail verificado com sucesso!" });

        } catch (error) {
            console.log("Erro ao verificar o token JWT:", error);

            if (error.name === "TokenExpiredError") {
                console.log("Token expirado. Removendo dados...");

                await prisma.email_verification.deleteMany({
                    where: { token }
                });

                console.log("Registros removidos de email_verification.");

                await prisma.autenticacao_localidades.deleteMany({
                    where: { localidade_id: verification.localidade_id }
                });

                console.log("Registros removidos de autenticacao_localidades.");

                return res.status(401).json({ message: "Token expirado. Os dados foram removidos." });
            }

            return res.status(400).json({ message: "Token inválido." });
        }
    } catch (error) {
        console.error("Erro ao verificar e-mail:", error);
        res.status(500).json({ message: "Erro interno do servidor" });
    }
});

/**
 * Rota para verificar se o accessToken é valido
 */
registerRoutes.get('/verify-token', authenticateToken, async (req, res) => {
    res.set({
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        "Pragma": "no-cache",
        "Expires": "0"
    });

    res.status(200).json({ message: "Token valido" });
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