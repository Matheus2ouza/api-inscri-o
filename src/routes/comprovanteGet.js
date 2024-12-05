const express = require('express');
const router = express.Router();
const { pool } = require('../db/dbConnection');

// Rota para obter todos os comprovantes de pagamento com base64 para imagens
router.get('/', async (req, res) => {
    try {
        // Consulta para pegar todos os dados dos comprovantes
        const result = await pool.query('SELECT id, tipo_arquivo, comprovante_imagem FROM comprovantes');

        if (result.rows.length === 0) {
            console.warn('Nenhum comprovante encontrado.');
            return res.status(404).json({ message: 'Nenhum comprovante encontrado.' });
        }

        // Mapeia os comprovantes para retornar as imagens em base64
        const comprovantes = result.rows.map((comprovante) => {
            const { id, tipo_arquivo, comprovante_imagem } = comprovante;

            // Se for uma imagem, converte para base64
            let base64Image = null;
            if (tipo_arquivo.startsWith('image')) {
                base64Image = `data:${tipo_arquivo};base64,${comprovante_imagem.toString('base64')}`;
            }

            return {
                id,
                tipo_arquivo,
                base64Image,
            };
        });

        // Envia os comprovantes com as imagens em base64
        return res.status(200).json({ comprovantes });

    } catch (err) {
        console.error(`Erro ao recuperar comprovantes: ${err}`);
        return res.status(500).json({ error: 'Erro ao recuperar comprovantes.' });
    }
});

module.exports = router;
