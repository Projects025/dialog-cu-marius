import Navbar from "@/components/ui/Navbar";
import Footer from "@/components/ui/Footer";

export default function TermeniPage() {
  return (
    <div className="min-h-screen bg-background text-white flex flex-col">
      <Navbar />
      <main className="flex-grow pt-32 pb-12">
        <div className="max-w-4xl mx-auto px-4">
          <h1 className="text-4xl font-bold mb-8 text-primary">Termeni și Condiții</h1>
          <div className="prose prose-invert max-w-none text-slate-300 space-y-4">
            <p>Conținutul pentru această pagină va fi adăugat ulterior.</p>
            <p>Această secțiune va detalia regulile și liniile directoare pentru utilizarea platformei "Dialog cu Marius". Va acoperi aspecte precum responsabilitățile utilizatorilor, drepturile de proprietate intelectuală, limitările de răspundere și legislația aplicabilă.</p>
            <h2 className="text-2xl font-semibold text-white pt-4">1. Definiții</h2>
            <p>Aici vor fi definiți termenii cheie folosiți în document, cum ar fi "Serviciu", "Utilizator", "Agent", "Client Final", "Conținut".</p>
            <h2 className="text-2xl font-semibold text-white pt-4">2. Utilizarea Serviciului</h2>
            <p>Se vor descrie condițiile în care agenții pot folosi platforma, inclusiv crearea de conturi, personalizarea formularelor și gestionarea clienților.</p>
            <h2 className="text-2xl font-semibold text-white pt-4">3. Plăți și Abonamente</h2>
            <p>Detalii despre planurile tarifare, procesul de plată, politica de rambursare și condițiile de anulare a abonamentului.</p>
             <h2 className="text-2xl font-semibold text-white pt-4">4. Proprietate Intelectuală</h2>
            <p>Clarificări privind drepturile de autor asupra platformei și conținutului generat de utilizatori.</p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
