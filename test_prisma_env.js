const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const user = await prisma.user.findFirst();
        console.log('Success, DB connected:', user?.email);
    } catch (e) {
        console.log('Error connecting to DB:', e.message);
    } finally {
        await prisma.$disconnect();
    }
}
main();
