const express = require('express')
const router = express.Router();
const { pool } = require('../db/dbConnection')
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const basicDataController = require('../controllers/basicDataController')

router.get('/localidades', async (req, res) => {
    try {
        const locations = await prisma.localidades.findMany({
            where: {
                nome: {
                    notIn: ['ADMIN', 'CEAPE']
                }
            },
            orderBy: {
                id: 'asc' // <-- Ordena por ID de forma crescente
            }
        });

        if (locations.length === 0) {
            console.warn('Consulta de localidade feita, mas não teve nenhum resultado.');
            res.status(404).json({ message: 'Nenhuma localidade encontrada.' });
        } else {
            console.info('Consulta de localidade feita com sucesso.');
            res.status(200).json(locations);
        }
    } catch (err) {
        console.error(`Erro ao buscar localidades: ${err}`);
        res.status(500).json({ error: 'Erro ao buscar localidades.' });
    }
});

router.get('/eventos', basicDataController.events);

router.get('/eventData', async (req, res) => {
    try {
        const eventos = await prisma.eventos.findMany({
            include: {
                tipo_inscricao: {
                    select: {
                        descricao: true,
                        valor: true
                    }
                }
            },
            orderBy: {
                data_limite: 'asc'
            }
        });

        res.status(200).json(eventos);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erro ao buscar os eventos.' });
    }
});

router.get('/inscricaoData', async (req, res) => {
    try {
        const inscricaoData = await pool.query(`
        SELECT 
            l.nome AS localidade_nome,

            -- Inscrição Geral
            ig.id AS inscricao_geral_id,
            ig.nome_responsavel AS nome_responsavel,

            -- Quantidade total para faixa 0-6 anos
            COALESCE(i06.qtd_masculino, 0) + COALESCE(i06.qtd_feminino, 0) AS qtd_0_6,

            -- Quantidade total para faixa 7-10 anos
            COALESCE(i710.qtd_masculino, 0) + COALESCE(i710.qtd_feminino, 0) AS qtd_7_10,

            -- Quantidade total para faixa acima de 10 anos
            COALESCE(i10a.qtd_masculino, 0) + COALESCE(i10a.qtd_feminino, 0) AS qtd_10_acima,

            -- Taxa de Participação
            COALESCE(itp.qtd_masculino, 0) + COALESCE(itp.qtd_feminino, 0) AS qtd_tx_participacao,

            -- Quantidade total de serviços
            COALESCE(iser.qtd_masculino, 0) + COALESCE(iser.qtd_feminino, 0) AS qtd_servico

        FROM 
            inscricao_geral ig
        LEFT JOIN 
            localidades l ON ig.localidade_id = l.id
        LEFT JOIN 
            inscricao_0_6 i06 ON i06.inscricao_geral_id = ig.id
        LEFT JOIN 
            inscricao_7_10 i710 ON i710.inscricao_geral_id = ig.id
        LEFT JOIN 
            inscricao_10_acima i10a ON i10a.inscricao_geral_id = ig.id
        LEFT JOIN 
            inscricao_tx_participacao itp ON itp.inscricao_geral_id = ig.id
        LEFT JOIN 
            inscricao_servico iser ON iser.inscricao_geral_id = ig.id
        ORDER BY 
            l.nome, ig.id;
            `);

        const result = inscricaoData.rows

        if (result.length === 0) {
            console.warn('Nenhuma inscrição encontrada');
            res.status(401).json({ message: 'Nenhuma inscrição encontrada' });
        } else {
            console.warn('Busca de inscrições feita com sucesso...');
            res.status(201).json(result);
        }
    } catch (err) {
        console.error(`Erro ao buscar os inscrições: ${err}`);
        res.status(500).json({ error: `Erro na busca de inscrições ${err}` });
    }
})

router.get('/list-inscription', basicDataController.list)
module.exports = router;