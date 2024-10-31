const express = require('express');
const router = express.Router();
const { pool } = require('../db/dbConnection');

// obter as localidades
router.get('/', async (req, res) => {
    try {
        const locations = await pool.query('SELECT * FROM localidades');
        const result = locations.rows;

        if (result.length === 0) { 
            console.warn('Consulta de localidade feita, mas não teve nenhum resultado.');
            return res.status(404).json({ message: 'Nenhuma localidade encontrada.' });
        } else {
            console.info('Consulta de localidade feita com sucesso.');
            return res.status(200).json(result); 
        }
    } catch (err) {
        console.error(`Erro ao buscar localidade: ${err}`);
        return res.status(500).json({ error: 'Erro ao buscar localidade.' });
    }
});

// Rota para obter o relatório
router.get('/:id', async (req, res) => {
    const localidadeId = req.params.id;

    try {
        const relatorio = await pool.query(`
            CALL Rel_Inscricoes_Geral($1)`, [localidadeId]);

        const response = {
            success: true,
            data: relatorio.rows,
            message: 'Relatório obtido com sucesso.'
        };

        console.info('Relatório retornado com sucesso.');
        return res.status(200).json(response);
    } catch (err) {
        console.error(`Erro ao obter relatório: ${err}`);
        return res.status(500).json({ error: 'Erro ao obter relatório.' });
    }
});

module.exports = router;
