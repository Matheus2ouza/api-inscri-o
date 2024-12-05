const express = require('express');
const router = express.Router();
const { pool } = require('../db/dbConnection');

// Rota para obter todos os comprovantes de pagamento (com todos os dados)
router.get('/', async (req, res) => {
    try {
        // Consulta para pegar todos os dados dos comprovantes
        const result = await pool.query(
            'SELECT * FROM comprovantes'  // Seleciona todos os dados da tabela
        );

        if (result.rows.length === 0) {
            console.warn('Nenhum comprovante encontrado.');
            return res.status(404).json({ message: 'Nenhum comprovante encontrado.' });
        }

        // Envia os comprovantes em uma resposta JSON com todos os dados
        return res.status(200).json({ comprovantes: result.rows });

    } catch (err) {
        console.error(`Erro ao recuperar comprovantes: ${err}`);
        return res.status(500).json({ error: 'Erro ao recuperar comprovantes.' });
    }
});

// Rota para recuperar um comprovante específico (arquivo binário)
router.get('/:id', async (req, res) => {
    const { id } = req.params;  // Obtém o ID do comprovante da URL

    try {
        // Consulta o banco de dados para recuperar o comprovante e o tipo de arquivo
        const result = await pool.query(
            'SELECT comprovante_imagem, tipo_arquivo FROM comprovantes WHERE id = $1',
            [id]
        );

        if (result.rows.length === 0) {
            console.warn(`Comprovante com ID ${id} não encontrado.`);
            return res.status(404).json({ message: 'Comprovante não encontrado.' });
        }

        // Recupera os dados do comprovante e o tipo de arquivo
        const { comprovante_imagem, tipo_arquivo } = result.rows[0];

        // Define o cabeçalho Content-Type com base no tipo de arquivo
        res.setHeader('Content-Type', tipo_arquivo);  // Exemplo: image/jpeg, application/pdf, etc.

        // Envia o arquivo binário para o cliente
        res.send(comprovante_imagem);

    } catch (err) {
        console.error(`Erro ao recuperar comprovante: ${err}`);
        return res.status(500).json({ error: 'Erro ao recuperar comprovante.' });
    }
});

module.exports = router;
