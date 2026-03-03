'use client';

import { useState, useEffect } from 'react';
import { X, AlertCircle, Building2 } from 'lucide-react';
import { formatCPF, formatPhone, validateCPF } from '@/lib/utils';
import toast from 'react-hot-toast';

interface Titular {
  id: string;
  nome: string;
  dependentes?: any[];
}

interface Company {
  id: string;
  name: string;
  valorPorVida: number;
}

interface AdminEmployeeFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  employee?: any;
  companies: Company[];
  selectedCompanyId: string;
  onCompanyChange: (companyId: string) => void;
  titulares?: Titular[];
  allowDependentes?: boolean;
}

export function AdminEmployeeForm({ 
  isOpen, 
  onClose, 
  onSuccess, 
  employee, 
  companies,
  selectedCompanyId,
  onCompanyChange,
  titulares = [], 
  allowDependentes = true 
}: AdminEmployeeFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    tipo: 'titular',
    titularId: '',
    nome: '',
    cpf: '',
    dataNascimento: '',
    genero: '',
    email: '',
    telefone: '',
    vigencia: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    if (employee) {
      setFormData({
        tipo: employee.tipo || 'titular',
        titularId: employee.titularId || '',
        nome: employee.nome || '',
        cpf: formatCPF(employee.cpf || ''),
        dataNascimento: employee.dataNascimento ? new Date(employee.dataNascimento).toISOString().split('T')[0] : '',
        genero: employee.genero || '',
        email: employee.email || '',
        telefone: employee.telefone ? formatPhone(employee.telefone) : '',
        vigencia: employee.vigencia ? new Date(employee.vigencia).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      });
    } else {
      setFormData({
        tipo: 'titular',
        titularId: '',
        nome: '',
        cpf: '',
        dataNascimento: '',
        genero: '',
        email: '',
        telefone: '',
        vigencia: new Date().toISOString().split('T')[0],
      });
    }
  }, [employee, isOpen]);

  // Verificar quantos dependentes cada titular já tem
  const getTitularDependentesCount = (titularId: string) => {
    const titular = titulares.find(t => t.id === titularId);
    return titular?.dependentes?.length || 0;
  };

  // Titulares disponíveis (com menos de 3 dependentes)
  const availableTitulares = titulares.filter(t => {
    const count = getTitularDependentesCount(t.id);
    // Se estamos editando um dependente deste titular, ele pode manter
    if (employee?.titularId === t.id) return true;
    return count < 3;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar empresa selecionada
    if (!selectedCompanyId) {
      toast.error('Selecione uma empresa');
      return;
    }

    const cleanedCPF = formData.cpf.replace(/\D/g, '');
    if (!validateCPF(cleanedCPF)) {
      toast.error('CPF inválido');
      return;
    }

    // Validar campos obrigatórios
    if (!formData.nome.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }
    if (!formData.dataNascimento) {
      toast.error('Data de nascimento é obrigatória');
      return;
    }
    if (!formData.email.trim()) {
      toast.error('Email é obrigatório');
      return;
    }
    if (!formData.telefone.trim()) {
      toast.error('Telefone é obrigatório');
      return;
    }
    if (!formData.vigencia) {
      toast.error('Data de vigência é obrigatória');
      return;
    }

    // Validar dependente
    if (formData.tipo === 'dependente') {
      if (!allowDependentes) {
        toast.error('Este plano não permite dependentes');
        return;
      }
      if (!formData.titularId) {
        toast.error('Selecione o titular do dependente');
        return;
      }
      // Verificar limite de 3 dependentes
      const currentCount = getTitularDependentesCount(formData.titularId);
      const isEditingSameTitular = employee?.titularId === formData.titularId;
      if (!isEditingSameTitular && currentCount >= 3) {
        toast.error('Este titular já possui 3 dependentes (limite máximo)');
        return;
      }
    }

    setLoading(true);

    try {
      const url = employee ? `/api/employees/${employee.id}` : '/api/employees';
      const method = employee ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          cpf: cleanedCPF,
          companyId: selectedCompanyId,
          titularId: formData.tipo === 'dependente' ? formData.titularId : null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erro ao salvar');
      }

      toast.success(employee ? 'Colaborador atualizado!' : 'Colaborador adicionado!');
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao salvar colaborador');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-fadeIn">
        <div className="flex items-center justify-between p-4 sm:p-6 border-b sticky top-0 bg-white z-10">
          <h2 className="text-lg sm:text-xl font-semibold">
            {employee ? 'Editar Colaborador' : 'Novo Colaborador'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          {/* Seleção de Empresa */}
          <div>
            <label className="label">Empresa *</label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <select
                value={selectedCompanyId}
                onChange={(e) => onCompanyChange(e.target.value)}
                className="input-field pl-10"
                required
                disabled={!!employee}
              >
                <option value="">Selecione uma empresa...</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            {employee && (
              <p className="text-xs text-gray-500 mt-1">A empresa não pode ser alterada na edição</p>
            )}
          </div>

          <div>
            <label className="label">Tipo *</label>
            <select
              value={formData.tipo}
              onChange={(e) => setFormData({ ...formData, tipo: e.target.value, titularId: '' })}
              className="input-field"
              required
            >
              <option value="titular">Titular</option>
              {allowDependentes && <option value="dependente">Dependente</option>}
            </select>
            {!allowDependentes && selectedCompanyId && (
              <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Este plano não permite cadastro de dependentes
              </p>
            )}
          </div>

          {formData.tipo === 'dependente' && allowDependentes && (
            <div>
              <label className="label">Titular Responsável *</label>
              <select
                value={formData.titularId}
                onChange={(e) => setFormData({ ...formData, titularId: e.target.value })}
                className="input-field"
                required
              >
                <option value="">Selecione o titular...</option>
                {availableTitulares.map((t) => {
                  const count = getTitularDependentesCount(t.id);
                  return (
                    <option key={t.id} value={t.id}>
                      {t.nome} ({count}/3 dependentes)
                    </option>
                  );
                })}
              </select>
              {availableTitulares.length === 0 && (
                <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Nenhum titular disponível. Adicione um titular primeiro ou escolha um com menos de 3 dependentes.
                </p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Cada titular pode ter até 3 dependentes sem custo adicional
              </p>
            </div>
          )}

          <div>
            <label className="label">Nome Completo *</label>
            <input
              type="text"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              className="input-field"
              placeholder="João da Silva"
              required
            />
          </div>

          <div>
            <label className="label">CPF *</label>
            <input
              type="text"
              value={formData.cpf}
              onChange={(e) => setFormData({ ...formData, cpf: formatCPF(e.target.value) })}
              className="input-field"
              placeholder="000.000.000-00"
              maxLength={14}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Data de Nascimento *</label>
              <input
                type="date"
                value={formData.dataNascimento}
                onChange={(e) => setFormData({ ...formData, dataNascimento: e.target.value })}
                className="input-field"
                required
              />
            </div>

            <div>
              <label className="label">Gênero</label>
              <select
                value={formData.genero}
                onChange={(e) => setFormData({ ...formData, genero: e.target.value })}
                className="input-field"
              >
                <option value="">Não informado</option>
                <option value="masculino">Masculino</option>
                <option value="feminino">Feminino</option>
                <option value="outro">Outro</option>
              </select>
            </div>
          </div>

          <div>
            <label className="label">Email *</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="input-field"
              placeholder="email@exemplo.com"
              required
            />
          </div>

          <div>
            <label className="label">Telefone *</label>
            <input
              type="text"
              value={formData.telefone}
              onChange={(e) => setFormData({ ...formData, telefone: formatPhone(e.target.value) })}
              className="input-field"
              placeholder="(00) 00000-0000"
              maxLength={15}
              required
            />
          </div>

          <div>
            <label className="label">Vigência (Início no Plano) *</label>
            <input
              type="date"
              value={formData.vigencia}
              onChange={(e) => setFormData({ ...formData, vigencia: e.target.value })}
              className="input-field"
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading || !selectedCompanyId}
            >
              {loading ? 'Salvando...' : employee ? 'Atualizar' : 'Adicionar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
