'use client';

import { signOut, useSession } from 'next-auth/react';
import { LogOut, Download } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export function ClientHeader() {
  const { data: session } = useSession() || {};

  const handleExport = async () => {
    window.open('/api/export', '_blank');
  };

  return (
    <header className="sticky top-0 z-50 bg-[#009A11]/95 backdrop-blur-sm shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <Link href="/cliente" className="flex items-center gap-3">
              <div className="relative w-32 h-10">
                <Image
                  src="/logo-branca.png"
                  alt="Akius Med"
                  fill
                  className="object-contain"
                />
              </div>
              <div className="hidden sm:flex items-center">
                <span className="text-white/70 text-sm">|</span>
                <span className="text-white/90 text-sm ml-3">{session?.user?.name}</span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-3 py-2 text-white/90 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:block">Exportar</span>
            </button>
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="flex items-center gap-2 px-3 py-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:block">Sair</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
