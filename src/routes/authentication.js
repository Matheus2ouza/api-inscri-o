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
        body("password").isLength({ min: 6 }).withMessage("A senha deve ter pelo menos 6 caracteres")
    ],
    async(req, res) => {
        try {
            const {
                locality,
                email,
                password
            } = req.body;
    
            const verificationLocality = await pool.query(`
                SELECT * FROM localidades
                WHERE nome = $1
                `,
            [locality]);

            const localityResult = verificationLocality.rows[0];
    
            if (verificationEmail.rows.length > 0) {  // Se já existe, retorna erro
                console.log(`${email} já existe no banco de dados`);
                return res.status(400).json({ message: `${email} já existe no banco de dados` });
            }            
    
            const verificationEmail = await pool.query(`
                SELECT * FROM email_verification
                WHERE email = $1`,
            [email]);
    
            if(verificationEmail.rows.length === 0) {
                console.log(`${email} Já existe no banco de dados`);
                return res.status(400).json({message: `${email} Já existe no banco de dados`});            
            }
    
            const token = generateToken();
            const insertDataEmail = await pool.query(`
                INSERT INTO email_verification(localidade_id, email, token)
                VALUES ($1, $2, $3)
                `,
            [localityResult.id, email, token]);
            
            const {salt , hash} = createHash(password);

            const insertDataPassword = await pool.query(`
                INSERT INTO autenticacao_localidades(localidade_id, senha_hash, salt, algoritmo, data_atualizacao)
                VALUES($1, $2, $3, $4, NOW())
                `,
            [localityResult.id, hash, salt, 'sha256']);            

            res.status(201).json({ message: "Registro realizado com sucesso." });

        }catch (error) {
            console.error("Erro ao registrar:", error);
            res.status(500).json({ message: "Erro interno do servidor" });
        }
    }
);

module.exports = registerRoutes;