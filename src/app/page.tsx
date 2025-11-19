
import { Suspense } from 'react';
import ChatAppClient from '@/components/conversation/ChatAppClient';

// Pagina de start a Next.js (Server Component)
export default function Page() {
  return (
    <main className="h-full">
        {/* Afișează un simplu mesaj de loading cât timp așteptăm datele dinamice */}
        <Suspense fallback={<div className="flex items-center justify-center h-full">Se încarcă aplicația...</div>}>
            {/* Aici se randează componenta Clientă (ChatAppClient), care folosește useSearchParams */}
            <ChatAppClient /> 
        </Suspense>
    </main>
  );
}
