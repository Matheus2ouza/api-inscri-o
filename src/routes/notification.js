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

    // Desestruturação dos dados da mensagem
    const { localidade, nomeResponsavel, totalAge, masculine, feminine } = message;

    // Verificação dos dados para garantir que valores ausentes sejam tratados como 0
    const masculino10plus = masculine || 0;
    const feminino10plus = feminine || 0;
    const totalSubscribers = masculino10plus + feminino10plus;

    // Criação do corpo da mensagem em HTML
    const htmlMessage = `
      <html>
        <body style="font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f4f4f4;">
          <div style="max-width: 600px; margin: 0 auto; background: #ffffff; padding: 20px; border-radius: 8px; box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);">
            <h2 style="color: #333; text-align: center; font-size: 24px; margin-bottom: 20px;">Nova Inscrição/Pagamento</h2>
            <p style="font-size: 16px; color: #555; text-align: center; margin-bottom: 20px;">
              <strong>Detalhes da inscrição:</strong>
            </p>
            <ul style="list-style: none; padding: 0; margin: 0;">
              <li style="font-size: 16px; padding: 10px 0; border-bottom: 1px solid #ddd;">
                <strong>Localidade:</strong> ${localidade}
              </li>
              <li style="font-size: 16px; padding: 10px 0; border-bottom: 1px solid #ddd;">
                <strong>Responsável:</strong> ${nomeResponsavel}
              </li>
              <li style="font-size: 16px; padding: 10px 0; border-bottom: 1px solid #ddd;">
                <strong>Total de Inscritos:</strong> ${totalAge}
              </li>
              <li style="font-size: 16px; padding: 10px 0; border-bottom: 1px solid #ddd;">
                <strong>Faixa Etária 10+:</strong> ${totalSubscribers} (Masculino: ${masculino10plus}, Feminino: ${feminino10plus})
              </li>
            </ul>
            <p style="font-size: 14px; color: #888; text-align: center; margin-top: 20px;">
              Obrigado por utilizar nosso sistema de inscrições!
            </p>
          </div>
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

async function sendNotificationPayment(message) {
  try {
    console.log('Enviando email para:', 'matheusfurtadogg@gmail.com');

    // Desestruturação dos dados da mensagem
    const { cidade, valor_pago, comprovante_pagamento } = message;

    // Criação do corpo da mensagem em HTML com estilo inline
    const htmlMessage = `
      <html>
        <body style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f4f4;">
          <div style="max-width: 600px; margin: auto; background: #ffffff; padding: 20px; border-radius: 8px; box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);">
            <h2 style="color: #333; text-align: center;">Nova Inscrição/Pagamento</h2>
            <p><strong>Detalhes da inscrição:</strong></p>
            <ul>
              <li><strong>Localidade:</strong> ${cidade}</li>
              <li><strong>Valor Pago:</strong> R$ ${parseFloat(valor_pago).toFixed(2)}</li>
            </ul>
            <p style="color: #666;">O comprovante de pagamento está anexado a este e-mail.</p>
            <p>Obrigado por utilizar nosso sistema de inscrições!</p>
          </div>
        </body>
      </html>
    `;

    // Definição do anexo com o comprovante de pagamento
    const attachments = [
      {
        filename: 'comprovante_pagamento.png',  // Nome do arquivo no e-mail
        content: comprovante_pagamento,         // O buffer da imagem recebida
        encoding: 'base64',                      // Codificação base64
        contentType: 'image/png'                  // Tipo de conteúdo
      }
    ];

    // Enviar e-mail com anexo
    const info = await transport.sendMail({
      from: `Sistema de Inscrição <${process.env.USER_EMAIL}>`,
      to: 'matheusfurtadogg@gmail.com',
      subject: 'Nova Inscrição/Pagamento',
      html: htmlMessage,
      attachments: attachments
    });

    console.log('E-mail enviado com sucesso:', info.response);
  } catch (error) {
    console.error('Erro ao enviar e-mail:', error);
  }
}

module.exports = { sendNotificationNormal, sendNotificationJovem, sendNotificationPayment };
