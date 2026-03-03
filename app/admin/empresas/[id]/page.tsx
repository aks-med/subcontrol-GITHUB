'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { AdminHeader } from '@/components/admin-header';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { ArrowLeft, Users, Trash2, Clock, UserX, ChevronDown, ChevronUp, DollarSign, Building2 } from 'lucide-react';
import { formatCPF, formatCNPJ, formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';

interface Employee {
  id: string;
  tipo: string;
  nome: string;
  cpf: string;
  dataNascimento: string;
  genero: string | null;
  email: string | null;
  telefone: string | null;
  vigencia: string;
  active: boolean;
  createdAt: string;
  deletedAt: string | null;
  deletedBy: string | null;
  titularId: string | null;
  titular?: { id: string; nome: string } | null;
  dependentes?: Employee[];
}

interface Company {
  id: string;
  name: string;
  cnpj: string;
  valorPorVida: number;
  active: boolean;
  createdAt: string;
}

export default function EmpresaDetalhePage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const params = useParams();
  const companyId = params?.id as string;

  const [company, setCompany] = useState<Company | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [inactiveEmployees, setInactiveEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInactive, setShowInactive] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    } else if (status === 'authenticated' && (session?.user as any)?.role !== 'admin') {
      router.push('/');
    }
  }, [session, status, router]);

  useEffect(() => {
    if (status === 'authenticated' && companyId) {
      fetchCompany();
      fetchEmployees();
    }
  }, [session, status, companyId]);

  const fetchCompany = async () => {
    try {
      const response = await fetch(`/api/companies/${companyId}`);
      if (response.ok) {
        const data = await response.json();
        setCompany(data);
      }
    } catch (error) {
      console.error('Error fetching company:', error);
    }
  };

  const fetchEmployees = async () => {
    try {
      const [activeRes, inactiveRes] = await Promise.all([
        fetch(`/api/employees?companyId=${companyId}`),
        fetch(`/api/employees?companyId=${companyId}&includeInactive=true`)
      ]);
      
      if (activeRes.ok) {
        const data = await activeRes.json();
        setEmployees(data.filter((e: Employee) => e.active));
      }
      
      if (inactiveRes.ok) {
        const data = await inactiveRes.json();
        setInactiveEmployees(data.filter((e: Employee) => !e.active));
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!employeeToDelete) return;
    
    setDeleteLoading(true);
    try {
      const response = await fetch(`/api/employees/${employeeToDelete.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Colaborador removido com sucesso!');
        fetchEmployees();
      } else {
        toast.error('Erro ao remover colaborador');
      }
    } catch (error) {
      toast.error('Erro ao remover colaborador');
    } finally {
      setDeleteLoading(false);
      setDeleteDialogOpen(false);
      setEmployeeToDelete(null);
    }
  };

  const organizeEmployees = (emps: Employee[]) => {
    const titulares = emps.filter(e => e.tipo === 'titular');
    const dependentes = emps.filter(e => e.tipo === 'dependente');
    
    const organized: (Employee & { isDependent?: boolean })[] = [];
    
    titulares.forEach(titular => {
      organized.push(titular);
      const deps = dependentes.filter(d => d.titularId === titular.id);
      deps.forEach(dep => {
        organized.push({ ...dep, isDependent: true });
      });
    });
    
    const orphanDeps = dependentes.filter(d => !titulares.find(t => t.id === d.titularId));
    orphanDeps.forEach(dep => {
      organized.push({ ...dep, isDependent: true });
    });
    
    return organized;
  };

  const organizedEmployees = organizeEmployees(employees);
  const organizedInactive = organizeEmployees(inactiveEmployees);

  const isNew = (createdAt: string) => {
    const created = new Date(createdAt);
    const now = new Date();
    const diffDays = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays <= 7;
  };

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#00552B] border-t-transparent"></div>
      </div>
    );
  }

  if ((session?.user as any)?.role !== 'admin') {
    return null;
  }

  const totalValue = employees.length * (company?.valorPorVida || 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader />
      
      <main className="max-w-7xl mx-auto px-4 py-6 sm:py-8">
        <button
          onClick={() => router.push('/admin/empresas')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 sm:mb-6 text-sm sm:text-base"
        >
          <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          Voltar para empresas
        </button>

        {/* Company Info */}
        <div className="card mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-[#00552B]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <Building2 className="w-6 h-6 sm:w-8 sm:h-8 text-[#00552B]" />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">{company?.name}</h1>
                <p className="text-sm sm:text-base text-gray-600">CNPJ: {formatCNPJ(company?.cnpj || '')}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:gap-4 sm:flex sm:flex-wrap">
              <div className="bg-gray-100 rounded-lg px-3 py-2 sm:px-4 text-center sm:text-left">
                <p className="text-[10px] sm:text-xs text-gray-500">Valor/Vida</p>
                <p className="text-sm sm:text-lg font-bold text-[#00552B]">{formatCurrency(company?.valorPorVida || 0)}</p>
              </div>
              <div className="bg-[#00552B]/10 rounded-lg px-3 py-2 sm:px-4 text-center sm:text-left">
                <p className="text-[10px] sm:text-xs text-gray-500">Colaboradores</p>
                <p className="text-sm sm:text-lg font-bold text-[#00552B]">{employees.length}</p>
              </div>
              <div className="bg-green-100 rounded-lg px-3 py-2 sm:px-4 text-center sm:text-left">
                <p className="text-[10px] sm:text-xs text-gray-500">Valor Mensal</p>
                <p className="text-sm sm:text-lg font-bold text-green-700">{formatCurrency(totalValue)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Active Employees */}
        <div className="card overflow-hidden mb-6">
          <h3 className="text-base sm:text-lg font-semibold mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-[#009A11]" />
            Colaboradores Ativos ({employees.length})
          </h3>

          {/* Mobile: Cards view */}
          <div className="sm:hidden space-y-3">
            {organizedEmployees.map((emp: any) => (
              <div
                key={emp.id}
                className={`p-3 rounded-lg border ${
                  emp.isDependent ? 'bg-gray-50 ml-4 border-gray-200' : 'bg-white border-gray-200'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      {emp.isDependent && <span className="text-gray-400">└</span>}
                      <p className="font-medium text-sm">{emp.nome}</p>
                      {isNew(emp.createdAt) && (
                        <span className="px-1.5 py-0.5 text-[10px] font-medium bg-green-100 text-green-700 rounded-full animate-pulse">
                          NOVO
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">{formatCPF(emp.cpf)}</p>
                    {emp.tipo === 'dependente' && emp.titular && (
                      <p className="text-xs text-gray-400">Dep. de: {emp.titular.nome}</p>
                    )}
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      emp.tipo === 'titular'
                        ? 'bg-[#00552B]/10 text-[#00552B]'
                        : 'bg-purple-100 text-purple-700'
                    }`}
                  >
                    {emp.tipo === 'titular' ? 'Titular' : 'Dep.'}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <div className="text-xs text-gray-500">
                    {formatDateTime(emp.createdAt).split(' ')[0]}
                  </div>
                  <button
                    onClick={() => {
                      setEmployeeToDelete(emp);
                      setDeleteDialogOpen(true);
                    }}
                    className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              </div>
            ))}
            {organizedEmployees.length === 0 && (
              <div className="py-8 text-center">
                <Users className="w-10 h-10 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-sm">Nenhum colaborador cadastrado</p>
              </div>
            )}
          </div>

          {/* Desktop: Table view */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Nome</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">CPF</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">Tipo</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Incluído em</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">Ações</th>
                </tr>
              </thead>
              <tbody>
                {organizedEmployees.map((emp: any) => (
                  <tr
                    key={emp.id}
                    className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                      emp.isDependent ? 'bg-gray-50/50' : ''
                    }`}
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {emp.isDependent && (
                          <span className="text-gray-400 ml-4">└</span>
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{emp.nome}</p>
                            {isNew(emp.createdAt) && (
                              <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full animate-pulse">
                                NOVO
                              </span>
                            )}
                          </div>
                          {emp.tipo === 'dependente' && emp.titular && (
                            <p className="text-xs text-gray-500">Dependente de: {emp.titular.nome}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-600">{formatCPF(emp.cpf)}</td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                          emp.tipo === 'titular'
                            ? 'bg-[#00552B]/10 text-[#00552B]'
                            : 'bg-purple-100 text-purple-700'
                        }`}
                      >
                        {emp.tipo === 'titular' ? 'Titular' : 'Dependente'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      <div className="flex items-center gap-1 text-sm">
                        <Clock className="w-3 h-3 text-gray-400" />
                        {formatDateTime(emp.createdAt)}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center">
                        <button
                          onClick={() => {
                            setEmployeeToDelete(emp);
                            setDeleteDialogOpen(true);
                          }}
                          className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                          title="Remover"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {organizedEmployees.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center">
                      <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">Nenhum colaborador cadastrado</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Inactive Employees */}
        <div className="card overflow-hidden">
          <button
            onClick={() => setShowInactive(!showInactive)}
            className="w-full flex items-center justify-between text-left p-0"
          >
            <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
              <UserX className="w-5 h-5 text-red-500" />
              Colaboradores Excluídos ({inactiveEmployees.length})
            </h3>
            {showInactive ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </button>

          {showInactive && inactiveEmployees.length > 0 && (
            <div className="mt-4">
              {/* Mobile: Cards view for inactive */}
              <div className="sm:hidden space-y-3">
                {organizedInactive.map((emp: any) => (
                  <div key={emp.id} className="p-3 rounded-lg bg-red-50 border border-red-100">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium text-gray-500 line-through text-sm">{emp.nome}</p>
                        <p className="text-xs text-gray-400">{formatCPF(emp.cpf)}</p>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                        {emp.tipo === 'titular' ? 'Titular' : 'Dep.'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <div className="text-xs text-gray-500">
                        {emp.deletedAt && formatDateTime(emp.deletedAt).split(' ')[0]}
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          emp.deletedBy === 'admin'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-orange-100 text-orange-700'
                        }`}
                      >
                        {emp.deletedBy === 'admin' ? 'Admin' : 'Empresa'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop: Table view for inactive */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-red-50 border-b">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Nome</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">CPF</th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">Tipo</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Excluído em</th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">Excluído por</th>
                    </tr>
                  </thead>
                  <tbody>
                    {organizedInactive.map((emp: any) => (
                      <tr key={emp.id} className="border-b border-gray-100 hover:bg-red-50/50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            {emp.isDependent && (
                              <span className="text-gray-400 ml-4">└</span>
                            )}
                            <div>
                              <p className="font-medium text-gray-500 line-through">{emp.nome}</p>
                              {emp.tipo === 'dependente' && emp.titular && (
                                <p className="text-xs text-gray-400">Dependente de: {emp.titular.nome}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-gray-400">{formatCPF(emp.cpf)}</td>
                        <td className="py-3 px-4 text-center">
                          <span className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                            {emp.tipo === 'titular' ? 'Titular' : 'Dependente'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-500">
                          {emp.deletedAt ? (
                            <div className="flex items-center gap-1 text-sm">
                              <Clock className="w-3 h-3 text-gray-400" />
                              {formatDateTime(emp.deletedAt)}
                            </div>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                              emp.deletedBy === 'admin'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-orange-100 text-orange-700'
                            }`}
                          >
                            {emp.deletedBy === 'admin' ? 'Administrador' : 'Empresa'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {showInactive && inactiveEmployees.length === 0 && (
            <div className="mt-4 py-8 text-center text-gray-500">
              <UserX className="w-10 h-10 sm:w-12 sm:h-12 text-gray-300 mx-auto mb-4" />
              <p>Nenhum colaborador excluído</p>
            </div>
          )}
        </div>
      </main>

      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setEmployeeToDelete(null);
        }}
        onConfirm={handleDelete}
        title="Remover Colaborador"
        message={`Tem certeza que deseja remover ${employeeToDelete?.nome}? Esta ação não pode ser desfeita.`}
        loading={deleteLoading}
      />
    </div>
  );
}
