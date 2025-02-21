const express = require("express");
const { body, validationResult } = require("express-validator");
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { generateToken } = require("../utils/tokenConfig");
const {createHash} = require("../utils/hashConfig");
const { sendVerifyEmail } = require("../routes/notification")
const jwt = require('jsonwebtoken');

const registerRoutes = express.Router();

registerRoutes.post(
    "/login",
    [
        body("locality").isString().withMessage("User nao encontrado"),
        body("password").isString().withMessage("Password nao encontrado")
    ],
    async (req, res) => {
        const {
            locality,
            password
        } = req.body;

        const verificationLocality = await prisma.localidades.findUnique({
            where: {nome: locality}
        });

        if (verificationLocality) {
            console.log(`${locality} não corresponde a nenhuma localidade existente`)
            res.status(400).json({message: `${locality} não corresponde a nenhuma localidades`});
        }

        const statusMessage = verificationLocality.status ? "active" : "inactive";
        
        if(statusMessage === "inactive") {
            res.status(401).json({message: `O status da localidade é ${stautsMessage}`})
        }
    }
)

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
            const localityResult = await prisma.localidades.findUnique({
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
            const token = generateToken({ email });

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

const jwt = require("jsonwebtoken");
const prisma = require("../prismaClient"); // Certifique-se de que está importando corretamente

registerRoutes.post("/verify-email", async (req, res) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({ message: "Token não fornecido." });
        }

        // Verifica o token JWT
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET); // Usa a chave secreta do .env
            const email = decoded.email; // Pegamos o e-mail que foi armazenado no token

            // Se o token for válido, apenas retornamos sucesso
            return res.status(200).json({ message: "E-mail verificado com sucesso!" });
        } catch (error) {
            if (error.name === "TokenExpiredError") {
                // Se o token expirou, deletamos os dados do usuário
                await prisma.email_verification.deleteMany({
                    where: { token }
                });

                await prisma.autenticacao_localidades.deleteMany({
                    where: { localidade_id: decoded.localidade_id }
                });

                return res.status(400).json({ message: "Token expirado. Os dados foram removidos." });
            } else {
                return res.status(400).json({ message: "Token inválido." });
            }
        }
    } catch (error) {
        console.error("Erro ao verificar e-mail:", error);
        res.status(500).json({ message: "Erro interno do servidor" });
    }
});


module.exports = registerRoutes;