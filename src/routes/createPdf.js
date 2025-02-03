const express = require('express');
const PDFDocument = require('pdfkit');
const { pool } = require("../db/dbConnection"); // Certifique-se de que a conexão está correta
const createPdfRouter = express.Router();

// Rota para gerar PDF dinamicamente
createPdfRouter.post("/createPdf", async (req, res) => {
    const tipo = req.body;

    if (!tipo) {
        return res.status(400).json({ error: "Tipo é obrigatório!" });
    }

    let query = "";

    switch (tipo) {
        case "geral":
            query = "SELECT * FROM movimentacao_financeira;";
            break;
        case "inscricao":
            query = `SELECT * FROM movimentacao_financeira WHERE descricao LIKE 'Pagamento referente%';`;
            break;
        case "conferencia":
            query = `SELECT * FROM movimentacao_financeira
                     WHERE descricao LIKE 'Venda de Alimentação%' 
                     OR descricao LIKE 'Pagamento referente%' 
                     OR descricao LIKE 'Movimentação%';`;
            break;
        case "inscricao_avulsa":
            query = `SELECT * FROM movimentacao_financeira 
                     WHERE descricao LIKE 'Inscrição avulsa%';`;
            break;
        case "ticket":
            query = `SELECT * FROM movimentacao_financeira
                     WHERE descricao LIKE 'Venda de Alimentação%';`;
            break;
        case "movimentacao":
            query = `SELECT * FROM movimentacao_financeira
                     WHERE descricao LIKE 'Movimentação%';`;
            break;
        default:
            console.warn(`Tipo inválido!`);
            return res.status(405).json({ error: "Tipo inválido!" });
    }

    try {
        console.info(rows);
        // Executa a consulta usando o pool
        const [rows] = await pool.execute(query);

        if (rows.length === 0) {
            return res.status(404).json({ error: "Nenhum dado encontrado!" });
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
        res.status(500).json({ error: `Erro ao gerar PDF: ${error.message}` });
    }
});

module.exports = createPdfRouter;
