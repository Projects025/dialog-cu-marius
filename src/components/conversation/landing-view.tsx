
"use client";

import { useEffect } from 'react';
import { cn } from "@/lib/utils";

interface LandingViewProps {
  onStart: () => void;
  isFadingOut: boolean;
}

const LandingView = ({ onStart, isFadingOut }: LandingViewProps) => {

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
        "min-h-screen w-full flex flex-col justify-center items-center text-center p-6 md:p-8 transition-opacity duration-500",
        isFadingOut ? "opacity-0" : "opacity-100"
      )}
    >
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
        <main className="relative z-10 text-center p-8 max-w-2xl mx-auto flex flex-col items-center">

            {/* ======================================================= */}
            {/* 1. Titlul Principal - Mare și de Impact */}
            {/* ======================================================= */}
            <h1 className="text-4xl md:text-5xl font-bold text-white drop-shadow-lg">
                Liniștea ta financiară, simplificată.
            </h1>

            {/* ====================================================================== */}
            {/* 2. Grupul de Sub-titluri - Unitate vizuală cu spațiere controlată */}
            {/* ====================================================================== */}
            <div className="mt-4 mb-8">
                <p className="text-lg md:text-xl text-gray-300 drop-shadow-md">
                    Descoperă care este gradul tău de expunere financiară
                </p>
                <p className="text-lg md:text-xl text-gray-300/80 drop-shadow-md mt-1">
                    Fără jargon, fără obligații.
                </p>
            </div>

            {/* ====================================================================== */}
            {/* 3. Butonul de Acțiune - Clar separat de text */}
            {/* ====================================================================== */}
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
