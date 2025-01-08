const express = require('express');
const router = express.Router();
const PDFDocument = require('pdfkit'); // Biblioteca para geração de PDFs

// Função para gerar o PDF a partir dos dados recebidos
router.post('/gerar-pdf', (req, res) => {
    const { movements } = req.body; // Recebe os dados agrupados do frontend

    if (!movements || Object.keys(movements).length === 0) {
        return res.status(400).json({ error: 'Dados inválidos ou ausentes.' });
    }

    const doc = new PDFDocument();
    
    // Definir cabeçalhos para o PDF
    doc.fontSize(20).text('Movimentações Financeiras', { align: 'center' });
    doc.moveDown(1); // Move para a próxima linha

    // Loop para percorrer os dados agrupados por dia
    Object.keys(movements).forEach(date => {
        doc.fontSize(16).text(`Data: ${date}`, { underline: true });
        doc.moveDown(0.5); // Espaço entre a data e as movimentações

        // Loop para mostrar entradas
        if (movements[date].entrada.length > 0) {
            doc.fontSize(14).text('Entradas:', { bold: true });
            movements[date].entrada.forEach(movement => {
                doc.fontSize(12).text(`ID: ${movement.id} | ${movement.descricao} | R$ ${movement.valor.toFixed(2)}`);
            });
            doc.moveDown(1); // Espaço entre categorias
        }

        // Loop para mostrar saídas
        if (movements[date].saida.length > 0) {
            doc.fontSize(14).text('Saídas:', { bold: true });
            movements[date].saida.forEach(movement => {
                doc.fontSize(12).text(`ID: ${movement.id} | ${movement.descricao} | R$ ${movement.valor.toFixed(2)}`);
            });
            doc.moveDown(1); // Espaço entre categorias
        }

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
