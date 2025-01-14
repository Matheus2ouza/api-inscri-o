const express = require('express');
const router = express.Router();
const { pool } = require('../db/dbConnection');

// Rota para recuperar todos os comprovantes de pagamento
router.get('/', async (req, res) => {
    try {
        // Consulta o banco de dados para obter todos os comprovantes
        const result = await pool.query('SELECT * FROM comprovantes');

        // Verifica se há comprovantes encontrados
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Nenhum comprovante encontrado.' });
        }

        // Para cada comprovante, configurar o tipo de arquivo
        const comprovantes = result.rows.map(comprovante => {
            const { id, localidade_id, tipo_arquivo, valor_pago } = comprovante;
            return {
                id,
                localidade_id,
                tipo_arquivo,
                valor_pago
            };
        });

        // Retorna todos os comprovantes encontrados
        return res.status(200).json({ comprovantes });
    } catch (err) {
        console.error(`Erro ao recuperar comprovantes de pagamento: ${err}`);
        return res.status(500).json({ error: 'Erro ao recuperar comprovantes de pagamento.' });
    }
});

module.exports = router;
