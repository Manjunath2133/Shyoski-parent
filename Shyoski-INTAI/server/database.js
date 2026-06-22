const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config();

const isPostgres = !!process.env.DATABASE_URL;
let pgPool = null;
let sqliteDb = null;

if (isPostgres) {
    console.log('🐘 PostgreSQL Database URL found. Connecting to Postgres...');
    pgPool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false // Required for Render SSL connection verification bypass
        }
    });
    initPgDb();
} else {
    console.log('📦 Connecting to SQLite database...');
    const dbPath = path.resolve(__dirname, process.env.DATABASE_PATH || './database.sqlite');
    sqliteDb = new sqlite3.Database(dbPath, (err) => {
        if (err) {
            console.error('❌ Failed to connect to SQLite:', err.message);
        } else {
            initSqliteDb();
        }
    });
}

// Convert `?` placeholder in SQL queries to `$1`, `$2` format for Postgres
function formatSql(sql) {
    if (!isPostgres) return sql;
    let index = 1;
    return sql.replace(/\?/g, () => `$${index++}`);
}

async function initPgDb() {
    try {
        await pgPool.query(`CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            email VARCHAR(255) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);

        await pgPool.query(`CREATE TABLE IF NOT EXISTS licenses (
            id SERIAL PRIMARY KEY,
            user_id INTEGER UNIQUE NOT NULL,
            status VARCHAR(50) DEFAULT 'free_trial',
            type VARCHAR(50) DEFAULT 'free',
            free_queries_left INTEGER DEFAULT 5,
            paid_minutes_left NUMERIC DEFAULT 0,
            expires_at TIMESTAMP,
            last_sync_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            device_id VARCHAR(255)
        )`);

        await pgPool.query(`CREATE TABLE IF NOT EXISTS transactions (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL,
            order_id VARCHAR(255) UNIQUE NOT NULL,
            payment_id VARCHAR(255),
            amount INTEGER NOT NULL,
            plan VARCHAR(50) NOT NULL,
            status VARCHAR(50) DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);

        await pgPool.query(`CREATE TABLE IF NOT EXISTS applications (
            id SERIAL PRIMARY KEY,
            job_title VARCHAR(255) NOT NULL,
            candidate_name VARCHAR(255) NOT NULL,
            candidate_email VARCHAR(255) NOT NULL,
            github_url VARCHAR(255),
            resume_url VARCHAR(255) NOT NULL,
            cover_letter TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);

        console.log('✅ PostgreSQL Tables Initialized');
    } catch (e) {
        console.error('❌ Failed to initialize Postgres tables:', e.message);
    }
}

function initSqliteDb() {
    sqliteDb.serialize(() => {
        sqliteDb.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        sqliteDb.run(`CREATE TABLE IF NOT EXISTS licenses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER UNIQUE NOT NULL,
            status TEXT DEFAULT 'free_trial',
            type TEXT DEFAULT 'free',
            free_queries_left INTEGER DEFAULT 5,
            paid_minutes_left INTEGER DEFAULT 0,
            expires_at DATETIME,
            last_sync_time DATETIME DEFAULT CURRENT_TIMESTAMP,
            device_id TEXT,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )`);

        sqliteDb.run(`CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            order_id TEXT UNIQUE NOT NULL,
            payment_id TEXT,
            amount INTEGER NOT NULL,
            plan TEXT NOT NULL,
            status TEXT DEFAULT 'pending',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )`);

        sqliteDb.run(`CREATE TABLE IF NOT EXISTS applications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            job_title TEXT NOT NULL,
            candidate_name TEXT NOT NULL,
            candidate_email TEXT NOT NULL,
            github_url TEXT,
            resume_url TEXT NOT NULL,
            cover_letter TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        console.log('✅ SQLite Tables Initialized');
    });
}

const dbUtils = {
    async get(sql, params = []) {
        const formatted = formatSql(sql);
        if (isPostgres) {
            const res = await pgPool.query(formatted, params);
            return res.rows[0] || null;
        } else {
            return new Promise((resolve, reject) => {
                sqliteDb.get(formatted, params, (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
            });
        }
    },
    async all(sql, params = []) {
        const formatted = formatSql(sql);
        if (isPostgres) {
            const res = await pgPool.query(formatted, params);
            return res.rows;
        } else {
            return new Promise((resolve, reject) => {
                sqliteDb.all(formatted, params, (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                });
            });
        }
    },
    async run(sql, params = []) {
        let formatted = formatSql(sql);
        if (isPostgres) {
            if (formatted.toUpperCase().startsWith('INSERT INTO') && !formatted.toUpperCase().includes('RETURNING')) {
                formatted += ' RETURNING id';
            }
            const res = await pgPool.query(formatted, params);
            const insertedRow = res.rows[0];
            return { id: insertedRow ? insertedRow.id : null, changes: res.rowCount };
        } else {
            return new Promise((resolve, reject) => {
                sqliteDb.run(formatted, params, function(err) {
                    if (err) reject(err);
                    else resolve({ id: this.lastID, changes: this.changes });
                });
            });
        }
    },
    async transaction(fn) {
        if (isPostgres) {
            const client = await pgPool.connect();
            try {
                await client.query('BEGIN');
                const res = await fn();
                await client.query('COMMIT');
                return res;
            } catch (err) {
                await client.query('ROLLBACK');
                throw err;
            } finally {
                client.release();
            }
        } else {
            return new Promise((resolve, reject) => {
                sqliteDb.serialize(() => {
                    sqliteDb.run('BEGIN TRANSACTION');
                    fn()
                        .then((res) => {
                            sqliteDb.run('COMMIT');
                            resolve(res);
                        })
                        .catch((err) => {
                            sqliteDb.run('ROLLBACK');
                            reject(err);
                        });
                });
            });
        }
    }
};

module.exports = dbUtils;
