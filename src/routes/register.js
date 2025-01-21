const express = require("express");
const { body, validationResult } = require("express-validator");
const { pool } = require("../db/dbConnection");
const { sendNotification } = require("../routes/notification");

const register = [
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.error("Validation errors:", errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { localidade, nomeResponsavel, totalInscritos, inscritos, servico, participacao } = req.body;

    try {
      // Verifica se a localidade existe
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
        "INSERT INTO inscricao_geral (localidade_id, nome_responsavel, qtd_geral) VALUES ($1, $2, $3) RETURNING id",
        [city.id, nomeResponsavel, totalInscritos]
      );
      const enrollmentId = enrollment.rows[0].id;
      console.info(`Inscrição geral criada com ID: ${enrollmentId} para a localidade: ${localidade}`);

      // Dados dos inscritos por faixa etária
      const {
        "0-6": { masculino: age06masculine, feminino: age06feminine },
        "7-10": { masculino: age710masculine, feminino: age710feminine },
        "10+": { masculino: age10masculine, feminino: age10feminine },
      } = inscritos;

      const { masculino: servicemasculine, feminino: servicefeminine } = servico;
      const { masculino: participacaoMasculine, feminino: participacaoFeminine } = participacao;

      // Calcula os totais por faixa etária
      const age06Total = Number(age06feminine) + Number(age06masculine);
      const age710Total = Number(age710feminine) + Number(age710masculine);
      const age10Total = Number(age10feminine) + Number(age10masculine);
      const serviceTotal = Number(servicemasculine) + Number(servicefeminine);
      const participacaoTotal = Number(participacaoMasculine) + Number(participacaoFeminine);

      // Verifica a data limite do evento
      const deadline = await pool.query(`SELECT * FROM eventos WHERE id = 1`);
      const currentDate = new Date();
      const isAfterDeadline =
        currentDate > new Date(deadline.rows[0].data_limite);

      // Define o tipo de inscrição para 7-10 e 10+
      const tipoInscricao7a10 = isAfterDeadline ? 4 : 2;
      const tipoInscricao10acima = isAfterDeadline ? 4 : 1;

      if (isAfterDeadline) {
        console.warn(`Tentativa de inscrição da localidade ${localidade} após a data limite: ${currentDate}`);
      }

      // Obtém todos os tipos de inscrição necessários em uma única consulta
      const tipoInscricaoIds = [3, 5, tipoInscricao7a10, tipoInscricao10acima, 6]; // IDs que você precisa buscar
      const tiposInscricaoResult = await pool.query("SELECT id, valor FROM tipo_inscricao WHERE id = ANY($1::int[])", [tipoInscricaoIds]);

      // Cria um objeto para armazenar os valores
      const tiposInscricaoMap = {};
      tiposInscricaoResult.rows.forEach((tipo) => {
        tiposInscricaoMap[tipo.id] = tipo.valor;
      });

      console.log('Tipos de Inscrição:', tiposInscricaoMap);

      let totalGeral = 0;
      // Inserção para a faixa etária 0-6
      if (age06Total > 0) {
        const enrollmentAge06 = await pool.query(
          "INSERT INTO inscricao_0_6(inscricao_geral_id, tipo_inscricao_id, qtd_masculino, qtd_feminino) VALUES ($1, $2, $3, $4) RETURNING id",
          [enrollmentId, 5, age06masculine, age06feminine]
        );
        if (enrollmentAge06.rowCount === 0) {
          console.error(`Falha ao inserir dados na tabela inscricao_0_6 para ID de inscrição: ${enrollmentId}`);
          return res.status(500).json({ error: "Falha ao processar a inscrição para a faixa etária 0-6." });
        }
        const registrationId06 = enrollmentAge06.rows[0].id;
        console.info(`Sucesso ao inserir na tabela inscricao_0_6: tipo_inscricao_id = 5 para ID de inscrição: ${enrollmentId}, registro ID: ${registrationId06}`);
      }

      // Inserção para a faixa etária 7-10
      if (age710Total > 0) {
        const enrollmentAge710 = await pool.query(
          "INSERT INTO inscricao_7_10(inscricao_geral_id, tipo_inscricao_id, qtd_masculino, qtd_feminino) VALUES ($1, $2, $3, $4) RETURNING tipo_inscricao_id",
          [enrollmentId, tipoInscricao7a10, age710masculine, age710feminine]
        );

        if (enrollmentAge710.rowCount === 0) {
          console.error(`Falha ao inserir dados na tabela inscricao_7_10 para ID de inscrição: ${enrollmentId}`);
          return res.status(500).json({ error: "Falha ao processar a inscrição para a faixa etária 7-10." });
        }

        console.info(`sucesso ao inserir os dados na tabela inscricao_7_10 para a localidade ${localidade},`);

        const tipoInscricaoId = enrollmentAge710.rows[0].tipo_inscricao_id;
        const valorTipoInscricao = tiposInscricaoMap[tipoInscricaoId];

        // Calcula o total para a faixa etária 7-10
        const totalAge710 = age710Total * valorTipoInscricao;
        totalGeral += totalAge710;
        console.info(`Total para faixa etária 7-10: ${totalAge710} (quantidade: ${age710Total}, valor: ${valorTipoInscricao})`);

        console.info(`Sucesso ao inserir na tabela inscricao_7_10: tipo_inscricao_id = ${tipoInscricaoId}, valor = ${valorTipoInscricao} para ID de inscrição: ${enrollmentId}`);
      }

      // Inserção para a faixa etária 10+
      if (age10Total > 0) {
        const enrollmentAge10 = await pool.query(
          "INSERT INTO inscricao_10_acima(inscricao_geral_id, tipo_inscricao_id, qtd_masculino, qtd_feminino) VALUES ($1, $2, $3, $4) RETURNING tipo_inscricao_id",
          [enrollmentId, tipoInscricao10acima, age10masculine, age10feminine]
        );

        if (enrollmentAge10.rowCount === 0) {
          console.error(`Falha ao inserir dados na tabela inscricao_10_acima para ID de inscrição: ${enrollmentId}`);
          return res.status(500).json({ error: "Falha ao processar a inscrição para a faixa etária 10+." });
        }

        const tipoInscricaoId = enrollmentAge10.rows[0].tipo_inscricao_id;
        const valorTipoInscricao = tiposInscricaoMap[tipoInscricaoId];

        // Calcula o total para a faixa etária 10+
        const totalAge10 = age10Total * valorTipoInscricao;
        totalGeral += totalAge10;
        console.info(`Total para faixa etária 10+: ${totalAge10} (quantidade: ${age10Total}, valor: ${valorTipoInscricao})`);

        console.info(`Sucesso ao inserir na tabela inscricao_10_acima: tipo_inscricao_id = ${tipoInscricaoId}, valor = ${valorTipoInscricao} para ID de inscrição: ${enrollmentId}`);
      }

      // Inserção para o serviço
      if (serviceTotal > 0) {
        const enrollmentService = await pool.query(
          "INSERT INTO inscricao_servico(inscricao_geral_id, tipo_inscricao_id, qtd_masculino, qtd_feminino) VALUES ($1, $2, $3, $4) RETURNING tipo_inscricao_id",
          [enrollmentId, 3, servicemasculine, servicefeminine]
        );

        if (enrollmentService.rowCount === 0) {
          console.error(`Falha ao inserir dados na tabela inscricao_servico para ID de inscrição: ${enrollmentId}`);
          return res.status(500).json({ error: "Falha ao processar a inscrição para o serviço." });
        }

        const tipoInscricaoId = enrollmentService.rows[0].tipo_inscricao_id;
        const valorTipoInscricao = tiposInscricaoMap[tipoInscricaoId];

        // Calcula o total para o serviço
        const totalService = serviceTotal * valorTipoInscricao;
        totalGeral += totalService;
        console.info(`Total para serviços: ${totalService} (quantidade: ${serviceTotal}, valor: ${valorTipoInscricao})`);

        console.info(`Sucesso ao inserir na tabela inscricao_servico: tipo_inscricao_id = ${tipoInscricaoId}, valor = ${valorTipoInscricao} para ID de inscrição: ${enrollmentId}`);
      }

      // Inserção para o participacao
      if (participacaoTotal > 0) {
        const enrollmenParticipacao = await pool.query(
          "INSERT INTO inscricao_tx_participacao(inscricao_geral_id, tipo_inscricao_id, qtd_masculino, qtd_feminino) VALUES ($1, $2, $3, $4) RETURNING tipo_inscricao_id",
          [enrollmentId, 6, participacaoMasculine, participacaoFeminine]
        );

        if (enrollmenParticipacao.rowCount === 0) {
          console.error(`Falha ao inserir dados na tabela inscricao_servico para ID de inscrição: ${enrollmentId}`);
          return res.status(500).json({ error: "Falha ao processar a inscrição para o serviço." });
        }

        const tipoInscricaoId = enrollmenParticipacao.rows[0].tipo_inscricao_id;
        const valorTipoInscricao = tiposInscricaoMap[tipoInscricaoId];

        // Calcula o total para o participacao
        const totalParticipacao = participacaoTotal * valorTipoInscricao;
        totalGeral += totalParticipacao;
        console.info(`Total para particpação: ${totalParticipacao} (quantidade: ${participacaoTotal}, valor: ${valorTipoInscricao})`);

        console.info(`Sucesso ao inserir na tabela inscricao_servico: tipo_inscricao_id = ${tipoInscricaoId}, valor = ${valorTipoInscricao} para ID de inscrição: ${enrollmentId}`);
      }

      // Atualiza o saldo devedor
      const saldoDevedor = await pool.query(
        "UPDATE localidades SET saldo_devedor = saldo_devedor + $1 WHERE nome = $2 RETURNING saldo_devedor",
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
		await sendNotification( emailMessage);

		// Log após o envio da notificação
		console.info("Notificação enviada com sucesso!");

      // Se todas as inserções forem bem-sucedidas, envia uma resposta de sucesso
      return res.status(201).json({
        message: "Inscrição realizada com sucesso",
        totalGeral,
        enrollmentId,
      });
    } catch (err) {
      console.error(`Erro ao processar a inscrição: ${err.message}`);
      return res.status(500).json({ error: "Erro ao processar a inscrição." });
    }
  },
];

module.exports = register;
