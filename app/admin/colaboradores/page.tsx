'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AdminHeader } from '@/components/admin-header';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { AdminEmployeeForm } from '@/components/admin-employee-form';
import { Search, Users, Download, Trash2, ChevronDown, ChevronUp, UserX, Clock, Building2, Filter, UserPlus, Edit2, CalendarDays, TrendingUp, TrendingDown, ArrowUpDown } from 'lucide-react';
import { formatCPF, formatPhone } from '@/lib/utils';
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
  company: {
    id: string;
    name: string;
    cnpj: string;
    valorPorVida?: number;
  };
}

interface Company {
  id: string;
  name: string;
  valorPorVida: number;
}

export default function ColaboradoresAdminPage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const searchParams = useSearchParams();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [inactiveEmployees, setInactiveEmployees] = useState<Employee[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  
  // Form states
  const [formOpen, setFormOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [selectedCompanyForForm, setSelectedCompanyForForm] = useState<string>('');
  
  // Filtro de período
  const [filterType, setFilterType] = useState<'all' | 'month' | 'custom'>('all');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFilterOptions, setShowFilterOptions] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    } else if (status === 'authenticated' && (session?.user as any)?.role !== 'admin') {
      router.push('/');
    }
  }, [session, status, router]);

  useEffect(() => {
    if (status === 'authenticated' && (session?.user as any)?.role === 'admin') {
      fetchEmployees();
      fetchCompanies();
    }
  }, [session, status]);

  useEffect(() => {
    const filter = searchParams.get('filter');
    if (filter === 'removed') {
      setShowInactive(true);
    }
  }, [searchParams]);

  const fetchEmployees = async () => {
    try {
      const [activeRes, inactiveRes] = await Promise.all([
        fetch('/api/employees'),
        fetch('/api/employees?includeInactive=true')
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

  const fetchCompanies = async () => {
    try {
      const response = await fetch('/api/companies');
      if (response.ok) {
        const data = await response.json();
        setCompanies(data);
      }
    } catch (error) {
      console.error('Error fetching companies:', error);
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

  const handleExport = () => {
    window.open('/api/export', '_blank');
  };

  // Filtrar por período
  const filterByPeriod = (emp: Employee, useCreatedAt: boolean = true) => {
    if (filterType === 'all') return true;
    
    const dateStr = useCreatedAt ? emp.createdAt : emp.deletedAt;
    if (!dateStr) return false;
    
    const date = new Date(dateStr);
    
    if (filterType === 'month' && selectedMonth) {
      const [year, month] = selectedMonth.split('-').map(Number);
      return date.getFullYear() === year && date.getMonth() === month - 1;
    }
    
    if (filterType === 'custom' && startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      return date >= start && date <= end;
    }
    
    return true;
  };

  // Filtrar colaboradores
  const filterEmployees = (emps: Employee[], useCreatedAt: boolean = true) => {
    return emps.filter((emp) => {
      const matchesSearch = 
        emp.nome?.toLowerCase().includes(search.toLowerCase()) ||
        emp.cpf?.includes(search.replace(/\D/g, '')) ||
        emp.company?.name?.toLowerCase().includes(search.toLowerCase());
      const matchesCompany = !companyFilter || emp.company?.id === companyFilter;
      const matchesPeriod = filterByPeriod(emp, useCreatedAt);
      return matchesSearch && matchesCompany && matchesPeriod;
    });
  };

  // Calcular movimentação no período
  const getMovimentacao = () => {
    const entradas = filterEmployees(employees, true).length;
    const saidas = inactiveEmployees.filter(emp => {
      const matchesSearch = 
        emp.nome?.toLowerCase().includes(search.toLowerCase()) ||
        emp.cpf?.includes(search.replace(/\D/g, '')) ||
        emp.company?.name?.toLowerCase().includes(search.toLowerCase());
      const matchesCompany = !companyFilter || emp.company?.id === companyFilter;
      const matchesPeriod = filterByPeriod(emp, false); // Usar deletedAt para saídas
      return matchesSearch && matchesCompany && matchesPeriod;
    }).length;
    return { entradas, saidas };
  };

  const movimentacao = getMovimentacao();

  const filteredEmployees = filterEmployees(employees);
  const filteredInactive = filterEmployees(inactiveEmployees, false);
  
  // Gerar lista de meses (últimos 12 meses)
  const generateMonthOptions = () => {
    const months = [];
    const current = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(current.getFullYear(), current.getMonth() - i, 1);
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      months.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
    }
    return months;
  };

  const clearFilters = () => {
    setFilterType('all');
    setStartDate('');
    setEndDate('');
  };

  // Organizar: Titulares primeiro, dependentes agrupados
  const organizeEmployees = (emps: Employee[]) => {
    const titulares = emps.filter(e => e.tipo === 'titular');
    const dependentes = emps.filter(e => e.tipo === 'dependente');
    
    const organized: (Employee & { isDependent?: boolean })[] = [];
    
    titulares.forEach(titular => {
      organized.push(titular);
      // Adicionar dependentes deste titular
      const deps = dependentes.filter(d => d.titularId === titular.id);
      deps.forEach(dep => {
        organized.push({ ...dep, isDependent: true });
      });
    });
    
    // Adicionar dependentes órfãos (sem titular válido)
    const orphanDeps = dependentes.filter(d => !titulares.find(t => t.id === d.titularId));
    orphanDeps.forEach(dep => {
      organized.push({ ...dep, isDependent: true });
    });
    
    return organized;
  };

  const organizedEmployees = organizeEmployees(filteredEmployees);
  const organizedInactive = organizeEmployees(filteredInactive);

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

  // Obter titulares da empresa selecionada para o form
  const getTitularesForForm = () => {
    if (!selectedCompanyForForm) return [];
    return employees
      .filter(e => e.tipo === 'titular' && e.company?.id === selectedCompanyForForm)
      .map(t => ({
        id: t.id,
        nome: t.nome,
        dependentes: employees.filter(d => d.titularId === t.id)
      }));
  };

  // Verificar se empresa permite dependentes
  const getCompanyAllowDependentes = (companyId: string) => {
    const company = companies.find(c => c.id === companyId);
    return company ? company.valorPorVida >= 35 : false;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader />
      
      <main className="max-w-7xl mx-auto px-4 py-6 sm:py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Colaboradores</h1>
            <p className="text-sm sm:text-base text-gray-600">Todos os colaboradores de todas as empresas</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <button 
              onClick={() => {
                setEditingEmployee(null);
                setSelectedCompanyForForm('');
                setFormOpen(true);
              }} 
              className="btn-accent flex items-center justify-center gap-2 w-full sm:w-auto"
            >
              <UserPlus className="w-5 h-5" />
              Novo Colaborador
            </button>
            <button onClick={handleExport} className="btn-primary flex items-center justify-center gap-2 w-full sm:w-auto">
              <Download className="w-5 h-5" />
              Exportar CSV
            </button>
          </div>
        </div>

        {/* Movimentação Card - Aparece quando filtro ativo */}
        {filterType !== 'all' && (
          <div className="card mb-6 bg-gradient-to-r from-[#00552B] to-[#009A11] text-white">
            <div className="flex items-center gap-3 mb-4">
              <ArrowUpDown className="w-6 h-6" />
              <h3 className="text-lg font-semibold">Movimentação no Período</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/10 rounded-xl p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <TrendingUp className="w-5 h-5 text-green-300" />
                  <span className="text-white/80 text-sm">Entradas</span>
                </div>
                <p className="text-3xl font-bold text-green-300">+{movimentacao.entradas}</p>
              </div>
              <div className="bg-white/10 rounded-xl p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <TrendingDown className="w-5 h-5 text-red-300" />
                  <span className="text-white/80 text-sm">Saídas</span>
                </div>
                <p className="text-3xl font-bold text-red-300">-{movimentacao.saidas}</p>
              </div>
            </div>
            <p className="text-white/70 text-sm mt-3 text-center">
              Saldo: {movimentacao.entradas - movimentacao.saidas >= 0 ? '+' : ''}{movimentacao.entradas - movimentacao.saidas} colaboradores
            </p>
          </div>
        )}

        {/* Filters */}
        <div className="card mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nome, CPF ou empresa..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-field pl-12"
              />
            </div>
            <div className="relative">
              <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <select
                value={companyFilter}
                onChange={(e) => setCompanyFilter(e.target.value)}
                className="input-field pl-12"
              >
                <option value="">Todas as empresas</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Period Filter Toggle */}
          <div>
            <button
              onClick={() => setShowFilterOptions(!showFilterOptions)}
              className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-[#00552B] transition-colors"
            >
              <CalendarDays className="w-4 h-4" />
              Filtrar por Período
              {filterType !== 'all' && (
                <span className="ml-1 px-2 py-0.5 bg-[#009A11] text-white text-xs rounded-full">
                  Filtro ativo
                </span>
              )}
              {showFilterOptions ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showFilterOptions && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                {/* Filter Type Selection */}
                <div className="flex flex-wrap gap-2 mb-4">
                  <button
                    onClick={() => setFilterType('all')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      filterType === 'all'
                        ? 'bg-[#00552B] text-white'
                        : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Todos
                  </button>
                  <button
                    onClick={() => setFilterType('month')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      filterType === 'month'
                        ? 'bg-[#00552B] text-white'
                        : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Por Mês
                  </button>
                  <button
                    onClick={() => setFilterType('custom')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      filterType === 'custom'
                        ? 'bg-[#00552B] text-white'
                        : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Período Personalizado
                  </button>
                </div>

                {/* Month Selector */}
                {filterType === 'month' && (
                  <div>
                    <label className="label text-sm">Selecione o mês</label>
                    <select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="input-field"
                    >
                      {generateMonthOptions().map((month) => (
                        <option key={month.value} value={month.value}>
                          {month.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Custom Date Range */}
                {filterType === 'custom' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="label text-sm">Data Inicial</label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label className="label text-sm">Data Final</label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="input-field"
                      />
                    </div>
                  </div>
                )}

                {filterType !== 'all' && (
                  <button
                    onClick={clearFilters}
                    className="mt-4 text-sm text-red-600 hover:underline"
                  >
                    Limpar filtros
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Active Filter Summary */}
          {filterType !== 'all' && (
            <div className="mt-4 p-3 bg-[#009A11]/10 rounded-lg flex items-center justify-between">
              <p className="text-sm text-[#00552B]">
                <Filter className="w-4 h-4 inline mr-1" />
                {filterType === 'month' && `Mostrando movimentação de ${generateMonthOptions().find(m => m.value === selectedMonth)?.label}`}
                {filterType === 'custom' && startDate && endDate && `Mostrando movimentação de ${new Date(startDate).toLocaleDateString('pt-BR')} até ${new Date(endDate).toLocaleDateString('pt-BR')}`}
              </p>
            </div>
          )}
        </div>

        {/* Active Employees */}
        <div className="card overflow-hidden mb-6">
          <h3 className="text-base sm:text-lg font-semibold mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-[#009A11]" />
            Colaboradores Ativos ({filteredEmployees.length})
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
                    <span className="text-gray-400">{emp.company?.name}</span>
                    <span className="mx-1">•</span>
                    {formatDateTime(emp.createdAt).split(' ')[0]}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditingEmployee(emp);
                        setSelectedCompanyForForm(emp.company?.id || '');
                        setFormOpen(true);
                      }}
                      className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-4 h-4 text-gray-600" />
                    </button>
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
              </div>
            ))}
            {organizedEmployees.length === 0 && (
              <div className="py-8 text-center">
                <Users className="w-10 h-10 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-sm">Nenhum colaborador encontrado</p>
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
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Empresa</th>
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
                    <td className="py-3 px-4 text-gray-600">{emp.company?.name}</td>
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
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => {
                            setEditingEmployee(emp);
                            setSelectedCompanyForForm(emp.company?.id || '');
                            setFormOpen(true);
                          }}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4 text-gray-600" />
                        </button>
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
                    <td colSpan={6} className="py-12 text-center">
                      <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">Nenhum colaborador encontrado</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Inactive Employees Section */}
        <div className="card overflow-hidden">
          <button
            onClick={() => setShowInactive(!showInactive)}
            className="w-full flex items-center justify-between text-left p-0"
          >
            <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
              <UserX className="w-5 h-5 text-red-500" />
              Colaboradores Excluídos ({filteredInactive.length})
            </h3>
            {showInactive ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </button>

          {showInactive && filteredInactive.length > 0 && (
            <div className="mt-4">
              {/* Mobile: Cards view for inactive */}
              <div className="sm:hidden space-y-3">
                {organizedInactive.map((emp: any) => (
                  <div key={emp.id} className="p-3 rounded-lg bg-red-50 border border-red-100">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium text-gray-500 line-through text-sm">{emp.nome}</p>
                        <p className="text-xs text-gray-400">{formatCPF(emp.cpf)}</p>
                        <p className="text-xs text-gray-400">{emp.company?.name}</p>
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
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Empresa</th>
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
                        <td className="py-3 px-4 text-gray-400">{emp.company?.name}</td>
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

          {showInactive && filteredInactive.length === 0 && (
            <div className="mt-4 py-8 text-center text-gray-500">
              <UserX className="w-10 h-10 sm:w-12 sm:h-12 text-gray-300 mx-auto mb-4" />
              <p>Nenhum colaborador excluído</p>
            </div>
          )}
        </div>

        <p className="text-xs sm:text-sm text-gray-500 mt-4 text-center">
          Total Ativos: {filteredEmployees.length} | Excluídos: {filteredInactive.length}
        </p>
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

      <AdminEmployeeForm
        isOpen={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingEmployee(null);
          setSelectedCompanyForForm('');
        }}
        onSuccess={() => {
          fetchEmployees();
        }}
        employee={editingEmployee}
        companies={companies}
        selectedCompanyId={selectedCompanyForForm}
        onCompanyChange={setSelectedCompanyForForm}
        titulares={getTitularesForForm()}
        allowDependentes={selectedCompanyForForm ? getCompanyAllowDependentes(selectedCompanyForForm) : true}
      />
    </div>
  );
}
