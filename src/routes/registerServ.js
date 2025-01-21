const express = require("express");
const { body, validationResult } = require("express-validator");
const { pool } = require("../db/dbConnection");

const registerServico = [
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            console.error("validation errors:", errors.array());
            return res.status(400).json({ errors: errors.array() });
        }

        const { localidade, nomeResponsavel, totalInscritos, inscritos } = req.body;

        try {
            const cityExist = await pool.query(
                `SELECT * FROM localidades WHERE nome = $1`,
                [localidade]
            );

            const city = cityExist.rows[0];

            if (!city) {
                console.warn(`Localidade não encontrada: ${localidade}`);
                return res.status(401).json({ message: `Localidade inválida` });
            }

            // Cria a inscrição geral
            const enrollment = await pool.query(
                "INSERT INTO inscricao_geral (localidade_id, nome_responsavel, qtd_geral, evento_id) VALUES ($1, $2, $3, $4) RETURNING id",
                [city.id, nomeResponsavel, totalInscritos, 2]
            );
            const enrollmentId = enrollment.rows[0].id;
            console.info(
                `Inscrição geral criada com ID: ${enrollmentId} para a localidade: ${localidade}`
            );

            // Verifica se os dados dos inscritos estão presentes
            if (!inscritos || !inscritos.masculino || !inscritos.feminino) {
                console.error("Dados de inscritos faltando.");
                return res.status(400).json({ message: "Dados de inscritos faltando" });
            }

            // Desestruturação de dados de inscritos
            const { masculino: masculine, feminino: feminine } = inscritos;

            const totalSubscribers = Number(feminine) + Number(masculine);

            // Obtém os tipos de inscrição
            const tipoInscricaoIds = [8]; // IDs que você precisa buscar
            const tiposInscricaoResult = await pool.query(
                "SELECT id, valor FROM tipo_inscricao WHERE id = ANY($1)",
                [tipoInscricaoIds]
            );

            // Cria um objeto para armazenar os valores
            const tiposInscricaoMap = {};
            tiposInscricaoResult.rows.forEach((tipo) => {
                tiposInscricaoMap[tipo.id] = tipo.valor;
            });

            console.log('Tipos de Inscrição:', tiposInscricaoMap);

            let totalGeral = 0;

            if (totalSubscribers > 0) {
                const subscribers = await pool.query(
                    "INSERT INTO inscricao_10_acima(inscricao_geral_id, tipo_inscricao_id, qtd_masculino, qtd_feminino) VALUES ($1, $2, $3, $4) RETURNING tipo_inscricao_id",
                    [enrollmentId, 8, masculine, feminine]
                );

                if (subscribers.rowsCount === 0) {
                    console.error(`Falha ao inserir dados na tabela Inscricao_10_acima para Id de inscrição = ${enrollmentId}`);
                    return res.status(500).json({ error: "Falha ao processar a inscrição para a faixa etária 10+." });
                }

                const tipoInscricaoId = subscribers.rows[0].tipo_inscricao_id;
                const valorTipoInscricao = tiposInscricaoMap[tipoInscricaoId];

                // Calcula o total geral
                const totalAge = totalSubscribers;
                totalGeral = totalAge * valorTipoInscricao;

                console.info(`Total para faixa etária 10+: ${totalAge} (quantidade: ${totalSubscribers}, valor: ${valorTipoInscricao})`);
                console.info(`Sucesso ao inserir na tabela inscricao_10_acima: tipo_inscricao_id = ${tipoInscricaoId}, valor = ${valorTipoInscricao} para ID de inscrição: ${enrollmentId}`);

                // Atualiza saldo devedor
                const saldoDevedor = await pool.query(
                    'UPDATE localidades SET saldo_devedor = saldo_devedor + $1 WHERE nome = $2',
                    [totalGeral, localidade]
                );

                if (saldoDevedor.rowCount === 0) {
                    console.error(`Falha ao tentar atualizar o saldo devedor da localidade: ${localidade}`);
                    return res.status(500).json({ error: `Falha ao tentar atualizar o saldo devedor da localidade: ${localidade}` });
                }

                    // Mensagem do e-mail com as informações de inscrição
                    const emailMessage = `Nova inscrição realizada com sucesso!\n\nDetalhes:\nLocalidade: ${localidade}\nResponsável: ${nomeResponsavel}\nTotal Inscritos: ${totalInscritos}\nFaixa etária 0-6: ${inscritos["0-6"].masculino + inscritos["0-6"].feminino}\nFaixa etária 7-10: ${inscritos["7-10"].masculino + inscritos["7-10"].feminino}\nFaixa etária 10+: ${inscritos["10+"].masculino + inscritos["10+"].feminino}`;

                    // Adicionando logs detalhados
                    console.info("Enviando notificação por e-mail...");
                    console.info("Corpo da mensagem do e-mail: ", emailMessage);

                    // Envia a notificação por e-mail
                    await sendNotification(emailMessage);

                    // Log após o envio da notificação
                    console.info("Notificação enviada com sucesso!");

                // Se todas as inserções forem bem-sucedidas, envia uma resposta de sucesso
                return res.status(201).json({
                    message: "Inscrição realizada com sucesso",
                    totalGeral,
                    enrollmentId,
                });
            }
        } catch (err) {
            console.error(`Erro ao processar a inscrição: ${err.message}`);
            return res.status(500).json({ error: "Erro ao processar a inscrição." });
        }
    }
];

module.exports = registerServico;
