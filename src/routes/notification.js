const nodemailer = require('nodemailer');

const smtp = nodemailer.createTransport({
  host: 'smtpsmtp.gmail.com',
  port: 587,
  secure: true,
  auth: {
    user: 'matifurtado0@gmail.com',
    pass: 'bigtank155'
  }
});

async function sendNotification(message) {
  try {
    console.log('Enviando email para:', 'matheusfurtadogg@gmail.com');

        // Criação do corpo da mensagem em HTML
        const htmlMessage = `
        <html>
          <body>
            <h2>Nova Inscrição/Pagamento</h2>
            <p><strong>Detalhes da inscrição:</strong></p>
            <ul>
              <li><strong>Localidade:</strong> ${message.localidade}</li>
              <li><strong>Responsável:</strong> ${message.nomeResponsavel}</li>
              <li><strong>Total de Inscritos:</strong> ${message.totalInscritos}</li>
              <li><strong>Faixa Etária 0-6:</strong> ${message.inscritos["0-6"].masculino + message.inscritos["0-6"].feminino}</li>
              <li><strong>Faixa Etária 7-10:</strong> ${message.inscritos["7-10"].masculino + message.inscritos["7-10"].feminino}</li>
              <li><strong>Faixa Etária 10+:</strong> ${message.inscritos["10+"].masculino + message.inscritos["10+"].feminino}</li>
            </ul>
            <p>Obrigado por utilizar nosso sistema de inscrições!</p>
          </body>
        </html>
      `;

    console.log('Mensagem:', message);
    const info = await transporter.sendMail({
      from: 'matifurtado0@gmail.com',
      to: 'matheusfurtadogg@gmail.com',
      subject: 'Nova Inscrição/Pagamento',
      text: message
    });
    console.log('E-mail enviado com sucesso:', info.response);
  } catch (error) {
    console.error('Erro ao enviar e-mail:', error);
  }
}

module.exports = { sendNotification };
