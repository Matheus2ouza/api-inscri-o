const express = require('express');
const fs = require('fs'); 
const path = require('path');
const PDFDocument = require('pdfkit');
const createPdfRouter = express.Router();

createPdfRouter.post("/createPdf", async (req, res) => {
  let { tipo, dataInscricao, dataInscricaoAvulsa, dataTicket, dataMovimentacao, ...totals } = req.body;

  // Se o 'tipo' estiver encapsulado em um objeto, extrai a propriedade
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
    
    // Configura os headers da resposta
    res.setHeader("Content-Disposition", `attachment; filename=${tipo}.pdf`);
    res.setHeader("Content-Type", "application/pdf");
    
    // Encaminha o stream do PDF para a resposta
    doc.pipe(res).on('finish', () => {
      console.log("✅ PDF gerado com sucesso!");
      // Não é necessário chamar res.end() aqui, pois o pipe já encerra a resposta.
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
    
    // 📌 Exibir totais (Resumo Financeiro)
    doc.fontSize(14).font("Helvetica-Bold").text("Resumo Financeiro:", { underline: true });
    doc.moveDown(1);
    
    // Posições para exibição dos totais
    const marginLeft = 20;      // Margem esquerda para a chave
    const marginRight = 500;    // Margem para o valor (ajustar conforme necessário)
    const pageWidth = doc.page.width;
    
    Object.entries(totals).forEach(([key, value]) => {
      const currentY = doc.y;
      
      // Exibe a chave (formatada) e o valor (formatado)
      doc.font("Helvetica").fontSize(12)
         .text(formatarChave(key), marginLeft, currentY);
      doc.text(`R$ ${formatarValor(value)}`, marginRight, currentY, { align: 'right' });
      
      // Desenha uma linha abaixo do par chave/valor
      doc.moveTo(marginLeft, doc.y)
         .lineTo(pageWidth - 40, doc.y)
         .stroke();
      
      doc.moveDown(0.5);
    });
    
    doc.moveDown(2);
    console.log("📌 Iniciando geração do PDF...");
    
    // 📌 Seções do relatório
    // Mapeamento dos dados por seção
    const dataMap = {
      "Inscrição": dataInscricao,
      "Inscrição Avulsa": dataInscricaoAvulsa,
      "Tickets": dataTicket,
      "Movimentação": dataMovimentacao
    };
    
    Object.entries(dataMap).forEach(([titulo, dados]) => {
      console.log(`📌 Processando seção: ${titulo}`);
      
      if (dados && Object.keys(dados).length > 0) {
        // Título da seção
        doc.fontSize(14)
           .font("Helvetica-Bold")
           .text(titulo, { underline: true });
        doc.moveDown(1);
        
        // Definição das posições das colunas (ajuste conforme necessário)
        const startX = 20;                 // Margem esquerda
        const colId = startX;
        const colDescricao = colId + 50;     // Coluna para a descrição
        const colPagamentos = colDescricao + 250; // Coluna para pagamentos
        const colValor = colPagamentos + 200;     // Coluna para o valor
        const colTipo = colValor + 80;       // Coluna para o tipo
        
        // Cabeçalho da tabela
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
        
        // Corpo da tabela
        doc.font("Helvetica").fontSize(10);
        Object.values(dados).forEach((item, index) => {
          const currentY = doc.y;
          console.log(`🔹 Processando item ${index + 1}:`, item);
          
          // Valida e define valores padrão para os campos
          const id = item.id ? item.id.toString() : "N/A";
          const descricao = item.descricao || "";
          const formattedDescricao = formatarDescricao(descricao, 50);
          const valorStr = formatarValor(item.valor);
          const tipoItem = item.tipo || "";
          let pagamentosStr = "";
          
          if (item.pagamentos && Array.isArray(item.pagamentos) && item.pagamentos.length > 0) {
            pagamentosStr = item.pagamentos
              .map(pag => {
                const pagId = pag.id ? pag.id.toString() : "N/A";
                const pagTipo = pag.tipo_pagamento || "";
                const pagValor = formatarValor(pag.valor);
                return `ID: ${pagId} - ${pagTipo} (R$ ${pagValor})`;
              })
              .join("\n");
          }
          
          // Escreve os dados nas colunas
          doc.text(id, colId, currentY);
          doc.text(formattedDescricao, colDescricao, currentY, {
            width: 200,
            ellipsis: true
          });
          doc.text(pagamentosStr, colPagamentos, currentY, {
            width: 180
          });
          doc.text(`R$ ${valorStr}`, colValor, currentY);
          doc.text(tipoItem, colTipo, currentY);
          
          doc.moveDown(0.5); // Espaçamento entre linhas
        });
        
        console.log(`✅ Finalizada seção '${titulo}' com ${Object.keys(dados).length} registros`);
        doc.moveDown(1); // Espaço entre seções
      } else {
        console.log(`⚠️ Seção '${titulo}' está vazia e foi ignorada.`);
      }
    });
    
    console.log("✅ Finalizando e encerrando o documento PDF...");
    doc.end();
    
    // Não é necessário logar aqui "PDF gerado com sucesso", 
    // pois o evento 'finish' já cuidará disso.
    
  } catch (error) {
    console.error(`❌ Erro ao gerar PDF: ${error.message}`);
    res.status(500).json({ error: `Erro ao gerar PDF: ${error.message}` });
  }
});

/**
 * 🔹 Formata os valores numéricos para exibição correta
 */
function formatarValor(valor) {
  const num = parseFloat(valor);
  if (isNaN(num)) {
    console.warn("Valor inválido encontrado, usando 0,00:", valor);
    return "0,00";
  }
  return num.toFixed(2).replace(".", ",");
}

/**
 * 🔹 Converte as chaves do objeto para uma versão mais legível
 */
function formatarChave(chave) {
  if (!chave || typeof chave !== 'string') return "";
  return chave.replace("total", "Total").replace(/([A-Z])/g, " $1").trim();
}

/**
 * 🔹 Ajusta descrições muito longas para evitar quebra na tabela
 */
function formatarDescricao(descricao, tamanhoMax) {
  if (!descricao || typeof descricao !== 'string') return "";
  return descricao.length > tamanhoMax
    ? descricao.substring(0, tamanhoMax - 3) + "..."
    : descricao;
}

module.exports = createPdfRouter;
