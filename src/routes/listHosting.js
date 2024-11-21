const express = require('express');
const router = express.Router();
const { pool } = require('../db/dbConnection');

router.get('/', async (req, res) => {
    try {
        // Query SQL para pegar os dados com junções
        const query = `
            SELECT 
                h.id, 
                h.nome, 
                l.nome AS localidade
            FROM 
                hospedagem h
            JOIN 
                inscricao_geral i ON h.id_inscricao = i.id
            JOIN 
                localidades l ON i.localidade_id = l.id;
        `;
        
        // Executando a query no banco de dados
        const { rows } = await pool.query(query);
        
        // Retornando o resultado como JSON
        res.status(200).json(rows);
    } catch (err) {
        // Se ocorrer erro, retornamos um erro
        console.error('Erro ao buscar dados: ', err);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});

module.exports = router;