const express = require("express");
const { body, validationResult } = require("express-validator");
const { pool } = require("../db/dbConnection");

const registerRoutes = express.Router();

// Rota de teste GET
registerRoutes.get("/teste", (req, res) => {
  res.status(200).json({ message: "Rota de teste funcionando!" });
});

registerRoutes.get("/movimentacao", async (req, res) => {
  try {
    // Consulta inicial para obter movimentações financeiras
    const sqlQuery = `
      SELECT * 
      FROM movimentacao_financeira;
    `;

    console.log("SQL Executado:", sqlQuery);

    const movimentacoes = await pool.query(sqlQuery);

    // Processando cada movimentação para buscar pagamentos associados
    const movimentacoesComPagamentos = await Promise.all(
      movimentacoes.rows.map(async (movimentacao) => {
        // Verifica se a descrição contém o ID da inscrição
        const match = movimentacao.descricao.match(/id:(\d+), nome responsavel:/);
        
        if (match) {
          const inscricaoId = match[1]; // Extrai o ID da inscrição da descrição
          console.log(`Buscando pagamentos para inscrição ID: ${inscricaoId}`);

          // Busca pagamentos associados ao ID da inscrição
          const pagamentos = await pool.query(
            `SELECT * 
             FROM pagamento_avulso 
             WHERE inscricao_avulsa2_id = $1`,
            [inscricaoId]
          );

          return {
            ...movimentacao,
            pagamentos: pagamentos.rows, // Adiciona os pagamentos associados
          };
        } else {
          // Caso não haja ID de inscrição, lista de pagamentos é vazia
          return {
            ...movimentacao,
            pagamentos: [],
          };
        }
      })
    );

    // Retorna a resposta com todas as movimentações e pagamentos associados
    return res.status(200).json(movimentacoesComPagamentos);
  } catch (error) {
    console.error("Erro ao buscar movimentações financeiras:", error.message);
    return res.status(500).json({
      message: "Erro ao buscar movimentações financeiras.",
      error: error.message,
    });
  }
});


