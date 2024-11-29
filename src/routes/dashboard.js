const express = require('express');
const router = express.Router();
const { pool } = require('../db/dbConnection');

// Rota para obter dados do dashboard
router.get('/', async (req, res) => {
    try {
        // Consulta dados das diferentes tabelas
        const localidades = await pool.query('SELECT id, nome, saldo_devedor FROM public.localidades');
        const eventos = await pool.query('SELECT id, descricao, data_limite FROM public.eventos');
        const hospedagem = await pool.query(`
            SELECT h.id, h.nome, ig.nome_responsavel, l.nome AS localidade
            FROM public.hospedagem h
            JOIN public.inscricao_geral ig ON h.id_inscricao = ig.id
            JOIN public.localidades l ON ig.localidade_id = l.id
        `);
        const inscricoes0_6 = await pool.query(`SELECT lc.nome, sum(insc.qtd_masculino) as qtd_masculino, sum(insc.qtd_feminino) as qtd_feminino  FROM public.inscricao_0_6 as insc
                                                inner join inscricao_geral as ig on insc.inscricao_geral_id = ig.id
                                                inner join localidades as lc on ig.localidade_id = lc.id
                                                GROUP BY lc.nome`);
        const inscricoes7_10 = await pool.query(
            `SELECT lc.nome, sum(insc.qtd_masculino) as qtd_masculino, sum(insc.qtd_feminino) as qtd_feminino  FROM public.inscricao_7_10 as insc
                                                inner join inscricao_geral as ig on insc.inscricao_geral_id = ig.id
                                                inner join localidades as lc on ig.localidade_id = lc.id
                                                GROUP BY lc.nome`
        );
        const inscricoes10_acima = await pool.query(
            `SELECT lc.nome, sum(insc.qtd_masculino) as qtd_masculino, sum(insc.qtd_feminino) as qtd_feminino  FROM public.inscricao_10_acima as insc
                                                inner join inscricao_geral as ig on insc.inscricao_geral_id = ig.id
                                                inner join localidades as lc on ig.localidade_id = lc.id
                                                GROUP BY lc.nome`
        );
        const inscricaoGeral = await pool.query(`
                                                SELECT ig.id, ig.nome_responsavel, ig.qtd_geral, l.nome AS localidade
                                                FROM public.inscricao_geral ig
                                                LEFT JOIN public.localidades l ON ig.localidade_id = l.id
        `);
        const inscricao_servico = await pool.query(
            `SELECT lc.nome, sum(insc.qtd_masculino) as qtd_masculino, sum(insc.qtd_feminino) as qtd_feminino  FROM public.inscricao_servico as insc
                                                inner join inscricao_geral as ig on insc.inscricao_geral_id = ig.id
                                                inner join localidades as lc on ig.localidade_id = lc.id
                                                GROUP BY lc.nome`
        );
        const inscricao_tx_participacao = await pool.query(
            `SELECT lc.nome, sum(insc.qtd_masculino) as qtd_masculino, sum(insc.qtd_feminino) as qtd_feminino  FROM public.inscricao_tx_participacao as insc
                                                inner join inscricao_geral as ig on insc.inscricao_geral_id = ig.id
                                                inner join localidades as lc on ig.localidade_id = lc.id
                                                GROUP BY lc.nome`
        );
        const movimentacaoFinanceira = await pool.query('SELECT id, descricao, valor FROM public.movimentacao_financeira');
        const pagamento = await pool.query(`
            SELECT p.id, p.valor_pago, l.nome AS localidade
            FROM public.pagamento p
            LEFT JOIN public.localidades l ON p.localidade_id = l.id
        `);
        const tipoInscricao = await pool.query('SELECT id, descricao, valor FROM public.tipo_inscricao');

        // Monta o objeto de resposta para cada tabela
        const response = {
            localidades: {
                success: true,
                data: localidades.rows,
                message: 'Dados das localidades obtidos com sucesso.'
            },eventos: {
                success: true,
                data: eventos.rows,
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
            pagamento: {
                success: true,
                data: pagamento.rows,
                message: 'Dados de pagamentos obtidos com sucesso.'
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
