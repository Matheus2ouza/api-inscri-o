const express = require('express');
const router = express.Router();
const { pool } = require('../db/dbConnection');
const PDFDocument = require('pdfkit');

// Função para buscar os dados do banco com filtro
const fetchFilteredData = async (filter) => {
    try {
        // Monta a query com ou sem filtro
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

        // Adiciona o filtro se estiver definido
        if (filter) {
            query += ` WHERE l.nome = $1`;
            const { rows } = await pool.query(query, [filter]);
            return rows;
        }

        // Caso contrário, retorna todos os dados
        const { rows } = await pool.query(query);
        return rows;
    } catch (err) {
        console.error('Erro ao buscar dados filtrados: ', err);
        throw new Error('Erro ao buscar dados para o PDF');
    }
};

// Função para gerar o PDF com os dados
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


module.exports = router;
