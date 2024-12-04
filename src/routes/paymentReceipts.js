const express = require('express');
const router = express.Router();
const { pool } = require('../db/dbConnection');
const fs = require('fs');
const path = require('path');

// Função para salvar o arquivo e retornar a URL
const salvarComprovante = (comprovanteImagemBuffer, idImagem, tipoArquivo) => {
    const pastaComprovantes = path.join(__dirname, '..', 'uploads', 'comprovantes');
    if (!fs.existsSync(pastaComprovantes)) {
        fs.mkdirSync(pastaComprovantes, { recursive: true });
    }

    const nomeArquivo = `comprovante_${idImagem}.${tipoArquivo}`;
    const caminhoArquivo = path.join(pastaComprovantes, nomeArquivo);
    fs.writeFileSync(caminhoArquivo, comprovanteImagemBuffer);

    return `/uploads/comprovantes/${nomeArquivo}`;
};

router.get('/', async (req, res) => {
    try {
        // Primeira consulta: Dados de pagamento
        const query1 = `
            SELECT 
                pagamento.id,
                pagamento.valor_pago,
                pagamento.comprovante_imagem,
                localidades.nome AS localidade_nome
            FROM 
                pagamento
            JOIN 
                localidades ON pagamento.localidade_id = localidades.id
            WHERE 
                comprovante_imagem IS NOT NULL;
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

            // Processa o comprovante de imagem e retorna a URL do arquivo
            let comprovanteImagemUrl = null;
            if (pagamento.comprovante_imagem) {
                const hexData = pagamento.comprovante_imagem.slice(2); // Remove o prefixo \x
                const buffer = Buffer.from(hexData, 'hex'); // Converte de hex para Buffer
                // Salvar o arquivo e obter a URL
                comprovanteImagemUrl = salvarComprovante(buffer, pagamento.id, 'jpg'); // Aqui, você pode verificar o tipo de arquivo para definir 'jpg', 'pdf', etc.
            }

            return {
                ...pagamento,
                qtd_geral: qtdGeralData.qtd_geral || 0,
                comprovante_imagem: comprovanteImagemUrl, // URL do arquivo salvo
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

module.exports = router;
