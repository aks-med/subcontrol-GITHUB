'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { AdminHeader } from '@/components/admin-header';
import { Building2, Users, TrendingUp, TrendingDown, DollarSign, Activity, Bell, X } from 'lucide-react';
import { formatCurrency, formatCNPJ } from '@/lib/utils';

interface Stats {
  totalCompanies: number;
  activeCompanies: number;
  totalEmployees: number;
  recentAdditions: number;
  recentRemovals: number;
  totalRevenue: number;
  companiesWithStats: Array<{
    id: string;
    name: string;
    cnpj: string;
    employeeCount: number;
    valorPorVida: number;
    monthlyValue: number;
  }>;
}

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  companyName: string | null;
  read: boolean;
  createdAt: string;
}

export default function AdminDashboard() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    } else if (status === 'authenticated' && (session?.user as any)?.role !== 'admin') {
      router.push('/');
    }
  }, [session, status, router]);

  useEffect(() => {
    if (status === 'authenticated' && (session?.user as any)?.role === 'admin') {
      fetchStats();
      fetchNotifications();
    }
  }, [session, status]);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/notifications?limit=20');
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      setNotifications(notifications.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };

  const formatNotificationDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `há ${minutes}min`;
    if (hours < 24) return `há ${hours}h`;
    if (days < 7) return `há ${days}d`;
    return date.toLocaleDateString('pt-BR');
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

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader />
      
      <main className="max-w-7xl mx-auto px-4 py-6 sm:py-8">
        <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-sm sm:text-base text-gray-600">Visão geral do sistema de gestão de benefícios</p>
          </div>

          {/* Notification Bell */}
          <div className="relative self-end sm:self-auto">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2.5 sm:p-3 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-200"
            >
              <Bell className="w-5 h-5 sm:w-6 sm:h-6 text-[#00552B]" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <>
                {/* Backdrop for mobile */}
                <div 
                  className="fixed inset-0 bg-black/20 z-40 sm:hidden"
                  onClick={() => setShowNotifications(false)}
                />
                <div className="fixed sm:absolute left-4 right-4 sm:left-auto sm:right-0 top-auto bottom-4 sm:bottom-auto sm:top-full sm:mt-2 w-auto sm:w-96 bg-white rounded-xl shadow-xl border border-gray-200 z-50 animate-fadeIn max-h-[70vh] flex flex-col">
                  <div className="flex items-center justify-between p-4 border-b">
                    <h3 className="font-semibold text-gray-900">Notificações</h3>
                    <div className="flex items-center gap-2">
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllAsRead}
                          className="text-xs text-[#00552B] hover:underline"
                        >
                          Marcar lidas
                        </button>
                      )}
                      <button onClick={() => setShowNotifications(false)}>
                        <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
                      </button>
                    </div>
                  </div>
                  <div className="overflow-y-auto flex-1">
                    {notifications.length > 0 ? (
                      notifications.map((notif) => (
                        <div
                          key={notif.id}
                          className={`p-4 border-b hover:bg-gray-50 transition-colors ${
                            !notif.read ? 'bg-green-50' : ''
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                              notif.type === 'inclusion' ? 'bg-green-500' : 'bg-red-500'
                            }`} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900">{notif.title}</p>
                              <p className="text-xs text-gray-500 mt-1 line-clamp-2">{notif.message}</p>
                              <p className="text-xs text-gray-400 mt-1">{formatNotificationDate(notif.createdAt)}</p>
                            </div>
                            {!notif.read && (
                              <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full flex-shrink-0">
                                Novo
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-8 text-center text-gray-500">
                        <Bell className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                        <p>Nenhuma notificação</p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Stats Cards - Clickable */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
          <div
            onClick={() => router.push('/admin/empresas')}
            className="card flex flex-col sm:flex-row items-center gap-3 sm:gap-4 cursor-pointer hover:shadow-lg hover:border-[#00552B] transition-all p-4 sm:p-6"
          >
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-[#00552B]/10 rounded-xl flex items-center justify-center flex-shrink-0">
              <Building2 className="w-6 h-6 sm:w-7 sm:h-7 text-[#00552B]" />
            </div>
            <div className="text-center sm:text-left">
              <p className="text-xs sm:text-sm text-gray-500">Empresas Ativas</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats?.activeCompanies ?? 0}</p>
            </div>
          </div>

          <div
            onClick={() => router.push('/admin/colaboradores')}
            className="card flex flex-col sm:flex-row items-center gap-3 sm:gap-4 cursor-pointer hover:shadow-lg hover:border-[#009A11] transition-all p-4 sm:p-6"
          >
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-[#009A11]/10 rounded-xl flex items-center justify-center flex-shrink-0">
              <Users className="w-6 h-6 sm:w-7 sm:h-7 text-[#009A11]" />
            </div>
            <div className="text-center sm:text-left">
              <p className="text-xs sm:text-sm text-gray-500">Colaboradores</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats?.totalEmployees ?? 0}</p>
            </div>
          </div>

          <div
            onClick={() => router.push('/admin/colaboradores?filter=new')}
            className="card flex flex-col sm:flex-row items-center gap-3 sm:gap-4 cursor-pointer hover:shadow-lg hover:border-green-500 transition-all p-4 sm:p-6"
          >
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-6 h-6 sm:w-7 sm:h-7 text-green-600" />
            </div>
            <div className="text-center sm:text-left">
              <p className="text-xs sm:text-sm text-gray-500">Inclusões (7d)</p>
              <p className="text-xl sm:text-2xl font-bold text-green-600">+{stats?.recentAdditions ?? 0}</p>
            </div>
          </div>

          <div
            onClick={() => router.push('/admin/colaboradores?filter=removed')}
            className="card flex flex-col sm:flex-row items-center gap-3 sm:gap-4 cursor-pointer hover:shadow-lg hover:border-red-500 transition-all p-4 sm:p-6"
          >
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <TrendingDown className="w-6 h-6 sm:w-7 sm:h-7 text-red-500" />
            </div>
            <div className="text-center sm:text-left">
              <p className="text-xs sm:text-sm text-gray-500">Exclusões (7d)</p>
              <p className="text-xl sm:text-2xl font-bold text-red-500">-{stats?.recentRemovals ?? 0}</p>
            </div>
          </div>
        </div>

        {/* Revenue Card */}
        <div className="card mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-[#00552B] to-[#009A11] rounded-xl flex items-center justify-center flex-shrink-0">
              <DollarSign className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-gray-500">Receita Mensal Estimada</p>
              <p className="text-2xl sm:text-3xl font-bold text-[#00552B]">{formatCurrency(stats?.totalRevenue ?? 0)}</p>
            </div>
          </div>
        </div>

        {/* Companies Table */}
        <div className="card">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <div className="flex items-center gap-3">
              <Activity className="w-5 h-5 text-[#00552B]" />
              <h2 className="text-base sm:text-lg font-semibold">Empresas por Colaboradores</h2>
            </div>
          </div>

          {/* Mobile: Cards view */}
          <div className="sm:hidden space-y-3">
            {stats?.companiesWithStats?.map((company) => (
              <div
                key={company.id}
                onClick={() => router.push(`/admin/empresas/${company.id}`)}
                className="p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-medium text-gray-900">{company.name}</p>
                    <p className="text-xs text-gray-500">{formatCNPJ(company.cnpj)}</p>
                  </div>
                  <span className="px-2 py-1 bg-[#009A11]/10 text-[#009A11] rounded-full text-sm font-medium">
                    {company.employeeCount}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Valor/Vida: {formatCurrency(company.valorPorVida)}</span>
                  <span className="font-semibold text-[#00552B]">{formatCurrency(company.monthlyValue)}</span>
                </div>
              </div>
            )) ?? []}
            {(!stats?.companiesWithStats || stats.companiesWithStats.length === 0) && (
              <div className="py-8 text-center text-gray-500">
                Nenhuma empresa cadastrada ainda
              </div>
            )}
          </div>

          {/* Desktop: Table view */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Empresa</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">CNPJ</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">Colaboradores</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Valor/Vida</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Valor Mensal</th>
                </tr>
              </thead>
              <tbody>
                {stats?.companiesWithStats?.map((company) => (
                  <tr
                    key={company.id}
                    onClick={() => router.push(`/admin/empresas/${company.id}`)}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-4 font-medium">{company.name}</td>
                    <td className="py-3 px-4 text-gray-600">{formatCNPJ(company.cnpj)}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center justify-center min-w-[40px] px-2 py-1 bg-[#009A11]/10 text-[#009A11] rounded-full text-sm font-medium">
                        {company.employeeCount}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-gray-600">{formatCurrency(company.valorPorVida)}</td>
                    <td className="py-3 px-4 text-right font-semibold text-[#00552B]">{formatCurrency(company.monthlyValue)}</td>
                  </tr>
                )) ?? []}
                {(!stats?.companiesWithStats || stats.companiesWithStats.length === 0) && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-500">
                      Nenhuma empresa cadastrada ainda
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
