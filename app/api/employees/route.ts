export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { validateCPF, cleanCPF, cleanPhone, formatCNPJ, formatCurrency } from '@/lib/utils';

async function sendNotification(type: 'add' | 'remove', company: any, count: number, valorPorVida: number, totalColaboradores: number) {
  try {
    const impacto = count * valorPorVida;
    const novoTotal = totalColaboradores * valorPorVida;
    const emoji = type === 'add' ? '🟢' : '🔴';
    const acao = type === 'add' ? 'Adicionou' : 'Removeu';
    const iconeAcao = type === 'add' ? '✅' : '❌';
    const textoImpacto = type === 'add' ? 'Aumento' : 'Redução';

    const cnpjFormatado = formatCNPJ(company.cnpj);

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #1e3a5f; border-bottom: 3px solid #22c55e; padding-bottom: 15px;">
          ${emoji} Movimentação de Colaboradores
        </h2>
        
        <div style="background: #f8fafc; padding: 20px; border-radius: 12px; margin: 20px 0;">
          <h3 style="margin: 0 0 10px 0; color: #334155;">${company.name}</h3>
          <p style="margin: 5px 0; color: #64748b;">CNPJ: ${cnpjFormatado}</p>
        </div>

        <div style="background: ${type === 'add' ? '#dcfce7' : '#fee2e2'}; padding: 20px; border-radius: 12px; margin: 20px 0; border-left: 4px solid ${type === 'add' ? '#22c55e' : '#ef4444'};">
          <p style="margin: 0; font-size: 18px; font-weight: bold; color: ${type === 'add' ? '#166534' : '#dc2626'};">
            ${iconeAcao} ${acao} ${count} colaborador${count > 1 ? 'es' : ''}
          </p>
        </div>

        <div style="background: #fff; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0;">
                <strong>💵 ${textoImpacto}:</strong>
              </td>
              <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; text-align: right; color: ${type === 'add' ? '#166534' : '#dc2626'};">
                ${type === 'add' ? '+' : '-'}${formatCurrency(impacto)} (${count} × ${formatCurrency(valorPorVida)})
              </td>
            </tr>
            <tr>
              <td style="padding: 10px 0;">
                <strong>📊 Novo valor do boleto:</strong>
              </td>
              <td style="padding: 10px 0; text-align: right; font-size: 18px; font-weight: bold; color: #1e3a5f;">
                ${formatCurrency(novoTotal)}
              </td>
            </tr>
            <tr>
              <td style="padding: 10px 0; border-top: 1px solid #e2e8f0;">
                <strong>👥 Total de colaboradores ativos:</strong>
              </td>
              <td style="padding: 10px 0; border-top: 1px solid #e2e8f0; text-align: right;">
                ${totalColaboradores}
              </td>
            </tr>
          </table>
        </div>

        <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 30px;">
          Notificação automática - Akius Med Gestão<br>
          ${new Date().toLocaleString('pt-BR')}
        </p>
      </div>
    `;

    const notificationId = type === 'add' 
      ? process.env.NOTIF_ID_INCLUSO_DE_COLABORADORES 
      : process.env.NOTIF_ID_EXCLUSO_DE_COLABORADORES;

    await fetch('https://apps.abacus.ai/api/sendNotificationEmail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deployment_token: process.env.ABACUSAI_API_KEY,
        app_id: process.env.WEB_APP_ID,
        notification_id: notificationId,
        subject: `${emoji} ${company.name} - ${acao} ${count} colaborador${count > 1 ? 'es' : ''}`,
        body: htmlBody,
        is_html: true,
        recipient_email: 'financeiro@akiusmedbeneficios.com',
        sender_alias: 'Akius Med Gestão',
      }),
    });
  } catch (error) {
    console.error('Error sending notification:', error);
  }
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const includeInactive = searchParams.get('includeInactive') === 'true';

    const userRole = (session.user as any)?.role;
    const userId = (session.user as any)?.id;

    let whereClause: any = {};
    
    // Se não incluir inativos, filtrar apenas ativos
    if (!includeInactive) {
      whereClause.active = true;
    }

    if (userRole === 'client') {
      whereClause.companyId = userId;
    } else if (companyId) {
      whereClause.companyId = companyId;
    }

    const employees = await prisma.employee.findMany({
      where: whereClause,
      include: {
        company: {
          select: { id: true, name: true, cnpj: true },
        },
        titular: {
          select: { id: true, nome: true },
        },
        dependentes: {
          where: { active: true },
          select: { id: true, nome: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(employees);
  } catch (error) {
    console.error('Error fetching employees:', error);
    return NextResponse.json({ error: 'Erro ao buscar colaboradores' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const userRole = (session.user as any)?.role;
    const userId = (session.user as any)?.id;

    const body = await request.json();
    const employees = Array.isArray(body) ? body : [body];

    const companyId = userRole === 'client' ? userId : employees[0]?.companyId;

    if (!companyId) {
      return NextResponse.json({ error: 'ID da empresa é obrigatório' }, { status: 400 });
    }

    const company = await prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 });
    }

    const createdEmployees = [];

    for (const emp of employees) {
      const { tipo, nome, cpf, dataNascimento, genero, email, telefone, vigencia, titularId } = emp;

      // Gênero agora é opcional
      if (!tipo || !nome || !cpf || !dataNascimento || !vigencia) {
        return NextResponse.json(
          { error: 'Campos obrigatórios: tipo, nome, cpf, dataNascimento, vigencia' },
          { status: 400 }
        );
      }

      const cleanedCPF = cleanCPF(cpf);

      if (!validateCPF(cleanedCPF)) {
        return NextResponse.json({ error: `CPF inválido: ${cpf}` }, { status: 400 });
      }

      // Validar dependente
      if (tipo === 'dependente') {
        // Verificar se a empresa permite dependentes (valor >= 35)
        if (company.valorPorVida < 35) {
          return NextResponse.json({ error: 'Este plano não permite cadastro de dependentes' }, { status: 400 });
        }

        if (!titularId) {
          return NextResponse.json({ error: 'Dependente deve estar vinculado a um titular' }, { status: 400 });
        }

        // Verificar limite de 3 dependentes por titular
        const dependentesCount = await prisma.employee.count({
          where: { titularId, active: true },
        });

        if (dependentesCount >= 3) {
          return NextResponse.json({ error: 'O titular já possui 3 dependentes (limite máximo)' }, { status: 400 });
        }
      }

      const employee = await prisma.employee.create({
        data: {
          companyId,
          tipo,
          nome,
          cpf: cleanedCPF,
          dataNascimento: new Date(dataNascimento),
          genero: genero || null,
          email: email || null,
          telefone: telefone ? cleanPhone(telefone) : null,
          vigencia: new Date(vigencia),
          titularId: tipo === 'dependente' ? titularId : null,
        },
      });

      createdEmployees.push(employee);
    }

    const totalActiveEmployees = await prisma.employee.count({
      where: { companyId, active: true },
    });

    // Criar notificação no banco
    await prisma.notification.create({
      data: {
        type: 'inclusion',
        title: `Novo colaborador adicionado`,
        message: `${createdEmployees.length} colaborador(es) adicionado(s) na empresa ${company.name}`,
        employeeId: createdEmployees[0]?.id,
        companyId: company.id,
        companyName: company.name,
      },
    });

    await sendNotification('add', company, createdEmployees.length, company.valorPorVida, totalActiveEmployees);

    return NextResponse.json(createdEmployees.length === 1 ? createdEmployees[0] : createdEmployees);
  } catch (error) {
    console.error('Error creating employee:', error);
    return NextResponse.json({ error: 'Erro ao criar colaborador' }, { status: 500 });
  }
}
