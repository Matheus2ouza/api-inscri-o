const nodemailer = require('nodemailer');

// Configuração do transporte de e-mail
const transport = nodemailer.createTransport({
  host: process.env.SERVER_SMTP,
  port: process.env.PORT_SMTP,
  secure: true,
  auth: {
    user: process.env.USER_EMAIL,
    pass: process.env.PASSWORD_EMAIL
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

    // Log da mensagem HTML para depuração
    console.log('Mensagem HTML:', htmlMessage);

    const info = await smtp.sendMail({
      from: `Sistema de Inscrição ${process.env.USER_EMAIL}`,
      to: 'matheusfurtadogg@gmail.com',
      subject: 'Nova Inscrição/Pagamento',
      html: htmlMessage 
    });

    console.log('E-mail enviado com sucesso:', info.response);
  } catch (error) {
    console.error('Erro ao enviar e-mail:', error);
  }
}

module.exports = { sendNotification };
