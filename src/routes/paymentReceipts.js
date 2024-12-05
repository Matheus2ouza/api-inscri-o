const express = require('express');
const router = express.Router();
const { pool } = require('../db/dbConnection'); // Importando o pool de conexão com o banco de dados
const imageType = require('image-type'); // Importando a biblioteca image-type
const { spawn } = require('child_process'); // Para rodar o script Python
const JSON = require('json'); // Biblioteca para trabalhar com JSON

// Função para verificar o tipo de arquivo e adicionar o prefixo adequado
async function addBase64Prefix(buffer) {
    // Tentando detectar o tipo da imagem usando image-type
    const image = imageType(buffer);

    if (image) {
        // Se for uma imagem, adicionamos o prefixo de imagem adequado
        switch (image.mime) {
            case 'image/jpeg':
                return `data:image/jpeg;base64,${buffer.toString('base64')}`;
            case 'image/png':
                return `data:image/png;base64,${buffer.toString('base64')}`;
            case 'image/webp':
                return `data:image/webp;base64,${buffer.toString('base64')}`;
            default:
                throw new Error('Tipo de imagem não suportado');
        }
    } else {
        // Se não for uma imagem, verificamos se é um PDF
        const pdfMagicBytes = buffer.toString('hex', 0, 4); // Verifica os primeiros 4 bytes para PDF
        if (pdfMagicBytes === '25504446') {
            // Se for PDF, adicionamos o prefixo de PDF
            return `data:application/pdf;base64,${buffer.toString('base64')}`;
        } else {
            throw new Error('Tipo de arquivo não suportado');
        }
    }
}

// Rota GET para obter os dados processados
router.get('/', async (req, res) => {
    try {
        // Primeira consulta: Dados de pagamento
        const query1 = `SELECT pagamento.id, pagamento.valor_pago, pagamento.comprovante_imagem, pagamento.localidade_id, localidades.nome AS localidade_nome
                        FROM pagamento
                        JOIN localidades ON pagamento.localidade_id = localidades.id
                        WHERE comprovante_imagem IS NOT NULL;`;
        const { rows: pagamentos } = await pool.query(query1);

        // Segunda consulta: Dados de qtd_masculino e qtd_feminino por localidade
        const query2 = `SELECT inscricao_geral.localidade_id, inscricao_geral.nome_responsavel,
                        inscricao_0_6.qtd_masculino AS qtd_0_6_masculino, inscricao_0_6.qtd_feminino AS qtd_0_6_feminino,
                        inscricao_7_10.qtd_masculino AS qtd_7_10_masculino, inscricao_7_10.qtd_feminino AS qtd_7_10_feminino,
                        inscricao_10_acima.qtd_masculino AS qtd_10_acima_masculino, inscricao_10_acima.qtd_feminino AS qtd_10_acima_feminino,
                        inscricao_servico.qtd_masculino AS qtd_servico_masculino, inscricao_servico.qtd_feminino AS qtd_servico_feminino,
                        inscricao_tx_participacao.qtd_masculino AS qtd_tx_participacao_masculino, inscricao_tx_participacao.qtd_feminino AS qtd_tx_participacao_feminino
                        FROM inscricao_geral
                        LEFT JOIN inscricao_0_6 ON inscricao_geral.id = inscricao_0_6.inscricao_geral_id
                        LEFT JOIN inscricao_7_10 ON inscricao_geral.id = inscricao_7_10.inscricao_geral_id
                        LEFT JOIN inscricao_10_acima ON inscricao_geral.id = inscricao_10_acima.inscricao_geral_id
                        LEFT JOIN inscricao_servico ON inscricao_geral.id = inscricao_servico.inscricao_geral_id
                        LEFT JOIN inscricao_tx_participacao ON inscricao_geral.id = inscricao_tx_participacao.inscricao_geral_id`;
        const { rows: qtdGerais } = await pool.query(query2);

        // Preparando os dados a serem enviados para o Python
        const dadosParaPython = pagamentos.map((pagamento) => {
            const localidadeId = pagamento.localidade_id;
            const qtdGeralData = qtdGerais.find(item => item.localidade_id === localidadeId) || {};

            let comprovanteImagemBase64 = null;
            if (pagamento.comprovante_imagem) {
                let hexData = pagamento.comprovante_imagem;
                
                // Verifica se hexData começa com '\x' e remove esse prefixo
                if (typeof hexData === 'string' && hexData.startsWith('\\x')) {
                    hexData = hexData.slice(2); // Remove o prefixo '\x'
                }

                // Converte o valor hexadecimal para Buffer
                const buffer = Buffer.from(hexData, 'hex');
                
                // Adiciona o prefixo adequado com base no tipo do arquivo
                comprovanteImagemBase64 = addBase64Prefix(buffer); 
            }

            return {
                id: pagamento.id,
                valor_pago: pagamento.valor_pago,
                comprovante_imagem: comprovanteImagemBase64,
                localidade_nome: pagamento.localidade_nome,
                qtd_geral: qtdGeralData.qtd_geral || 0,  // Mantém a quantidade geral
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

        // Iniciando o processo Python para processar os dados
        const pythonProcess = spawn('python3', ['script.py']); // Assumindo que o script Python está em "script.py"

        // Enviar os dados para o Python
        pythonProcess.stdin.write(JSON.stringify(dadosParaPython));
        pythonProcess.stdin.end();

        // Receber a saída do Python
        pythonProcess.stdout.on('data', (data) => {
            const result = JSON.parse(data.toString());
            res.status(200).json({
                pagamentos: result,
                qtdGerais: qtdGerais
            });
        });

        // Capturar erro
        pythonProcess.stderr.on('data', (data) => {
            console.error('Erro:', data.toString());
            res.status(500).json({ message: 'Erro interno do servidor' });
        });

    } catch (err) {
        console.error(`Erro ao buscar os dados: ${err}`);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});

module.exports = router;
