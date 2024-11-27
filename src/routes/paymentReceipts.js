const express = require('express');
const router = express.Router(); // Certifique-se de definir o router aqui

const { pool } = require('../db/dbConnection'); // Importando o pool de conexão com o banco de dados

// A partir daqui, defina as rotas e use o router normalmente
router.get('/', async (req, res) => {
    try {
        const query = `
            SELECT 
                pagamento.id,
                pagamento.valor_pago,
                pagamento.comprovante_imagem,
                localidades.nome AS localidade_nome,
                SUM(inscricao_geral.qtd_geral) AS qtd_geral
            FROM 
                pagamento
            JOIN 
                localidades ON pagamento.localidade_id = localidades.id
            JOIN
                inscricao_geral ON localidades.id = inscricao_geral.localidade_id
                
            GROUP BY 
                pagamento.id, 
                pagamento.valor_pago, 
                pagamento.comprovante_imagem, 
                localidades.nome
                
            order by pagamento.id desc
        `;

        const { rows } = await pool.query(query);

        const processedRows = rows.map(row => ({
            ...row,
            comprovante_imagem: row.comprovante_imagem
                ? Buffer.from(row.comprovante_imagem).toString('base64')
                : null
        }));

        res.status(200).json(processedRows);
    } catch (err) {
        console.error(`Erro ao buscar os comprovantes: ${err}`);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});

// Exporta o router para ser usado em outro lugar
module.exports = router;
