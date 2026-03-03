const { PrismaClient } = require('@prisma/client');
async function testUrl(url) {
    console.log('Testing', url);
    const prisma = new PrismaClient({ datasources: { db: { url } } });
    try {
        await prisma.user.findFirst();
        console.log('Success!');
    } catch (e) {
        console.log('Failed:', e.message);
    } finally {
        await prisma.$disconnect();
    }
}
async function main() {
    await testUrl('postgresql://postgres.jhjihsemhwkkjxpihlnb:WRONGPASS@aws-0-sa-east-1.pooler.supabase.com:5432/postgres');
    await testUrl('postgresql://postgres.fake123123123123:A2k12us25ben09f@aws-0-sa-east-1.pooler.supabase.com:5432/postgres');
}
main();
