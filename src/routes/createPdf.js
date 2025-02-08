const express = require('express');
const fs = require('fs'); 
const path = require('path');
const PDFDocument = require('pdfkit');
const createPdfRouter = express.Router();

createPdfRouter.post("/createPdf", async (req, res) => {

    let { tipo, dataInscricao, dataInscricaoAvulsa, dataTicket, dataMovimentacao, ...totals } = req.body;

    if (typeof tipo === 'object' && tipo !== null) {
        tipo = tipo.tipo;
    }

    if (!tipo || typeof tipo !== 'string') {
        console.log(tipo);
        return res.status(400).json({ error: "❌ Tipo inválido ou não fornecido!" });
    }

    try {
        const doc = new PDFDocument({
            size: [620, 820],
            margin: 50
        });
    
        res.setHeader("Content-Disposition", `attachment; filename=${tipo}.pdf`);
        res.setHeader("Content-Type", "application/pdf");
    
        doc.pipe(res).on('finish', () => {
            console.log("✅ PDF gerado com sucesso!");
        });
    
        const imagePath = path.join(__dirname, '..', 'public', 'img', 'logo_conf_Tropas_e_Capitães.png');
    
        if (fs.existsSync(imagePath)) {
            doc.image(imagePath, 480, 20, { width: 100 });
        }
    
        doc.fontSize(18).font("Helvetica-Bold").text(`Relatório ${tipo.toUpperCase()}`, 40, 75, { align: "left" });
        doc.moveDown(2);

        doc.fontSize(14).font("Helvetica-Bold").text("Resumo Financeiro:", { underline: true });
        doc.moveDown(1);

        const marginLeft = 20;
        const marginRight = 500;
        const pageWidth = doc.page.width;

        Object.entries(totals).forEach(([key, value]) => {
            const currentY = doc.y;
            doc.font("Helvetica").fontSize(12).text(formatarChave(key), marginLeft, currentY);
            doc.text(`R$ ${formatarValor(value)}`, marginRight, currentY, { align: 'right' });
            doc.moveTo(marginLeft, doc.y).lineTo(pageWidth - 40, doc.y).stroke();
            doc.moveDown(0.5);
        });

        doc.moveDown(2);
    
        const dataMap = {
            "Inscrição": dataInscricao,
            "Inscrição Avulsa": dataInscricaoAvulsa,
            "Tickets": dataTicket,
            "Movimentação": dataMovimentacao
        };
        
        Object.entries(dataMap).forEach(([titulo, dados]) => {
            if (dados && Object.keys(dados).length > 0) {
                doc.fontSize(14).font("Helvetica-Bold").text(titulo, { underline: true });
                doc.moveDown(1);
        
                const startX = 20;
                const colId = startX;
                const colDescricao = colId + 50;
                const colValor = colDescricao + 250;
                const colTipo = colValor + 80;
        
                doc.font("Helvetica-Bold").fontSize(10);
                doc.text("ID", colId, doc.y);
                doc.text("Descrição", colDescricao, doc.y);
                doc.text("Valor", colValor, doc.y);
                doc.text("Tipo", colTipo, doc.y);
                doc.moveDown(0.5);
        
                doc.moveTo(startX, doc.y).lineTo(580, doc.y).stroke();
                doc.moveDown(0.5);
        
                doc.font("Helvetica").fontSize(10);
                Object.values(dados).forEach((item) => {
                    const currentY = doc.y;
        
                    doc.text(item.id.toString(), colId, currentY);
                    doc.text(formatarDescricao(item.descricao, 50), colDescricao, currentY, { width: 200, ellipsis: true });
                    doc.text(`R$ ${formatarValor(item.valor)}`, colValor, currentY);
                    doc.text(item.tipo, colTipo, currentY);
        
                    doc.moveDown(0.5);
        
                    if (item.pagamentos && item.pagamentos.length > 0) {
                        doc.font("Helvetica-Bold").text("Pagamentos:", { underline: true });
                        doc.moveDown(0.5);
                        
                        item.pagamentos.forEach((pag) => {
                            doc.font("Helvetica").text(`- ${pag.tipo_pagamento}: R$ ${formatarValor(pag.valor)}`);
                            doc.moveDown(0.3);
                        });
                        doc.moveDown(0.5);
                    }
                });
        
                doc.moveDown(1);
            }
        });
        
        doc.end();
        
    } catch (error) {
        console.error(`❌ Erro ao gerar PDF: ${error.message}`);
        res.status(500).json({ error: `Erro ao gerar PDF: ${error.message}` });
    }
});

function formatarValor(valor) {
    return parseFloat(valor).toFixed(2).replace(".", ",");
}

function formatarChave(chave) {
    return chave.replace("total", "Total").replace(/([A-Z])/g, " $1").trim();
}

function formatarDescricao(descricao, tamanhoMax) {
    return descricao.length > tamanhoMax ? descricao.substring(0, tamanhoMax - 3) + "..." : descricao.padEnd(tamanhoMax);
}

module.exports = createPdfRouter;

/**
 * 🔹 Formata os valores numéricos para exibição correta
 */
function formatarValor(valor) {
    return parseFloat(valor).toFixed(2).replace(".", ",");
}

/**
 * 🔹 Converte as chaves do objeto para uma versão mais legível
 */
function formatarChave(chave) {
    return chave.replace("total", "Total").replace(/([A-Z])/g, " $1").trim();
}

/**
 * 🔹 Ajusta descrições muito longas para evitar quebra na tabela
 */
function formatarDescricao(descricao, tamanhoMax) {
    return descricao.length > tamanhoMax ? descricao.substring(0, tamanhoMax - 3) + "..." : descricao.padEnd(tamanhoMax);
}
