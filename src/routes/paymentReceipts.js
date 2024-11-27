const express = require('express');
const router = express.Router(); // Certifique-se de definir o router aqui

const { pool } = require('../db/dbConnection'); // Importando o pool de conexão com o banco de dados

// Definindo a rota GET para a API
router.get('/', async (req, res) => {
    try {
        // Primeira consulta: Obtendo dados de pagamento
        const query1 = `
            SELECT 
                pagamento.id,
                pagamento.valor_pago,
                pagamento.comprovante_imagem,
                localidades.id AS localidade_id,
                localidades.nome AS localidade_nome
            FROM 
                pagamento
            JOIN 
                localidades ON pagamento.localidade_id = localidades.id
            ORDER BY 
                pagamento.id DESC
        `;
        const { rows: pagamentos } = await pool.query(query1);

        // Segunda consulta: Obtendo a soma de qtd_geral por localidade
        const query2 = `
            SELECT 
                localidade_id,
                SUM(qtd_geral) AS qtd_geral
            FROM 
                inscricao_geral
            GROUP BY 
                localidade_id
        `;
        const { rows: qtdGerais } = await pool.query(query2);

        // Processando os resultados dos pagamentos
        const processedPagamentos = pagamentos.map(pagamento => {
            const localidadeId = pagamento.localidade_id;
            const qtdGeral = qtdGerais.find(item => item.localidade_id === localidadeId)?.qtd_geral || 0;
            return {
                ...pagamento,
                qtd_geral: qtdGeral,
                comprovante_imagem: pagamento.comprovante_imagem
                    ? Buffer.from(pagamento.comprovante_imagem).toString('base64')
                    : null
            };
        });

        // Retornando os resultados das duas consultas
        res.status(200).json({
            pagamentos: processedPagamentos,
            qtdGerais: qtdGerais
        });

    } catch (err) {
        // Retorna erro caso algo dê errado
        console.error(`Erro ao buscar os dados: ${err}`);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});

// Exporta o router para ser usado no server
module.exports = router;
