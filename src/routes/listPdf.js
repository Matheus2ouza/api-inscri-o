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
    const tableWidth = columnWidths.id + columnWidths.nome + columnWidths.localidade; // Largura total da tabela

    // Espaçamento e altura
    const rowHeight = 20; // Altura de cada linha
    const pageHeight = 720; // Altura utilizável (A4 com margem)
    const headerHeight = 40; // Altura do cabeçalho

    // Função para desenhar o cabeçalho da tabela
    const drawHeader = (doc, y) => {
        doc.fontSize(10).font('Helvetica-Bold');  // Cabeçalho com fonte negrito
        doc.text('ID', 40 + 5, y + 5, { width: columnWidths.id, align: 'center' });
        doc.text('Nome', 40 + columnWidths.id + 5, y + 5, { width: columnWidths.nome });
        doc.text('Localidade', 40 + columnWidths.id + columnWidths.nome + 5, y + 5, {
            width: columnWidths.localidade,
        });

        // Linha horizontal abaixo do cabeçalho
        doc.moveTo(40, y + rowHeight).lineTo(40 + tableWidth, y + rowHeight).stroke();
    };

    // Configura o título da primeira página
    doc.fontSize(14).text('Tabela de Dados', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).text(`Relatório Gerado em: ${new Date().toLocaleString()}`);
    doc.moveDown();

    // Inicializa a posição vertical
    let y = doc.y;

    // Desenha o cabeçalho na primeira página
    drawHeader(doc, y);
    y += rowHeight;

    // Define a fonte para o corpo da tabela (Helvetica normal)
    doc.font('Helvetica');  // Garantir que a fonte seja Helvetica normal para os dados

    // Adiciona os dados
    data.forEach((row, index) => {
        // Adiciona uma nova página se necessário
        if (y + rowHeight > pageHeight) {
            doc.addPage();
            y = 40; // Redefine a posição vertical
            drawHeader(doc, y); // Redesenha o cabeçalho com Helvetica-Bold
            y += rowHeight;

            // Garantir que a fonte nas páginas subsequentes seja Helvetica normal
            doc.font('Helvetica');  // Redefine a fonte para Helvetica (não negrito)
        }

        // Escreve os dados na linha atual
        doc.text(row.id, 40 + 5, y + 5, { width: columnWidths.id, align: 'center' });
        doc.text(row.nome, 40 + columnWidths.id + 5, y + 5, { width: columnWidths.nome });
        doc.text(row.localidade, 40 + columnWidths.id + columnWidths.nome + 5, y + 5, {
            width: columnWidths.localidade,
        });

        // Linha horizontal entre as linhas
        doc.moveTo(40, y + rowHeight).lineTo(40 + tableWidth, y + rowHeight).stroke();

        // Incrementa a posição vertical
        y += rowHeight;
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
