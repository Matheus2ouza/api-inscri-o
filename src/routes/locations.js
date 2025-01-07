const express = require('express')
const router = express.Router();
const { pool } = require('../db/dbConnection')

router.get('/', async (req, res) => {
    try {
        const locations = await pool.query('SELECT * FROM localidades_new');
        const result = locations.rows;

        if (result.length === 0) { // Verifica se não há localidades
            console.warn('Consulta de localidade feita, mas não teve nenhum resultado.');
            res.status(404).json({ message: 'Nenhuma localidade encontrada.' }); // Código 404 para não encontrado
        } else {
            console.info('Consulta de localidade feita com sucesso.');
            res.status(200).json(result); // Código 200 para OK
        }
    } catch (err) {
        console.error(`Erro ao buscar localidade: ${err}`);
        res.status(500).json({ error: 'Erro ao buscar localidade.' });
    }
});

module.exports = router;