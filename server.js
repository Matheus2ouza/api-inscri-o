require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require("express-rate-limit");
const favicon = require("serve-favicon");
const cookieParser = require("cookie-parser");
const path = require("path");

const app = express();
app.use(express.json());

app.set("trust proxy", 1);

// Configuração do rate limit (exemplo: 100 requisições por 15 minutos)
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // Limite de 100 requisições por IP
    message: "Muitas requisições! Tente novamente mais tarde.",
    standardHeaders: true, // Inclui os headers RateLimit
    legacyHeaders: false, // Desativa os headers X-RateLimit
});

app.use(limiter);
app.use(cookieParser());

// Configuração do CORS para múltiplas origens permitidas
const allowedOrigins = [
    "http://127.0.0.1:5500",
    "https://inscri-o-conf.vercel.app"
];

const corsOptions = {
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true); // Permite a origem
        } else {
            callback(new Error("Não permitido pelo CORS"));
        }
    },
    methods: "GET, POST, PUT, DELETE",
    allowedHeaders: "Content-Type, Authorization",
    credentials: true
};

app.use(cors(corsOptions));

// Middleware do favicon
app.use(favicon(path.join(__dirname, "src", "public", "img", "icons8-api-48.png")));

// Middleware de logs de requisição
app.use((req, res, next) => {
    console.info(`Request: ${req.method} ${req.url}`);
    next();
});

// Rota de boas-vindas
app.get('/', (req, res) => {
    console.info('Rota de boas-vindas acessada');
    res.send('Bem-vindo à minha API! ❤️');
});

const localityRouter = require('./src/routes/localityRouter.js')
const authRouter = require('./src/routes/authRoutes.js')
const basicData = require('./src/routes/basicDataRouter.js')
const register = require('./src/routes/registerRouter.js')

app.use('/user', authRouter)
app.use('/locality', localityRouter)
app.use('/data', basicData);
app.use('/register', register)

app.use('/pagamento', require('./src/routes/paymentRouter.js'));
app.use('/hospedagem', require('./src/routes/hospedagem.js'));
app.use('/dashboard', require('./src/routes/dashboard.js'));
app.use('/loginAdmin', require('./src/routes/loginAdmin.js'));
app.use('/report', require('./src/routes/report.js'));
app.use('/listHosting', require('./src/routes/listHosting.js'));
app.use('/generatePdf', require('./src/routes/listPdf.js'));
app.use('/buscarComporvante', require('./src/routes/comprovanteGet.js'));
app.use('/RegistroPagamento', require('./src/routes/registro_pagamento.js'));
app.use('/movementPdf', require('./src/routes/movementPdf.js'));
app.use('/pdf', require('./src/routes/createPdf.js'));

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

// Exportação correta para a Vercel
module.exports = app;
