const express = require('express');
const router = express.Router();  // Cria o roteador para modularizar as rotas
const PDFDocument = require('pdfkit'); // Biblioteca para geração de PDFs

// Função para gerar o PDF a partir dos dados recebidos
router.post('/gerar-pdf', (req, res) => {
    console.log("Dados recebidos da API:");
    console.log("req.body:", req.body);

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

    const doc = new PDFDocument({ size: 'A4', margin: 40 });  // Reduzindo a margem para aproveitar mais a página
    const pageWidth = doc.page.width;
    const pageMargin = 40;

    // Largura da tabela e das colunas
    const tableWidth = pageWidth - 2 * pageMargin;
    const colWidths = [0.1 * tableWidth, 0.2 * tableWidth, 0.6 * tableWidth, 0.1 * tableWidth]; // Ajustando a largura da coluna de descrição

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
            yPosition += 40; // Aqui aumentamos a distância entre as entradas

            total += movement.valor;

            // Renderizar os detalhes dos pagamentos em 2x2
            if (movement.pagamentos && movement.pagamentos.length > 0) {
                renderPagamento2x2(doc, movement.pagamentos, pageMargin, yPosition, pageWidth);
                yPosition += Math.ceil(movement.pagamentos.length / 2) * 15;  // Ajusta o espaço para os pagamentos
            }
        });

        // Renderizar saídas
        movements[date].saida.forEach(movement => {
            renderRow(doc, movement, 'Saída', colWidths, yPosition, pageMargin, true);
            yPosition += 40; // Aumenta o espaçamento entre as saídas

            total -= movement.valor;

            // Renderizar os detalhes dos pagamentos em 2x2
            if (movement.pagamentos && movement.pagamentos.length > 0) {
                renderPagamento2x2(doc, movement.pagamentos, pageMargin, yPosition, pageWidth);
                yPosition += Math.ceil(movement.pagamentos.length / 2) * 15;  // Ajusta o espaço para os pagamentos
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

// Função para renderizar os detalhes dos pagamentos em 2x2 (centralizados)
function renderPagamento2x2(doc, pagamentos, pageMargin, yPosition, pageWidth) {
    // Ajuste na largura das colunas para reduzir o gap
    const colWidths = [0.38 * (pageWidth - 2 * pageMargin), 0.38 * (pageWidth - 2 * pageMargin)];
    const totalWidth = colWidths[0] + colWidths[1];  // Largura total da tabela 2x2

    // Calcular a posição inicial para centralizar, com um pequeno deslocamento para a direita
    const startX = (pageWidth - totalWidth) / 2 + 20;  // Deslocar para a direita

    let row = 0;
    let col = 0;

    // Diminuir o gap entre as linhas
    const rowHeight = 12;  // Menor distância entre as linhas

    pagamentos.forEach((payment, index) => {
        const xPosition = startX + col * colWidths[0]; // Centraliza nas colunas
        const yOffset = yPosition + row * rowHeight;   // Menor espaço entre as linhas

        const paymentValue = Number(payment.valor_pago);
        const paymentText = `Forma: ${payment.tipo_pagamento} | Valor: R$ ${isNaN(paymentValue) ? 'inválido' : paymentValue.toFixed(2)}`;

        doc.fontSize(8).text(paymentText, xPosition, yOffset, { width: colWidths[0], align: 'left' });

        // Alterna entre as colunas e linhas
        col++;
        if (col === 2) {
            col = 0;
            row++;
        }
    });
}

module.exports = router;
