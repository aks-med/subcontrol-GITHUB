export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== 'admin') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const now = new Date();
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [totalCompanies, activeCompanies, totalEmployees, recentAdditions, recentRemovals, companiesWithStats] = await Promise.all([
      prisma.company.count(),
      prisma.company.count({ where: { active: true } }),
      prisma.employee.count({ where: { active: true } }),
      prisma.employee.count({
        where: {
          active: true,
          createdAt: { gte: last7Days },
        },
      }),
      prisma.employee.count({
        where: {
          active: false,
          updatedAt: { gte: last7Days },
        },
      }),
      prisma.company.findMany({
        where: { active: true },
        include: {
          _count: {
            select: { employees: { where: { active: true } } },
          },
        },
        orderBy: { name: 'asc' },
      }),
    ]);

    const totalRevenue = companiesWithStats.reduce((acc, company) => {
      return acc + (company._count.employees * company.valorPorVida);
    }, 0);

    return NextResponse.json({
      totalCompanies,
      activeCompanies,
      totalEmployees,
      recentAdditions,
      recentRemovals,
      totalRevenue,
      companiesWithStats: companiesWithStats.map(c => ({
        id: c.id,
        name: c.name,
        cnpj: c.cnpj,
        employeeCount: c._count.employees,
        valorPorVida: c.valorPorVida,
        monthlyValue: c._count.employees * c.valorPorVida,
      })),
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json({ error: 'Erro ao buscar estatísticas' }, { status: 500 });
  }
}
