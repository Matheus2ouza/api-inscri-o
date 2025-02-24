require('dotenv').config();
const express = require('express');
const app = express();
const cors = require('cors');
const { checkDatabaseConnection } = require('./src/db/dbConnection.js');
const favicon = require("serve-favicon");
const path = require("path");

// Importações de Rotas
const authentication = require('./src/routes/authentication.js')
const basicData = require('./src/routes/basicData.js');
const register = require('./src/routes/register.js');
const registerServico = require('./src/routes/registerServ.js');
const registerJovem = require('./src/routes/registerJovem.js');
const paymentRoutes = require('./src/routes/payment.js');
const hospedagemRoutes = require('./src/routes/hospedagem.js');
const dashboardRoutes = require('./src/routes/dashboard.js');
const loginAdminRoutes = require('./src/routes/loginAdmin.js');
const report = require('./src/routes/report.js');
const listHosting = require('./src/routes/listHosting.js');
const generatePdf = require('./src/routes/listPdf.js');
const getcomprovante = require('./src/routes/comprovanteGet.js');
const RegistroPagamento = require('./src/routes/registro_pagamento.js');
const movementPdf = require('./src/routes/movementPdf.js');
const createPdfRouter = require('./src/routes/createPdf.js');

app.use(express.json());

// Conexão com o banco de dados
checkDatabaseConnection();

const corsOptions = {
    origin: '*',
    methods: 'GET, POST, PUT, DELETE',
    allowedHeaders: 'Content-Type, Authorization',
    credentials: true
};

app.use(cors(corsOptions));

app.use(favicon(path.join(__dirname, "src", "public", "img", "icons8-api-48.png")));

// Middleware de logs de requisição
app.use((req, res, next) => {
    console.info(`Request: ${req.method} ${req.url}`);
    next();
});

app.get('/', (req, res) => {
    console.info('Rota de boas-vindas acessada');
    res.send('Bem-vindo à minha API! ❤️');
});

// Suas rotas
app.use('/user',authentication)
app.use('/dados', basicData);
app.use('/registro', register);
app.use('/registroServ', registerServico);
app.use('/registroJovem', registerJovem);
app.use('/pagamento', paymentRoutes);
app.use('/hospedagem', hospedagemRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/loginAdmin', loginAdminRoutes);
app.use('/report', report);
app.use('/listHosting', listHosting);
app.use('/generatePdf', generatePdf);
app.use('/buscarComporvante', getcomprovante);
app.use('/RegistroPagamento', RegistroPagamento);
app.use('/movementPdf', movementPdf);
app.use('/pdf', createPdfRouter);

// Middleware para capturar erros 404 (rota não encontrada)
app.use((req, res, next) => {
    console.error(`Rota não encontrada: ${req.method} ${req.originalUrl}`);
    res.status(404).json({ error: 'Rota não encontrada' });
});

// Middleware para capturar outros erros
app.use((err, req, res, next) => {
    console.error(`Erro interno no servidor: ${err.message}`);
    res.status(500).json({ error: 'Erro interno no servidor' });
});

const port = process.env.PORT;
console.log(port);
app.listen(port, () => {
    console.info('API iniciada com sucesso');
    console.log(`API rodando em http://localhost:${port}`);
});
