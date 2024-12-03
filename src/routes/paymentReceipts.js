const express = require('express');
const router = express.Router();
const { pool } = require('../db/dbConnection'); // Importando o pool de conexão com o banco de dados

// Rota GET para obter os dados processados
router.get('/', async (req, res) => {
    try {
        // Primeira consulta: Dados de pagamento
        const query1 = `
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
            ORDER BY pagamento.id DESC
        `;
        const { rows: pagamentos } = await pool.query(query1);

        // Segunda consulta: Soma de `qtd_geral` por localidade
        const query2 = `
            SELECT 
                inscricao_geral.localidade_id,
                inscricao_geral.nome_responsavel,
                SUM(inscricao_geral.qtd_geral) AS qtd_geral,
                SUM(COALESCE(inscricao_0_6.qtd_masculino, 0)) AS qtd_0_6_masculino,
                SUM(COALESCE(inscricao_0_6.qtd_feminino, 0)) AS qtd_0_6_feminino,
                SUM(COALESCE(inscricao_7_10.qtd_masculino, 0)) AS qtd_7_10_masculino,
                SUM(COALESCE(inscricao_7_10.qtd_feminino, 0)) AS qtd_7_10_feminino,
                SUM(COALESCE(inscricao_10_acima.qtd_masculino, 0)) AS qtd_10_acima_masculino,
                SUM(COALESCE(inscricao_10_acima.qtd_feminino, 0)) AS qtd_10_acima_feminino,
                SUM(COALESCE(inscricao_servico.qtd_masculino, 0)) AS qtd_servico_masculino,
                SUM(COALESCE(inscricao_servico.qtd_feminino, 0)) AS qtd_servico_feminino,
                SUM(COALESCE(inscricao_tx_participacao.qtd_masculino, 0)) AS qtd_tx_participacao_masculino,
                SUM(COALESCE(inscricao_tx_participacao.qtd_feminino, 0)) AS qtd_tx_participacao_feminino
            FROM 
                inscricao_geral
            LEFT JOIN 
                inscricao_0_6 ON inscricao_geral.id = inscricao_0_6.inscricao_geral_id
            LEFT JOIN 
                inscricao_7_10 ON inscricao_geral.id = inscricao_7_10.inscricao_geral_id
            LEFT JOIN 
                inscricao_10_acima ON inscricao_geral.id = inscricao_10_acima.inscricao_geral_id
            LEFT JOIN 
                inscricao_servico ON inscricao_geral.id = inscricao_servico.inscricao_geral_id
            LEFT JOIN 
                inscricao_tx_participacao ON inscricao_geral.id = inscricao_tx_participacao.inscricao_geral_id
            GROUP BY 
                inscricao_geral.localidade_id, 
                inscricao_geral.nome_responsavel;
        `;
        const { rows: qtdGerais } = await pool.query(query2);

        // Processando os resultados
        const processedPagamentos = pagamentos.map(pagamento => {
            const localidadeId = pagamento.localidade_id;
            const qtdGeral = qtdGerais.find(item => item.localidade_id === localidadeId)?.qtd_geral || 0;

            // Processa a imagem no formato hexadecimal (\x...)
            let comprovanteImagemBase64 = null;
            if (pagamento.comprovante_imagem) {
                const hexData = pagamento.comprovante_imagem.slice(2); // Remove o prefixo \x
                const buffer = Buffer.from(hexData, 'hex'); // Converte de hex para Buffer
                comprovanteImagemBase64 = buffer.toString('base64'); // Converte para Base64
            }

            return {
                ...pagamento,
                qtd_geral: qtdGeral,
                comprovante_imagem: comprovanteImagemBase64 ? `data:image/jpeg;base64,${comprovanteImagemBase64}` : null // Adiciona o prefixo base64
            };
        });

        // Resposta da API
        res.status(200).json({
            pagamentos: processedPagamentos,
            qtdGerais: qtdGerais
        });

    } catch (err) {
        console.error(`Erro ao buscar os dados: ${err}`);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});

// Exporta o router para uso no server.js
module.exports = router;
