
"use client";
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Navbar from '@/components/ui/Navbar';
import Footer from '@/components/ui/Footer';
import { Check, BadgePercent } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Badge } from '../ui/badge';

// Componenta pentru efectul de spotlight
const Spotlight = () => {
  const spotlightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (spotlightRef.current) {
        const { clientX, clientY } = e;
        spotlightRef.current.style.background = `radial-gradient(350px at ${clientX}px ${clientY}px, rgba(29, 78, 216, 0.15), transparent 80%)`;
      }
    };

    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return <div ref={spotlightRef} className="pointer-events-none fixed inset-0 z-30 transition-all duration-300" />;
};


// Custom hook to detect when an element is in the viewport
const useInView = (options?: IntersectionObserverInit) => {
  const [isInView, setIsInView] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsInView(true);
        // We can unobserve once it's in view to avoid re-triggering
        if (ref.current) {
          observer.unobserve(ref.current);
        }
      }
    }, options);

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        // eslint-disable-next-line react-hooks/exhaustive-deps
        observer.unobserve(ref.current);
      }
    };
  }, [options]);

  return [ref, isInView] as const;
};

const FeatureCard = ({ icon, title, desc, colorClass }: { icon: React.ReactNode, title: string, desc: string, colorClass: string }) => {
    const cardRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (cardRef.current) {
                const rect = cardRef.current.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                cardRef.current.style.setProperty('--mouse-x', `${x}px`);
                cardRef.current.style.setProperty('--mouse-y', `${y}px`);
            }
        };
        const currentCardRef = cardRef.current;
        currentCardRef?.addEventListener('mousemove', handleMouseMove);

        return () => {
            currentCardRef?.removeEventListener('mousemove', handleMouseMove);
        };
    }, []);

    return (
        <div ref={cardRef} className={cn("feature-card group relative p-8 rounded-2xl text-left transition-all duration-300 overflow-hidden bg-slate-900/40 backdrop-blur-xl", colorClass)}>
            <div className="card-border"></div>
            <div className="card-spotlight"></div>
            <div className="relative z-10">
                <div className={cn("w-14 h-14 mb-6 rounded-lg bg-slate-800/80 border border-white/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg relative overflow-hidden")}>
                    {React.cloneElement(icon as React.ReactElement, { className: "relative z-10 w-8 h-8" })}
                    <div className="icon-glow absolute inset-0 blur-lg opacity-60"></div>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
            </div>
        </div>
    );
};


