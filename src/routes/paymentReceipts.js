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
        const { rows: pagamentos } = await pool.query(query1);

        // Segunda consulta: Obtendo a soma de qtd_geral por localidade
        const query2 = `
            SELECT 
                localidade_id,
                nome_responsavel,
                SUM(qtd_geral) AS qtd_geral
            FROM 
                inscricao_geral
            GROUP BY 
                localidade_id, nome_responsavel
        `;
    
        const { rows: qtdGerais } = await pool.query(query2);

        // Processando os resultados dos pagamentos
        const processedPagamentos = pagamentos.map(pagamento => {
            const localidadeId = pagamento.localidade_id;
            const qtdGeral = qtdGerais.find(item => item.localidade_id === localidadeId)?.qtd_geral || 0;

            // Verificando o campo comprovante_imagem e adicionando o prefixo 'data:image/' correspondente
            let comprovanteImagem = pagamento.comprovante_imagem || null;

            if (comprovanteImagem) {
                // Verifica se a imagem é base64 e começa com os prefixos para PNG ou JPEG
                if (comprovanteImagem.startsWith('iVBOR')) {
                    // PNG
                    comprovanteImagem = `data:image/png;base64,${comprovanteImagem}`;
                } else if (comprovanteImagem.startsWith('/9j')) {
                    // JPEG
                    comprovanteImagem = `data:image/jpeg;base64,${comprovanteImagem}`;
                } else {
                    // Tipo de imagem desconhecido
                    console.error('Tipo de imagem desconhecido');
                    comprovanteImagem = null;
                }
            }

            // Retornando o objeto com a imagem processada
            return {
                ...pagamento,
                qtd_geral: qtdGeral,
                comprovante_imagem: comprovanteImagem
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
