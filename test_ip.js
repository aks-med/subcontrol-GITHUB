const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
    datasources: {
        db: {
            url: "postgresql://postgres.jhjihsemhwkkjxpihlnb:A2k12us25ben09f@15.229.150.166:5432/postgres?connect_timeout=30"
        }
    }
});

async function test() {
    console.log('--- Teste com IP DIRETO (sa-east-1) ---');
    try {
        const user = await prisma.user.findFirst();
        console.log('✅ SUCESSO via IP!');
        console.log('Usuário:', user?.email);
    } catch (e) {
        console.error('❌ FALHA via IP:', e.message);
    } finally {
        await prisma.$disconnect();
    }
}
test();
