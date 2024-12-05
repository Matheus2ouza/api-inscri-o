const express = require('express');
const router = express.Router();
const { pool } = require('../db/dbConnection');
const multer = require('multer');

// Configuração do multer para processar o upload de arquivos como buffer
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Rota para registrar o comprovante de pagamento
router.post('/', upload.single('comprovante_pagamento'), async (req, res) => {
    const { cidade } = req.body;
    const comprovante_pagamento = req.file ? req.file.buffer : null;  // Dados binários da imagem (sem conversão para base64)

    // Verifica se o comprovante foi carregado
    if (!comprovante_pagamento) {
        console.warn('Comprovante de pagamento não fornecido.');
        return res.status(400).json({ message: 'Comprovante de pagamento é obrigatório.' });
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
            console.log(`Localidade encontrada: ${cityExists.rows[0].nome}`);
        }

        // Obtém o ID da localidade
        const localidade_id = cityExists.rows[0].id;

        // Insere o comprovante de pagamento na tabela "comprovantes"
        const result = await pool.query(
            'INSERT INTO comprovantes (comprovante_imagem, localidade_id) VALUES ($1, $2) RETURNING id',
            [comprovante_pagamento, localidade_id]  // Dados binários diretamente
        );

        const comprovanteId = result.rows[0].id;
        console.info(`Comprovante de pagamento registrado com sucesso, ID: ${comprovanteId}`);

        return res.status(201).json({ message: 'Comprovante registrado com sucesso!', comprovanteId });
        
    } catch (err) {
        console.error(`Erro ao registrar comprovante: ${err}`);
        return res.status(500).json({ error: 'Erro ao registrar comprovante.' });
    }
});

module.exports = router;