// Rota para criar uma entrada ou saída no caixa
registerRoutes.post(
  "/caixa",
  [
    body("descricao").notEmpty().withMessage("Descrição é obrigatória."),
    body("responsavel").notEmpty().withMessage("Responsável é obrigatório."),
    body("valor").isNumeric().withMessage("Valor deve ser numérico."),
    body("tipo")
      .isIn(["Entrada", "Saida"])
      .withMessage("Tipo de movimento inválido."),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { descricao, responsavel, valor, tipo } = req.body;

    const data = new Date();

    try {
      const insert_caixa = await pool.query(
        "INSERT INTO caixa (descricao, responsavel, valor, tipomovimento, data) VALUES ($1, $2, $3, $4, $5) RETURNING id",
        [descricao, responsavel, valor, tipo, data]
      );

      if(!insert_caixa.rows.length) {
        const errorMessage = 'Erro ao inserir venda de caixa.';
        console.error(errorMessage);
        return res.status(401).json({message:errorMessage});
      }

      // Inserção na tabela `movimentacao_financeira`
      const financialMovement = await pool.query(
        `INSERT INTO movimentacao_financeira (tipo, descricao, valor, data)
        VALUES($1, $2, $3, $4) RETURNING id`,
        [tipo, `Movimentação do tipo ${tipo} com responsavel ${responsavel}.`, valor, data]
      );

      if (!financialMovement.rows || financialMovement.rows.length === 0) {
        const errorMessage = 'Erro ao registrar movimentação financeira. Não foi possível inserir os dados.';
        console.error(errorMessage);
        return res.status(500).json({ message: errorMessage });
      }
      
      return res
        .status(201)
        .json({ message: "Movimento registrado no caixa", id: financialMovement.rows[0].id });
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
    body("quantidade")
        .isInt({ min: 1 })
        .withMessage("Quantidade deve ser um número inteiro positivo."),
    body("valorUnitario")
        .isNumeric()
        .withMessage("Valor unitário deve ser numérico."),
    body("valorTotal")
        .isNumeric()
        .withMessage("Valor total deve ser numérico."),
    body("pagamentos")
        .isArray({ min: 1 })
        .withMessage("Deve haver pelo menos um pagamento."),
    body("pagamentos.*.tipo")
        .notEmpty()
        .withMessage("O tipo de pagamento é obrigatório."),
    body("pagamentos.*.valor")
        .isNumeric()
        .withMessage("O valor do pagamento deve ser numérico.")
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { tipo_refeicao, quantidade, valorUnitario, valorTotal, pagamentos } = req.body;

    let data = new Date();

    try {
      const venda_alimentacao = await pool.query(
          `INSERT INTO venda_alimentacao (evento_id, tipo_refeicao, quantidade, valor_unitario, valor_total) 
          VALUES ($1, $2, $3, $4, $5) RETURNING id`,
          [3, tipo_refeicao, quantidade, valorUnitario, valorTotal]
      );
  
      if (!venda_alimentacao.rows.length) {
          const errorMessage = 'Erro ao inserir venda de alimentação.';
          console.error(errorMessage);
          return res.status(401).json({message:errorMessage});
      }
  
      const vendaId = venda_alimentacao.rows[0].id;
      let pagamentosInseridos = 0;
  
      for (const pagamento of pagamentos) {
          const pagamentoInserido = await pool.query(
              `INSERT INTO pagamento_alimentacao (venda_alimentacao_id, tipo_pagamento, valor) 
              VALUES ($1, $2, $3) RETURNING id`,
              [vendaId, pagamento.tipo, pagamento.valor]
          );
  
          if (pagamentoInserido.rows.length) {
              pagamentosInseridos++;
          }
      }
  
      // Verifica se todos os pagamentos foram inseridos corretamente
      if (pagamentosInseridos !== pagamentos.length) {
          const errorMessage = 'Nem todos os pagamentos foram inseridos corretamente.';
          console.error(errorMessage);
          return res.status(401).json({message:errorMessage});
      }

      // Inserção na tabela `movimentacao_financeira`
      const financialMovement = await pool.query(
        `INSERT INTO movimentacao_financeira (tipo, descricao, valor, data)
        VALUES($1, $2, $3, $4) RETURNING id`,
        ["Entrada", `Venda de Alimentação, tipo_refeição:${tipo_refeicao}.`, valorTotal, data]
      );

      if (!financialMovement.rows || financialMovement.rows.length === 0) {
        const errorMessage = 'Erro ao registrar movimentação financeira. Não foi possível inserir os dados.';
        console.error(errorMessage);
        return res.status(500).json({ message: errorMessage });
      }
  
      res.status(201).json({ message: "Venda registrada com sucesso!" });
  
    } catch (err) {
      console.error(`Erro ao registrar venda de alimentação: ${err.message}`);
      return res.status(500).json({ error: "Erro ao registrar venda de alimentação." });
    }
  
  }
);

registerRoutes.get("/DadosRefeicao", async (req, res) => {
  try {
      // Executa a consulta no banco de dados
      const query = `
          SELECT
              SPLIT_PART(venda.tipo_refeicao, '_', 2) AS refeicao,
              SPLIT_PART(venda.tipo_refeicao, '_', 1) AS dia,
              venda.quantidade,
              venda.valor_total
          FROM
              venda_alimentacao venda
          WHERE
              venda.tipo_refeicao LIKE 'sexta_%';
      `;

      const result = await pool.query(query); // Executa a consulta usando o pool de conexões do PostgreSQL

      if (result.rows.length > 0) {
          // Envia os dados retornados como resposta
          res.status(200).json(result.rows);
      } else {
          res.status(404).json({ message: "Nenhuma refeição encontrada." });
      }

  } catch (error) {
      console.error('Erro ao buscar dados de refeição:', error);
      res.status(500).json({ error: "Erro interno ao buscar dados de refeição." });
  }
});


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
      nomeResponsavel
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
          data,
          nome_responsavel
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
        [
          2, // evento_id
          city.id, // localidade_id
          faixasPorIdade['0-6'] || 0, // qtd_0_6
          faixasPorIdade['7-10'] || 0, // qtd_7_10
          faixasPorIdade['10plus'] || 0, // qtd_10_normal
          faixasPorIdade['visitante'] || 0, // qtd_visitante
          data,
          nomeResponsavel
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
        ["Entrada", `Inscrição avulsa, id:${inscricao.rows[0].id}, nome responsavel: ${nomeResponsavel}`, valorTotal, data]
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

module.exports = registerRoutes;
