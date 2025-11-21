"use client";
import React from 'react';
import Link from 'next/link';

const Footer = () => {
  return (
    <footer className="w-full text-center p-6 mt-12 border-t border-white/10">
        <div className="space-x-4 text-sm text-slate-500">
             <span>© {new Date().getFullYear()} Dialog cu Marius. Toate drepturile rezervate.</span>
             <span className='mx-2'>|</span>
            <Link href="/termeni" className="hover:text-white transition-colors">Termeni și Condiții</Link>
            <span className='mx-2'>•</span>
            <Link href="/confidentialitate" className="hover:text-white transition-colors">Confidențialitate</Link>
        </div>
    </footer>
  );
};

export default Footer;
