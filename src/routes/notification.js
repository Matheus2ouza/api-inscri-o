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

async function sendNotificationNormal(message) {
  try {
    console.log('Enviando email para:', 'matheusfurtadogg@gmail.com');

    // Verificação dos dados para garantir que valores ausentes sejam tratados como 0
    const faixa06 = message.inscritos["0-6"] ? message.inscritos["0-6"].masculino + message.inscritos["0-6"].feminino : 0;
    const faixa710 = message.inscritos["7-10"] ? message.inscritos["7-10"].masculino + message.inscritos["7-10"].feminino : 0;
    const faixa10plus = message.inscritos["10+"] ? message.inscritos["10+"].masculino + message.inscritos["10+"].feminino : 0;

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
            <li><strong>Faixa Etária 0-6:</strong> ${faixa06}</li>
            <li><strong>Faixa Etária 7-10:</strong> ${faixa710}</li>
            <li><strong>Faixa Etária 10+:</strong> ${faixa10plus}</li>
          </ul>
          <p>Obrigado por utilizar nosso sistema de inscrições!</p>
        </body>
      </html>
    `;

    // Log da mensagem HTML para depuração
    console.log('Mensagem HTML:', htmlMessage);

    const info = await transport.sendMail({
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

async function sendNotificationJovem(message) {
  try {
    console.log('Enviando email para:', 'matheusfurtadogg@gmail.com');

    // Verificação dos dados para garantir que valores ausentes sejam tratados como 0
    const faixa06 = message.inscritos["0-6"] ? message.inscritos["0-6"].masculino + message.inscritos["0-6"].feminino : 0;
    const faixa710 = message.inscritos["7-10"] ? message.inscritos["7-10"].masculino + message.inscritos["7-10"].feminino : 0;
    const faixa10plus = message.inscritos["10+"] ? message.inscritos["10+"].masculino + message.inscritos["10+"].feminino : 0;

    // Masculino e Feminino para faixa etária 10+
    const masculino10plus = message.inscritos["10+"] ? message.inscritos["10+"].masculino : 0;
    const feminino10plus = message.inscritos["10+"] ? message.inscritos["10+"].feminino : 0;

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
            <li><strong>Faixa Etária 0-6:</strong> ${faixa06}</li>
            <li><strong>Faixa Etária 7-10:</strong> ${faixa710}</li>
            <li><strong>Faixa Etária 10+:</strong> ${faixa10plus} (Masculino: ${masculino10plus}, Feminino: ${feminino10plus})</li>
          </ul>
          <p>Obrigado por utilizar nosso sistema de inscrições!</p>
        </body>
      </html>
    `;

    // Log da mensagem HTML para depuração
    console.log('Mensagem HTML:', htmlMessage);

    const info = await transport.sendMail({
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


module.exports = { sendNotificationNormal, sendNotificationJovem };
