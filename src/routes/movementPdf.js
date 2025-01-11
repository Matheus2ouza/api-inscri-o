const express = require('express');
const router = express.Router();  // Cria o roteador para modularizar as rotas
const PDFDocument = require('pdfkit'); // Biblioteca para geração de PDFs

// Função para gerar o PDF a partir dos dados recebidos
router.post('/gerar-pdf', (req, res) => {
    const { movements } = req.body;

    if (!movements || Object.keys(movements).length === 0) {
        return res.status(400).json({ error: 'Dados inválidos ou ausentes.' });
    }

    // Converte todos os valores para números antes de processar
    Object.keys(movements).forEach(date => {
        movements[date].entrada.forEach(movement => {
            movement.valor = Number(movement.valor); // Converte para número
        });

        movements[date].saida.forEach(movement => {
            movement.valor = Number(movement.valor); // Converte para número
        });
    });

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
    doc.moveDown(1);

    // Processar cada data
    Object.keys(movements).forEach((date, index) => {
        if (index > 0) {
            doc.addPage();
        }

        doc.fontSize(16).text(`Data: ${date}`, { underline: true });
        doc.moveDown(0.5);

        // Início da tabela
        let yPosition = doc.y;

        // Renderizar cabeçalhos
        headers.forEach((header, i) => {
            const xPosition = pageMargin + colWidths.slice(0, i).reduce((a, b) => a + b, 0);
            doc.fontSize(12).text(header, xPosition, yPosition, { width: colWidths[i], align: 'center' });
        });

        yPosition += 20; // Espaço após cabeçalhos

        // Linha horizontal abaixo dos cabeçalhos
        doc.moveTo(pageMargin, yPosition).lineTo(pageMargin + tableWidth, yPosition).stroke();
        yPosition += 10;

        let total = 0;

        // Renderizar entradas
        movements[date].entrada.forEach(movement => {
            renderRow(doc, movement, 'Entrada', colWidths, yPosition, pageMargin);
            yPosition += 20;
            total += movement.valor;

            // Renderizar os detalhes dos pagamentos
            if (movement.pagamentos && movement.pagamentos.length > 0) {
                movement.pagamentos.forEach((payment, paymentIndex) => {
                    // Converte payment.valor para número usando Number()
                    const paymentValue = Number(payment.valor);
                    const paymentText = `Forma: ${payment.tipo_pagamento} | Valor: R$ ${paymentValue.toFixed(2)}`;
                    doc.fontSize(10).text(paymentText, pageMargin + colWidths[0] + colWidths[1], yPosition + paymentIndex * 12, { width: colWidths[2], align: 'left' });
                });
                yPosition += (movement.pagamentos.length * 12);  // Ajustar o espaço para os pagamentos
            }
        });

        // Renderizar saídas
        movements[date].saida.forEach(movement => {
            renderRow(doc, movement, 'Saída', colWidths, yPosition, pageMargin, true);
            yPosition += 20;
            total -= movement.valor;

            // Renderizar os detalhes dos pagamentos
            if (movement.pagamentos && movement.pagamentos.length > 0) {
                movement.pagamentos.forEach((payment, paymentIndex) => {
                    // Converte payment.valor para número usando Number()
                    const paymentValue = Number(payment.valor);
                    const paymentText = `Forma: ${payment.tipo_pagamento} | Valor: R$ ${paymentValue.toFixed(2)}`;
                    doc.fontSize(10).text(paymentText, pageMargin + colWidths[0] + colWidths[1], yPosition + paymentIndex * 12, { width: colWidths[2], align: 'left' });
                });
                yPosition += (movement.pagamentos.length * 12);  // Ajustar o espaço para os pagamentos
            }
        });

        // Linha horizontal abaixo dos dados
        doc.moveTo(pageMargin, yPosition).lineTo(pageMargin + tableWidth, yPosition).stroke();
        yPosition += 10;

        // Total
        doc.fontSize(14).text(`Total: R$ ${total.toFixed(2)}`, pageMargin + colWidths[0] + colWidths[1] + colWidths[2], yPosition, { width: colWidths[3], align: 'right' });
        yPosition += 20;
    });

    // Finalizando o PDF e enviando a resposta
    doc.end();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="movimentacoes_financeiras.pdf"');
    doc.pipe(res);
});

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
}

module.exports = router;
