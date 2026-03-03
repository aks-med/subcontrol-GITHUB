'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { ClientHeader } from '@/components/client-header';
import { EmployeeForm } from '@/components/employee-form';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { Plus, Search, Edit2, Trash2, Users, UserPlus, Calendar, Clock, UserX, ChevronDown, ChevronUp, DollarSign, Filter, CalendarDays, TrendingUp, TrendingDown, ArrowUpDown } from 'lucide-react';
import { formatCPF, formatPhone, formatCurrency } from '@/lib/utils';
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
  createdAt: string;
  deletedAt: string | null;
  deletedBy: string | null;
  active: boolean;
  titularId: string | null;
  titular?: { nome: string } | null;
  dependentes?: Employee[];
}

interface CompanyInfo {
  id: string;
  name: string;
  valorPorVida: number;
  allowDependentes: boolean;
}

export default function ClientePage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [inactiveEmployees, setInactiveEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  
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
    } else if (status === 'authenticated' && (session?.user as any)?.role !== 'client') {
      router.push('/');
    }
  }, [session, status, router]);

  useEffect(() => {
    if (status === 'authenticated' && (session?.user as any)?.role === 'client') {
      fetchEmployees();
      fetchCompanyInfo();
    }
  }, [session, status]);

  const fetchCompanyInfo = async () => {
    try {
      const response = await fetch('/api/companies/info');
      if (response.ok) {
        const data = await response.json();
        setCompanyInfo(data);
      }
    } catch (error) {
      console.error('Error fetching company info:', error);
    }
  };

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

  // Filtrar por período
  const filterByPeriod = (emp: Employee) => {
    if (filterType === 'all') return true;
    
    const createdDate = new Date(emp.createdAt);
    
    if (filterType === 'month' && selectedMonth) {
      const [year, month] = selectedMonth.split('-').map(Number);
      return createdDate.getFullYear() === year && createdDate.getMonth() === month - 1;
    }
    
    if (filterType === 'custom' && startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      return createdDate >= start && createdDate <= end;
    }
    
    return true;
  };

  const filteredEmployees = employees.filter(
    (emp) =>
      (emp.nome?.toLowerCase().includes(search.toLowerCase()) ||
      emp.cpf?.includes(search.replace(/\D/g, ''))) &&
      filterByPeriod(emp)
  );

  const titulares = filteredEmployees.filter((e) => e.tipo === 'titular');
  const dependentes = filteredEmployees.filter((e) => e.tipo === 'dependente');

  // Calcular estatísticas do mês atual
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  const employeesThisMonth = employees.filter(e => {
    const created = new Date(e.createdAt);
    return created.getMonth() === currentMonth && created.getFullYear() === currentYear;
  }).length;

  // Calcular valor total
  const valorPorVida = companyInfo?.valorPorVida || 0;
  const totalColaboradores = filteredEmployees.length;
  const allTitulares = employees.filter(e => e.tipo === 'titular');
  const valorTotal = allTitulares.length * valorPorVida; // Dependentes não tem custo adicional

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

  // Agrupar titulares com seus dependentes
  const getTitularWithDependentes = (titular: Employee) => {
    const deps = dependentes.filter(d => d.titularId === titular.id);
    return { titular, dependentes: deps };
  };

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

  // Calcular movimentação no período selecionado
  const getMovimentacao = () => {
    // Filtrar entradas baseado no filtro de período
    const filterByPeriodForMovimentacao = (dateStr: string | null) => {
      if (filterType === 'all') return true;
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

    const entradas = employees.filter(emp => filterByPeriodForMovimentacao(emp.createdAt)).length;
    const saidas = inactiveEmployees.filter(emp => filterByPeriodForMovimentacao(emp.deletedAt)).length;
    return { entradas, saidas };
  };

  const movimentacao = getMovimentacao();

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#009A11] border-t-transparent"></div>
      </div>
    );
  }

  if ((session?.user as any)?.role !== 'client') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <ClientHeader />
      
      <main className="max-w-7xl mx-auto px-4 py-6 sm:py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Meus Colaboradores</h1>
            <p className="text-sm sm:text-base text-gray-600">Gerencie os colaboradores da sua empresa</p>
          </div>
          <button
            onClick={() => {
              setEditingEmployee(null);
              setFormOpen(true);
            }}
            className="btn-accent flex items-center justify-center gap-2 w-full sm:w-auto"
          >
            <UserPlus className="w-5 h-5" />
            Novo Colaborador
          </button>
        </div>

        {/* Valor Card - Destaque */}
        <div className="card mb-6 bg-gradient-to-r from-[#00552B] to-[#009A11] text-white">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <DollarSign className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
              </div>
              <div>
                <p className="text-white/80 text-xs sm:text-sm">Valor por Associado/Vida</p>
                <p className="text-2xl sm:text-3xl font-bold">{formatCurrency(valorPorVida)}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 sm:flex sm:flex-wrap sm:gap-6">
              <div className="text-center">
                <p className="text-white/80 text-xs sm:text-sm">Titulares</p>
                <p className="text-xl sm:text-2xl font-bold">{allTitulares.length}</p>
              </div>
              <div className="text-center">
                <p className="text-white/80 text-xs sm:text-sm">Dependentes</p>
                <p className="text-xl sm:text-2xl font-bold">{employees.filter(e => e.tipo === 'dependente').length}</p>
                {companyInfo?.allowDependentes && (
                  <p className="text-[10px] sm:text-xs text-white/60">Sem custo</p>
                )}
              </div>
              <div className="text-center sm:border-l sm:border-white/30 sm:pl-6">
                <p className="text-white/80 text-xs sm:text-sm">Valor Mensal</p>
                <p className="text-xl sm:text-3xl font-bold">{formatCurrency(valorTotal)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="card flex items-center gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#009A11]/10 rounded-xl flex items-center justify-center flex-shrink-0">
              <Users className="w-5 h-5 sm:w-6 sm:h-6 text-[#009A11]" />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-gray-500">Total Vidas Ativas</p>
              <p className="text-xl sm:text-2xl font-bold">{employees.length}</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#00552B]/10 rounded-xl flex items-center justify-center flex-shrink-0">
              <Users className="w-5 h-5 sm:w-6 sm:h-6 text-[#00552B]" />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-gray-500">Titulares</p>
              <p className="text-xl sm:text-2xl font-bold">{allTitulares.length}</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-gray-500">Novos este mês</p>
              <p className="text-xl sm:text-2xl font-bold text-green-600">+{employeesThisMonth}</p>
            </div>
          </div>
        </div>

        {/* Movimentação Card - Aparece quando filtro ativo */}
        {filterType !== 'all' && (
          <div className="card mb-6 border-2 border-[#00552B]/20 bg-gradient-to-r from-gray-50 to-white">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-[#00552B]/10 rounded-xl flex items-center justify-center">
                <ArrowUpDown className="w-5 h-5 text-[#00552B]" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Movimentação no Período</h3>
                <p className="text-xs text-gray-500">
                  {filterType === 'month' && generateMonthOptions().find(m => m.value === selectedMonth)?.label}
                  {filterType === 'custom' && startDate && endDate && `${new Date(startDate).toLocaleDateString('pt-BR')} - ${new Date(endDate).toLocaleDateString('pt-BR')}`}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-green-50 rounded-xl">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  <span className="text-xs text-green-600 font-medium">Entradas</span>
                </div>
                <p className="text-2xl font-bold text-green-600">+{movimentacao.entradas}</p>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-xl">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <TrendingDown className="w-4 h-4 text-red-600" />
                  <span className="text-xs text-red-600 font-medium">Saídas</span>
                </div>
                <p className="text-2xl font-bold text-red-600">-{movimentacao.saidas}</p>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-xl">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <span className="text-xs text-blue-600 font-medium">Saldo</span>
                </div>
                <p className={`text-2xl font-bold ${movimentacao.entradas - movimentacao.saidas >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                  {movimentacao.entradas - movimentacao.saidas >= 0 ? '+' : ''}{movimentacao.entradas - movimentacao.saidas}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Search and Filters */}
        <div className="card mb-6">
          <div className="flex flex-col gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nome ou CPF..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-field pl-12"
              />
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
          </div>

          {/* Active Filter Summary */}
          {filterType !== 'all' && (
            <div className="mt-4 p-3 bg-[#009A11]/10 rounded-lg flex items-center justify-between">
              <p className="text-sm text-[#00552B]">
                <Filter className="w-4 h-4 inline mr-1" />
                {filterType === 'month' && `Mostrando inclusões de ${generateMonthOptions().find(m => m.value === selectedMonth)?.label}`}
                {filterType === 'custom' && startDate && endDate && `Mostrando inclusões de ${new Date(startDate).toLocaleDateString('pt-BR')} até ${new Date(endDate).toLocaleDateString('pt-BR')}`}
                {' '}({filteredEmployees.length} colaboradores)
              </p>
            </div>
          )}
        </div>

        {/* Titulares with Dependentes */}
        <div className="card mb-6">
          <h3 className="text-base sm:text-lg font-semibold mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-[#009A11]" />
            Colaboradores Ativos
            {filterType !== 'all' && <span className="text-sm font-normal text-gray-500">({filteredEmployees.length} no período)</span>}
          </h3>

          {titulares.length === 0 && dependentes.length === 0 ? (
            <div className="py-8 sm:py-12 text-center">
              <Users className="w-10 h-10 sm:w-12 sm:h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">
                {filterType === 'all' ? 'Nenhum colaborador cadastrado' : 'Nenhum colaborador encontrado no período selecionado'}
              </p>
              {filterType === 'all' && (
                <button
                  onClick={() => {
                    setEditingEmployee(null);
                    setFormOpen(true);
                  }}
                  className="mt-4 text-[#009A11] hover:underline flex items-center gap-1 mx-auto"
                >
                  <Plus className="w-4 h-4" /> Adicionar primeiro colaborador
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {titulares.map((titular) => {
                const { dependentes: deps } = getTitularWithDependentes(titular);
                return (
                  <div key={titular.id} className="border border-gray-200 rounded-xl overflow-hidden">
                    {/* Titular Row */}
                    <div className="bg-[#00552B]/5 p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                      <div className="flex items-center gap-3 sm:gap-4">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#00552B] rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                          {titular.nome.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-semibold text-gray-900 text-sm sm:text-base truncate">{titular.nome}</h4>
                            <span className="px-2 py-0.5 text-xs font-medium bg-[#00552B] text-white rounded-full">
                              Titular
                            </span>
                          </div>
                          <p className="text-xs sm:text-sm text-gray-500">CPF: {formatCPF(titular.cpf)}</p>
                          <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                            <Clock className="w-3 h-3" />
                            <span className="truncate">Incluído em: {formatDateTime(titular.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 sm:gap-4 justify-between sm:justify-end">
                        <div className="text-left sm:text-right">
                          <p className="text-xs text-gray-500">Valor</p>
                          <p className="font-bold text-[#00552B]">{formatCurrency(valorPorVida)}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setEditingEmployee(titular);
                              setFormOpen(true);
                            }}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Edit2 className="w-4 h-4 text-gray-600" />
                          </button>
                          <button
                            onClick={() => {
                              setEmployeeToDelete(titular);
                              setDeleteDialogOpen(true);
                            }}
                            className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                            title="Remover"
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Dependentes */}
                    {deps.length > 0 && (
                      <div className="bg-white divide-y divide-gray-100">
                        {deps.map((dep, idx) => (
                          <div key={dep.id} className="p-3 sm:p-4 pl-10 sm:pl-16 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
                            <div className="flex items-center gap-2 sm:gap-3">
                              <span className="text-gray-400 hidden sm:inline">└</span>
                              <div className="w-6 h-6 sm:w-8 sm:h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-700 font-medium text-xs sm:text-sm flex-shrink-0">
                                {dep.nome.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="font-medium text-gray-700 text-sm truncate">Dep. {idx + 1}: {dep.nome}</p>
                                </div>
                                <p className="text-xs text-gray-400">CPF: {formatCPF(dep.cpf)}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 sm:gap-4 justify-between sm:justify-end ml-8 sm:ml-0">
                              <span className="text-[10px] sm:text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full whitespace-nowrap">
                                Sem custo
                              </span>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => {
                                    setEditingEmployee(dep);
                                    setFormOpen(true);
                                  }}
                                  className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                  title="Editar"
                                >
                                  <Edit2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-600" />
                                </button>
                                <button
                                  onClick={() => {
                                    setEmployeeToDelete(dep);
                                    setDeleteDialogOpen(true);
                                  }}
                                  className="p-1.5 sm:p-2 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Remover"
                                >
                                  <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-500" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add Dependent Button */}
                    {companyInfo?.allowDependentes && deps.length < 3 && (
                      <div className="bg-gray-50 px-3 sm:px-4 py-2 border-t">
                        <button
                          onClick={() => {
                            setEditingEmployee(null);
                            setFormOpen(true);
                          }}
                          className="text-xs sm:text-sm text-[#009A11] hover:underline flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3 sm:w-4 sm:h-4" /> Adicionar dependente ({deps.length}/3)
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Dependentes órfãos (sem titular válido) */}
              {dependentes.filter(d => !titulares.find(t => t.id === d.titularId)).length > 0 && (
                <div className="border border-orange-200 rounded-xl p-3 sm:p-4 bg-orange-50">
                  <p className="text-xs sm:text-sm text-orange-600 mb-2">Dependentes sem titular vinculado:</p>
                  {dependentes.filter(d => !titulares.find(t => t.id === d.titularId)).map(dep => (
                    <div key={dep.id} className="flex items-center justify-between py-2">
                      <span className="text-gray-700 text-sm">{dep.nome}</span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingEmployee(dep);
                            setFormOpen(true);
                          }}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4 text-gray-600" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Inactive Employees Section */}
        {inactiveEmployees.length > 0 && (
          <div className="card overflow-hidden">
            <button
              onClick={() => setShowInactive(!showInactive)}
              className="w-full flex items-center justify-between text-left"
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

            {showInactive && (
              <div className="mt-4 space-y-2">
                {inactiveEmployees.map((emp) => (
                  <div key={emp.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-red-50 rounded-lg gap-2">
                    <div>
                      <p className="font-medium text-gray-500 line-through text-sm">{emp.nome}</p>
                      <p className="text-xs text-gray-400">
                        {emp.tipo === 'titular' ? 'Titular' : 'Dependente'} - CPF: {formatCPF(emp.cpf)}
                      </p>
                    </div>
                    <div className="text-left sm:text-right">
                      {emp.deletedAt && (
                        <p className="text-xs text-gray-500">
                          Excluído: {formatDateTime(emp.deletedAt)}
                        </p>
                      )}
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${
                          emp.deletedBy === 'admin'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-orange-100 text-orange-700'
                        }`}
                      >
                        {emp.deletedBy === 'admin' ? 'Pelo Admin' : 'Pela Empresa'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      <EmployeeForm
        isOpen={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingEmployee(null);
        }}
        onSuccess={fetchEmployees}
        employee={editingEmployee}
        companyId={(session?.user as any)?.id}
        titulares={allTitulares.map(t => ({
          id: t.id,
          nome: t.nome,
          dependentes: employees.filter(d => d.titularId === t.id)
        }))}
        allowDependentes={companyInfo?.allowDependentes ?? false}
      />

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
