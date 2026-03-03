'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { formatCNPJ, validateCNPJ } from '@/lib/utils';
import toast from 'react-hot-toast';

interface CompanyFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  company?: any;
}

export function CompanyForm({ isOpen, onClose, onSuccess, company }: CompanyFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    cnpj: '',
    valorPorVida: '',
  });

  useEffect(() => {
    if (company) {
      setFormData({
        name: company.name || '',
        cnpj: formatCNPJ(company.cnpj || ''),
        valorPorVida: company.valorPorVida?.toString() || '',
      });
    } else {
      setFormData({
        name: '',
        cnpj: '',
        valorPorVida: '',
      });
    }
  }, [company, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const cleanedCNPJ = formData.cnpj.replace(/\D/g, '');
    if (!validateCNPJ(cleanedCNPJ)) {
      toast.error('CNPJ inválido');
      return;
    }

    setLoading(true);

    try {
      const url = company ? `/api/companies/${company.id}` : '/api/companies';
      const method = company ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          cnpj: cleanedCNPJ,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erro ao salvar');
      }

      toast.success(company ? 'Empresa atualizada!' : 'Empresa cadastrada!');
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao salvar empresa');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md animate-fadeIn">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">
            {company ? 'Editar Empresa' : 'Nova Empresa'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="label">Nome da Empresa *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input-field"
              placeholder="Empresa LTDA"
              required
            />
          </div>

          <div>
            <label className="label">CNPJ *</label>
            <input
              type="text"
              value={formData.cnpj}
              onChange={(e) => setFormData({ ...formData, cnpj: formatCNPJ(e.target.value) })}
              className="input-field"
              placeholder="00.000.000/0001-00"
              maxLength={18}
              required
            />
          </div>

          <div>
            <label className="label">Valor por Vida (R$) *</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.valorPorVida}
              onChange={(e) => setFormData({ ...formData, valorPorVida: e.target.value })}
              className="input-field"
              placeholder="35.00"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Este valor é confidencial e não será visível para o cliente
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
