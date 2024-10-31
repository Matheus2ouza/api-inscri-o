const express = require('express');
const router = express.Router();
const { pool } = require('../db/dbConnection');

// Rota para obter todas as localidades
router.get('/localidades', async (req, res) => {
    try {
        const localidades = await pool.query(`
            SELECT id, nome FROM public.localidades
        `);
        
        const response = {
            success: true,
            data: localidades.rows,
            message: 'Dados das localidades obtidos com sucesso.'
        };

        console.info('Dados das localidades retornados com sucesso.');
        return res.status(200).json(response);
    } catch (err) {
        console.error(`Erro ao obter dados das localidades: ${err}`);
        return res.status(500).json({ error: 'Erro ao obter dados das localidades.' });
    }
});

// Rota para obter o relatório com base no ID da localidade
router.get('/relatorio/:id', async (req, res) => {
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
