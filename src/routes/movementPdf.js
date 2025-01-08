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

    const doc = new PDFDocument();
    
    // Definir cabeçalhos para o PDF
    doc.fontSize(20).text('Movimentações Financeiras', { align: 'center' });
    doc.moveDown(1); // Move para a próxima linha

    // Loop para percorrer os dados agrupados por dia
    Object.keys(movements).forEach((date, index) => {
        if (index > 0) {
            doc.addPage(); // Adiciona uma nova página para cada data
        }

        doc.fontSize(16).text(`Data: ${date}`, { underline: true });
        doc.moveDown(0.5); // Espaço entre a data e as movimentações

        // Inicializa a tabela
        doc.fontSize(12);
        doc.text('ID', 50, doc.y);
        doc.text('Tipo', 100, doc.y);
        doc.text('Descrição', 200, doc.y);
        doc.text('Valor', 400, doc.y);
        doc.moveDown(0.5); // Espaço entre cabeçalhos e primeira linha

        // Tabelando as entradas e saídas
        let total = 0;

        movements[date].entrada.forEach(movement => {
            const valorEntrada = movement.valor.toFixed(2);
            doc.text(movement.id, 50, doc.y);
            doc.text('Entrada', 100, doc.y);
            doc.text(movement.descricao, 200, doc.y);
            doc.text(`+ R$ ${valorEntrada}`, 400, doc.y);
            doc.moveDown(0.3); // Espaço entre linhas
            total += movement.valor;
        });

        movements[date].saida.forEach(movement => {
            const valorSaida = movement.valor.toFixed(2);
            doc.text(movement.id, 50, doc.y);
            doc.text('Saída', 100, doc.y);
            doc.text(movement.descricao, 200, doc.y);
            doc.text(`- R$ ${valorSaida}`, 400, doc.y);
            doc.moveDown(0.3); // Espaço entre linhas
            total -= movement.valor;
        });

        // Adiciona o total
        doc.moveDown(0.5); // Espaço antes do total
        doc.fontSize(14).text(`Total: R$ ${total.toFixed(2)}`, 400, doc.y);

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
