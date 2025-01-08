const express = require('express');
const router = express.Router();  // Cria o roteador para modularizar as rotas
const PDFDocument = require('pdfkit'); // Biblioteca para geração de PDFs

// Função para gerar o PDF a partir dos dados recebidos
router.post('/gerar-pdf', (req, res) => {
    const { movements } = req.body; // Recebe os dados agrupados do frontend

    if (!movements || Object.keys(movements).length === 0) {
        return res.status(400).json({ error: 'Dados inválidos ou ausentes.' });
    }

    // Converte todos os valores para números antes de processar
    Object.keys(movements).forEach(date => {
        movements[date].entrada.forEach(movement => {
            movement.valor = parseFloat(movement.valor); // Converte para número
        });

        movements[date].saida.forEach(movement => {
            movement.valor = parseFloat(movement.valor); // Converte para número
        });
    });

    const doc = new PDFDocument({ size: 'A4' });
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;

    // Definir cabeçalhos para o PDF
    doc.fontSize(20).text('Movimentações Financeiras', { align: 'center' });
    doc.moveDown(1); // Move para a próxima linha

    // Largura total disponível para a tabela (excluindo margens)
    const tableLeftMargin = 50;
    const tableRightMargin = 50;
    const tableWidth = pageWidth - tableLeftMargin - tableRightMargin;

    // Definir larguras das colunas com base no tamanho da página
    const colWidths = [0.1 * tableWidth, 0.2 * tableWidth, 0.5 * tableWidth, 0.2 * tableWidth]; // Percentuais da largura total da tabela

    // Loop para percorrer os dados agrupados por dia
    Object.keys(movements).forEach((date, index) => {
        if (index > 0) {
            doc.addPage(); // Adiciona uma nova página para cada data
        }

        doc.fontSize(16).text(`Data: ${date}`, { underline: true });
        doc.moveDown(0.5); // Espaço entre a data e as movimentações

        // Inicializa a tabela
        const tableTop = doc.y;
        doc.fontSize(12);

        // Cabeçalhos da tabela
        const headers = ['ID', 'Tipo', 'Descrição', 'Valor'];
        const headerPositions = [
            tableLeftMargin,
            tableLeftMargin + colWidths[0],
            tableLeftMargin + colWidths[0] + colWidths[1],
            tableLeftMargin + colWidths[0] + colWidths[1] + colWidths[2]
        ];

        // Imprime os cabeçalhos da tabela
        headers.forEach((header, i) => {
            doc.text(header, headerPositions[i], tableTop, { width: colWidths[i], align: 'center' });
        });
        doc.moveDown(0.5); // Espaço entre cabeçalhos e primeira linha

        // Adiciona uma linha horizontal para separar os cabeçalhos
        doc.moveTo(tableLeftMargin, doc.y).lineTo(tableLeftMargin + tableWidth, doc.y).stroke(); 
        
        let total = 0;
        let yPosition = doc.y;

        // Tabelando as entradas e saídas
        movements[date].entrada.forEach(movement => {
            const valorEntrada = movement.valor.toFixed(2);
            doc.text(movement.id, tableLeftMargin, yPosition, { width: colWidths[0], align: 'center' });
            doc.text('Entrada', tableLeftMargin + colWidths[0], yPosition, { width: colWidths[1], align: 'center' });
            doc.text(movement.descricao, tableLeftMargin + colWidths[0] + colWidths[1], yPosition, { width: colWidths[2], align: 'left' });
            doc.text(`+ R$ ${valorEntrada}`, tableLeftMargin + colWidths[0] + colWidths[1] + colWidths[2], yPosition, { width: colWidths[3], align: 'right' });
            yPosition += 20; // Espaço entre linhas
            total += movement.valor;
        });

        movements[date].saida.forEach(movement => {
            const valorSaida = movement.valor.toFixed(2);
            doc.text(movement.id, tableLeftMargin, yPosition, { width: colWidths[0], align: 'center' });
            doc.text('Saída', tableLeftMargin + colWidths[0], yPosition, { width: colWidths[1], align: 'center' });
            doc.text(movement.descricao, tableLeftMargin + colWidths[0] + colWidths[1], yPosition, { width: colWidths[2], align: 'left' });
            doc.text(`- R$ ${valorSaida}`, tableLeftMargin + colWidths[0] + colWidths[1] + colWidths[2], yPosition, { width: colWidths[3], align: 'right' });
            yPosition += 20; // Espaço entre linhas
            total -= movement.valor;
        });

        // Adiciona uma linha horizontal após as movimentações
        doc.moveTo(tableLeftMargin, yPosition).lineTo(tableLeftMargin + tableWidth, yPosition).stroke(); 

        // Exibe o total
        doc.moveDown(0.5); // Espaço antes do total
        doc.fontSize(14).text(`Total: R$ ${total.toFixed(2)}`, tableLeftMargin + colWidths[0] + colWidths[1] + colWidths[2], yPosition, { width: colWidths[3], align: 'right' });

        doc.moveDown(1); // Espaço entre datas
    });

    // Finalizando o PDF e enviando a resposta
    doc.end();

    // Enviar o PDF como um arquivo para o frontend
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="movimentacoes_financeiras.pdf"');
    doc.pipe(res); // Envia o PDF gerado diretamente para a resposta
});


module.exports = router;
