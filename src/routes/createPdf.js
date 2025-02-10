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
        
        Object.entries(dataMap).forEach(([titulo, dados], index) => {
            if (dados && Object.keys(dados).length > 0) {
                if (index > 0) {
                    doc.addPage(); // Nova página para cada seção, exceto a primeira
                }
        
                // Título alinhado à esquerda
                doc.fontSize(14).font("Helvetica-Bold").text(titulo, 40, doc.y, { underline: true });
                doc.moveDown(1.5); // Aumentando espaçamento abaixo do título
        
                // Definição das colunas com uma largura total maior
                const startX = 40; // Margem inicial
                const colWidths = { id: 70, descricao: 350, valor: 120, tipo: 120 }; // Larguras aumentadas

                const colId = startX;
                const colDescricao = colId + colWidths.id + 20; // Adicionei 20px de espaço extra
                const colValor = colDescricao + colWidths.descricao + 30; // Mais espaço antes do "Valor"
                const colTipo = colValor + colWidths.valor + 20; // Mais espaço antes do "Tipo"

                // Cabeçalho alinhado corretamente
                let headerY = doc.y;
                doc.font("Helvetica-Bold").fontSize(10);
                doc.text("ID", colId, headerY, { width: colWidths.id, align: "left" });
                doc.text("Descrição", colDescricao, headerY, { width: colWidths.descricao, align: "left" });
                doc.text("Valor", colValor, headerY, { width: colWidths.valor, align: "right" });
                doc.text("Tipo", colTipo, headerY, { width: colWidths.tipo, align: "left" });

                doc.moveDown(1); // Aumentando espaço entre cabeçalho e dados

                // Linha separadora ajustada para cobrir toda a nova largura da tabela
                doc.moveTo(startX, doc.y).lineTo(colTipo + colWidths.tipo, doc.y).stroke();
                doc.moveDown(1);

                // Itera sobre os dados e alinha corretamente cada linha
                doc.font("Helvetica").fontSize(10);
                Object.values(dados).forEach((item) => {
                    let currentY = doc.y; // Posição atual da linha
        
                    // Alinhamento correto das colunas
                    doc.text(item.id.toString(), colId, currentY, { width: colWidths.id, align: "left" });
                    doc.text(formatarDescricao(item.descricao, 50), colDescricao, currentY, { width: colWidths.descricao, align: "left" });
                    doc.text(`R$ ${formatarValor(item.valor)}`, colValor, currentY, { width: colWidths.valor, align: "right" });
                    doc.text(item.tipo, colTipo, currentY, { width: colWidths.tipo, align: "left" });
        
                    doc.moveDown(1); // Aumentando espaçamento entre linhas de dados
        
                    // Exibir pagamentos abaixo da linha principal
                    if (item.pagamentos && item.pagamentos.length > 0) {
                        doc.font("Helvetica-Bold").text("Pagamentos:", colDescricao, doc.y, { underline: true });
                        doc.moveDown(0.5);
        
                        item.pagamentos.forEach((pag) => {
                            doc.font("Helvetica").text(`- ${pag.tipo_pagamento}: R$ ${formatarValor(pag.valor)}`, colDescricao, doc.y, { width: colWidths.descricao, align: "left" });
                            doc.moveDown(0.5);
                        });
        
                        doc.moveDown(1);
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
