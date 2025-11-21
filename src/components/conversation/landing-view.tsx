
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
        <main className="relative z-10 text-center p-6 max-w-xl mx-auto flex flex-col items-center">

            <h1 className="text-3xl md:text-4xl font-bold text-white drop-shadow-lg mb-4">
                <span>Cât ești de pregătit financiar</span>
                <span className="block mt-1">pentru surprizele vieții?</span>
            </h1>

            <div className="mb-8 text-center">
                <p className="text-base md:text-lg text-gray-300 drop-shadow-md leading-relaxed">
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
