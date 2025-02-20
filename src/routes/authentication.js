const express = require("express");
const { body, validationResult } = require("express-validator");
const { pool } = require("../db/dbConnection");
const { generateToken } = require("../utils/tokenGenerator");
const {createHash} = require("../utils/hashCreate")

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

        const verificationLocality = await pool.query(`
            SELECT * FROM localidades
            WHERE nome = $1`,
        [locality]);

        if (verificationLocality.rows.length === 0) {
            console.log(`${locality} não corresponde a nenhuma localidade existente`)
            res.status(400).json({message: `${locality} não corresponde a nenhuma localidades`});
        }

        const status = verificationLocality.rows[0].status
        
        const stautsMessage = status ? "active" : "inactive"
        
        if(stautsMessage === "inactive") {
            res.status(401).json({message: `O status da localidade é ${stautsMessage}`})
        }
    }
)

registerRoutes.post(
    "register",
    [
        body("locality").isString().withMessage("Localidade não encontrada"),
        body("email").isEmail().withMessage("Email inválido"),
        body("password").isLength({ min: 10 }).withMessage("A senha deve ter pelo menos 10 caracteres")
    ],
    async (req, res) => {
        try {
            const { locality, email, password } = req.body;

            // Verifica se a localidade existe
            const verificationLocality = await pool.query(`
                SELECT * FROM localidades WHERE nome = $1
            `, [locality]);

            const localityResult = verificationLocality.rows[0];

            if (!localityResult) {
                return res.status(400).json({ message: "Localidade não encontrada" });
            }

            // Verifica se o email já está registrado
            const verificationEmail = await pool.query(`
                SELECT * FROM email_verification WHERE email = $1
            `, [email]);

            if (verificationEmail.rows.length > 0) {  
                console.log(`${email} já existe no banco de dados`);
                return res.status(400).json({ message: `${email} já existe no banco de dados` });
            }

            // Gera um token para verificação de e-mail
            const token = generateToken();

            // Insere o e-mail e o token no banco de dados
            await pool.query(`
                INSERT INTO email_verification(localidade_id, email, token)
                VALUES ($1, $2, $3)
            `, [localityResult.id, email, token]);
            
            // Gera o hash da senha
            const { salt, hash } = createHash(password);

            // Insere os dados de autenticação no banco
            await pool.query(`
                INSERT INTO autenticacao_localidades(localidade_id, senha_hash, salt, algoritmo, data_atualizacao)
                VALUES($1, $2, $3, $4, NOW())
            `, [localityResult.id, hash, salt, 'sha256']);

            // Envia o e-mail de verificação
            await sendVerifyEmail(token, email, localityResult.nome);

            res.status(201).json({ message: "Registro realizado com sucesso. Verifique seu e-mail para confirmar." });

        } catch (error) {
            console.error("Erro ao registrar:", error);
            res.status(500).json({ message: "Erro interno do servidor" });
        }
    }
);


registerRoutes.post(
    "verify-email",
    async(req, res) =>{
        try {
            const { token } = req.body;

            if(!token) {
                return res.status(400).json({message: "Token não fornecido."})
            }

            const verification = await pool.query(`
                SELECT * FROM email_verification
                WHERE token = $1
            `, [token]);

            if(verification.rows.length === 0) {
                return res.status(400).json({message: "Token Invalido ou expirado. "});
            };

        } catch (error) {
            console.error("Erro ao registrar:", error);
            res.status(500).json({ message: "Erro interno do servidor" });
        }
    }
);

module.exports = registerRoutes;