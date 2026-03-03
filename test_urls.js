const { PrismaClient } = require('@prisma/client');

async function testUrl(url) {
    console.log('Testing', url);
    const prisma = new PrismaClient({ datasources: { db: { url } } });
    try {
        const user = await prisma.user.findFirst();
        console.log('Success!', user?.email);
    } catch (e) {
        console.log('Failed:', e.message);
    } finally {
        await prisma.$disconnect();
    }
}

async function main() {
    const pw = 'akiusmed3400';
    const ref = 'jhjihsemhwkkjxpihlnb';
    await testUrl(`postgresql://postgres.${ref}:${pw}@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true`);
    await testUrl(`postgresql://postgres.${ref}:${pw}@aws-0-sa-east-1.pooler.supabase.com:5432/postgres?pgbouncer=true`);
    await testUrl(`postgresql://postgres:${pw}@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true`);
    await testUrl(`postgresql://postgres:${pw}@aws-0-sa-east-1.pooler.supabase.com:5432/postgres?pgbouncer=true`);
}

main();
