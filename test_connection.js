const { PrismaClient } = require('@prisma/client');
const pw = 'A2k12us25ben09f';
const ref = 'jhjihsemhwkkjxpihlnb';

async function testUrl(url) {
    console.log('Testing', url);
    const prisma = new PrismaClient({ datasources: { db: { url } } });
    try {
        const user = await prisma.user.findFirst();
        console.log('Success!', user ? user.email : 'No user');
    } catch (e) {
        console.log('Failed:', e.message);
    } finally {
        await prisma.$disconnect();
    }
}

async function main() {
    await testUrl(`postgresql://postgres.${ref}:${pw}@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true`);
    await testUrl(`postgresql://postgres.${ref}:${pw}@aws-0-sa-east-1.pooler.supabase.com:5432/postgres?pgbouncer=true`);
    await testUrl(`postgresql://postgres:${pw}@aws-0-sa-east-1.pooler.supabase.com:5432/postgres?pgbouncer=true`);
}
main();
