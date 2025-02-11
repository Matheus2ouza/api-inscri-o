const express = require("express");
const { body, validationResult } = require("express-validator");
const { pool } = require("../db/dbConnection");

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

        if (!verificationLocality) {
            console.log(`${locality} não corresponde a nenhuma localidade existente`)
            res.status(400).json({message: `${locality} não corresponde a nenhuma localidades`});
        }

        const status = verificationLocality.rows[0].status
        
        const stautsMessage = status ? "active" : "inactive"
        console.log(`${stautsMessage}`);
        res.status(201).json(`O status da localidade; ${locality} é: ${stautsMessage}`);
    }
)

module.exports = registerRoutes;