/**
 * Database configuration and connection setup
 * PostgreSQL connection using pg library
 */

const { Pool } = require('pg');

// Database connection pool
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'sharebuddy_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
  ssl: false // Disable SSL as the database server doesn't support it
});

// Test database connection
const connectDB = async () => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as current_time');
    console.log('📅 Database connected at:', result.rows[0].current_time);
    client.release();
    return true;
  } catch (error) {
    console.error('❌ Database connection error:', error.message);
    throw error;
  }
};

// Generic query function with error handling
const query = async (text, params = []) => {
  const client = await pool.connect();
  try {
    const start = Date.now();
    const result = await client.query(text, params);
    const duration = Date.now() - start;
    
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 Query executed:', { text, duration: `${duration}ms`, rows: result.rowCount });
    }
    
    return result;
  } catch (error) {
    console.error('❌ Database query error:', {
      query: text,
      params: params,
      error: error.message
    });
    throw error;
  } finally {
    client.release();
  }
};

// Transaction helper
const withTransaction = async (callback) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Graceful shutdown
const closeDB = async () => {
  try {
    await pool.end();
    console.log('👋 Database connection pool closed');
  } catch (error) {
    console.error('❌ Error closing database:', error.message);
  }
};

module.exports = {
  pool,
  query,
  connectDB,
  withTransaction,
  closeDB
};