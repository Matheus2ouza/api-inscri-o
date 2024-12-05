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

        // Segunda consulta: Dados de qtd_masculino e qtd_feminino por localidade
        const query2 = `
            SELECT 
                inscricao_geral.localidade_id,
                inscricao_geral.nome_responsavel,
                inscricao_0_6.qtd_masculino AS qtd_0_6_masculino,
                inscricao_0_6.qtd_feminino AS qtd_0_6_feminino,
                inscricao_7_10.qtd_masculino AS qtd_7_10_masculino,
                inscricao_7_10.qtd_feminino AS qtd_7_10_feminino,
                inscricao_10_acima.qtd_masculino AS qtd_10_acima_masculino,
                inscricao_10_acima.qtd_feminino AS qtd_10_acima_feminino,
                inscricao_servico.qtd_masculino AS qtd_servico_masculino,
                inscricao_servico.qtd_feminino AS qtd_servico_feminino,
                inscricao_tx_participacao.qtd_masculino AS qtd_tx_participacao_masculino,
                inscricao_tx_participacao.qtd_feminino AS qtd_tx_participacao_feminino
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
        `;
        const { rows: qtdGerais } = await pool.query(query2);

        // Processando os resultados
        const processedPagamentos = pagamentos.map(pagamento => {
            const localidadeId = pagamento.localidade_id;

            // Encontrar o item correspondente na consulta `qtdGerais` baseado no `localidade_id`
            const qtdGeralData = qtdGerais.find(item => item.localidade_id === localidadeId) || {};

            // Processa a imagem no formato hexadecimal (\x...)
            let comprovanteImagemBase64 = null;
            if (pagamento.comprovante_imagem) {
                const hexData = pagamento.comprovante_imagem.slice(2); // Remove o prefixo \x
                const buffer = Buffer.from(hexData, 'hex'); // Converte de hex para Buffer
                comprovanteImagemBase64 = buffer.toString('base64'); // Converte para Base64
            }

            return {
                ...pagamento,
                qtd_geral: qtdGeralData.qtd_geral || 0,
                comprovante_imagem: comprovanteImagemBase64 ? `data:image/jpeg;base64,${comprovanteImagemBase64}` : null,
                // Passando os dados de masculino e feminino de cada categoria/serviço
                qtd_0_6_masculino: qtdGeralData.qtd_0_6_masculino || 0,
                qtd_0_6_feminino: qtdGeralData.qtd_0_6_feminino || 0,
                qtd_7_10_masculino: qtdGeralData.qtd_7_10_masculino || 0,
                qtd_7_10_feminino: qtdGeralData.qtd_7_10_feminino || 0,
                qtd_10_acima_masculino: qtdGeralData.qtd_10_acima_masculino || 0,
                qtd_10_acima_feminino: qtdGeralData.qtd_10_acima_feminino || 0,
                qtd_servico_masculino: qtdGeralData.qtd_servico_masculino || 0,
                qtd_servico_feminino: qtdGeralData.qtd_servico_feminino || 0,
                qtd_tx_participacao_masculino: qtdGeralData.qtd_tx_participacao_masculino || 0,
                qtd_tx_participacao_feminino: qtdGeralData.qtd_tx_participacao_feminino || 0,
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