require('dotenv').config();
const express = require('express');
const app = express();
const cors = require('cors');
const { checkDatabaseConnection } = require('./src/db/dbConnection.js');
const axios = require('axios');  // Adicionando axios para chamadas HTTP

// Importações de Rotas
const locationsRoutes = require('./src/routes/locations.js');
const register = require('./src/routes/register.js');
const paymentRoutes = require('./src/routes/payment.js');
const hospedagemRoutes = require('./src/routes/hospedagem.js');
const dashboardRoutes = require('./src/routes/dashboard.js');
const loginAdminRoutes = require('./src/routes/loginAdmin.js');
const report = require('./src/routes/report.js');
const listHosting = require('./src/routes/listHosting.js');
const generatePdf = require('./src/routes/listPdf.js');
const getPaymentReceipts = require('./src/routes/paymentReceipts.js');

app.use(express.json());

// Conexão com o banco de dados
checkDatabaseConnection();

app.use(cors({
    origin: '*',
    methods: 'GET, POST',
    allowedHeaders: 'Content-Type'
}));

app.use((req, res, next) => {
    console.info(`Request: ${req.method} ${req.url}`);
    next();
});

app.get('/', (req, res) => {
    console.info('Rota de boas-vindas acessada');
    res.send('Bem-vindo à minha API! ❤️');
});

// Rota para chamar a API Python via HTTP
app.use('/api-python', async (req, res) => {
    try {
        // Substitua pela URL da sua API Python hospedada no Vercel
        const pythonApiUrl = 'https://seu-dominio-python.vercel.app/api/comprovantes';  // Substitua pela URL real da sua API Python

        // Realiza uma requisição GET para a API Python
        const response = await axios.get(pythonApiUrl);

        // Envia a resposta da API Python de volta para o front-end
        res.status(response.status).json(response.data);
    } catch (error) {
        console.error('Erro ao chamar a API Python:', error);
        res.status(500).json({ error: 'Erro ao se comunicar com a API Python' });
    }
});

app.use('/localidades', locationsRoutes);
app.use('/registro', register);
app.use('/pagamento', paymentRoutes);
app.use('/hospedagem', hospedagemRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/loginAdmin', loginAdminRoutes);
app.use('/report', report);
app.use('/listHosting', listHosting);
app.use('/generatePdf', generatePdf);
app.use('/comprovantes', getPaymentReceipts);

const port = process.env.PORT;
console.log(port);
app.listen(port, () => {
    console.info('API iniciada com sucesso');
    console.log(`API rodando em http://localhost:${port}`);
});
