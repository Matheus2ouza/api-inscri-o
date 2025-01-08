const express = require("express");
const { body, validationResult } = require("express-validator");
const { pool } = require("../db/dbConnection");

const registerRoutes = express.Router();

// Rota de teste GET
registerRoutes.get("/teste", (req, res) => {
  res.status(200).json({ message: "Rota de teste funcionando!" });
});

registerRoutes.get(
  "/movimentacao", 
  async (req, res) => {
    try {
      const sqlQuery = `
        SELECT 
          mf.id,
          mf.tipo,
          CASE 
            WHEN mf.descricao LIKE 'Inscrição avulsa, id:%' THEN
              CONCAT(
                'Inscrição avulsa, ', 
                COALESCE(
                  (SELECT l.nome 
                   FROM inscricao_avulsa2 ia
                   JOIN localidades l ON ia.localidade_id = l.id
                   WHERE ia.id = CAST(SUBSTRING(mf.descricao FROM 'id:(\\d+)') AS INTEGER)),
                  'Localidade não encontrada'
                )
              )
            ELSE mf.descricao
          END AS descricao,
          mf.valor,
          mf.data
        FROM movimentacao_financeira mf;
      `;

      // Log da consulta SQL
      console.log("SQL Executado:", sqlQuery);

      const result = await pool.query(sqlQuery);
      
      // Log de depuração para verificar o retorno dos dados
      result.rows.forEach(row => {
        console.log("Descricao:", row.descricao);
      });

      return res.status(200).json(result.rows);
    } catch (error) {
      console.error("Erro ao buscar movimentações financeiras:", error.message);
      return res.status(500).json({
        message: "Erro ao buscar movimentações financeiras.",
        error: error.message,
      });
    }
  }
);



// Rota para criar uma entrada ou saída no caixa
registerRoutes.post(
  "/caixa",
  [
    body("descricao").notEmpty().withMessage("Descrição é obrigatória."),
    body("responsavel").notEmpty().withMessage("Responsável é obrigatório."),
    body("valor").isNumeric().withMessage("Valor deve ser numérico."),
    body("tipomovimento")
      .isIn(["entrada", "saida"])
      .withMessage("Tipo de movimento inválido."),
    body("data").isISO8601().withMessage("Data deve estar no formato ISO."),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { descricao, responsavel, valor, tipomovimento, data } = req.body;

    try {
      const result = await pool.query(
        "INSERT INTO caixa (descricao, responsavel, valor, tipomovimento, data) VALUES ($1, $2, $3, $4, $5) RETURNING id",
        [descricao, responsavel, valor, tipomovimento, data]
      );
      return res
        .status(201)
        .json({ message: "Movimento registrado no caixa", id: result.rows[0].id });
    } catch (err) {
      console.error(`Erro ao registrar movimento no caixa: ${err.message}`);
      return res.status(500).json({ error: "Erro ao registrar movimento no caixa." });
    }
  }
);

// Rota para registrar venda de alimentação
registerRoutes.post(
  "/venda-alimentacao",
  [
    body("tipo_refeicao").notEmpty().withMessage("Tipo de refeição é obrigatório."),
    body("quantidade").isInt({ min: 1 }).withMessage("Quantidade deve ser positiva."),
    body("valortotal").isNumeric().withMessage("Valor total deve ser numérico."),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { tipo_refeicao, quantidade, valortotal } = req.body;

    try {
      const venda = await pool.query(
        "INSERT INTO venda_alimentacao (tipo_refeicao, quantidade, valortotal) VALUES ($1, $2, $3) RETURNING id",
        [tipo_refeicao, quantidade, valortotal]
      );
      const vendaId = venda.rows[0].id;

      return res
        .status(201)
        .json({ message: "Venda de alimentação registrada", id: vendaId });
    } catch (err) {
      console.error(`Erro ao registrar venda de alimentação: ${err.message}`);
      return res.status(500).json({ error: "Erro ao registrar venda de alimentação." });
    }
  }
);

// Rota para registrar detalhes de venda de alimentação
registerRoutes.post(
  "/venda-alimentacao/detalhes/:vendaId",
  [
    body("valor").isNumeric().withMessage("Valor deve ser numérico."),
    body("formapagamento").notEmpty().withMessage("Forma de pagamento é obrigatória."),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { vendaId } = req.params;
    const { valor, formapagamento } = req.body;

    try {
      // Inserir os detalhes da venda de alimentação
      await pool.query(
        "INSERT INTO venda_alimentacao_detalhes (id_alimentacao, valor, formapagamento) VALUES ($1, $2, $3)",
        [vendaId, valor, formapagamento]
      );

      return res
        .status(201)
        .json({ message: "Detalhe da venda de alimentação registrado." });
    } catch (err) {
      console.error(`Erro ao registrar detalhe de venda de alimentação: ${err.message}`);
      return res.status(500).json({ error: "Erro ao registrar detalhe da venda de alimentação." });
    }
  }
);

