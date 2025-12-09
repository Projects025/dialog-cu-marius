"use client";
import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';

const Navbar = () => {
    const pathname = usePathname();
    const isLoginPage = pathname.startsWith('/login');

  return (
    <header className="fixed top-0 left-0 w-full z-50">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex justify-between items-center bg-slate-950/50 backdrop-blur-xl border-b border-b-white/10 rounded-b-2xl m-2 mt-0">
            <Link href="/" className="font-bold text-2xl tracking-tight text-white">
                PoliSafe<span className="text-amber-500">;</span>
            </Link>
            <div className="flex gap-2 sm:gap-4 items-center">
                {isLoginPage ? (
                    <Link href="/" className="px-4 py-2 text-xs sm:text-sm font-medium text-slate-300 hover:text-white transition-colors">
                        Înapoi la site
                    </Link>
                ) : (
                    <>
                        <Link href="/login" className="px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium text-slate-300 hover:text-white transition-colors">Autentificare</Link>
                        <Link href="/login?mode=signup" className="px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium bg-white text-slate-950 rounded-full hover:bg-slate-200 transition-colors text-center">Creează Cont</Link>
                    </>
                )}
            </div>
      </nav>
    </header>
  );
};

export default Navbar;
