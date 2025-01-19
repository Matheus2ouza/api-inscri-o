const express = require('express');
const router = express.Router();
const { pool } = require('../db/dbConnection');

// Rota para recuperar todos os comprovantes de pagamento com a imagem
router.get('/', async (req, res) => {
    try {
        // Consulta o banco de dados para obter todos os comprovantes
        const result = await pool.query(`SELECT 
            c.*,
            l.nome AS localidade_nome
        FROM 
            comprovantes c
        JOIN 
            localidades l
        ON 
            c.localidade_id = l.id;
    `);

        // Verifica se há comprovantes encontrados
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Nenhum comprovante encontrado.' });
        }

        // Para cada comprovante, configurar o tipo de arquivo e retornar os dados
        const comprovantes = result.rows.map(comprovante => {
            const { id, localidade_id, tipo_arquivo, valor_pago, comprovante_imagem } = comprovante;
            
            // Converte a imagem em base64 (somente se for uma imagem)
            const imagem_base64 = tipo_arquivo && tipo_arquivo.startsWith('image') 
                ? `data:${tipo_arquivo};base64,${comprovante_imagem.toString('base64')}`
                : null;

            return {
                id,
                localidade_id,
                tipo_arquivo,
                valor_pago,
                imagem_base64,
                localidade_nome
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
