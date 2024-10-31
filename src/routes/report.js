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
router.get('/:localidadeId?', async (req, res) => {
    const { localidadeId } = req.params;

    try {
        // Consulta base
        let query = `
            SELECT 
                lc.id AS localidade_id,
                lc.nome AS localidade_nome,
                COALESCE(SUM(ic.qtd_masculino), 0) AS total_masculino_0_6,
                COALESCE(SUM(ic.qtd_feminino), 0) AS total_feminino_0_6,
                COALESCE(SUM((ic.qtd_masculino + ic.qtd_feminino) * 0.00), 0) AS valor_total_0_6,
                COALESCE(SUM(ia.qtd_masculino), 0) AS total_masculino_7_10,
                COALESCE(SUM(ia.qtd_feminino), 0) AS total_feminino_7_10,
                COALESCE(SUM((ia.qtd_masculino + ia.qtd_feminino) * 120.00), 0) AS valor_total_7_10,
                COALESCE(SUM(ino.qtd_masculino), 0) AS total_masculino_normal,
                COALESCE(SUM(ino.qtd_feminino), 0) AS total_feminino_normal,
                COALESCE(SUM((ino.qtd_masculino + ino.qtd_feminino) * 200.00), 0) AS valor_total_normal,
                COALESCE(SUM(ise.qtd_masculino), 0) AS total_masculino_servico,
                COALESCE(SUM(ise.qtd_feminino), 0) AS total_feminino_servico,
                COALESCE(SUM((ise.qtd_masculino + ise.qtd_feminino) * 100.00), 0) AS valor_total_servico,
                COALESCE(SUM(itx.qtd_masculino), 0) AS total_masculino_participacao,
                COALESCE(SUM(itx.qtd_feminino), 0) AS total_feminino_participacao,
                COALESCE(SUM((itx.qtd_masculino + itx.qtd_feminino) * 100.00), 0) AS valor_total_participacao,
                COALESCE(SUM((ic.qtd_masculino + ic.qtd_feminino) * 0.00 
                    + (ia.qtd_masculino + ia.qtd_feminino) * 120.00 
                    + (ino.qtd_masculino + ino.qtd_feminino) * 200.00 
                    + (ise.qtd_masculino + ise.qtd_feminino) * 100.00 
                    + (itx.qtd_masculino + itx.qtd_feminino) * 100.00), 0) AS valor_total_geral
            FROM 
                localidades AS lc
            INNER JOIN 
                inscricao_geral AS ig ON lc.id = ig.localidade_id
            LEFT JOIN 
                inscricao_0_6 AS ic ON ic.inscricao_geral_id = ig.id
            LEFT JOIN 
                inscricao_7_10 AS ia ON ia.inscricao_geral_id = ig.id
            LEFT JOIN 
                inscricao_10_acima AS ino ON ino.inscricao_geral_id = ig.id
            LEFT JOIN 
                inscricao_servico AS ise ON ise.inscricao_geral_id = ig.id
            LEFT JOIN 
                inscricao_tx_participacao AS itx ON itx.inscricao_geral_id = ig.id
        `;

        const params = [];
        
        if (localidadeId) {
            
            query += ` WHERE lc.id = $1`;
            params.push(localidadeId);
        }

        query += ` GROUP BY lc.id, lc.nome`;

        const result = await pool.query(query, params);

        if (result.rows.length === 0) {
            console.warn('Consulta de inscrições feita, mas não teve nenhum resultado.');
            res.status(404).json({ message: 'Nenhum resultado encontrado.' });
        } else {
            console.info('Consulta de inscrições feita com sucesso.');
            res.status(200).json(result.rows);
        }
    } catch (err) {
        console.error(`Erro ao buscar inscrições: ${err}`);
        res.status(500).json({ error: 'Erro ao buscar inscrições.' });
    }
});

module.exports = router;
