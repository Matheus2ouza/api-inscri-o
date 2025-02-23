require("dotenv").config();
const express = require("express");
const { body, validationResult } = require("express-validator");
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { generateTokenEmail, generateTokenAuth } = require("../utils/tokenConfig");
const {createHash, verifyPassword} = require("../utils/hashConfig");
const { sendVerifyEmail } = require("../routes/notification")
const jwt = require('jsonwebtoken');

const registerRoutes = express.Router();

registerRoutes.post(
    "/login",
    [
        body("locality").isString().withMessage("User não encontrado"),
        body("password").isString().withMessage("Password não encontrado")
    ],
    async (req, res) => {
        try {
            const { locality, password } = req.body;

            // Verificação da localidade
            const verificationLocality = await prisma.localidades.findFirst({
                where: { nome: locality }
            });

            if (!verificationLocality) { 
                console.log(`${locality} não corresponde a nenhuma localidade existente`);
                return res.status(400).json({ message: `${locality} não corresponde a nenhuma localidade existente` });
            }

            // Verificação do status da localidade
            if (!verificationLocality.status) {
                console.log(`O status da localidade é inativo`) 
                return res.status(401).json({ message: `O status da localidade é inativo` });
            }

            // Verificação da autenticação vinculada à localidade
            const verificationPassword = await prisma.autenticacao_localidades.findFirst({
                where: { localidade_id: verificationLocality.id }
            });

            if (!verificationPassword) {
                console.log(`Nenhum dado de autenticação encontrado para esta localidade`)
                return res.status(403).json({ message: `Nenhum dado de autenticação encontrado para esta localidade` });
            }

            // Verificação da senha
            const matchPassword = verifyPassword(password, verificationPassword.salt, verificationPassword.senha_hash);

            if (!matchPassword) {
                console.log(`A senha não corresponde`)
                return res.status(402).json({ message: `A senha não corresponde` });
            }

            const token = generateTokenAuth({
                id: verificationLocality.id, 
                nome: verificationLocality.nome, role: 
                verificationLocality.role
            });


            console.log(`Login realizado com sucesso!`);
            return res.status(200).json({ 
                message: "Login realizado com sucesso!",
                token: token
            });

        } catch (error) {
            console.error("Erro ao realizar login:", error);
            return res.status(500).json({ message: "Erro interno no servidor" });
        }
    }
);

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

module.exports = registerRoutes;