'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { AdminHeader } from '@/components/admin-header';
import { CompanyForm } from '@/components/company-form';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { Plus, Search, Edit2, Trash2, Users, ChevronRight } from 'lucide-react';
import { formatCNPJ, formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';

interface Company {
  id: string;
  name: string;
  cnpj: string;
  valorPorVida: number;
  active: boolean;
  _count: { employees: number };
}

export default function EmpresasPage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState<Company | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    } else if (status === 'authenticated' && (session?.user as any)?.role !== 'admin') {
      router.push('/');
    }
  }, [session, status, router]);

  useEffect(() => {
    if (status === 'authenticated' && (session?.user as any)?.role === 'admin') {
      fetchCompanies();
    }
  }, [session, status]);

  const fetchCompanies = async () => {
    try {
      const response = await fetch('/api/companies');
      if (response.ok) {
        const data = await response.json();
        setCompanies(data);
      }
    } catch (error) {
      console.error('Error fetching companies:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!companyToDelete) return;
    
    setDeleteLoading(true);
    try {
      const response = await fetch(`/api/companies/${companyToDelete.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Empresa excluída com sucesso!');
        fetchCompanies();
      } else {
        toast.error('Erro ao excluir empresa');
      }
    } catch (error) {
      toast.error('Erro ao excluir empresa');
    } finally {
      setDeleteLoading(false);
      setDeleteDialogOpen(false);
      setCompanyToDelete(null);
    }
  };

  const filteredCompanies = companies.filter(
    (company) =>
      company.name?.toLowerCase().includes(search.toLowerCase()) ||
      company.cnpj?.includes(search.replace(/\D/g, ''))
  );

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

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader />
      
      <main className="max-w-7xl mx-auto px-4 py-6 sm:py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Empresas</h1>
            <p className="text-sm sm:text-base text-gray-600">Gerencie as empresas clientes cadastradas</p>
          </div>
          <button
            onClick={() => {
              setEditingCompany(null);
              setFormOpen(true);
            }}
            className="btn-primary flex items-center justify-center gap-2 w-full sm:w-auto"
          >
            <Plus className="w-5 h-5" />
            Nova Empresa
          </button>
        </div>

        {/* Search */}
        <div className="card mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nome ou CNPJ..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-12"
            />
          </div>
        </div>

        {/* Companies List */}
        <div className="grid gap-3 sm:gap-4">
          {filteredCompanies.map((company) => (
            <div
              key={company.id}
              className="card hover:shadow-lg hover:border-[#00552B] transition-all duration-200 animate-fadeIn cursor-pointer"
              onClick={() => router.push(`/admin/empresas/${company.id}`)}
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                {/* Company Info */}
                <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#00552B]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Users className="w-5 h-5 sm:w-6 sm:h-6 text-[#00552B]" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{company.name}</h3>
                    <p className="text-xs sm:text-sm text-gray-500">{formatCNPJ(company.cnpj)}</p>
                  </div>
                </div>

                {/* Stats and Actions */}
                <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-6 pl-12 sm:pl-0">
                  <div className="flex items-center gap-3 sm:gap-6">
                    <div className="text-center">
                      <p className="text-xs text-gray-500 hidden sm:block">Colaboradores</p>
                      <p className="font-semibold text-[#009A11] text-sm sm:text-base">
                        {company._count?.employees ?? 0}
                        <span className="sm:hidden text-xs text-gray-400 ml-1">colab.</span>
                      </p>
                    </div>
                    <div className="text-center hidden sm:block">
                      <p className="text-xs text-gray-500">Valor/Vida</p>
                      <p className="font-semibold text-[#00552B]">{formatCurrency(company.valorPorVida)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-500 hidden sm:block">Valor Mensal</p>
                      <p className="font-semibold text-[#00552B] text-sm sm:text-base">
                        {formatCurrency((company._count?.employees ?? 0) * company.valorPorVida)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => {
                        setEditingCompany(company);
                        setFormOpen(true);
                      }}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Editar"
                    >
                      <Edit2 className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                    </button>
                    <button
                      onClick={() => {
                        setCompanyToDelete(company);
                        setDeleteDialogOpen(true);
                      }}
                      className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" />
                    </button>
                    <ChevronRight className="w-5 h-5 text-gray-400 hidden sm:block" />
                  </div>
                </div>
              </div>
            </div>
          ))}

          {filteredCompanies.length === 0 && (
            <div className="card text-center py-8 sm:py-12">
              <Users className="w-10 h-10 sm:w-12 sm:h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Nenhuma empresa encontrada</p>
            </div>
          )}
        </div>
      </main>

      <CompanyForm
        isOpen={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingCompany(null);
        }}
        onSuccess={fetchCompanies}
        company={editingCompany}
      />

      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setCompanyToDelete(null);
        }}
        onConfirm={handleDelete}
        title="Excluir Empresa"
        message={`Tem certeza que deseja excluir a empresa "${companyToDelete?.name}"? Todos os colaboradores serão removidos.`}
        loading={deleteLoading}
      />
    </div>
  );
}
