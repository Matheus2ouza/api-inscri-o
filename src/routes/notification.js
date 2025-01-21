const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'matifurtado0@gmail.com',
    pass: 'bigtank155'
  }
});

async function sendNotification(email, message) {
  await transporter.sendMail({
    from: 'matheusfurtadogg@gmail.com',
    to: email,
    subject: 'Nova Inscrição/Pagamento',
    text: message
  });
}

module.exports = { sendNotification };