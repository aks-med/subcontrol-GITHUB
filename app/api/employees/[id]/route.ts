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

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const userRole = (session.user as any)?.role;
    const userId = (session.user as any)?.id;

    const employee = await prisma.employee.findUnique({
      where: { id: params.id },
    });

    if (!employee) {
      return NextResponse.json({ error: 'Colaborador não encontrado' }, { status: 404 });
    }

    if (userRole === 'client' && employee.companyId !== userId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { tipo, nome, cpf, dataNascimento, genero, email, telefone, vigencia, titularId } = await request.json();

    if (cpf) {
      const cleanedCPF = cleanCPF(cpf);
      if (!validateCPF(cleanedCPF)) {
        return NextResponse.json({ error: 'CPF inválido' }, { status: 400 });
      }
    }

    // Validar dependente
    if (tipo === 'dependente' && titularId) {
      // Verificar limite de 3 dependentes por titular
      const dependentesCount = await prisma.employee.count({
        where: {
          titularId,
          active: true,
          id: { not: params.id }, // Excluir o próprio funcionário da contagem
        },
      });

      if (dependentesCount >= 3) {
        return NextResponse.json({ error: 'O titular já possui 3 dependentes (limite máximo)' }, { status: 400 });
      }
    }

    const updatedEmployee = await prisma.employee.update({
      where: { id: params.id },
      data: {
        ...(tipo && { tipo }),
        ...(nome && { nome }),
        ...(cpf && { cpf: cleanCPF(cpf) }),
        ...(dataNascimento && { dataNascimento: new Date(dataNascimento) }),
        ...(genero && { genero }),
        ...(email !== undefined && { email: email || null }),
        ...(telefone !== undefined && { telefone: telefone ? cleanPhone(telefone) : null }),
        ...(vigencia && { vigencia: new Date(vigencia) }),
        ...(titularId !== undefined && { titularId: tipo === 'dependente' ? titularId : null }),
      },
    });

    return NextResponse.json(updatedEmployee);
  } catch (error) {
    console.error('Error updating employee:', error);
    return NextResponse.json({ error: 'Erro ao atualizar colaborador' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const userRole = (session.user as any)?.role;
    const userId = (session.user as any)?.id;

    const employee = await prisma.employee.findUnique({
      where: { id: params.id },
      include: { company: true },
    });

    if (!employee) {
      return NextResponse.json({ error: 'Colaborador não encontrado' }, { status: 404 });
    }

    if (userRole === 'client' && employee.companyId !== userId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Determinar quem excluiu
    const deletedBy = userRole === 'admin' ? 'admin' : 'company';

    // Marcar o próprio colaborador como inativo
    await prisma.employee.update({
      where: { id: params.id },
      data: {
        active: false,
        deletedAt: new Date(),
        deletedBy,
      },
    });

    // Se for um titular, também inativar todos os dependentes associados
    if (employee.tipo === 'titular') {
      await prisma.employee.updateMany({
        where: { titularId: params.id },
        data: {
          active: false,
          deletedAt: new Date(),
          deletedBy,
        },
      });
    }

    const totalActiveEmployees = await prisma.employee.count({
      where: { companyId: employee.companyId, active: true },
    });

    // Criar notificação no banco
    await prisma.notification.create({
      data: {
        type: 'exclusion',
        title: `Colaborador excluído`,
        message: `${employee.nome} foi excluído da empresa ${employee.company.name} por ${deletedBy === 'admin' ? 'Administrador' : 'Empresa'}`,
        employeeId: employee.id,
        companyId: employee.companyId,
        companyName: employee.company.name,
      },
    });

    await sendNotification('remove', employee.company, 1, employee.company.valorPorVida, totalActiveEmployees);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting employee:', error);
    return NextResponse.json({ error: 'Erro ao remover colaborador' }, { status: 500 });
  }
}
