'use client';

import { useState, useEffect } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Shield, Lock, ShieldCheck, Globe, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatCNPJ } from '@/lib/utils';
import Image from 'next/image';

export default function HomePage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      const role = (session.user as any)?.role;
      if (role === 'admin') {
        router.push('/admin');
      } else if (role === 'client') {
        router.push('/cliente');
      }
    }
  }, [session, status, router]);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await signIn('admin-login', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        toast.error('Email ou senha inválidos');
      } else {
        router.push('/admin');
      }
    } catch (error) {
      toast.error('Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  const handleClientLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await signIn('client-login', {
        cnpj: cnpj.replace(/\D/g, ''),
        redirect: false,
      });

      if (result?.error) {
        toast.error('CNPJ não cadastrado ou empresa inativa');
      } else {
        router.push('/cliente');
      }
    } catch (error) {
      toast.error('Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#00552B] to-[#009A11]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#00552B] to-[#009A11] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6 sm:mb-8">
          <div className="relative w-40 h-20 sm:w-48 sm:h-24 mx-auto mb-4">
            <Image
              src="/logo-branca.png"
              alt="Akius Med"
              fill
              className="object-contain"
              priority
            />
          </div>
          <p className="text-green-100 text-sm sm:text-base">Portal de Gestão de Benefícios</p>
        </div>

        {!showAdminLogin ? (
          <div className="card animate-fadeIn">
            <h2 className="text-lg sm:text-xl font-semibold text-center mb-2">Acesso Empresa</h2>
            <p className="text-gray-500 text-xs sm:text-sm text-center mb-6">
              Entre com o CNPJ da sua empresa
            </p>

            <form onSubmit={handleClientLogin} className="space-y-4">
              <div>
                <label className="label">CNPJ da Empresa</label>
                <input
                  type="text"
                  value={cnpj}
                  onChange={(e) => setCnpj(formatCNPJ(e.target.value))}
                  className="input-field text-center text-base sm:text-lg"
                  placeholder="00.000.000/0001-00"
                  maxLength={18}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-accent w-full flex items-center justify-center gap-2 py-3"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                ) : (
                  <>Acessar Portal <ArrowRight className="w-4 h-4" /></>
                )}
              </button>
            </form>

            {/* Security Info Section */}
            <div className="mt-6 pt-4 border-t border-gray-100">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <ShieldCheck className="w-5 h-5 text-[#00552B]" />
                  <span className="text-sm font-medium text-gray-700">Portal Seguro</span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-start gap-2 text-xs text-gray-600">
                    <Lock className="w-3.5 h-3.5 text-[#009A11] mt-0.5 flex-shrink-0" />
                    <span>Conexão criptografada SSL/TLS</span>
                  </div>
                  <div className="flex items-start gap-2 text-xs text-gray-600">
                    <Globe className="w-3.5 h-3.5 text-[#009A11] mt-0.5 flex-shrink-0" />
                    <span>Dados protegidos em servidores seguros</span>
                  </div>
                  <div className="flex items-start gap-2 text-xs text-gray-600">
                    <Shield className="w-3.5 h-3.5 text-[#009A11] mt-0.5 flex-shrink-0" />
                    <span>Acesso restrito apenas ao CNPJ cadastrado</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100">
              <button
                onClick={() => setShowAdminLogin(true)}
                className="w-full text-xs sm:text-sm text-gray-400 hover:text-[#00552B] flex items-center justify-center gap-2 transition-colors"
              >
                <Shield className="w-4 h-4" />
                Acesso Administrativo
              </button>
            </div>
          </div>
        ) : (
          <div className="card animate-fadeIn">
            <button
              onClick={() => setShowAdminLogin(false)}
              className="text-xs sm:text-sm text-gray-500 hover:text-gray-700 mb-4 flex items-center gap-1"
            >
              ← Voltar
            </button>
            
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-[#00552B]/10 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-[#00552B]" />
              </div>
              <h2 className="text-lg sm:text-xl font-semibold">Login Administrativo</h2>
            </div>

            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <label className="label">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field"
                  placeholder="seu@email.com"
                  required
                />
              </div>

              <div>
                <label className="label">Senha</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-field pr-12"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5 text-gray-400" />
                    ) : (
                      <Eye className="w-5 h-5 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                ) : (
                  <>Entrar <ArrowRight className="w-4 h-4" /></>
                )}
              </button>
            </form>

            {/* Security Info for Admin */}
            <div className="mt-6 pt-4 border-t border-gray-100">
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <ShieldCheck className="w-4 h-4 text-[#00552B]" />
                  <span>Área restrita protegida por autenticação segura</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer with SSL badge */}
        <div className="mt-6 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
            <Lock className="w-4 h-4 text-green-200" />
            <span className="text-xs sm:text-sm text-green-100">Ambiente Seguro Akius Med</span>
          </div>
        </div>
      </div>
    </div>
  );
}
