const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
    console.log('--- Diagnóstico de Conexão AkiusMed ---');
    console.log('Testando conexão com prisma.user.findFirst()...');
    try {
        const user = await prisma.user.findFirst({
            where: { email: 'Suporte@akiusmed.com' }
        });
        if (user) {
            console.log('✅ Conexão bem sucedida!');
            console.log('Usuário encontrado:', user.email);
            console.log('Hash da senha no banco:', user.password);
        } else {
            console.log('❌ Usuário não encontrado no banco.');
        }
    } catch (error) {
        console.error('❌ Erro de conexão Prisma:', error.message);
        if (error.code) console.error('Código do erro:', error.code);
    } finally {
        await prisma.$disconnect();
    }
}

test();
