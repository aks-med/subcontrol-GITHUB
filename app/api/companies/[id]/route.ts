export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { validateCNPJ, cleanCNPJ } from '@/lib/utils';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const company = await prisma.company.findUnique({
      where: { id: params.id },
      include: {
        employees: {
          where: { active: true },
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: { employees: { where: { active: true } } },
        },
      },
    });

    if (!company) {
      return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 });
    }

    return NextResponse.json(company);
  } catch (error) {
    console.error('Error fetching company:', error);
    return NextResponse.json({ error: 'Erro ao buscar empresa' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== 'admin') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { name, cnpj, valorPorVida, active } = await request.json();

    const cleanedCNPJ = cleanCNPJ(cnpj);

    if (cnpj && !validateCNPJ(cleanedCNPJ)) {
      return NextResponse.json({ error: 'CNPJ inválido' }, { status: 400 });
    }

    if (cnpj) {
      const existingCompany = await prisma.company.findFirst({
        where: {
          cnpj: cleanedCNPJ,
          NOT: { id: params.id },
        },
      });

      if (existingCompany) {
        return NextResponse.json(
          { error: 'CNPJ já cadastrado em outra empresa' },
          { status: 400 }
        );
      }
    }

    const company = await prisma.company.update({
      where: { id: params.id },
      data: {
        ...(name && { name }),
        ...(cnpj && { cnpj: cleanedCNPJ }),
        ...(valorPorVida !== undefined && { valorPorVida: parseFloat(valorPorVida) }),
        ...(active !== undefined && { active }),
      },
    });

    return NextResponse.json(company);
  } catch (error) {
    console.error('Error updating company:', error);
    return NextResponse.json({ error: 'Erro ao atualizar empresa' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== 'admin') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    await prisma.company.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting company:', error);
    return NextResponse.json({ error: 'Erro ao excluir empresa' }, { status: 500 });
  }
}
