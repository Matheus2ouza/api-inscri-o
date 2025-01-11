const express = require('express');
const router = express.Router();  // Cria o roteador para modularizar as rotas
const PDFDocument = require('pdfkit'); // Biblioteca para geração de PDFs

// Função para gerar o PDF a partir dos dados recebidos
router.post('/gerar-pdf', (req, res) => {
    const { movements } = req.body;

    if (!movements || Object.keys(movements).length === 0) {
        return res.status(400).json({ error: 'Dados inválidos ou ausentes.' });
    }

    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const pageWidth = doc.page.width;
    const pageMargin = 50;

    // Largura da tabela e das colunas
    const tableWidth = pageWidth - 2 * pageMargin;
    const colWidths = [0.1 * tableWidth, 0.2 * tableWidth, 0.5 * tableWidth, 0.2 * tableWidth];

    // Cabeçalhos da tabela
    const headers = ['ID', 'Tipo', 'Descrição', 'Valor'];

    // Definir o título do documento
    doc.fontSize(20).text('Movimentações Financeiras', { align: 'center' });
    doc.moveDown(2); // Maior espaçamento após o título

    // Processar cada data
    Object.keys(movements).forEach((date, index) => {
        if (index > 0) {
            doc.addPage();
        }

        // Adicionar data em negrito e sublinhado
        doc.fontSize(16).text(`Data: ${date}`, { underline: true, font: 'Helvetica-Bold' });
        doc.moveDown(1);

        // Início da tabela
        let yPosition = doc.y;

        // Renderizar cabeçalhos com maior espaçamento e estilo
        renderTableHeader(doc, headers, colWidths, yPosition, pageMargin);
        yPosition += 30; // Maior espaçamento após cabeçalhos

        // Linha horizontal abaixo dos cabeçalhos
        doc.moveTo(pageMargin, yPosition).lineTo(pageMargin + tableWidth, yPosition).stroke();
        yPosition += 10;

        let total = 0;

        // Renderizar entradas
        movements[date].entrada.forEach(movement => {
            yPosition = renderRow(doc, movement, 'Entrada', colWidths, yPosition, pageMargin);
            total += movement.valor;

            // Renderizar os detalhes dos pagamentos
            if (movement.pagamentos && movement.pagamentos.length > 0) {
                yPosition = renderPayments(doc, movement.pagamentos, colWidths, yPosition, pageMargin);
            }
        });

        // Renderizar saídas
        movements[date].saida.forEach(movement => {
            yPosition = renderRow(doc, movement, 'Saída', colWidths, yPosition, pageMargin, true);
            total -= movement.valor;

            // Renderizar os detalhes dos pagamentos
            if (movement.pagamentos && movement.pagamentos.length > 0) {
                yPosition = renderPayments(doc, movement.pagamentos, colWidths, yPosition, pageMargin);
            }
        });

        // Linha horizontal abaixo dos dados
        doc.moveTo(pageMargin, yPosition).lineTo(pageMargin + tableWidth, yPosition).stroke();
        yPosition += 10;

        // Total, ajustado para melhor visualização
        doc.fontSize(14).text(`Total: R$ ${total.toFixed(2)}`, pageMargin + colWidths[0] + colWidths[1] + colWidths[2], yPosition, { width: colWidths[3], align: 'right' });
        yPosition += 20;
    });

    // Finalizando o PDF e enviando a resposta
    doc.end();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="movimentacoes_financeiras.pdf"');
    doc.pipe(res);
});

// Função para renderizar o cabeçalho da tabela
function renderTableHeader(doc, headers, colWidths, yPosition, pageMargin) {
    headers.forEach((header, i) => {
        const xPosition = pageMargin + colWidths.slice(0, i).reduce((a, b) => a + b, 0);
        doc.fontSize(12).text(header, xPosition, yPosition, { width: colWidths[i], align: 'center', font: 'Helvetica-Bold' });
    });
}

// Função para renderizar uma linha da tabela
function renderRow(doc, movement, tipo, colWidths, yPosition, pageMargin, isSaida = false) {
    const values = [
        movement.id,
        tipo,
        movement.descricao,
        `${isSaida ? '-' : '+'} R$ ${movement.valor.toFixed(2)}`,
    ];

    values.forEach((value, i) => {
        const xPosition = pageMargin + colWidths.slice(0, i).reduce((a, b) => a + b, 0);
        doc.fontSize(10).text(value, xPosition, yPosition, { width: colWidths[i], align: i === 3 ? 'right' : 'center' });
    });

    return yPosition + 20; // Retorna a nova posição vertical após renderizar a linha
}

// Função para renderizar os pagamentos em duas colunas (2x2)
function renderPayments(doc, pagamentos, colWidths, yPosition, pageMargin) {
    if (pagamentos && pagamentos.length > 0) {
        let col1X = pageMargin + colWidths[0] + colWidths[1];
        let col2X = pageMargin + colWidths[0] + colWidths[1] + colWidths[2];
        
        pagamentos.forEach((payment, paymentIndex) => {
            const paymentValue = Number(payment.valor_pago); // Usar payment.valor_pago, não movement.valor
            const paymentText = `Forma: ${payment.tipo_pagamento} | Valor: R$ ${isNaN(paymentValue) ? 'inválido' : paymentValue.toFixed(2)}`;
            
            if (paymentIndex % 2 === 0) {
                // Primeira coluna
                doc.fontSize(10).text(paymentText, col1X, yPosition + Math.floor(paymentIndex / 2) * 14, { width: colWidths[2], align: 'left' });
            } else {
                // Segunda coluna
                doc.fontSize(10).text(paymentText, col2X, yPosition + Math.floor(paymentIndex / 2) * 14, { width: colWidths[2], align: 'left' });
            }
        });

        yPosition += Math.ceil(pagamentos.length / 2) * 14; // Ajusta o espaço para os pagamentos (2x2)
    }

    return yPosition; // Retorna a nova posição vertical após renderizar os pagamentos
}

module.exports = router;
