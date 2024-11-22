const express = require('express');
const router = express.Router();
const { pool } = require('../db/dbConnection');
const PDFDocument = require('pdfkit');

// Função para buscar os dados do banco com filtro
const generatePDF = async (req, res) => {
    try {
        // Captura o filtro de localidade (se houver)
        const localidade = req.query.localidade || null;

        // Buscar os dados do banco (todas as localidades, ou filtradas por uma localidade específica)
        let query = `
            SELECT 
                h.id, 
                h.nome, 
                l.nome AS localidade
            FROM 
                hospedagem h
            JOIN 
                inscricao_geral i ON h.id_inscricao = i.id
            JOIN 
                localidades l ON i.localidade_id = l.id;
        `;

        let { rows } = await pool.query(query);

        // Se uma localidade for especificada, filtra os dados
        if (localidade) {
            rows = rows.filter(row => row.localidade === localidade);
        }

        // Organiza os dados por localidade
        const groupedData = groupByLocation(rows); // A função groupByLocation que você já tem

        // Gera o PDF com os dados organizados
        const doc = new PDFDocument({ margin: 40 });

        // Adiciona os dados das localidades ao PDF
        groupedData.forEach(({ localidade, pessoas }) => {
            doc.addPage();

            // Título da página com a localidade
            doc.fontSize(16).font('Helvetica-Bold').text(`Lista de Hospedagem - ${localidade}`, { align: 'center' });
            doc.moveDown();

            // Cabeçalho da tabela
            let y = doc.y;
            drawHeader(doc, y); // Função para desenhar o cabeçalho da tabela
            y += rowHeight;

            // Adiciona as pessoas para a localidade
            pessoas.forEach((pessoa, index) => {
                doc.fontSize(10).font('Helvetica');
                doc.text(index + 1, 40 + 5, y + 5, { width: columnWidths.id, align: 'center' }); // Recomeça a contagem de ID para cada localidade
                doc.text(pessoa.nome, 40 + columnWidths.id + 5, y + 5, { width: columnWidths.nome });
                doc.text(pessoa.localidade, 40 + columnWidths.id + columnWidths.nome + 5, y + 5, { width: columnWidths.localidade });

                y += rowHeight;
            });
        });

        // Cabeçalhos para o download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=relatorio.pdf');

        // Gera o PDF
        doc.pipe(res);
        doc.end();
    } catch (err) {
        console.error('Erro ao gerar PDF:', err);
        res.status(500).json({ message: 'Erro ao gerar PDF' });
    }
};

// Rota para gerar o PDF
router.get('/generate-pdf', async (req, res) => {
    try {
        // Captura o filtro da query string
        const filter = req.query.localidade || null;

        // Busca os dados no banco com ou sem filtro
        const data = await fetchFilteredData(filter);

        // Reorganiza os dados por localidade
        const groupedData = groupByLocation(data);

        // Gera o PDF com os dados retornados
        generatePDF(groupedData, res);
    } catch (err) {
        console.error('Erro ao gerar PDF: ', err);
        res.status(500).json({ message: 'Erro ao gerar PDF' });
    }
});

module.exports = router;
