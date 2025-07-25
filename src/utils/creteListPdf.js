const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Configurações do documento
const doc = new PDFDocument({
  size: 'A4',
  margin: 50,
  bufferPages: true
});

// Dados de exemplo
const data = [
  {
    "nome": "stephany sophy reis de melo",
    "sexo": "feminino",
    "localidade": "RAPOSA (MA)"
  },
  // ... outros dados
];

// Agrupar por localidade
const groupedData = {};
data.forEach(item => {
  if (!groupedData[item.localidade]) {
    groupedData[item.localidade] = [];
  }
  groupedData[item.localidade].push(item);
});

// Estilos
const styles = {
  header: {
    fontSize: 24,
    bold: true,
    color: '#2c3e50'
  },
  localidade: {
    fontSize: 16,
    bold: true,
    color: '#2980b9',
    background: '#f1f8ff'
  },
  item: {
    fontSize: 12,
    color: '#34495e'
  }
};

// Função para adicionar cabeçalho com logo e nome do evento
function addHeader(doc) {
  const logoPath = path.join(__dirname,'..', 'public', 'img', 'TROPAS E CAPITÃES DA REGIÃO 2.png');
  const logoWidth = 70;
  const logoHeight = 70;
  const logoX = doc.page.margins.left;
  const logoY = 30;

  try {
    // Adicionar logo
    doc.image(logoPath, logoX, logoY, { 
      width: logoWidth,
      height: logoHeight
    });
  } catch (err) {
    console.warn('Erro ao carregar logo:', err.message);
    doc.rect(logoX, logoY, logoWidth, logoHeight)
       .fill('#e0e0e0');
  }

  // Texto do evento alinhado verticalmente com o logo
  const textX = logoX + logoWidth + 15;
  // Ajuste para centralizar verticalmente com a imagem
  const textY = logoY + (logoHeight / 2) - (styles.header.fontSize / 3) - 15;

  doc.font('Helvetica-Bold')
     .fontSize(styles.header.fontSize)
     .fillColor(styles.header.color)
     .text('CONFERÊNCIA TROPAS E CAPITÃES DE JUL/2025', textX, textY, {
       align: 'left',
       width: doc.page.width - textX - doc.page.margins.right
     });

  // Linha divisória
  const lineY = Math.max(doc.y, logoY + logoHeight + 20);
  doc.moveTo(doc.page.margins.left, lineY)
     .lineTo(doc.page.width - doc.page.margins.right, lineY)
     .lineWidth(1)
     .strokeColor('#cccccc')
     .stroke();
}

// Gerar PDF
doc.pipe(fs.createWriteStream('participantes.pdf'));

// Adicionar cabeçalho
addHeader(doc);

// Adicionar conteúdo
Object.entries(groupedData).forEach(([localidade, participantes]) => {
  // Verificar se precisa de nova página
  if (doc.y > doc.page.height - 200) {
    doc.addPage();
    // Se quiser repetir o cabeçalho em cada página, descomente:
    // addHeader(doc);
  }

  // Título da localidade
  doc.moveDown(1.5)
     .font('Helvetica-Bold')
     .fontSize(styles.localidade.fontSize)
     .fillColor(styles.localidade.color)
     .text(localidade, {
       align: 'center',
       width: doc.page.width - doc.page.margins.left - doc.page.margins.right,
       background: styles.localidade.background,
       padding: 5
     });

  // Lista de participantes
  participantes.forEach(participante => {
    // Verificar espaço na página
    if (doc.y > doc.page.height - 50) {
      doc.addPage();
      // Se quiser repetir o cabeçalho em cada página, descomente:
      // addHeader(doc);
    }

    doc.moveDown(0.5)
       .font('Helvetica')
       .fontSize(styles.item.fontSize)
       .fillColor(styles.item.color)
       .text(`${participante.nome} - ${participante.sexo}`, {
         indent: 30,
         align: 'left'
       });
  });
});

// Rodapé (opcional)
doc.addPage()
   .fontSize(10)
   .fillColor('#777777')
   .text('Documento gerado em ' + new Date().toLocaleDateString(), {
     align: 'center'
   });

// Finalizar
doc.end();