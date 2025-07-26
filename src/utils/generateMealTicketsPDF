const PDFDocument = require('pdfkit');
const { generateQRCode } = require('./qrCodeGenerator');

async function generateMealTicketsPDF(tickets) {
  return new Promise(async (resolve, reject) => {
    try {
      // Configuração do documento - altura proporcional ao número de tickets
      const ticketHeight = 150;
      const spacing = 10;
      const doc = new PDFDocument({
        size: [80, (ticketHeight + spacing) * tickets.length],
        margins: { top: 5, bottom: 5, left: 5, right: 5 },
      });

      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers).toString('base64')));

      // Gerar cada ticket no PDF
      let yPosition = 5; // Posição vertical inicial

      for (const ticket of tickets) {
        // === Cabeçalho ===
        doc.font('Helvetica-Bold').fontSize(10).fillColor('black');
        doc.text('TICKET DE REFEIÇÃO', 0, yPosition, { align: 'center', width: doc.page.width });
        yPosition += 12;

        // === Informações da Refeição ===
        doc.font('Helvetica-Bold').fontSize(8);
        doc.text(ticket.mealType.toUpperCase(), 0, yPosition, { align: 'center', width: doc.page.width });
        yPosition += 10;
        
        doc.font('Helvetica').fontSize(7);
        doc.text(ticket.day.toUpperCase(), 0, yPosition, { align: 'center', width: doc.page.width });
        yPosition += 10;

        // === Valor ===
        doc.font('Helvetica-Bold').fontSize(8);
        doc.text(`VALOR: R$ ${ticket.value.toFixed(2)}`, 0, yPosition, { align: 'center', width: doc.page.width });
        yPosition += 12;

        // === QR Code ===
        const qrData = `TICKET:${ticket.id}`;
        const qrDataUrl = await generateQRCode(qrData);
        const qrBuffer = Buffer.from(qrDataUrl.replace(/^data:image\/png;base64,/, ''), 'base64');

        const qrSize = 60;
        const qrX = (doc.page.width - qrSize) / 2;
        doc.image(qrBuffer, qrX, yPosition, { width: qrSize });
        yPosition += qrSize + 8;

        // === Rodapé ===
        doc.font('Helvetica').fontSize(6);
        doc.text('TICKET DE USO ÚNICO', 0, yPosition, { align: 'center', width: doc.page.width });
        yPosition += 8;
        doc.text('APÓS O USO DESCARTÁ-LO', 0, yPosition, { align: 'center', width: doc.page.width });
        yPosition += 8;

        // ID do ticket pequeno
        doc.font('Helvetica-Oblique').fontSize(5);
        doc.text(`ID: ${ticket.id}`, 0, yPosition, { align: 'center', width: doc.page.width });
        yPosition += 10;

        // Adiciona linha divisória entre tickets (exceto após o último)
        if (ticket !== tickets[tickets.length - 1]) {
          doc.moveTo(10, yPosition).lineTo(doc.page.width - 10, yPosition).stroke();
          yPosition += spacing;
        }
      }

      doc.end();
    } catch (error) {
      console.error("Erro ao gerar PDF de tickets:", error);
      reject(error);
    }
  });
}

module.exports = { generateMealTicketsPDF };