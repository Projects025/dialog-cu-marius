"use client";
import React from 'react';
import Link from 'next/link';

const SaaSLandingView = () => {
  return (
    <div className='min-h-screen bg-background'>
      {/* Navbar Simplu */}
      <nav className="absolute top-0 left-0 w-full z-50 px-6 py-6 flex justify-between items-center max-w-7xl mx-auto left-0 right-0">
        <div className="font-bold text-xl tracking-tight">Dialog cu Marius<span className="text-amber-500">.</span></div>
        <div className="flex gap-4">
            <Link href="/login" className="px-5 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors">Autentificare</Link>
            <Link href="/login" className="px-5 py-2 text-sm font-medium bg-white text-slate-950 rounded-full hover:bg-slate-200 transition-colors">Creează Cont</Link>
        </div>
      </nav>

      {/* Fundal Dinamic */}
      <div className="absolute inset-0 w-full h-full pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40rem] h-[40rem] bg-purple-500/20 rounded-full mix-blend-screen filter blur-[100px] animate-blob"></div>
        <div className="absolute top-[-10%] right-[-10%] w-[35rem] h-[35rem] bg-amber-500/10 rounded-full mix-blend-screen filter blur-[100px] animate-blob animation-delay-2000"></div>
      </div>

      {/* Hero Content */}
      <main className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 text-center pt-20">
        <div className="animate-fade-in-up space-y-8 max-w-4xl">
          <div className="inline-flex items-center px-3 py-1 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400 text-xs font-medium mb-4">
            ✨ Platformă pentru Consultanți Financiari
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-tight">
            Digitalizează-ți <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-500">
              Cariera de Consultant.
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed font-light">
            Primul CRM conversațional care educă clientul și îți filtrează lead-urile automat. Scapă de explicațiile repetitive și concentrează-te pe încheierea contractelor.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
            <Link href="/login" className="px-8 py-4 bg-amber-500 text-slate-950 font-bold rounded-full shadow-[0_0_30px_-10px_rgba(245,158,11,0.5)] hover:scale-105 transition-transform">
              Începe Gratuit
            </Link>
          </div>
        </div>
        
        {/* Features Grid */}
        <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-6xl animate-fade-in-up opacity-0" style={{ animationDelay: '0.3s', animationFillMode: 'forwards' }}>
           {[
             { title: "Formulare Dinamice", desc: "Deces, Pensie, Studii - scenarii gata făcute.", icon: "⚡" },
             { title: "Link Personalizat", desc: "URL unic și QR code pentru cartea ta de vizită.", icon: "🔗" },
             { title: "CRM Integrat", desc: "Gestionează lead-urile și statusul lor într-un singur loc.", icon: "📊" }
           ].map((item, i) => (
              <div key={i} className="p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all text-left">
                <div className="text-3xl mb-4">{item.icon}</div>
                <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                <p className="text-slate-400 text-sm">{item.desc}</p>
              </div>
           ))}
        </div>
      </main>
    </div>
  );
};

export default SaaSLandingView;
