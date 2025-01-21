const express = require('express');
const router = express.Router();
const { pool } = require('../db/dbConnection');
const multer = require('multer');
const { sendNotificationPayment } = require("../routes/notification")

// Configuração do multer para processar o upload de arquivos como buffer
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Rota para registrar o pagamento
router.post('/', upload.single('comprovante_pagamento'), async (req, res) => {
    const { valor_pago, cidade } = req.body;
    const comprovante_pagamento = req.file ? req.file.buffer : null; // Não precisa mais converter para base64
    const tipo_arquivo = req.file ? req.file.mimetype : null; // Tipo do arquivo

    // Verifica se o comprovante foi carregado
    if (!comprovante_pagamento) {
        console.warn('Comprovante de pagamento não fornecido.');
        return res.status(400).json({ message: 'Comprovante de pagamento é obrigatório.' });
    }

    if (!tipo_arquivo) {
        console.warn('Tipo de arquivo não fornecido.');
        return res.status(400).json({ message: 'Tipo de arquivo é obrigatório.' });
    }

    try {
        // Verifica se a cidade existe
        const cityExists = await pool.query(
            'SELECT * FROM localidades WHERE nome = $1',
            [cidade]
        );

        if (cityExists.rows.length === 0) {
            console.warn(`Localidade "${cidade}" não encontrada.`);
            return res.status(404).json({ message: 'Localidade não encontrada.' });
        } else {
            console.log(`Localidade encontrada: ${cityExists.rows[0]}`);
        }

        // Verifica se a inscrição existe
        const enrollmentExists = await pool.query(
            'SELECT ig.* FROM localidades l INNER JOIN inscricao_geral ig ON l.id = ig.localidade_id WHERE l.nome = $1',
            [cidade]
        );

        if (enrollmentExists.rows.length === 0) {
            console.warn(`Inscrição não encontrada com cidade: ${cidade}`);
            return res.status(404).json({ message: 'Inscrição não encontrada.' });
        }

        // Obtém o ID da localidade associada à inscrição
        const localidade_id = enrollmentExists.rows[0].localidade_id;

        // Insere o pagamento
        const result = await pool.query(
            'INSERT INTO comprovantes (localidade_id, comprovante_imagem, tipo_arquivo, valor_pago) VALUES ($1, $2, $3, $4) RETURNING id',
            [localidade_id, comprovante_pagamento, tipo_arquivo, valor_pago]
        );

        const comprovanteId = result.rows[0].id;
        console.info(`Pagamento registrado com sucesso, ID: ${comprovanteId}`);

        // Registra a movimentação financeira
        await pool.query(
            'INSERT INTO Movimentacao_Financeira (tipo, descricao, valor) VALUES ($1, $2, $3)',
            ['Entrada', `Pagamento referente à localidade com ID: ${localidade_id}`, valor_pago]
        );

        // Atualiza o saldo da localidade, subtraindo o valor pago
        await pool.query(
            'UPDATE localidades SET saldo_devedor = saldo_devedor - $1 WHERE id = $2',
            [valor_pago, localidade_id]
        );

        console.info(`Saldo da localidade atualizado após o pagamento, nova entrada: ${valor_pago}`);

        const emailMessage = {
            cidade: cidade,
            valor_pago: valor_pago,
            comprovante_pagamento: comprovante_pagamento
        };

        // Adicionando logs detalhados
        console.info("Enviando notificação por e-mail...");
        console.info("Corpo da mensagem do e-mail: ", emailMessage);

        await sendNotificationPayment(emailMessage);

        // Log após o envio da notificação
        console.info("Notificação enviada com sucesso!");

        return res.status(201).json({ message: 'Pagamento registrado com sucesso!', comprovanteId });
        
    } catch (err) {
        console.error(`Erro ao registrar pagamento: ${err}`);
        return res.status(500).json({ error: 'Erro ao registrar pagamento.' });
    }
});

module.exports = router;
