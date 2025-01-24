import pg from 'pg';

const { Pool } = pg;

// Configuração do pool de conexões
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  max: 10,                      // Número máximo de conexões no pool
  idleTimeoutMillis: 30000,      // Tempo ocioso antes de liberar a conexão (30s)
  connectionTimeoutMillis: 10000 // Tempo máximo para conexão (10s)
});

let isConnected = false; // Variável de controle da conexão

// Função para verificar conexão com o banco
const checkDatabaseConnection = async () => {
    if (isConnected) {
        console.info('Já conectado ao banco de dados.');
        return;
    }

    try {
        const client = await pool.connect(); // Tenta conectar
        console.info('Conexão com o banco de dados estabelecida com sucesso.');
        isConnected = true;
        client.release(); // Libera a conexão após teste bem-sucedido
    } catch (err) {
        console.error('Erro ao conectar ao banco de dados:', err.message);
        process.exit(1); // Encerra a aplicação em caso de falha crítica
    }
};

// Tratamento para capturar erros globais no pool de conexões
pool.on('error', (err) => {
    console.error('Erro inesperado no pool de conexões:', err.message);
    isConnected = false; // Reseta o status de conexão para evitar falhas futuras
});

export { pool, checkDatabaseConnection };
