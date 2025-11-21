"use client";
import React from 'react';
import Link from 'next/link';
import Navbar from '@/components/ui/Navbar';
import Footer from '@/components/ui/Footer';


const SaaSLandingView = () => {
  const handleContactSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    console.log("Contact Form Submitted:", data);
    alert("Mesajul tău a fost trimis (simulare). Verifică consola dezvoltatorului.");
    e.currentTarget.reset();
  };

  return (
    <div className='min-h-screen bg-background text-white overflow-y-auto no-scrollbar'>
      <Navbar />

      {/* Fundal Dinamic */}
      <div className="absolute inset-0 w-full h-full pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40rem] h-[40rem] bg-purple-500/20 rounded-full mix-blend-screen filter blur-[100px] animate-blob"></div>
        <div className="absolute top-[-10%] right-[-10%] w-[35rem] h-[35rem] bg-amber-500/10 rounded-full mix-blend-screen filter blur-[100px] animate-blob animation-delay-2000"></div>
      </div>

      <div className="relative z-10">
        {/* Hero Content */}
        <main className="flex flex-col items-center justify-center min-h-screen px-4 text-center pt-20">
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
              <Link href="/login?mode=signup" className="px-8 py-4 bg-amber-500 text-slate-950 font-bold rounded-full shadow-[0_0_30px_-10px_rgba(245,158,11,0.5)] hover:scale-105 transition-transform">
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
        
        {/* Demo Section */}
        <section className="py-20 sm:py-32 px-4">
          <div className="max-w-4xl mx-auto text-center">
             <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">Conversații care Convertesc</h2>
             <p className="text-lg text-slate-400 mb-12 max-w-2xl mx-auto">Marius nu este un simplu formular. Este un asistent virtual care ghidează clientul printr-o analiză reală, construind încredere.</p>
            <div className="max-w-md mx-auto bg-slate-900/70 rounded-2xl p-6 border border-white/10 shadow-2xl">
              <div className="space-y-4 text-left text-sm">
                <div className="animate-chat-bubble-in">
                  <div className="inline-block bg-secondary text-secondary-foreground rounded-2xl rounded-bl-none p-3 max-w-[80%]">
                    Salut! Sunt Marius, agentul tău. Despre ce subiect vrei să discutăm?
                  </div>
                </div>
                <div className="flex justify-end animate-chat-bubble-in" style={{animationDelay: '1s'}}>
                   <div className="inline-block bg-primary text-primary-foreground rounded-2xl rounded-br-none p-3 max-w-[80%]">
                    Aș vrea să știu mai multe despre siguranța familiei în caz de deces.
                  </div>
                </div>
                 <div className="animate-chat-bubble-in" style={{animationDelay: '2s'}}>
                  <div className="inline-block bg-secondary text-secondary-foreground rounded-2xl rounded-bl-none p-3 max-w-[80%]">
                    Excelent. Vom parcurge 6 întrebări pentru a stabili exact care este deficitul financiar. Ești gata?
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-20 sm:py-32 px-4 bg-background/50">
          <div className="max-w-5xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">Investiție Minimă, Rezultate Maxime</h2>
            <p className="text-lg text-slate-400 mb-12 max-w-2xl mx-auto">Alege planul care ți se potrivește și începe să atragi clienți calificați chiar de azi.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Agent Pro Card */}
              <div className="p-8 rounded-3xl bg-white/5 border border-primary/30 backdrop-blur-xl text-left flex flex-col shadow-2xl shadow-primary/10">
                <h3 className="text-2xl font-semibold text-primary mb-2">Agent Pro</h3>
                <p className="text-4xl font-bold mb-4">15€<span className="text-base font-normal text-slate-400"> / lună</span></p>
                <p className="text-sm text-slate-400 min-h-[40px]">Planul perfect pentru consultantul individual care vrea să-și digitalizeze procesul de calificare.</p>
                <ul className="space-y-3 mt-8 text-sm flex-grow">
                  {["Formular Master Complet", "CRM Integrat pentru Leads", "Link & QR Code Personal", "Notificări Email Instant"].map(feat => (
                    <li key={feat} className="flex items-center gap-3"><span className="text-primary">✅</span><span className="text-slate-300">{feat}</span></li>
                  ))}
                </ul>
                <Link href="/login?mode=signup" className="mt-8 block w-full text-center px-8 py-4 bg-primary text-primary-foreground font-bold rounded-full hover:scale-105 transition-transform">
                  Alege Pro
                </Link>
              </div>

              {/* Enterprise Card */}
               <div className="p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl text-left flex flex-col">
                <h3 className="text-2xl font-semibold text-white mb-2">Enterprise</h3>
                <p className="text-4xl font-bold mb-4">Personalizat</p>
                 <p className="text-sm text-slate-400 min-h-[40px]">Pentru agenții și brokeri care doresc soluții personalizate și integrări avansate.</p>
                <ul className="space-y-3 mt-8 text-sm flex-grow">
                   {["Toate beneficiile Pro", "Formulare 100% Customizate", "Integrări API (alte CRM-uri)", "Training & Suport Prioritar"].map(feat => (
                    <li key={feat} className="flex items-center gap-3"><span className="text-slate-400">✅</span><span className="text-slate-300">{feat}</span></li>
                  ))}
                </ul>
                <a href="mailto:contact@dialogcumarius.ro" className="mt-8 block w-full text-center px-8 py-4 bg-white/10 text-white font-bold rounded-full hover:bg-white/20 transition-colors">
                  Contactează-ne
                </a>
              </div>
            </div>
          </div>
        </section>
        
        {/* Contact Section */}
        <section id="contact" className="py-20 sm:py-32 px-4">
           <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">Ai întrebări?</h2>
              <p className="text-lg text-slate-400 mb-12">Completează formularul de mai jos și revenim cu un răspuns în cel mai scurt timp.</p>
              <form onSubmit={handleContactSubmit} className="space-y-6 text-left">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-slate-400 mb-2">Nume</label>
                    <input type="text" name="name" id="name" required className="w-full bg-white/5 border border-white/10 rounded-lg p-3 focus:ring-2 focus:ring-primary outline-none transition" />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-slate-400 mb-2">Email</label>
                    <input type="email" name="email" id="email" required className="w-full bg-white/5 border border-white/10 rounded-lg p-3 focus:ring-2 focus:ring-primary outline-none transition" />
                  </div>
                   <div>
                    <label htmlFor="message" className="block text-sm font-medium text-slate-400 mb-2">Mesajul tău</label>
                    <textarea name="message" id="message" rows={4} required className="w-full bg-white/5 border border-white/10 rounded-lg p-3 focus:ring-2 focus:ring-primary outline-none transition"></textarea>
                  </div>
                  <button type="submit" className="w-full px-8 py-4 bg-primary text-primary-foreground font-bold rounded-full hover:scale-105 transition-transform">
                    Trimite Mesaj
                  </button>
              </form>
           </div>
        </section>

        <Footer />
      </div>
    </div>
  );
}; 

export default SaaSLandingView;
