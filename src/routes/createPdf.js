const express = require('express');
const fs = require('fs'); 
const path = require('path');
const PDFDocument = require('pdfkit');
const createPdfRouter = express.Router();

createPdfRouter.post("/createPdf", async (req, res) => {

    let { tipo, dataInscricao, dataInscricaoAvulsa, dataTicket, dataMovimentacao, ...totals } = req.body;

    if (typeof tipo === 'object' && tipo !== null) {
        tipo = tipo.tipo;
    }

    if (!tipo || typeof tipo !== 'string') {
        return res.status(400).json({ error: "❌ Tipo inválido ou não fornecido!" });
    }

    try {
        // Configura o tamanho da página com largura e altura personalizadas
        const doc = new PDFDocument({
            size: [620, 820], // Largura de 600px e altura de 800px
            margin: 50
        });
    
        res.setHeader("Content-Disposition", `attachment; filename=${tipo}.pdf`);
        res.setHeader("Content-Type", "application/pdf");
    
        doc.pipe(res).on('finish', () => {
            console.log("✅ PDF gerado com sucesso!");
            res.end();
        });
    
        // 📌 Verifica se a imagem existe antes de adicioná-la
        const imagePath = path.join(__dirname, '..', 'public', 'img', 'logo_conf_Tropas_e_Capitães.png');
        console.log(`🖼️ Tentando carregar a imagem em: ${imagePath}`);        
    
        if (fs.existsSync(imagePath)) {
            doc.image(imagePath, 480, 20, { width: 100 });
        } else {
            console.warn(`⚠️ Arquivo de imagem não encontrado: ${imagePath}`);
        }
    
        // 📌 Título do relatório alinhado à esquerda
        doc.fontSize(18).font("Helvetica-Bold").text(`Relatório ${tipo.toUpperCase()}`, 40, 75, { align: "left" });
        doc.moveDown(2);
    
        // 📌 Exibir totais
        doc.fontSize(14).font("Helvetica-Bold").text("Resumo Financeiro:", { underline: true });
        doc.moveDown(1);

        // Definir uma posição inicial para a chave
        const marginLeft = 50;  // Margem esquerda para a chave
        const marginRight = 550;  // Margem direita para o valor (ajustar conforme necessário)

        Object.entries(totals).forEach(([key, value]) => {
            // Exibir chave alinhada à esquerda
            doc.font("Helvetica").fontSize(12).text(formatarChave(key), marginLeft, doc.y);
            
            // Exibir valor alinhado à direita
            doc.text(`R$ ${formatarValor(value)}`, marginRight, doc.y, { align: 'right' });
            
            doc.moveDown(0.5);  // Adiciona um pequeno espaço entre as linhas
        });

        doc.moveDown(2);  // Espaço após os totais
    
        // 📌 Seções do relatório
        const dataMap = {
            "Inscrição": dataInscricao,
            "Inscrição Avulsa": dataInscricaoAvulsa,
            "Tickets": dataTicket,
            "Movimentação": dataMovimentacao
        };
    
        Object.entries(dataMap).forEach(([titulo, dados]) => {
            if (dados && Object.keys(dados).length > 0) {
                doc.fontSize(14).font("Helvetica-Bold").text(titulo, { underline: true });
                doc.moveDown(1);
    
                // 📌 Cabeçalho da tabela
                doc.font("Helvetica-Bold").fontSize(10);
                doc.text("ID".padEnd(6) + "Descrição".padEnd(50) + "Valor".padEnd(12) + "Tipo".padEnd(10), { underline: true });
                doc.text("-".repeat(85));
    
                doc.font("Helvetica").fontSize(10);
                Object.values(dados).forEach((item) => {
                    const id = item.id.toString().padEnd(6);
                    const descricao = formatarDescricao(item.descricao, 50);
                    const valor = `R$ ${formatarValor(item.valor)}`.padEnd(12);
                    const tipo = item.tipo.padEnd(10);
    
                    doc.text(`${id}${descricao}${valor}${tipo}`);
                });
    
                doc.moveDown(2);
            }
        });
    
        doc.end();
    } catch (error) {
        console.error(`❌ Erro ao gerar PDF: ${error.message}`);
        res.status(500).json({ error: `Erro ao gerar PDF: ${error.message}` });
    }
    
    
});

/**
 * 🔹 Formata os valores numéricos para exibição correta
 */
function formatarValor(valor) {
    return parseFloat(valor).toFixed(2).replace(".", ",");
}

/**
 * 🔹 Converte as chaves do objeto para uma versão mais legível
 */
function formatarChave(chave) {
    return chave.replace("total", "Total").replace(/([A-Z])/g, " $1").trim();
}

/**
 * 🔹 Ajusta descrições muito longas para evitar quebra na tabela
 */
function formatarDescricao(descricao, tamanhoMax) {
    return descricao.length > tamanhoMax ? descricao.substring(0, tamanhoMax - 3) + "..." : descricao.padEnd(tamanhoMax);
}

module.exports = createPdfRouter;