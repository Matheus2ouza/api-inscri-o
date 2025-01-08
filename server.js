require('dotenv').config();
const express = require('express');
const app = express();
const cors = require('cors');
const { checkDatabaseConnection } = require('./src/db/dbConnection.js');

// Importações de Rotas
const locationsRoutes = require('./src/routes/locations.js');
const register = require('./src/routes/register.js');
const registerServico = require('./src/routes/registerServ.js')
const paymentRoutes = require('./src/routes/payment.js');
const hospedagemRoutes = require('./src/routes/hospedagem.js');
const dashboardRoutes = require('./src/routes/dashboard.js');
const loginAdminRoutes = require('./src/routes/loginAdmin.js');
const report = require('./src/routes/report.js');
const listHosting = require('./src/routes/listHosting.js');
const generatePdf = require('./src/routes/listPdf.js');
const getPaymentReceipts = require('./src/routes/paymentReceipts.js');
const setcomprovante = require('./src/routes/imagemPayment.js');
const getcomprovante = require('./src/routes/comprovanteGet.js');
const RegistroPagamento = require('./src/routes/registro_pagamento.js');
const createPdf = require('./src/routes/movementPdf.js')

app.use(express.json());

// Conexão com o banco de dados
checkDatabaseConnection();

const corsOptions = {
    origin: '*',
    methods: 'GET, POST, PUT, DELETE',
    allowedHeaders: 'Content-Type, Authorization',
};

app.use(cors(corsOptions));

app.use((req, res, next) => {
    console.info(`Request: ${req.method} ${req.url}`);
    next();
});

app.get('/', (req, res) => {
    console.info('Rota de boas-vindas acessada');
    res.send('Bem-vindo à minha API! ❤️');
});

app.use('/localidades', locationsRoutes);
app.use('/registro', register);
app.use('/registroServ', registerServico)
app.use('/pagamento', paymentRoutes);
app.use('/hospedagem', hospedagemRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/loginAdmin', loginAdminRoutes);
app.use('/report', report);
app.use('/listHosting', listHosting);
app.use('/generatePdf', generatePdf);
app.use('/comprovantes', getPaymentReceipts);
app.use('/comprovante', setcomprovante);
app.use('/buscarComporvante', getcomprovante);
app.use('/RegistroPagamento', RegistroPagamento);
app.use('/movementPdf', createPdf);

const port = process.env.PORT;
console.log(port);
app.listen(port, () => {
    console.info('API iniciada com sucesso');
    console.log(`API rodando em http://localhost:${port}`);
});
