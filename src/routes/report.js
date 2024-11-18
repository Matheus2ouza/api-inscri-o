const express = require('express');
const router = express.Router();
const { pool } = require('../db/dbConnection');


// Rota para obter o relatório
router.get('/:localidadeId?', async (req, res) => {
    const { localidadeId } = req.params;

    try {
        // Consulta base
        let query = `
            SELECT 
                    lc.id AS "Localidade ID",
                    lc.nome AS "Localidade Nome",
                    COALESCE(SUM(ic.qtd_masculino), 0) AS "Total Masculino 0-6",
                    COALESCE(SUM(ic.qtd_feminino), 0) AS "Total Feminino 0-6",
                    COALESCE(SUM((ic.qtd_masculino + ic.qtd_feminino) * 0.00), 0) AS "Valor Total 0-6",
                    COALESCE(SUM(ia.qtd_masculino), 0) AS "Total Masculino 7-10",
                    COALESCE(SUM(ia.qtd_feminino), 0) AS "Total Feminino 7-10",
                    COALESCE(SUM((ia.qtd_masculino + ia.qtd_feminino) * 120.00), 0) AS "Valor Total 7-10",
                    COALESCE(SUM(ino.qtd_masculino), 0) AS "Total Masculino Normal",
                    COALESCE(SUM(ino.qtd_feminino), 0) AS "Total Feminino Normal",
                    COALESCE(SUM((ino.qtd_masculino + ino.qtd_feminino) * 200.00), 0) AS "Valor Total Normal",
                    COALESCE(SUM(ise.qtd_masculino), 0) AS "Total Masculino Serviço",
                    COALESCE(SUM(ise.qtd_feminino), 0) AS "Total Feminino Serviço",
                    COALESCE(SUM((ise.qtd_masculino + ise.qtd_feminino) * 100.00), 0) AS "Valor Total Serviço",
                    COALESCE(SUM(itx.qtd_masculino), 0) AS "Total Masculino Participação",
                    COALESCE(SUM(itx.qtd_feminino), 0) AS "Total Feminino Participação",
                    COALESCE(SUM((itx.qtd_masculino + itx.qtd_feminino) * 100.00), 0) AS "Valor Total Participação",
                    COALESCE(SUM((ic.qtd_masculino + ic.qtd_feminino) * 0.00 
                        + (ia.qtd_masculino + ia.qtd_feminino) * 120.00 
                        + (ino.qtd_masculino + ino.qtd_feminino) * 200.00 
                        + (ise.qtd_masculino + ise.qtd_feminino) * 100.00 
                        + (itx.qtd_masculino + itx.qtd_feminino) * 100.00), 0) AS "Valor Total Geral"
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
