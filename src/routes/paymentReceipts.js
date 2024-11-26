router.get('/', async (req, res) => {
    try {
        // Query para buscar os comprovantes
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

        // Executando a query no banco de dados
        const { rows } = await pool.query(query);

        // Processando o campo comprovante_imagem para Base64
        const processedRows = rows.map(row => ({
            ...row,
            comprovante_imagem: row.comprovante_imagem
                ? Buffer.from(row.comprovante_imagem).toString('base64')
                : null // Caso não exista uma imagem
        }));

        // Retorno do resultado como JSON
        res.status(200).json(processedRows);
    } catch (err) {
        // Se ocorrer algum erro, retorna o erro
        console.error(`Erro ao buscar os comprovantes: ${err}`);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});
