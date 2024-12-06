const express = require("express");
const { body, validationResult } = require("express-validator");
const { pool } = require("../db/dbConnection");

const registerRoutes = express.Router();

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
    body("detalhes").isArray().withMessage("Detalhes devem ser um array."),
    body("detalhes.*.valor")
      .isNumeric()
      .withMessage("O valor em detalhes deve ser numérico."),
    body("detalhes.*.formapagamento")
      .notEmpty()
      .withMessage("Forma de pagamento é obrigatória em detalhes."),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { tipo_refeicao, quantidade, valortotal, detalhes } = req.body;

    try {
      const venda = await pool.query(
        "INSERT INTO venda_alimentacao (tipo_refeicao, quantidade, valortotal) VALUES ($1, $2, $3) RETURNING id",
        [tipo_refeicao, quantidade, valortotal]
      );
      const vendaId = venda.rows[0].id;

      for (const detalhe of detalhes) {
        await pool.query(
          "INSERT INTO venda_alimentacao_detalhes (id_alimentacao, valor, formapagamento) VALUES ($1, $2, $3)",
          [vendaId, detalhe.valor, detalhe.formapagamento]
        );
      }

      return res
        .status(201)
        .json({ message: "Venda de alimentação registrada", id: vendaId });
    } catch (err) {
      console.error(`Erro ao registrar venda de alimentação: ${err.message}`);
      return res.status(500).json({ error: "Erro ao registrar venda de alimentação." });
    }
  }
);

// Rota para registrar inscrição avulsa
registerRoutes.post(
  "/inscricao-avulsa",
  [
    body("tipo_inscricao_id")
      .isInt()
      .withMessage("Tipo de inscrição é obrigatório e deve ser um número."),
    body("vl_total").isNumeric().withMessage("Valor total deve ser numérico."),
    body("data").isISO8601().withMessage("Data deve estar no formato ISO."),
    body("detalhes").isArray().withMessage("Detalhes devem ser um array."),
    body("detalhes.*.valor")
      .isNumeric()
      .withMessage("O valor em detalhes deve ser numérico."),
    body("detalhes.*.formapagamento")
      .notEmpty()
      .withMessage("Forma de pagamento é obrigatória em detalhes."),
  ],
  async (req, res) => {
    const {
      tipo_inscricao_id,
      qtd_masculino_06,
      qtd_feminino_06,
      qtd_masculino_7_10,
      qtd_feminino_7_10,
      qtd_masculino_normal,
      qtd_feminino_normal,
      qtd_masculino_visitante,
      qtd_feminino_visitante,
      vl_total,
      data,
      detalhes,
    } = req.body;

    try {
      const inscricao = await pool.query(
        "INSERT INTO inscricao_avulsa (tipo_inscricao_id, qtd_masculino_06, qtd_feminino_06, qtd_masculino_7_10, qtd_feminino_7_10, qtd_masculino_normal, qtd_feminino_normal, qtd_masculino_visitante, qtd_feminino_visitante, vl_total, data) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id",
        [
          tipo_inscricao_id,
          qtd_masculino_06 || 0,
          qtd_feminino_06 || 0,
          qtd_masculino_7_10 || 0,
          qtd_feminino_7_10 || 0,
          qtd_masculino_normal || 0,
          qtd_feminino_normal || 0,
          qtd_masculino_visitante || 0,
          qtd_feminino_visitante || 0,
          vl_total,
          data,
        ]
      );
      const inscricaoId = inscricao.rows[0].id;

      for (const detalhe of detalhes) {
        await pool.query(
          "INSERT INTO inscricao_avulsa_detalhes (id_inscricao_avulsa, valor, formapagamento) VALUES ($1, $2, $3)",
          [inscricaoId, detalhe.valor, detalhe.formapagamento]
        );
      }

      return res
        .status(201)
        .json({ message: "Inscrição avulsa registrada", id: inscricaoId });
    } catch (err) {
      console.error(`Erro ao registrar inscrição avulsa: ${err.message}`);
      return res.status(500).json({ error: "Erro ao registrar inscrição avulsa." });
    }
  }
);

module.exports = registerRoutes;
