const express = require('express');
const { body, validationResult } = require('express-validator');
const { pool } = require('../db/dbConnection');
const router = express.Router();
const bcrypt = require('bcryptjs');

// Defina as validações para `username` e `password`
router.post(
    '/',
    [
        body('username').notEmpty().withMessage('O campo username é obrigatório'),
        body('password').notEmpty().withMessage('O campo password é obrigatório')
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            console.log("validation errors: ", errors.array());
            return res.status(400).json({ errors: errors.array() });
        }

        const { username, password } = req.body;

        // Verificação adicional de preenchimento dos campos
        if (!username || !password) {
            console.warn("Algum campo não foi preenchido");
            return res.status(401).json({ message: "dados invalidos" });
        };
        
        const usernameValidation = await pool.query(`SELECT * FROM userAdmin WHERE username = $1`, [username]);
        const user = usernameValidation.rows[0];

        // Verifica se o usuário não foi encontrado
        if (!user) {
            console.warn(`Tentativa de login rejeitada, usuário ${username} não encontrado`);
            return res.status(401).json({ message: `username invalido` });
        }

        const match = await bcrypt.compare(password, user.password);

        if (!match) {
            console.warn(`Tentativa de login rejeitada, senha: ${password}`);
            return res.status(401).json({ message: `password invalido` });
        }

        console.log(`Dados aceitos`);
        return res.status(201).json({ message: 'Dados válidos' });
    }
);

module.exports = router;
