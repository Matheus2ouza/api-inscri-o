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
        
            let comprovanteImagem = pagamento.comprovante_imagem || null;
        
            if (comprovanteImagem) {
                // Verifica se comprovante_imagem é um Buffer
                if (Buffer.isBuffer(comprovanteImagem)) {
                    // Converte para base64
                    comprovanteImagem = comprovanteImagem.toString('base64');
                }
        
                // Agora, verifica se a string base64 começa com o prefixo da imagem e adiciona o tipo correto
                if (typeof comprovanteImagem === 'string') {
                    if (comprovanteImagem.startsWith('iVBOR')) {
                        // Imagem PNG
                        comprovanteImagem = `data:image/png;base64,${comprovanteImagem}`;
                    } else if (comprovanteImagem.startsWith('/9j')) {
                        // Imagem JPEG
                        comprovanteImagem = `data:image/jpeg;base64,${comprovanteImagem}`;
                    } else {
                        // Caso não seja PNG nem JPEG, loga o erro e retorna null
                        console.error('Tipo de imagem desconhecido');
                        comprovanteImagem = null;
                    }
                }
            }
        
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
