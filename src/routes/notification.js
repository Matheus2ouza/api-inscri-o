const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'matifurtado0@gmail.com',
    pass: 'bigtank155'
  }
});

async function sendNotification(email, message) {
  try {
    console.log('Enviando email para:', email);
    console.log('Mensagem:', message);
    const info = await transporter.sendMail({
      from: 'matheusfurtadogg@gmail.com',
      to: email,
      subject: 'Nova Inscrição/Pagamento',
      text: message
    });
    console.log('E-mail enviado com sucesso:', info.response);
  } catch (error) {
    console.error('Erro ao enviar e-mail:', error);
  }
}

module.exports = { sendNotification };