const SaaSLandingView = () => {
  const handleContactSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    console.log("Contact Form Submitted:", data);
    alert("Mesajul tău a fost trimis (simulare). Verifică consola dezvoltatorului.");
    e.currentTarget.reset();
  };
  
  const plans = [
    {
      name: "Basic",
      price: { monthly: 75, yearly: 675 },
      description: "Ideal pentru consultanții la început de drum care doresc să facă primii pași în digitalizare.",
      features: [
        "CRM pentru managementul clienților",
        "Link personalizat",
        "Dashboard cu statistici",
        "Suport tehnic prin email",
      ],
      isPopular: false
    },
    {
      name: "Pro",
      price: { monthly: 100, yearly: 900 },
      description: "Planul perfect pentru consultantul individual care vrea să-și scaleze afacerea.",
      features: [
        "Toate beneficiile 'Basic'",
        "Export & Print rapoarte clienți",
        "5 formulare personalizate",
      ],
      isPopular: true
    },
    {
      name: "Team",
      price: { monthly: 125, yearly: 1125 },
      description: "Pentru liderii de echipă (minim 10 conturi) care vor să-și standardizeze procesul și să monitorizeze performanța.",
      features: [
        "Toate beneficiile 'Pro'",
        "Formulare nelimitate",
        "Cont de administrator de echipă",
        "Rapoarte de performanță lunare",
      ],
      isPopular: false
    },
    {
      name: "Enterprise",
      price: { monthly: null, yearly: null },
      description: "Soluții dedicate pentru agenții și companii de brokeraj cu nevoi complexe și volume mari (minim 50 de conturi).",
      features: [
        "Toate beneficiile 'Team'",
        "Personalizări avansate și branding",
        "Acces API pentru integrări",
        "TopTrigger.Thinkific",
        "Suport prioritar și training dedicat",
      ],
      isPopular: false
    }
  ];

  const [chatRef, isChatInView] = useInView({ threshold: 0.5 });
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');


  const features = [
    {
      title: "Formulare Dinamice",
      desc: "Clientul parcurge singur analiza, ghidat de un asistent virtual inteligent.",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      ),
      colorClass: 'icon-amber'
    },
    {
      title: "Link Personalizat",
      desc: "Primești propriul tău URL unic pentru a colecta lead-uri de oriunde.",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
        </svg>
      ),
      colorClass: 'icon-blue'
    },
    {
      title: "CRM Integrat",
      desc: "Vezi lead-urile în timp real, gestionează statusul și închide mai multe deal-uri.",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
        </svg>
      ),
      colorClass: 'icon-purple'
    }
  ];

  return (
    <div className='h-screen w-full bg-slate-950 text-white relative overflow-y-auto overflow-x-hidden no-scrollbar'>
      <Spotlight />
      <Navbar />

      {/* Fundal Dinamic */}
      <div className="fixed inset-0 w-full h-full pointer-events-none -z-10">
        <div className="absolute inset-0 w-full h-full bg-slate-950 [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]"></div>
        <div className="absolute top-0 left-0 w-full h-full bg-[url('/grid.svg')] bg-repeat opacity-5 [mask-image:radial-gradient(ellipse_at_center,white_10%,transparent_70%)]"></div>
        <div className="absolute top-[-10%] left-[-10%] w-[40rem] h-[40rem] bg-purple-500/20 rounded-full mix-blend-screen filter blur-[100px] animate-blob"></div>
        <div className="absolute top-[-10%] right-[-10%] w-[35rem] h-[35rem] bg-amber-500/10 rounded-full mix-blend-screen filter blur-[100px] animate-blob animation-delay-2000"></div>
      </div>

      <div className="relative z-10">
        {/* Hero Content */}
        <main className="flex flex-col items-center justify-center min-h-screen px-4 text-center pt-32 sm:pt-20">
          <div className="animate-fade-in-up space-y-4 max-w-4xl">
            <div className="inline-flex items-center px-4 py-2 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400 text-xs font-medium mb-4">
               ✨ Platforma pentru intermediari in asigurări
            </div>
            
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight leading-tight text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400 drop-shadow-[0_2px_8px_rgba(245,158,11,0.2)]">
              Digitalizează-ți <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-500">
                Viața și Sănătatea
              </span>
            </h1>
            
            <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto">
              Primul CRM conversațional care educă clientul și îți filtrează lead-urile automat. Concentrează-te pe rezultate, nu pe blocaje.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
               <Link 
                href="/login?mode=signup" 
                className="group relative inline-block px-8 py-4 bg-gradient-to-b from-amber-400 to-amber-500 text-slate-950 font-bold rounded-full hover:scale-105 transition-transform duration-300"
              >
                  <span className="relative z-10">Începe Gratuit</span>
                  {/* Inner Highlight */}
                  <div className="absolute top-[1px] left-[1px] right-[1px] h-8 rounded-full bg-white/30 blur-[10px] opacity-70"></div>
                  {/* Glossy overlay */}
                  <div className="absolute inset-0 rounded-full" style={{background: 'radial-gradient(circle at 50% -20%, hsl(var(--primary) / 0.7), transparent 70%)'}}></div>
              </Link>
            </div>
          </div>
          
          {/* Features Grid */}
           <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-6xl animate-fade-in-up opacity-0" style={{ animationDelay: '0.3s', animationFillMode: 'forwards' }}>
                {features.map((item, i) => (
                    <FeatureCard 
                        key={i} 
                        icon={item.icon} 
                        title={item.title} 
                        desc={item.desc}
                        colorClass={item.colorClass}
                    />
                ))}
          </div>
        </main>
        
        {/* Light Beam Separator */}
        <div className="relative w-full h-16 flex items-center justify-center my-4">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl h-[1px] bg-gradient-to-r from-transparent via-amber-500/50 to-transparent"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-32 bg-amber-500/10 blur-3xl"></div>
        </div>

        {/* Demo Section */}
        <section className="py-16 sm:py-20 px-4">
          <div className="max-w-4xl mx-auto text-center">
             <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
                <span className="text-amber-400">PoliSafe</span> nu este un simplu formular.
             </h2>
             <p className="text-lg text-slate-400 mb-12 max-w-2xl mx-auto">PoliSafe este un asistent virtual care îl ajută pe client să conștientizeze vulnerabilitățile financiare și îl încurajează să ceară sprijinul agentului.</p>
            <div ref={chatRef} className="[perspective:1000px]">
              <div className="group relative max-w-md mx-auto bg-slate-900/70 rounded-2xl p-6 border-t border-t-white/10 border-x border-x-white/5 shadow-2xl transition-transform duration-700 [transform-style:preserve-3d] group-hover:rotate-x-0" style={{ transform: isChatInView ? 'rotateX(0deg)' : 'rotateX(-15deg)' }}>
                {/* Inner Glow */}
                <div className="absolute inset-0 rounded-2xl border-b border-b-white/10 [mask-image:linear-gradient(to_bottom,white,transparent)]"></div>
                {/* Glossy Reflection */}
                <div className="absolute top-0 left-0 w-full h-full rounded-2xl bg-gradient-to-br from-white/5 to-transparent opacity-50 group-hover:opacity-100 transition-opacity duration-700"></div>

                <div className="relative space-y-4 text-left text-sm">
                  <div className={cn("transition-all duration-700", isChatInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4")}>
                    <div className="inline-block bg-secondary text-secondary-foreground rounded-2xl rounded-bl-none p-3 max-w-[80%]">
                      Salut! Sunt Marius, agentul tău. Despre ce subiect vrei să discutăm?
                    </div>
                  </div>
                  <div className={cn("flex justify-end transition-all duration-700", isChatInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4")} style={{transitionDelay: '700ms'}}>
                    <div className="inline-block bg-primary text-primary-foreground rounded-2xl rounded-br-none p-3 max-w-[80%]">
                      Aș vrea să știu mai multe despre siguranța familiei în caz de deces.
                    </div>
                  </div>
                  <div className={cn("transition-all duration-700", isChatInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4")} style={{transitionDelay: '1400ms'}}>
                    <div className="inline-block bg-secondary text-secondary-foreground rounded-2xl rounded-bl-none p-3 max-w-[80%]">
                      Excelent. Vom parcurge 6 întrebări pentru a stabili exact care este deficitul financiar. Ești gata?
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-16 sm:py-20 px-4">
          <div className="max-w-7xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">Alege planul potrivit pentru tine</h2>
            
            <div className="flex items-center justify-center gap-4 mb-12">
                <Label htmlFor="billing-cycle-landing" className={cn("font-semibold", billingCycle === 'monthly' ? 'text-primary' : 'text-muted-foreground')}>
                    Plată Lunară
                </Label>
                <Switch 
                    id="billing-cycle-landing"
                    checked={billingCycle === 'yearly'}
                    onCheckedChange={(checked) => setBillingCycle(checked ? 'yearly' : 'monthly')}
                />
                 <Label htmlFor="billing-cycle-landing" className={cn("font-semibold", billingCycle === 'yearly' ? 'text-primary' : 'text-muted-foreground')}>
                    Plată Anuală
                </Label>
                 <Badge variant="secondary" className="gap-1.5 bg-green-800/50 text-green-300 border-green-500/30">
                    <BadgePercent className="h-4 w-4" />
                    Economisești 2 luni!
                </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {plans.map((plan, i) => {
                const price = plan.price[billingCycle];
                const interval = billingCycle === 'monthly' ? 'lună' : 'an';
                
                return (
                    <div key={i} className={cn(
                      "p-6 sm:p-8 rounded-2xl bg-slate-900/40 border border-white/10 backdrop-blur-xl text-left flex flex-col transition-all duration-300",
                       plan.isPopular ? "border-amber-500/50 shadow-2xl shadow-amber-500/10" : "hover:border-white/20"
                    )}>
                      <h3 className={cn("text-2xl font-semibold mb-2", plan.isPopular ? "text-amber-400" : "text-white")}>{plan.name}</h3>
                      <div className="flex items-baseline gap-2 mb-4">
                         {price !== null ? (
                            <>
                             <span className="text-4xl sm:text-5xl font-bold tracking-tight">
                                {price}
                              </span>
                              <span className="text-slate-400 text-sm">RON / {interval}</span>
                            </>
                         ) : (
                            <span className="text-3xl font-bold tracking-tight">Personalizat</span>
                         )}
                      </div>
                      <p className="text-sm text-slate-400 min-h-[60px]">{plan.description}</p>
                      <ul className="space-y-3 mt-8 text-sm flex-grow">
                        {plan.features.map(feat => (
                          <li key={feat} className="flex items-start gap-3">
                            <Check className="w-4 h-4 text-amber-400 mt-1 flex-shrink-0" />
                            <span className="text-slate-300">{feat}</span>
                          </li>
                        ))}
                      </ul>
                      {plan.name === "Enterprise" ? (
                         <a href="#contact" className="mt-8 block w-full text-center px-6 py-3 bg-white/10 text-white font-bold rounded-full hover:bg-white/20 transition-colors">
                            Contactează-ne
                          </a>
                      ) : (
                         <Link href="/login?mode=signup" className={cn(
                           "mt-8 block w-full text-center px-6 py-3 font-bold rounded-full transition-colors",
                           plan.isPopular 
                            ? "bg-amber-500 text-slate-950 hover:bg-amber-400"
                            : "bg-white/10 text-white hover:bg-white/20"
                         )}>
                            Alege Planul
                          </Link>
                      )}
                    </div>
                )
            })}
            </div>
          </div>
        </section>
        
        {/* Contact Section */}
        <section id="contact" className="py-16 sm:py-24 px-4">
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
