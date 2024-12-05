const express = require('express');
const router = express.Router();
const { pool } = require('../db/dbConnection');

// Rota para obter todos os comprovantes de pagamento com base64 para imagens e PDFs
router.get('/', async (req, res) => {
    try {
        // Consulta para pegar todos os dados dos comprovantes
        const result = await pool.query(`SELECT 
                    c.id,
                    c.comprovante_imagem,
                    c.tipo_arquivo,
                    c.localidade_id,
                    p.valor_pago
                FROM 
                    comprovantes c
                JOIN 
                    pagamento p ON c.pagamento_id = p.id;
                `);

        if (result.rows.length === 0) {
            console.warn('Nenhum comprovante encontrado.');
            return res.status(404).json({ message: 'Nenhum comprovante encontrado.' });
        }

        // Mapeia os comprovantes para retornar as imagens em base64
        const comprovantes = result.rows.map((comprovante) => {
            const { id, tipo_arquivo, comprovante_imagem, localidade_id, valor_pago } = comprovante;

            let base64Data = null;

            // Se for uma imagem, converte para base64
            if (tipo_arquivo.startsWith('image')) {
                base64Data = `data:${tipo_arquivo};base64,${comprovante_imagem.toString('base64')}`;
            }
            // Se for um PDF, converte também para base64
            else if (tipo_arquivo === 'application/pdf') {
                base64Data = `data:${tipo_arquivo};base64,${comprovante_imagem.toString('base64')}`;
            }

            return {
                id,
                tipo_arquivo,
                base64Image: base64Data, // Retorna os dados base64
                localidade_id,
                valor_pago,
            };
        });

        // Envia os comprovantes com as imagens e PDFs em base64
        return res.status(200).json({ comprovantes });

    } catch (err) {
        console.error(`Erro ao recuperar comprovantes: ${err}`);
        return res.status(500).json({ error: 'Erro ao recuperar comprovantes.' });
    }
});

module.exports = router;
