const express = require('express'); // Framework para criar e gerenciar servidores web
const router = express.Router(); // Permite criar rotas modularizadas
const { pool } = require('../db/dbConnection'); // Conexão com o banco de dados usando Pool
const PDFDocument = require('pdfkit'); // Biblioteca para geração de PDFs

// Função para buscar dados do banco, aplicando filtro por localidade (se fornecida)
const fetchFilteredData = async (localidade) => {
    try {
        // Consulta SQL, com ou sem filtro de localidade
        const query = localidade 
            ? `
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
                WHERE 
                    l.nome = $1; -- Filtra pela localidade fornecida
            `
            : `
                SELECT 
                    h.id, 
                    h.nome, 
                    l.nome AS localidade
                FROM 
                    hospedagem h
                JOIN 
                    inscricao_geral i ON h.id_inscricao = i.id
                JOIN 
                    localidades l ON i.localidade_id = l.id; -- Retorna todas as localidades
            `;
        
        const values = localidade ? [localidade] : []; // Define os valores para a consulta, se necessário

        // Executa a consulta no banco de dados
        const { rows } = await pool.query(query, values);

        // Organiza os resultados por localidade
        return groupByLocation(rows);
    } catch (err) {
        console.error('Erro ao buscar dados filtrados: ', err);
        throw new Error('Erro ao buscar dados para o PDF');
    }
};

// Função para agrupar pessoas por localidade
function groupByLocation(pessoas) {
    const groupedByLocation = pessoas.reduce((acc, pessoa) => {
        if (!acc[pessoa.localidade]) acc[pessoa.localidade] = []; // Inicializa o array se não existir
        acc[pessoa.localidade].push(pessoa); // Adiciona a pessoa ao grupo correspondente
        return acc;
    }, {});

    // Converte o agrupamento em um array estruturado
    return Object.entries(groupedByLocation).map(([localidade, pessoas]) => ({
        localidade,
        pessoas,
    }));
}

// Função para gerar o PDF com os dados fornecidos
const generatePDF = (data, res, localidade = null) => {
    const doc = new PDFDocument({ margin: 40 }); // Cria o documento PDF com margens padrão

    // Configuração das larguras das colunas da tabela
    const columnWidths = { numero: 50, nome: 300, localidade: 200 };
    const rowHeight = 20; // Altura de cada linha da tabela
    const headerHeight = 40; // Altura do cabeçalho da tabela

    // Função para desenhar o cabeçalho da tabela
    const drawHeader = (doc, y) => {
        doc.fontSize(10).font('Helvetica-Bold'); // Fonte em negrito para o cabeçalho
        doc.text('N°', 40 + 5, y + 5, { width: columnWidths.numero, align: 'center' });
        doc.text('Nome', 40 + columnWidths.numero + 5, y + 5, { width: columnWidths.nome });
        doc.text('Localidade', 40 + columnWidths.numero + columnWidths.nome + 5, y + 5, {
            width: columnWidths.localidade,
        });
        
        // Desenha uma linha horizontal abaixo do cabeçalho
        doc.moveTo(40, y + rowHeight).lineTo(40 + columnWidths.numero + columnWidths.nome + columnWidths.localidade, y + rowHeight).stroke();
    };

    // Adiciona os dados ao PDF, com uma página para cada localidade
    data.forEach(({ localidade, pessoas }, localidadeIndex) => {
        if (localidadeIndex > 0) {
            doc.addPage(); // Nova página para cada localidade, exceto a primeira
        }

        // Adiciona o título da página
        doc.fontSize(14).font('Helvetica-Bold').text(`Lista de Hospedagem - ${localidade}`, { align: 'center' });
        doc.moveDown();

        // Desenha o cabeçalho da tabela
        let y = doc.y;
        drawHeader(doc, y);
        y += rowHeight;

        // Adiciona as pessoas à tabela
        let number = 1; // Contador para numerar as pessoas
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

            // Verifica se precisa de uma nova página
            if (y > doc.page.height - doc.page.margins.bottom - rowHeight) {
                doc.addPage();
                y = doc.y; // Redefine a posição Y
                drawHeader(doc, y); // Redesenha o cabeçalho
                y += rowHeight;
            }

            number++;
        });

        doc.moveDown(); // Espaçamento entre localidades
    });

    // Define o nome do arquivo PDF
    const pdfFilename = localidade
        ? `lista de hospedagem - ${localidade}.pdf`
        : 'lista de hospedagem geral.pdf';

    // Define os cabeçalhos para o download do PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(pdfFilename)}"`);

    // Envia o PDF para o cliente
    doc.pipe(res);
    doc.end();
};

// Rota para gerar o PDF baseado em um filtro de localidade
router.get('/generate-pdf', async (req, res) => {
    try {
        const filter = req.query.localidade || null; // Captura o filtro da query string
        const data = await fetchFilteredData(filter); // Busca os dados no banco
        generatePDF(data, res, filter); // Gera o PDF
    } catch (err) {
        console.error('Erro ao gerar PDF: ', err);
        res.status(500).json({ message: 'Erro ao gerar PDF' });
    }
});

module.exports = router;
