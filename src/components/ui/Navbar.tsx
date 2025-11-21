"use client";
import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';

const Navbar = () => {
    const pathname = usePathname();
    const isLoginPage = pathname.startsWith('/login');

  return (
    <nav className="absolute top-0 left-0 w-full z-50 px-6 py-6 flex justify-between items-center max-w-7xl mx-auto right-0">
        <Link href="/" className="font-bold text-xl tracking-tight text-white">
            Dialog cu Marius<span className="text-amber-500">.</span>
        </Link>
        <div className="flex gap-4 items-center">
            {isLoginPage ? (
                 <Link href="/" className="px-5 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors">
                    Înapoi la site
                 </Link>
            ) : (
                <>
                    <Link href="/login" className="px-5 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors">Autentificare</Link>
                    <Link href="/login?mode=signup" className="px-5 py-2 text-sm font-medium bg-white text-slate-950 rounded-full hover:bg-slate-200 transition-colors">Creează Cont</Link>
                </>
            )}
        </div>
      </nav>
  );
};

export default Navbar;
