import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create admin user
  const hashedPassword = await bcrypt.hash('#m%sSII******', 10);
  
  // Delete old admin user if exists
  await prisma.user.deleteMany({
    where: { email: 'john@doe.com' }
  });
  
  const adminUser = await prisma.user.upsert({
    where: { email: 'Suporte@akiusmed.com' },
    update: {
      password: hashedPassword,
    },
    create: {
      email: 'Suporte@akiusmed.com',
      password: hashedPassword,
      name: 'Suporte Akius Med',
      role: 'admin',
    },
  });

  console.log('Created admin user:', adminUser.email);

  // Create sample company for testing
  const sampleCompany = await prisma.company.upsert({
    where: { cnpj: '12345678000190' },
    update: {},
    create: {
      name: 'Empresa Demonstração LTDA',
      cnpj: '12345678000190',
      valorPorVida: 35.00,
      active: true,
    },
  });

  console.log('Created sample company:', sampleCompany.name);

  console.log('Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
