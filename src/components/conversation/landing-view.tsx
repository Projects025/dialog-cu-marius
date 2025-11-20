
"use client";

import { useEffect } from 'react';
import { cn } from "@/lib/utils";
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebaseConfig';

interface LandingViewProps {
  onStart: () => void;
  isFadingOut: boolean;
}

const LandingView = ({ onStart, isFadingOut }: LandingViewProps) => {

    const restoreDatabase = async () => {
        const templateData = {
            title: "Analiză Financiară - Deces (Standard)",
            startStepId: "intro_analysis_1",
            ownerId: null,
            isTemplate: true,
            flow: {
                "intro_analysis_1": { "message": "Un deces afectează negativ pe multiple planuri, două dintre acestea fiind extrem de profunde și de durată - planul existențial și planul financiar.", "actionType": "buttons", "options": [], "autoContinue": true, "delay": 2000, "nextStep": "intro_analysis_2" },
                "intro_analysis_2": { "message": "În momentele următoare, vom răspunde la 6 întrebări prin care să stabilim care este suma de bani de care ar avea nevoie familia pentru a ameliora impactul financiar negativ.", "actionType": "buttons", "options": [], "autoContinue": true, "delay": 2000, "nextStep": "ask_period" },
                "ask_period": { "message": "1. În cazul unui posibil deces, care ar fi perioada de timp în care familia ta ar avea nevoie de susținere financiară (ani)?", "actionType": "buttons", "options": ["3 ani", "4 ani", "5 ani"], "nextStep": "ask_monthly_sum" },
                "ask_monthly_sum": { "message": "Care ar fi suma lunară necesară (în lei) pentru menținerea actualului standard de viață?", "actionType": "input", "options": { "type": "number", "placeholder": "Ex: 5000" }, "nextStep": "show_deficit_1" },
                "show_deficit_1": { "message": "Am calculat primul deficit. Continuăm cu cheltuielile specifice.", "actionType": "buttons", "options": [], "autoContinue": true, "delay": 2000, "nextStep": "ask_event_costs" },
                "ask_event_costs": { "message": "2. Ce sumă unică (în lei) ar fi necesară pentru cheltuieli imediate (înmormântare, taxe succesorale)?", "actionType": "input", "options": { "type": "number", "placeholder": "Ex: 20000" }, "nextStep": "ask_projects" },
                "ask_projects": { "message": "3. Există proiecte în desfășurare (construcții, studii) care necesită finanțare? Care este suma totală necesară?", "actionType": "input", "options": { "type": "number", "placeholder": "Ex: 50000" }, "nextStep": "ask_debts" },
                "ask_debts": { "message": "4. Există credite sau datorii care ar trebui stinse? Care este valoarea lor totală?", "actionType": "input", "options": { "type": "number", "placeholder": "Ex: 150000" }, "nextStep": "show_brute_deficit" },
                "show_brute_deficit": { "message": "Am calculat necesarul total brut. Acum haide să vedem ce resurse există deja.", "actionType": "buttons", "options": [], "autoContinue": true, "delay": 2500, "nextStep": "ask_insurance" },
                "ask_insurance": { "message": "5. Familia ar beneficia de vreo asigurare de viață existentă (necesionată băncii)? Care este suma?", "actionType": "input", "options": { "type": "number", "placeholder": "Ex: 0" }, "nextStep": "ask_savings" },
                "ask_savings": { "message": "6. Există economii sau investiții care pot fi accesate imediat? Care este valoarea lor?", "actionType": "input", "options": { "type": "number", "placeholder": "Ex: 10000" }, "nextStep": "show_final_deficit" },
                "show_final_deficit": { "message": "Calcul finalizat. Acesta este deficitul real care ar rămâne descoperit.", "actionType": "buttons", "options": [], "autoContinue": true, "delay": 3000, "nextStep": "ask_feeling" },
                "ask_feeling": { "message": "Cum ți se pare această sumă? Care este sentimentul pe care îl simți acum?", "actionType": "input", "options": { "type": "text", "placeholder": "Scrie aici..." }, "nextStep": "ask_dramatic_options" },
                "ask_dramatic_options": { "message": "În lipsa acestei sume, ce opțiuni realiste ar avea familia? Bifează-le:", "actionType": "interactive_scroll_list", "options": { "buttonText": "Am bifat", "options": ["Să se mute cu părinții", "Să vândă casa", "Să își ia un al doilea job", "Să renunțe la educația copiilor", "Să ceară ajutor prietenilor"] }, "nextStep": "present_solution" },
                "present_solution": { "message": "Dacă nu ești mulțumit cu aceste opțiuni, dorești să vezi o soluție personalizată care să acopere acest deficit?", "actionType": "buttons", "options": ["Da, vreau detalii", "Nu"], "nextStep": "ask_contact_details" },
                "ask_contact_details": { "message": "Perfect. Te rog lasă-mi datele de contact pentru a-ți trimite analiza completă.", "actionType": "form", "options": { "buttonText": "Trimite", "gdpr": "Sunt de acord cu prelucrarea datelor.", "fields": [{ "name": "name", "placeholder": "Nume", "type": "text", "required": true }, { "name": "email", "placeholder": "Email", "type": "email", "required": true }, { "name": "phone", "placeholder": "Telefon", "type": "tel", "required": true }] }, "nextStep": "thank_you_final" },
                "thank_you_final": { "message": "Mulțumesc! Datele au fost transmise.", "actionType": "end", "nextStep": "" }
            }
        };

        try {
            console.log("Încep restaurarea bazei de date...");
            await setDoc(doc(db, "formTemplates", "deces_standard_v1"), templateData);
            alert("Succes! Formularul 'deces_standard_v1' a fost restaurat în Firestore.");
        } catch (e: any) {
            console.error(e);
            alert("Eroare la restaurare: " + e.message);
        }
    };


    useEffect(() => {
        // Când componenta se încarcă, blochează scroll-ul pe body
        document.body.classList.add('overflow-hidden');

        const handleMouseMove = (e: MouseEvent) => {
            const layers = document.querySelectorAll<HTMLElement>('.scene-layer');
            const { clientX, clientY } = e;
            const centerX = window.innerWidth / 2;
            const centerY = window.innerHeight / 2;

            const moveX = (clientX - centerX) / centerX;
            const moveY = (clientY - centerY) / centerY;

            layers.forEach(layer => {
                const depth = parseFloat(layer.getAttribute('data-depth') || '0');
                const x = -(moveX * depth * 40); 
                const y = -(moveY * depth * 40); 
                layer.style.transform = `translate3d(${x}px, ${y}px, 0)`;
            });
        };
        
        document.addEventListener('mousemove', handleMouseMove);

        // Când componenta dispare, permite din nou scroll-ul
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.body.classList.remove('overflow-hidden');
        };
    }, []);


  return (
    <div
      className={cn(
        "min-h-screen w-full flex flex-col justify-center items-center p-6 transition-opacity duration-500",
        isFadingOut ? "opacity-0" : "opacity-100"
      )}
    >
        <button onClick={restoreDatabase} className="fixed top-4 right-4 bg-red-600 text-white p-2 rounded z-50 text-xs font-bold">
            FIX DB
        </button>

        {/* Container pentru ilustrația din fundal */}
        <div className="scene-container absolute inset-0 z-0 pointer-events-none">
            
            {/* Stele căzătoare */}
            <div className="absolute inset-0">
                <div className="shooting-star star-1"></div>
                <div className="shooting-star star-2"></div>
                <div className="shooting-star star-3"></div>
            </div>
            
            {/* Straturi Parallax */}
            <div className="scene-layer" data-depth="0.1" style={{animationDelay: '0.4s'}}>
                <svg className="w-full h-full fill-yellow-400/20">
                    <circle cx="10%" cy="20%" r="1" /> <circle cx="15%" cy="80%" r="0.5" /> <circle cx="5%" cy="50%" r="0.8" />
                    <circle cx="85%" cy="10%" r="1.2" /> <circle cx="95%" cy="90%" r="0.5" /> <circle cx="70%" cy="50%" r="1" />
                </svg>
            </div>
            <div className="scene-layer" data-depth="0.3" style={{animationDelay: '0.2s'}}>
                <svg className="w-full h-full fill-yellow-400/40">
                    <circle cx="20%" cy="60%" r="1.5" /> <circle cx="30%" cy="15%" r="1" /> <circle cx="45%" cy="85%" r="1.2" />
                    <circle cx="90%" cy="25%" r="1.5" /> <circle cx="60%" cy="75%" r="1" /> <circle cx="75%" cy="35%" r="1.8" />
                </svg>
            </div>
            <div className="scene-layer" data-depth="0.6" style={{animationDelay: '0s'}}>
                <svg className="w-full h-full fill-yellow-400/60">
                    <circle cx="10%" cy="90%" r="2" /> <circle cx="25%" cy="30%" r="2.5" />
                    <circle cx="80%" cy="80%" r="2.2" /> <circle cx="95%" cy="40%" r="1.5" />
                </svg>
            </div>
        </div>

        {/* Conținutul principal al paginii */}
        <main className="relative z-10 text-center p-6 max-w-2xl mx-auto flex flex-col items-center">

            <h1 className="text-3xl md:text-5xl font-bold text-white drop-shadow-lg mb-6">
                <span>Cât ești de pregătit financiar</span>
                <span className="block mt-2">pentru surprizele vieții?</span>
            </h1>

            <div className="mb-10 text-center">
                <p className="text-lg md:text-xl text-gray-300 drop-shadow-md">
                    <span>Fă o scurtă analiză și</span>
                    <span className="block mt-1">descoperă unde ești vulnerabil.</span>
                </p>
            </div>

            <button 
                onClick={onStart} 
                className="bg-amber-400 text-gray-900 font-bold py-3 px-8 rounded-lg shadow-lg hover:bg-amber-300 transition-all duration-300 transform hover:scale-105"
            >
                Începe Analiza Gratuită
            </button>

        </main>
    </div>
  );
};

export default LandingView;
