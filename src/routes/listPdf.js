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
    const doc = new PDFDocument({ margin: 40 });

    // Definindo as dimensões e o espaçamento
    const columnWidths = { numero: 50, nome: 300, localidade: 200 };
    const rowHeight = 20; // Altura de cada linha
    const headerHeight = 40; // Altura do cabeçalho

    // Função para desenhar o cabeçalho
    const drawHeader = (doc, y) => {
        doc.fontSize(10).font('Helvetica-Bold');  // Cabeçalho com fonte negrito
        doc.text('N°', 40 + 5, y + 5, { width: columnWidths.numero, align: 'center' });
        doc.text('Nome', 40 + columnWidths.numero + 5, y + 5, { width: columnWidths.nome });
        doc.text('Localidade', 40 + columnWidths.numero + columnWidths.nome + 5, y + 5, {
            width: columnWidths.localidade,
        });
        
        // Linha horizontal abaixo do cabeçalho
        doc.moveTo(40, y + rowHeight).lineTo(40 + columnWidths.numero + columnWidths.nome + columnWidths.localidade, y + rowHeight).stroke();
    };

    // Se houver dados para a localidade, processa as pessoas
    data.forEach(({ localidade, pessoas }, localidadeIndex) => {
        // Adiciona o título da localidade
        if (localidadeIndex > 0) {
            doc.addPage();  // Adiciona uma nova página para a próxima localidade
        }

        // Título da página com a localidade
        doc.fontSize(14).font('Helvetica-Bold').text(`Lista de Hospedagem - ${localidade}`, { align: 'center' });
        doc.moveDown();

        // Desenha o cabeçalho
        let y = doc.y;
        drawHeader(doc, y);
        y += rowHeight;

        // Adiciona as pessoas à tabela, reiniciando a contagem de N°
        let number = 1;  // Reinicia a contagem para cada localidade
        pessoas.forEach((pessoa) => {
            doc.fontSize(10).font('Helvetica');
            doc.text(number, 40 + 5, y + 5, { width: columnWidths.numero, align: 'center' });
            doc.text(pessoa.nome, 40 + columnWidths.numero + 5, y + 5, { width: columnWidths.nome });
            doc.text(pessoa.localidade, 40 + columnWidths.numero + columnWidths.nome + 5, y + 5, {
                width: columnWidths.localidade,
            });

            // Linha horizontal entre as pessoas
            doc.moveTo(40, y + rowHeight).lineTo(40 + columnWidths.numero + columnWidths.nome + columnWidths.localidade, y + rowHeight).stroke();
            y += rowHeight;

            // Se a página estiver cheia, adicionar uma nova página
            if (y > doc.page.height - doc.page.margins.bottom - rowHeight) {
                doc.addPage();
                y = doc.y; // Reseta a posição Y para o topo da nova página
                drawHeader(doc, y);  // Redesenha o cabeçalho na nova página
                y += rowHeight;
            }

            number++; // Incrementa o número para a próxima pessoa
        });

        doc.moveDown(); // Espaço entre localidades
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
