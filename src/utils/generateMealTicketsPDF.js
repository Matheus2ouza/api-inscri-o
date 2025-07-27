const PDFDocument = require('pdfkit');
const { generateQRCodeFood } = require('./qrCodeGenerator');

async function generateMealTicketsPDF(tickets) {
  return new Promise(async (resolve, reject) => {
    try {
      const margin = { top: 10, bottom: 10, left: 5, right: 5 };
      const pageWidth = 137; // largura compatível com impressora Kapbom (58mm)
      const qrSize = 60;
      const spacingBetweenTickets = 15;

      const calculateTicketHeight = () => {
        return 30 + qrSize + 28; // header + QR + footer estimado
      };

      const totalHeight = tickets.reduce((sum) => {
        return sum + calculateTicketHeight() + spacingBetweenTickets;
      }, 0);

      const doc = new PDFDocument({
        size: [pageWidth, totalHeight],
        margins: margin
      });

      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer.toString('base64')); // mantém base64 como no original
      });

      let yPosition = margin.top;

      for (const [index, ticket] of tickets.entries()) {
        // Título
        doc.font('Helvetica-Bold').fontSize(12).fillColor('black');
        doc.text('TICKET DE REFEIÇÃO', 0, yPosition, {
          align: 'center',
          width: pageWidth
        });
        yPosition += 15;

        // Tipo da refeição
        doc.font('Helvetica-Bold').fontSize(9);
        doc.text(ticket.mealType.toUpperCase(), 0, yPosition, {
          align: 'center',
          width: pageWidth
        });
        yPosition += 12;

        // Dia
        doc.font('Helvetica').fontSize(8);
        doc.text(ticket.day.toUpperCase(), 0, yPosition, {
          align: 'center',
          width: pageWidth
        });
        yPosition += 10;

        // Valor
        doc.font('Helvetica-Bold').fontSize(8);
        doc.text(`VALOR: R$ ${ticket.value.toFixed(2)}`, 0, yPosition, {
          align: 'center',
          width: pageWidth
        });
        yPosition += 10;

        // Método de pagamento
        doc.font('Helvetica').fontSize(7);
        doc.text(`PAGO COM: ${ticket.paymentMethod}`, 0, yPosition, {
          align: 'center',
          width: pageWidth
        });
        yPosition += 12;

        // QR Code
        const qrData = `TICKET:${ticket.id}`;
        const qrDataUrl = await generateQRCodeFood(qrData);
        const qrBuffer = Buffer.from(qrDataUrl.replace(/^data:image\/png;base64,/, ''), 'base64');
        const qrX = (pageWidth - qrSize) / 2;

        doc.image(qrBuffer, qrX, yPosition, { width: qrSize });
        yPosition += qrSize + 10;

        // Rodapé
        doc.font('Helvetica').fontSize(6);
        doc.text('TICKET DE USO ÚNICO', 0, yPosition, {
          align: 'center',
          width: pageWidth
        });
        yPosition += 8;

        doc.text('APÓS O USO DESCARTÁ-LO', 0, yPosition, {
          align: 'center',
          width: pageWidth
        });
        yPosition += 10;

        // ID do ticket
        doc.font('Helvetica-Oblique').fontSize(5);
        doc.text(`ID: ${ticket.id}`, 0, yPosition, {
          align: 'center',
          width: pageWidth
        });
        yPosition += 10;

        // Linha divisória
        if (index < tickets.length - 1) {
          doc.moveTo(margin.left, yPosition)
             .lineTo(pageWidth - margin.right, yPosition)
             .stroke();
          yPosition += spacingBetweenTickets;
        }
      }

      doc.end();
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      reject(error);
    }
  });
}

module.exports = { generateMealTicketsPDF };
