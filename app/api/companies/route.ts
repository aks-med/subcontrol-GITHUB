export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { validateCNPJ, cleanCNPJ } from '@/lib/utils';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== 'admin') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const companies = await prisma.company.findMany({
      include: {
        _count: {
          select: { employees: { where: { active: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(companies);
  } catch (error) {
    console.error('Error fetching companies:', error);
    return NextResponse.json({ error: 'Erro ao buscar empresas' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== 'admin') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { name, cnpj, valorPorVida } = await request.json();

    if (!name || !cnpj) {
      return NextResponse.json(
        { error: 'Nome e CNPJ são obrigatórios' },
        { status: 400 }
      );
    }

    const cleanedCNPJ = cleanCNPJ(cnpj);

    if (!validateCNPJ(cleanedCNPJ)) {
      return NextResponse.json({ error: 'CNPJ inválido' }, { status: 400 });
    }

    const existingCompany = await prisma.company.findUnique({
      where: { cnpj: cleanedCNPJ },
    });

    if (existingCompany) {
      return NextResponse.json(
        { error: 'CNPJ já cadastrado' },
        { status: 400 }
      );
    }

    const company = await prisma.company.create({
      data: {
        name,
        cnpj: cleanedCNPJ,
        valorPorVida: parseFloat(valorPorVida) || 0,
      },
    });

    return NextResponse.json(company);
  } catch (error) {
    console.error('Error creating company:', error);
    return NextResponse.json({ error: 'Erro ao criar empresa' }, { status: 500 });
  }
}
