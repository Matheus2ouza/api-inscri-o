const express = require('express');
const PDFDocument = require('pdfkit');
const { pool } = require("../db/dbConnection"); // Certifique-se de que a conexão está correta
const createPdfRouter = express.Router();

// Mapeamento dos tipos para suas respectivas queries
const tipoQueries = {
    geral: "SELECT * FROM movimentacao_financeira;",
    inscricao: "SELECT * FROM movimentacao_financeira WHERE descricao LIKE 'Pagamento referente%';",
    conferencia: `SELECT * FROM movimentacao_financeira WHERE descricao LIKE 'Venda de Alimentação%' OR descricao LIKE 'Pagamento referente%' OR descricao LIKE 'Movimentação%';`,
    inscricao_avulsa: "SELECT * FROM movimentacao_financeira WHERE descricao LIKE 'Inscrição avulsa%';",
    ticket: "SELECT * FROM movimentacao_financeira WHERE descricao LIKE 'Venda de Alimentação%';",
    movimentacao: "SELECT * FROM movimentacao_financeira WHERE descricao LIKE 'Movimentação%';"
};

// Rota para gerar PDF dinamicamente
createPdfRouter.post("/createPdf", async (req, res) => {
    let tipo = req.body.tipo;

    if (typeof tipo !== 'string' || !tipo.trim()) {
        return res.status(400).json({ error: "Tipo inválido ou não fornecido! O tipo deve ser uma string válida." });
    }
    tipo = tipo.trim().toLowerCase(); // Normalizando o tipo

    if (!tipoQueries[tipo]) {
        return res.status(400).json({ error: `Tipo '${tipo}' não encontrado! Escolha um tipo válido.` });
    }

    const query = tipoQueries[tipo];

    try {
        // Usando o método query do pool para executar a consulta
        const { rows } = await pool.query(query);

        if (rows.length === 0) {
            return res.status(404).json({ error: "Nenhum dado encontrado para o tipo especificado!" });
        }

        // Criando o PDF diretamente na resposta HTTP
        const doc = new PDFDocument();
        res.setHeader("Content-Disposition", `attachment; filename=${tipo}.pdf`);
        res.setHeader("Content-Type", "application/pdf");

        doc.pipe(res);

        doc.fontSize(18).text(`Relatório: ${tipo}`, { align: "center" });
        doc.moveDown();
        doc.fontSize(12).text("ID | Descrição | Valor | Tipo");
        doc.text("-------------------------------------------");

        rows.forEach((item) => {
            doc.text(`${item.id} | ${item.descricao} | R$ ${item.valor} | ${item.tipo}`);
        });

        doc.end();
    } catch (error) {
        console.error(`Erro ao gerar PDF: ${error.message}`);
        res.status(500).json({ error: `Erro ao gerar PDF: ${error.message}` });
    }
});

module.exports = createPdfRouter;
