const express = require('express');
const fs = require('fs'); 
const path = require('path');
const PDFDocument = require('pdfkit');
const createPdfRouter = express.Router();

createPdfRouter.post("/createPdf", async (req, res) => {

    let { tipo, dataInscricao, dataInscricaoAvulsa, dataTicket, dataMovimentacao, ...totals } = req.body;

    // Verifica se 'tipo' está correto
    if (typeof tipo === 'object' && tipo !== null) {
        tipo = tipo.tipo;
    }

    if (!tipo || typeof tipo !== 'string') {
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
    
        // Verifica se a imagem existe e adiciona no PDF
        if (fs.existsSync(imagePath)) {
            doc.image(imagePath, 480, 20, { width: 100 });
        }
    
        doc.fontSize(18).font("Helvetica-Bold").text(`Relatório ${tipo.toUpperCase()}`, 40, 75, { align: "left" });
        doc.moveDown(2);

        // Seção de Resumo Financeiro
        doc.fontSize(14).font("Helvetica-Bold").text("Resumo Financeiro:", { underline: true });
        doc.moveDown(1);

        const marginLeft = 20;
        const marginRight = 500;
        const pageWidth = doc.page.width;

        // Itera pelos totais e adiciona ao PDF
        Object.entries(totals).forEach(([key, value]) => {
            const currentY = doc.y;
            doc.font("Helvetica").fontSize(12).text(formatarChave(key), marginLeft, currentY);
            doc.text(`R$ ${formatarValor(value)}`, marginRight, currentY, { align: 'right' });
            doc.moveTo(marginLeft, doc.y).lineTo(pageWidth - 40, doc.y).stroke();
            doc.moveDown(0.5);
        });

        doc.moveDown(2);
    
        // Mapear dados para tabelas
        const dataMap = {
            "Inscrição": dataInscricao,
            "Inscrição Avulsa": dataInscricaoAvulsa,
            "Tickets": dataTicket,
            "Movimentação": dataMovimentacao
        };
        
        // Para cada seção de dados, criar uma nova página e tabela
        Object.entries(dataMap).forEach(([titulo, dados]) => {
            if (dados && Object.keys(dados).length > 0) {
                doc.addPage(); // Nova página para cada conjunto de dados
            
                doc.fontSize(14).font("Helvetica-Bold").text(titulo, 40, doc.y, { underline: true });
                doc.moveDown(1.5);
        
                // Definindo as colunas da tabela
                const startX = 40;
                const colWidths = { id: 20, descricao: 280, valor: 90, tipo: 120 };
        
                const colId = startX;
                const colDescricao = colId + colWidths.id + 20;
                const colValor = colDescricao + colWidths.descricao + 40;
                const colTipo = colValor + colWidths.valor + 25;
        
                // Função para desenhar cabeçalho da tabela
                function desenharCabecalho() {
                    let headerY = doc.y;
                    doc.font("Helvetica-Bold").fontSize(10);
                    doc.text("ID", colId, headerY, { width: colWidths.id, align: "left" });
                    doc.text("Descrição", colDescricao, headerY, { width: colWidths.descricao, align: "left" });
                    doc.text("Valor", colValor, headerY, { width: colWidths.valor, align: "right" });
                    doc.text("Tipo", colTipo, headerY, { width: colWidths.tipo, align: "left" });
        
                    doc.moveDown(1);
                    doc.moveTo(startX, doc.y).lineTo(colTipo + colWidths.tipo, doc.y).stroke();
                    doc.moveDown(1);
                }
        
                // Desenha o cabeçalho
                desenharCabecalho();
        
                // Adiciona os dados na tabela
                Object.values(dados).forEach((item) => {
                    if (doc.y + 20 > 750) {
                        doc.addPage();
                        desenharCabecalho(); // Redesenha o cabeçalho em nova página
                    }
        
                    let currentY = doc.y;
        
                    doc.font("Helvetica").fontSize(10).text(item.id.toString(), colId, currentY, { width: colWidths.id, align: "left" });
                    doc.font("Helvetica").fontSize(9).text(item.descricao, colDescricao, currentY, { width: colWidths.descricao, align: "left" });
                    doc.font("Helvetica").fontSize(10).text(`R$ ${formatarValor(item.valor)}`, colValor, currentY, { width: colWidths.valor, align: "right" });
                    doc.text(item.tipo, colTipo, currentY, { width: colWidths.tipo, align: "left" });
        
                    doc.moveDown(0.8);
        
                    // Exibe os pagamentos abaixo de cada item, se existirem
                    if (item.pagamentos && item.pagamentos.length > 0) {
                        doc.font("Helvetica-Bold").text("Pagamentos:", colDescricao, doc.y, { underline: true });
                        doc.moveDown(0.5);
        
                        item.pagamentos.forEach((pag) => {
                            if (doc.y + 15 > 750) {
                                doc.addPage();
                                desenharCabecalho();
                            }
        
                            doc.font("Helvetica").fontSize(9).text(
                                `- ${pag.tipo_pagamento}: R$ ${formatarValor(pag.valor)}`,
                                colDescricao, doc.y, { width: colWidths.descricao, align: "left" }
                            );
                            doc.moveDown(0.5);
                        });
        
                        doc.moveDown(1);
                    }
                });
            }
        });                
        
        doc.end();  // Finaliza o PDF
    
    } catch (error) {
        console.error(`❌ Erro ao gerar PDF: ${error.message}`);
        res.status(500).json({ error: `Erro ao gerar PDF: ${error.message}` });
    }
});

// Formatação de valores para exibição
function formatarValor(valor) {
    return parseFloat(valor).toFixed(2).replace(".", ",");
}

// Formatação das chaves para exibição no PDF
function formatarChave(chave) {
    return chave.replace("total", "Total").replace(/([A-Z])/g, " $1").trim();
}

module.exports = createPdfRouter;
