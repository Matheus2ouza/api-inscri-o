const nodemailer = require('nodemailer');

const smtp = nodemailer.createTransport({
  host: 'smtp.gmail.com', // Corrigido o nome do host para o correto.
  port: 587,
  secure: true,
  auth: {
    user: 'matifurtado0@gmail.com',
    pass: 'bigtank155'  // Considere usar variáveis de ambiente para armazenar senhas, em vez de deixá-las no código
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
      from: 'matifurtado0@gmail.com',
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
