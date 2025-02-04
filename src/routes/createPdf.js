const express = require('express');
const PDFDocument = require('pdfkit');
const path = require('path');
const createPdfRouter = express.Router();

// Rota para gerar PDF
createPdfRouter.post("/createPdf", async (req, res) => {
    const { tipo, dataInscricao, dataInscricaoAvulsa, dataTicket, dataMovimentacao, ...totals } = req.body;

    if (!tipo || typeof tipo !== 'string') {
        return res.status(400).json({ error: "Tipo inválido ou não fornecido!" });
    }

    try {
        const doc = new PDFDocument({ margin: 50 });
        res.setHeader("Content-Disposition", `attachment; filename=${tipo}.pdf`);
        res.setHeader("Content-Type", "application/pdf");

        doc.pipe(res);

        // Adicionando imagem no canto superior direito
        const imagePath = path.join(__dirname, '../public/images/logo.png');
        doc.image(imagePath, 400, 30, { width: 150 });

        // Título alinhado à esquerda
        doc.fontSize(18).text(`Relatório: ${tipo.toUpperCase()}`, 50, 30);
        doc.moveDown(2);

        // Exibir totais no PDF
        doc.font("Helvetica-Bold").fontSize(14).text("Totais:", { underline: true });
        Object.entries(totals).forEach(([key, value]) => {
            doc.font("Helvetica").fontSize(12).text(`${key.replace("total", "Total")}: R$ ${value}`);
        });
        doc.moveDown(2);

        // Criar tabelas com os dados recebidos
        const dataMap = {
            "Inscrição": dataInscricao,
            "Inscrição Avulsa": dataInscricaoAvulsa,
            "Ticket": dataTicket,
            "Movimentação": dataMovimentacao
        };

        Object.entries(dataMap).forEach(([title, data]) => {
            if (Object.keys(data).length > 0) {
                doc.font("Helvetica-Bold").fontSize(14).text(title, { underline: true });
                doc.moveDown(1);

                doc.font("Courier-Bold").fontSize(12);
                doc.text("ID".padEnd(10) + "Descrição".padEnd(40) + "Valor".padEnd(15) + "Tipo", { underline: true });
                doc.text("-".repeat(80));

                doc.font("Courier").fontSize(10);
                data.forEach((item) => {
                    doc.text(
                        item.id.toString().padEnd(10) +
                        item.descricao.padEnd(40) +
                        `R$ ${item.valor.toFixed(2)}`.padEnd(15) +
                        item.tipo
                    );
                });

                doc.moveDown(2);
            }
        });

        doc.end();
    } catch (error) {
        console.error(`Erro ao gerar PDF: ${error.message}`);
        res.status(500).json({ error: `Erro ao gerar PDF: ${error.message}` });
    }
});

module.exports = createPdfRouter;