registerRoutes.post(
  "/inscricao-avulsa",
  [
    body("localidade").isString().withMessage("Localidade é obrigatória."),
    body("quantidadeTotal").isInt().withMessage("Quantidade total deve ser um número inteiro."),
    body("valorTotal").isNumeric().withMessage("Valor total deve ser numérico."),
    body("formasDePagamento").isArray().withMessage("Formas de pagamento devem ser um array."),
    body("qtdDetalhes").isArray().withMessage("Detalhes das quantidades devem ser um array."),
  ],
  async (req, res) => {
    const {
      localidade,
      qtdDetalhes, // Array com as faixas e suas quantidades
      quantidadeTotal,
      valorTotal,
      formasDePagamento, // Array com detalhes das formas de pagamento
    } = req.body;

    // Cria um objeto separado para as faixas de idade
    const faixasPorIdade = {};

    // Processa as faixas e organiza em um novo objeto
    qtdDetalhes.forEach(faixa => {
      faixasPorIdade[faixa.faixa] = faixa.quantidade || 0;
    });

    let data = new Date();

    try {
      // Verifica se a localidade existe
      const localeCheck = await pool.query(
        "SELECT * FROM localidades WHERE nome = $1",
        [localidade]
      );

      const city = localeCheck.rows[0];

      if (!city) {
        console.warn(`Localidade não encontrada: ${localidade}`);
        return res.status(401).json({ message: "Localidade inválida" });
      }

      // Insere os dados na tabela `inscricao_avulsa2`
      const inscricao = await pool.query(
        `INSERT INTO inscricao_avulsa2 (
          evento_id, 
          localidade_id, 
          qtd_0_6, 
          qtd_7_10, 
          qtd_10_normal, 
          qtd_visitante, 
          data
        ) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [
          2, // evento_id
          city.id, // localidade_id
          faixasPorIdade['0-6'] || 0, // qtd_0_6
          faixasPorIdade['7-10'] || 0, // qtd_7_10
          faixasPorIdade['10plus'] || 0, // qtd_10_normal
          faixasPorIdade['visitante'] || 0, // qtd_visitante
          data
        ]
      );


      // Verifica se a inserção da inscrição foi bem-sucedida
      if (!inscricao.rows[0] || !inscricao.rows[0].id) {
        const errorMessage = 'Erro ao inserir inscrição avulsa. Não foi possível registrar os dados.';
        console.error(errorMessage);
        return res.status(500).json({ message: errorMessage });
      }

      // Inscrição inserida com sucesso
      console.log(`Inscrição avulsa registrada com sucesso: ${inscricao.rows[0].id}`);

      // Inserção das formas de pagamento na tabela `pagamento_avulso`
      if (formasDePagamento.length > 0) {
        try {
          const pagamentoQueries = formasDePagamento.map((pagamento) => {
            return pool.query(
              `INSERT INTO pagamento_avulso (
                inscricao_avulsa2_id, 
                tipo_pagamento, 
                valor
              ) VALUES ($1, $2, $3)`,
              [inscricao.rows[0].id, pagamento.tipo, pagamento.valor]
            );
          });

          await Promise.all(pagamentoQueries); // Executa todas as queries em paralelo
          console.log("Formas de pagamento registradas com sucesso.");
        } catch (error) {
          console.error(`Erro ao inserir formas de pagamento: ${error.message}`);
          return res.status(500).json({ message: 'Erro ao processar as formas de pagamento.', error: error.message });
        }
      }

      // Inserção na tabela `movimentacao_financeira`
      const financialMovement = await pool.query(
        `INSERT INTO movimentacao_financeira (tipo, descricao, valor, data)
        VALUES($1, $2, $3, $4) RETURNING id`,
        ["Entrada", `Inscrição avulsa, id:${inscricao.rows[0].id}`, valorTotal, data]
      );

      if (!financialMovement.rows || financialMovement.rows.length === 0) {
        const errorMessage = 'Erro ao registrar movimentação financeira. Não foi possível inserir os dados.';
        console.error(errorMessage);
        return res.status(500).json({ message: errorMessage });
      }

      console.log(`Movimentação financeira registrada com sucesso: ${financialMovement.rows[0].id}`);


      return res.status(201).json({
        message: "Inscrição avulsa registrada com sucesso.",
        id: inscricao.rows[0].id,
      });
    } catch (err) {
      console.error(`Erro ao registrar inscrição avulsa: ${err.message}`);
      return res.status(500).json({ error: "Erro ao registrar inscrição avulsa." });
    }
  }
);



// Rota para registrar detalhes de inscrição avulsa
registerRoutes.post(
  "/inscricao-avulsa/detalhes/:inscricaoId",
  [
    body("valor").isNumeric().withMessage("Valor deve ser numérico."),
    body("formapagamento").notEmpty().withMessage("Forma de pagamento é obrigatória."),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { inscricaoId } = req.params;
    const { valor, formapagamento } = req.body;

    try {
      // Inserir os detalhes da inscrição avulsa
      await pool.query(
        "INSERT INTO inscricao_avulsa_detalhes (id_inscricao_avulsa, valor, formapagamento) VALUES ($1, $2, $3)",
        [inscricaoId, valor, formapagamento]
      );

      return res
        .status(201)
        .json({ message: "Detalhe da inscrição avulsa registrado." });
    } catch (err) {
      console.error(`Erro ao registrar detalhe de inscrição avulsa: ${err.message}`);
      return res.status(500).json({ error: "Erro ao registrar detalhe da inscrição avulsa." });
    }
  }
);

module.exports = registerRoutes;
