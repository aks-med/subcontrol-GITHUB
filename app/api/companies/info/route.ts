import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any)?.id;
    const role = (session.user as any)?.role;

    if (role !== 'client') {
      return NextResponse.json({ error: 'Client only' }, { status: 403 });
    }

    const company = await prisma.company.findUnique({
      where: { id: userId },
    });

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Retorna o valor por vida para a empresa ver
    return NextResponse.json({
      id: company.id,
      name: company.name,
      valorPorVida: company.valorPorVida,
      allowDependentes: company.valorPorVida >= 35,
    });
  } catch (error) {
    console.error('Error fetching company info:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
