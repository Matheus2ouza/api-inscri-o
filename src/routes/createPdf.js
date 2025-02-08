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
        console.log(tipo);
        return res.status(400).json({ error: "❌ Tipo inválido ou não fornecido!" });
    }

    try {
        // Configura o tamanho da página com largura e altura personalizadas
        const doc = new PDFDocument({
            size: [620, 820], // Largura de 620px e altura de 820px
            margin: 50
        });
    
        res.setHeader("Content-Disposition", `attachment; filename=${tipo}.pdf`);
        res.setHeader("Content-Type", "application/pdf");
    
        // Pipe para a resposta. Note que não chamamos res.end() manualmente.
        doc.pipe(res).on('finish', () => {
            console.log("✅ PDF gerado com sucesso!");
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
        doc.fontSize(18)
           .font("Helvetica-Bold")
           .text(`Relatório ${tipo.toUpperCase()}`, 40, 75, { align: "left" });
        doc.moveDown(2);

        // 📌 Exibir totais
        doc.fontSize(14)
           .font("Helvetica-Bold")
           .text("Resumo Financeiro:", { underline: true });
        doc.moveDown(1);

        // Posições para exibir os totais
        const marginLeft = 20;   // Margem esquerda para a chave
        const marginRight = 500; // Margem para o valor (ajustar conforme necessário)
        const pageWidth = doc.page.width;

        Object.entries(totals).forEach(([key, value]) => {
            const currentY = doc.y;
            
            // Exibe a chave formatada e o valor formatado
            doc.font("Helvetica").fontSize(12)
               .text(formatarChave(key), marginLeft, currentY);
            doc.text(`R$ ${formatarValor(value)}`, marginRight, currentY, { align: 'right' });
            
            // Linha divisória abaixo do par chave/valor
            doc.moveTo(marginLeft, doc.y)
               .lineTo(pageWidth - 40, doc.y)
               .stroke();
            doc.moveDown(0.5);
        });

        doc.moveDown(2);
    
        console.log("📌 Iniciando geração do PDF...");

        // 📌 Seções do relatório
        const dataMap = {
            "Inscrição": dataInscricao,
            "Inscrição Avulsa": dataInscricaoAvulsa,
            "Tickets": dataTicket,
            "Movimentação": dataMovimentacao
        };

        Object.entries(dataMap).forEach(([titulo, dados]) => {
            console.log(`📌 Processando seção: ${titulo}`);

            if (dados && Object.keys(dados).length > 0) {
                doc.fontSize(14)
                   .font("Helvetica-Bold")
                   .text(titulo, { underline: true });
                doc.moveDown(1);

                // 📌 Cabeçalho da tabela - Define posições fixas para cada coluna
                const startX = 20;  // Margem esquerda
                const colId = startX;
                const colDescricao = colId + 50;  // Coluna para a descrição
                const colPagamentos = colDescricao + 250;  // Coluna para pagamentos
                const colValor = colPagamentos + 200;  // Coluna para o valor
                const colTipo = colValor + 80;  // Coluna para o tipo

                doc.font("Helvetica-Bold").fontSize(10);
                doc.text("ID", colId, doc.y);
                doc.text("Descrição", colDescricao, doc.y);
                doc.text("Pagamentos", colPagamentos, doc.y);
                doc.text("Valor", colValor, doc.y);
                doc.text("Tipo", colTipo, doc.y);
                doc.moveDown(0.5);

                console.log(`✅ Cabeçalho da seção '${titulo}' criado`);

                // Linha divisória
                doc.moveTo(startX, doc.y).lineTo(580, doc.y).stroke();
                doc.moveDown(0.5);

                // 📌 Corpo da tabela
                doc.font("Helvetica").fontSize(10);
                Object.values(dados).forEach((item, index) => {
                    const currentY = doc.y;
                    console.log(`🔹 Processando item ${index + 1}:`, item);

                    // Coluna ID
                    doc.text(item.id.toString(), colId, currentY);

                    // Coluna Descrição
                    doc.text(formatarDescricao(item.descricao, 50), colDescricao, currentY, {
                        width: 200,
                        ellipsis: true
                    });

                    // Coluna Pagamentos:
                    // Se o array de pagamentos estiver vazio, exibe "N/A".
                    const pagamentosStr = (item.pagamentos && Array.isArray(item.pagamentos) && item.pagamentos.length > 0)
                        ? item.pagamentos
                              .map(pag => `${pag.tipo_pagamento} (R$ ${formatarValor(pag.valor)})`)
                              .join("\n")
                        : "N/A";
                    doc.text(pagamentosStr, colPagamentos, currentY, { width: 180 });

                    // Coluna Valor
                    doc.text(`R$ ${formatarValor(item.valor)}`, colValor, currentY);

                    // Coluna Tipo
                    doc.text(item.tipo, colTipo, currentY);

                    doc.moveDown(0.5);
                });

                console.log(`✅ Finalizada seção '${titulo}' com ${Object.keys(dados).length} registros`);
                doc.moveDown(1);
            } else {
                console.log(`⚠️ Seção '${titulo}' está vazia e foi ignorada.`);
            }
        });

        console.log("✅ Finalizando e encerrando o documento PDF...");
        doc.end();
        console.log("🎉 PDF gerado com sucesso!");
        
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
    return descricao.length > tamanhoMax
        ? descricao.substring(0, tamanhoMax - 3) + "..."
        : descricao.padEnd(tamanhoMax);
}

module.exports = createPdfRouter;
