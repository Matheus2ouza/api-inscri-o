const PDFDocument = require('pdfkit');
const { generateQRCode } = require('./qrCodeGenerator');

async function generateMealTicketsPDF(tickets) {
  return new Promise(async (resolve, reject) => {
    try {
      // Configurações do PDF
      const ticketHeight = 150;
      const spacing = 15;
      const doc = new PDFDocument({
        size: [80, (ticketHeight + spacing) * tickets.length],
        margins: { top: 10, bottom: 10, left: 10, right: 10 }
      });

      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers).toString('base64')));

      let yPosition = 10;

      for (const ticket of tickets) {
        // Cabeçalho
        doc.font('Helvetica-Bold').fontSize(10).fillColor('black');
        doc.text('TICKET DE REFEIÇÃO', 0, yPosition, { align: 'center', width: doc.page.width });
        yPosition += 12;

        // Informações da refeição
        doc.font('Helvetica-Bold').fontSize(8);
        doc.text(ticket.mealType.toUpperCase(), 0, yPosition, { align: 'center', width: doc.page.width });
        yPosition += 10;
        
        doc.font('Helvetica').fontSize(7);
        doc.text(ticket.day.toUpperCase(), 0, yPosition, { align: 'center', width: doc.page.width });
        yPosition += 10;

        // Valor e método de pagamento
        doc.font('Helvetica-Bold').fontSize(8);
        doc.text(`VALOR: R$ ${ticket.value.toFixed(2)}`, 0, yPosition, { align: 'center', width: doc.page.width });
        yPosition += 10;
        
        doc.font('Helvetica').fontSize(7);
        doc.text(`PAGO COM: ${ticket.paymentMethod}`, 0, yPosition, { align: 'center', width: doc.page.width });
        yPosition += 12;

        // QR Code
        const qrData = `TICKET:${ticket.id}`;
        const qrDataUrl = await generateQRCode(qrData);
        const qrBuffer = Buffer.from(qrDataUrl.replace(/^data:image\/png;base64,/, ''), 'base64');

        const qrSize = 60;
        const qrX = (doc.page.width - qrSize) / 2;
        doc.image(qrBuffer, qrX, yPosition, { width: qrSize });
        yPosition += qrSize + 10;

        // Rodapé
        doc.font('Helvetica').fontSize(6);
        doc.text('TICKET DE USO ÚNICO', 0, yPosition, { align: 'center', width: doc.page.width });
        yPosition += 8;
        doc.text('APÓS O USO DESCARTÁ-LO', 0, yPosition, { align: 'center', width: doc.page.width });
        yPosition += 10;

        // ID do ticket
        doc.font('Helvetica-Oblique').fontSize(5);
        doc.text(`ID: ${ticket.id}`, 0, yPosition, { align: 'center', width: doc.page.width });
        yPosition += 10;

        // Linha divisória (exceto após o último ticket)
        if (ticket !== tickets[tickets.length - 1]) {
          doc.moveTo(10, yPosition).lineTo(doc.page.width - 10, yPosition).stroke();
          yPosition += spacing;
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