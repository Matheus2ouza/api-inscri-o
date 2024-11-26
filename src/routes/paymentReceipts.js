const express = require('express');
const router = express.Router();
const { pool } = require('../db/dbConnection');

router.get('/', async (req, res) => {
    try {
        //Query para buscar os comprovantes
        const query = `
        SELECT 
            pagamento.id,
            pagamento.valor_pago,
            pagamento.comprovante_imagem,
            localidades.nome AS localidade_nome
        FROM 
            pagamento
        JOIN 
            localidades ON pagamento.localidade_id = localidades.id;
        `;

        //Executando a query no banco de dados
        const { rows } = await pool.query(query)

        //Retorno do resultado como JSON
        res.status(200).json(rows);
    } catch(err) {
        //Se ocorrer algum error, retorna o erro
        console.error (`Erro ao buscar os comprovantes: ${err}`)
        res.status(500).json({ message: 'Erro interno do servidor'})
    }
});

module.exports = router