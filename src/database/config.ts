import { Pool } from 'pg';
import * as dotenv from 'dotenv';

// Carrega as variáveis de ambiente do arquivo .env
dotenv.config();

/**
 * Configuração do pool de conexões com o banco de dados PostgreSQL
 * Usa variáveis de ambiente do arquivo .env
 */
const pool = new Pool({
  // Se DATABASE_URL estiver definida, usa ela (formato: postgresql://user:password@host:port/database)
  // Caso contrário, usa as variáveis individuais
  connectionString: process.env.DATABASE_URL || undefined,
  
  // Configurações individuais (usadas se DATABASE_URL não estiver definida)
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5432,
  
  // Configurações do pool
  max: 20, // máximo de clientes no pool
  idleTimeoutMillis: 30000, // fecha clientes inativos após 30 segundos
  connectionTimeoutMillis: 2000, // timeout de conexão de 2 segundos
});

// Tratamento de erros do pool
pool.on('error', (err) => {
  console.error('Erro inesperado no pool de conexões do banco de dados:', err);
});

// Testa a conexão ao inicializar
pool.query('SELECT NOW()')
  .then(() => {
    console.log('✅ Conexão com o banco de dados estabelecida com sucesso');
  })
  .catch((err) => {
    console.error('❌ Erro ao conectar com o banco de dados:', err.message);
    console.error('Verifique as variáveis de ambiente no arquivo .env');
  });

export default pool;
