export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { formatCPF, formatPhone } from '@/lib/utils';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const userRole = (session.user as any)?.role;
    const userId = (session.user as any)?.id;

    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');

    let whereClause: any = { active: true };

    if (userRole === 'client') {
      whereClause.companyId = userId;
    } else if (companyId) {
      whereClause.companyId = companyId;
    }

    const employees = await prisma.employee.findMany({
      where: whereClause,
      include: {
        company: {
          select: { name: true },
        },
      },
      orderBy: [{ company: { name: 'asc' } }, { nome: 'asc' }],
    });

    const headers = ['Empresa', 'Tipo', 'Nome', 'CPF', 'Data de Nascimento', 'Gênero', 'Email', 'Telefone', 'Vigência'];
    
    const rows = employees.map(emp => [
      emp.company?.name ?? '',
      emp.tipo === 'titular' ? 'Titular' : 'Dependente',
      emp.nome,
      formatCPF(emp.cpf),
      new Date(emp.dataNascimento).toLocaleDateString('pt-BR'),
      emp.genero === 'masculino' ? 'Masculino' : emp.genero === 'feminino' ? 'Feminino' : 'Outro',
      emp.email ?? '',
      emp.telefone ? formatPhone(emp.telefone) : '',
      new Date(emp.vigencia).toLocaleDateString('pt-BR'),
    ]);

    const csvContent = [
      headers.join(';'),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(';')),
    ].join('\n');

    const bom = '\uFEFF';
    const csvWithBom = bom + csvContent;

    return new NextResponse(csvWithBom, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="colaboradores_${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error('Error exporting employees:', error);
    return NextResponse.json({ error: 'Erro ao exportar colaboradores' }, { status: 500 });
  }
}
