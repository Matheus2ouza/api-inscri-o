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

const generatePDF = (data, res) => {
    const doc = new PDFDocument({ margin: 40 });

    // Dimensões das colunas
    const columnWidths = { id: 50, nome: 300, localidade: 200 };

    // Configura título
    doc.fontSize(14).text('Tabela de Dados', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).text(`Relatório Gerado em: ${new Date().toLocaleString()}`);
    doc.moveDown();

    // Define as posições iniciais
    let y = doc.y;
    const xStart = 40; // Margem lateral esquerda
    const tableWidth = columnWidths.id + columnWidths.nome + columnWidths.localidade; // Largura total da tabela

    // Desenha o cabeçalho
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('ID', xStart + 5, y + 5, { width: columnWidths.id, align: 'center' });
    doc.text('Nome', xStart + columnWidths.id + 5, y + 5, { width: columnWidths.nome });
    doc.text('Localidade', xStart + columnWidths.id + columnWidths.nome + 5, y + 5, {
        width: columnWidths.localidade,
    });

    // Linha horizontal abaixo do cabeçalho
    y += 20;
    doc.moveTo(xStart, y).lineTo(xStart + tableWidth, y).stroke();

    // Preenche os dados
    doc.font('Helvetica');
    data.forEach((row) => {
        doc.text(row.id, xStart + 5, y + 5, { width: columnWidths.id, align: 'center' });
        doc.text(row.nome, xStart + columnWidths.id + 5, y + 5, { width: columnWidths.nome });
        doc.text(row.localidade, xStart + columnWidths.id + columnWidths.nome + 5, y + 5, {
            width: columnWidths.localidade,
        });

        // Incrementa a posição vertical
        y += 20;

        // Linha horizontal entre as linhas
        doc.moveTo(xStart, y).lineTo(xStart + tableWidth, y).stroke();
    });

    // Define os cabeçalhos HTTP para o download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=relatorio.pdf');

    // Envia o PDF para o cliente
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
