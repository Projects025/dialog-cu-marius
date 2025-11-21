import Navbar from "@/components/ui/Navbar";
import Footer from "@/components/ui/Footer";

export default function ConfidentialitatePage() {
  return (
    <div className="min-h-screen bg-background text-white flex flex-col">
       <Navbar />
       <main className="flex-grow pt-32 pb-12">
        <div className="max-w-4xl mx-auto px-4">
          <h1 className="text-4xl font-bold mb-8 text-primary">Politica de Confidențialitate</h1>
          <div className="prose prose-invert max-w-none text-slate-300 space-y-4">
            <p>Conținutul detaliat pentru politica de confidențialitate va fi adăugat ulterior, în conformitate cu legislația GDPR.</p>
            <p>Această pagină va explica în detaliu ce tipuri de date sunt colectate, cum sunt acestea utilizate, stocate și protejate. Se va adresa atât datelor agenților care se înregistrează pe platformă, cât și datelor clienților finali care interacționează cu formularele de chat.</p>
            <h2 className="text-2xl font-semibold text-white pt-4">1. Ce date colectăm?</h2>
            <p>Se vor enumera datele colectate: de la agenți (nume, email, date de facturare) și de la clienții finali (nume, telefon, email, răspunsurile din analiza financiară).</p>
            <h2 className="text-2xl font-semibold text-white pt-4">2. Cum folosim datele?</h2>
            <p>Scopul colectării datelor: pentru funcționarea serviciului (afișarea lead-urilor către agent), pentru comunicare, facturare și îmbunătățirea platformei.</p>
            <h2 className="text-2xl font-semibold text-white pt-4">3. Partajarea datelor</h2>
            <p>Se va specifica dacă și în ce condiții sunt partajate datele cu terți (ex: procesatori de plăți) și se va clarifica faptul că datele unui client final sunt vizibile doar pentru agentul asociat.</p>
            <h2 className="text-2xl font-semibold text-white pt-4">4. Drepturile utilizatorilor</h2>
            <p>Dreptul la acces, rectificare, ștergere ("dreptul de a fi uitat"), portabilitate și opoziție la prelucrarea datelor.</p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
