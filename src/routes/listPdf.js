const express = require('express');
const router = express.Router();
const { pool } = require('../db/dbConnection');
const PDFDocument = require('pdfkit');

// Função para buscar os dados do banco com filtro
const fetchFilteredData = async (filter) => {
    try {
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
                localidades l ON i.localidade_id = l.id
        `;

        // Adiciona filtro de localidade, se houver
        if (filter) {
            query += ` WHERE l.nome = $1`;
            const { rows } = await pool.query(query, [filter]);
            return rows;
        }

        // Retorna todos os registros se não houver filtro
        const { rows } = await pool.query(query);
        return rows;
    } catch (err) {
        console.error('Erro ao buscar dados filtrados: ', err);
        throw new Error('Erro ao buscar dados para o PDF');
    }
};

// Função para gerar o PDF
const generatePDF = (data, res) => {
    const doc = new PDFDocument();

    // Configura título e cabeçalho
    doc.fontSize(14).text('Tabela de Dados', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).text(`Relatório Gerado em: ${new Date().toLocaleString()}`);
    doc.moveDown();

    // Adiciona as colunas
    let y = 100;
    doc.fontSize(10).text('ID', 50, y);
    doc.text('Nome', 150, y);
    doc.text('Localidade', 300, y);
    y += 20;

    // Adiciona as linhas
    data.forEach((row) => {
        doc.text(row.id, 50, y);
        doc.text(row.nome, 150, y);
        doc.text(row.localidade, 300, y);
        y += 20;
    });

    // Define o cabeçalho para o download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=relatorio.pdf');

    // Gera e finaliza o PDF
    doc.pipe(res);
    doc.end();
};

// Rota para gerar o PDF
router.get('/generate-pdf', async (req, res) => {
    try {
        // Captura o filtro da query string
        const filter = req.query.localidade || null;

        // Busca os dados no banco com ou sem filtro
        const data = await fetchFilteredData(filter);

        // Gera o PDF com os dados retornados
        generatePDF(data, res);
    } catch (err) {
        console.error('Erro ao gerar PDF: ', err);
        res.status(500).json({ message: 'Erro ao gerar PDF' });
    }
});

module.exports = router;
