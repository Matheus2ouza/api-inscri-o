const express = require('express');
const router = express.Router();
const { pool } = require('../db/dbConnection');

router.get('/event', async(req, res) =>{
    try {
        const event = await pool.query(`SELECT * FROM eventos`);
        const result = event.rows;
        
        if (result.length === 0) {
            console.log(`Nenhum evento encontrado`);
            res.status(404).json({message: `Nenhum evento encontrado`});
        } else {
            console.log(`Consulta feita com sucesso: ${result.length}`);
            res.status(201).json(result)
        };

    } catch (err) {
        console.error(`Erro ao obter dados do dos eventos: ${err}`);
        return res.status(500).json({ error: 'Erro ao obter dados dos eventos.' });
    }
});

// Rota para obter dados do dashboard
router.post('/datageneralData', async (req, res) => {

    const { eventoId } = req.body
    console.log(`eventoId selecionado: ${eventoId}`);

    try {
        // Dados da localidades
        const localidades = await pool.query('SELECT id, nome, saldo_devedor FROM public.localidades');

        const eventGeral = await pool.query('SELECT * FROM eventos')

        //Dados da inscrição Geral
        const inscricaoGeral = await pool.query(`SELECT ig.id, ig.nome_responsavel, ig.qtd_geral, l.nome AS localidade
                                                FROM public.inscricao_geral ig LEFT JOIN public.localidades l 
                                                ON ig.localidade_id = l.id WHERE ig.evento_id = $1;
        `, [eventoId]);
        const resultInscricaoGeral = inscricaoGeral.rows
        if (resultInscricaoGeral.length === 0) {
            console.warn(`Dados da inscrição não encontrados ${resultInscricaoGeral.length}`);
        } else {
            console.info(`Dados de Incrição Geral recebidos: ${resultInscricaoGeral.length}`);
        };

        const inscricoesGeralIds = inscricaoGeral.map(row => row.id);

        // Consulta da faixa 0_6 considerando apenas os IDs obtidos
        const inscricoes0_6 = await pool.query(`SELECT lc.nome, SUM(insc.qtd_masculino) AS qtd_masculino, SUM(insc.qtd_feminino) AS qtd_feminino  
                                                FROM public.inscricao_0_6 AS insc INNER JOIN public.inscricao_geral AS ig ON insc.inscricao_geral_id = ig.id
                                                INNER JOIN public.localidades AS lc ON ig.localidade_id = lc.id WHERE insc.inscricao_geral_id = ANY($1)
                                                GROUP BY lc.nome
        `, [inscricoesGeralIds]);
    
        const resultinscricoes0_6 = inscricoes0_6.rows;
        if (resultinscricoes0_6.length === 0) {
            console.warn(`Dados da Inscrição 0_6 não encontrados: ${resultinscricoes0_6.length}`);
        } else {
            console.info(`Dados da Inscrição 0_6 encontrados: ${resultinscricoes0_6.length}`);
        }
    
        // Consulta da faixa 7_10 considerando os IDs filtrados
        const inscricoes7_10 = await pool.query(`SELECT lc.nome, SUM(insc.qtd_masculino) AS qtd_masculino, SUM(insc.qtd_feminino) AS qtd_feminino  
                                                FROM public.inscricao_7_10 AS insc INNER JOIN public.inscricao_geral AS ig ON insc.inscricao_geral_id = ig.id
                                                INNER JOIN public.localidades AS lc ON ig.localidade_id = lc.id WHERE insc.inscricao_geral_id = ANY($1)
                                                GROUP BY lc.nome
        `, [inscricoesGeralIds]);

        const resultinscricoes7_10 = inscricoes7_10.rows;
        if (resultinscricoes7_10.length === 0) {
            console.warn(`Dados da Inscrição 7_10 não encontrados: ${resultinscricoes7_10.length}`);
        } else {
            console.info(`Dados da Inscrição 7_10 encontrados: ${resultinscricoes7_10.length}`);
        }
    
        // Consulta da faixa 10_acima considerando os IDs filtrados
        const inscricoes10_acima = await pool.query(`SELECT lc.nome, SUM(insc.qtd_masculino) AS qtd_masculino, SUM(insc.qtd_feminino) AS qtd_feminino  
                                                    FROM public.inscricao_10_acima AS insc INNER JOIN public.inscricao_geral AS ig ON insc.inscricao_geral_id = ig.id
                                                    INNER JOIN public.localidades AS lc ON ig.localidade_id = lc.id WHERE insc.inscricao_geral_id = ANY($1)
                                                GROUP BY lc.nome
        `, [inscricoesGeralIds]);

        const resultinscricoes10_acima = inscricoes10_acima.rows;
        if (resultinscricoes10_acima.length === 0) {
            console.warn(`Dados da Inscrição 10_acima não encontrados: ${resultinscricoes10_acima.length}`);
        } else {
            console.info(`Dados da Inscrição 10_acima encontrados: ${resultinscricoes10_acima.length}`);
        }

        const inscricao_servico = await pool.query(`SELECT lc.nome, SUM(insc.qtd_masculino) AS qtd_masculino, SUM(insc.qtd_feminino) AS qtd_feminino  
                                                    FROM public.inscricao_servico AS insc INNER JOIN inscricao_geral AS ig ON insc.inscricao_geral_id = ig.id
                                                    INNER JOIN localidades AS lc ON ig.localidade_id = lc.id
                                                    WHERE insc.inscricao_geral_id = ANY($1)
                                                    GROUP BY lc.nome
        `, [inscricoesGeralIds]);

        const resultInscricao_servico = inscricao_servico.rows

        if (resultInscricao_servico.length === 0) {
            console.warn(`Dados da inscricao de serviço encontrados: ${resultInscricao_servico.length}`)
        } else {
            console.info(`Dados da inscricao de servico encontrados: ${resultInscricao_servico.length}`)
        };

        const inscricao_tx_participacao = await pool.query(`SELECT lc.nome, SUM(insc.qtd_masculino) AS qtd_masculino, SUM(insc.qtd_feminino) AS qtd_feminino  
                                                            FROM public.inscricao_tx_participacao AS insc INNER JOIN inscricao_geral AS ig ON insc.inscricao_geral_id = ig.id
                                                            INNER JOIN localidades AS lc ON ig.localidade_id = lc.id WHERE insc.inscricao_geral_id = ANY($1)
                                                            GROUP BY lc.nome
        `, [inscricoesGeralIds]);

        const resultinscricao_tx_participacao = inscricao_tx_participacao.rows

        if (resultinscricao_tx_participacao.length === 0) {
            console.warn(`Dados da inscricao de serviço encontrados: ${resultinscricao_tx_participacao.length}`)
        } else {
            console.info(`Dados da inscricao de servico encontrados: ${resultinscricao_tx_participacao.length}`)
        };
        
        const movimentacaoFinanceira = await pool.query(`SELECT 
                                                        mf.id,
                                                        CONCAT('Pagamento referente à localidade: ', loc.nome) AS descricao,
                                                        mf.valor
                                                    FROM 
                                                        public.movimentacao_financeira mf
                                                    LEFT JOIN 
                                                        public.localidades loc 
                                                        ON CAST(SUBSTRING(mf.descricao FROM 'ID: ([0-9]+)') AS INT) = loc.id;
        `);

        const hospedagem = await pool.query(`SELECT 
                                                h.id, 
                                                h.nome AS hospedagem, 
                                                l.nome AS localidade
                                            FROM 
                                                public.hospedagem h
                                            INNER JOIN 
                                                public.inscricao_geral ig ON h.id_inscricao = ig.id
                                            INNER JOIN 
                                                public.localidades l ON ig.localidade_id = l.id
                                            WHERE 
                                                h.id_inscricao = ANY($1);
        `, [inscricoesGeralIds]);

        const resultHospedagem = hospedagem.rows;

        if(resultHospedagem.length === 0 ) {
        console.warn(`Dados da hospedagem não encontradas: ${resultHospedagem.length}`);
        } else {
        console.log(`Dados da hospedagem encontrados: ${resultHospedagem.length}`)
        };

        const tipoInscricao = await pool.query('SELECT id, descricao, valor FROM public.tipo_inscricao');

        // Monta o objeto de resposta para cada tabela
        const response = {
            localidades: {
                success: true,
                data: localidades.rows,
                message: 'Dados das localidades obtidos com sucesso.'
            },eventos: {
                success: true,
                data: eventGeral.rows,
                message: 'Dados dos eventos obtidos com sucesso.'
            },
            hospedagem: {
                success: true,
                data: hospedagem.rows,
                message: 'Dados de hospedagem obtidos com sucesso.'
            },
            inscricoes0_6: {
                success: true,
                data: inscricoes0_6.rows,
                message: 'Dados de inscrições 0 a 6 anos obtidos com sucesso.'
            },
            inscricoes7_10: {
                success: true,
                data: inscricoes7_10.rows,
                message: 'Dados de inscrições 7 a 10 anos obtidos com sucesso.'
            },
            inscricoes10_acima: {
                success: true,
                data: inscricoes10_acima.rows,
                message: 'Dados de inscrições 10 anos ou mais obtidos com sucesso.'
            },
            inscricao_servico: {
                success: true,
                data: inscricao_servico.rows,
                message: 'Dados de inscrições serviço obtidos com sucesso.'
            },
            inscricao_tx_participacao: {
                success: true,
                data: inscricao_tx_participacao.rows,
                message: 'Dados de inscrições taxa de participação obtidos com sucesso.'
            },
            inscricaoGeral: {
                success: true,
                data: inscricaoGeral.rows,
                message: 'Dados das inscrições gerais obtidos com sucesso.'
            },
            movimentacaoFinanceira: {
                success: true,
                data: movimentacaoFinanceira.rows,
                message: 'Dados da movimentação financeira obtidos com sucesso.'
            },
            tipoInscricao: {
                success: true,
                data: tipoInscricao.rows,
                message: 'Dados dos tipos de inscrição obtidos com sucesso.'
            }
        };

        console.info('Dados do dashboard retornados com sucesso.');
        return res.status(200).json(response);
    } catch (err) {
        console.error(`Erro ao obter dados do dashboard: ${err}`);
        return res.status(500).json({ error: 'Erro ao obter dados do dashboard.' });
    }
});

module.exports = router;
