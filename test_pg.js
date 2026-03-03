const { Client } = require('pg');
require('dotenv').config();

async function testDirect() {
    console.log('--- Diagnóstico de Conexão NATIVA (pg) ---');
    console.log('URL sendo usada:', process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@'));

    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('✅ Conexão NATIVA bem sucedida!');
        const res = await client.query('SELECT current_user, current_database()');
        console.log('Dados do banco:', res.rows[0]);
        await client.end();
    } catch (err) {
        console.error('❌ Erro na conexão NATIVA:', err.message);
        if (err.detail) console.log('Detalhe:', err.detail);
        if (err.hint) console.log('Dica:', err.hint);
    }
}

testDirect();
