
"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebaseConfig";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Navbar from "@/components/ui/Navbar";
import Footer from "@/components/ui/Footer";

// Componenta care conține logica, pentru a putea fi înfășurată în Suspense
function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSignUp, setIsSignUp] = useState(false);

  useEffect(() => {
      // Sincronizează starea 'isSignUp' cu parametrul URL 'mode'
      if (searchParams.get('mode') === 'signup') {
          setIsSignUp(true);
      } else {
          setIsSignUp(false);
      }
  }, [searchParams]);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (isSignUp) {
      // --- Logică Înregistrare ---
      if (!name.trim()) {
        setError("Numele este obligatoriu.");
        setLoading(false);
        return;
      }
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Creează documentul în Firestore pentru noul agent
        await setDoc(doc(db, "agents", user.uid), {
            name: name,
            email: email,
            uid: user.uid,
            activeFormId: "master_standard_v1", // Setează formularul Master ca default
            createdAt: new Date()
        });

        router.push("/dashboard");
      } catch (err: any) {
        if (err.code === 'auth/email-already-in-use') {
          setError("Acest email este deja folosit. Încearcă să te loghezi.");
        } else if (err.code === 'auth/weak-password') {
          setError("Parola este prea slabă. Trebuie să aibă cel puțin 6 caractere.");
        } else {
          setError("A apărut o eroare la înregistrare. Te rog să încerci din nou.");
        }
        console.error(err);
      }
    } else {
      // --- Logică Login ---
      try {
        await signInWithEmailAndPassword(auth, email, password);
        router.push("/dashboard");
      } catch (err) {
        setError("Email sau parolă incorectă. Te rog să încerci din nou.");
        console.error(err);
      }
    }
    setLoading(false);
  };

  const toggleAuthMode = () => {
      const newMode = !isSignUp;
      setIsSignUp(newMode);
      setError(null);
      // Resetează câmpurile de formular
      setName("");
      setEmail("");
      setPassword("");
      // Actualizează URL-ul fără a reîncărca pagina
      const newUrl = newMode ? `${window.location.pathname}?mode=signup` : window.location.pathname;
      window.history.pushState({ ...window.history.state, as: newUrl, url: newUrl }, '', newUrl);
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-white relative overflow-hidden">
        <div className="absolute inset-0 w-full h-full pointer-events-none">
            <div className="absolute top-[-10%] left-[-10%] w-[40rem] h-[40rem] bg-purple-500/20 rounded-full mix-blend-screen filter blur-[100px] animate-blob"></div>
            <div className="absolute top-[-10%] right-[-10%] w-[35rem] h-[35rem] bg-amber-500/10 rounded-full mix-blend-screen filter blur-[100px] animate-blob animation-delay-2000"></div>
        </div>
      <Navbar />
      <div className="flex-grow flex items-center justify-center relative z-10 px-4">
        <Card className="w-full max-w-md mx-4 bg-slate-900/40 border-white/10 backdrop-blur-lg">
            <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-white">
                {isSignUp ? "Creează Cont Agent" : "Autentificare Agent"}
            </CardTitle>
            <CardDescription className="text-slate-400">
                {isSignUp ? "Completează datele pentru a începe" : "Introdu credențialele pentru a accesa panoul"}
            </CardDescription>
            </CardHeader>
            <CardContent>
            <form onSubmit={handleAuth} className="space-y-6">
                {isSignUp && (
                <div className="space-y-2">
                    <Label htmlFor="name" className="text-slate-300">Nume Prenume</Label>
                    <Input
                    id="name"
                    type="text"
                    placeholder="Ex: Popescu Ion"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="h-12 bg-white/5 border-white/10 placeholder:text-slate-500"
                    />
                </div>
                )}
                <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-300">Email</Label>
                <Input
                    id="email"
                    type="email"
                    placeholder="agent@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-12 bg-white/5 border-white/10 placeholder:text-slate-500"
                />
                </div>
                <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-300">Parolă</Label>
                <Input
                    id="password"
                    type="password"
                    value={password}
                    placeholder="Minim 6 caractere"
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-12 bg-white/5 border-white/10 placeholder:text-slate-500"
                />
                </div>
                {error && (
                <p className="text-sm text-center text-red-400">{error}</p>
                )}
                <Button type="submit" className="w-full h-12 font-semibold bg-amber-500 text-slate-900 hover:bg-amber-400 transition-colors" disabled={loading}>
                {loading ? "Se procesează..." : (isSignUp ? "Creează Cont" : "Intră în cont")}
                </Button>
            </form>
            <div className="mt-6 text-center text-sm">
                <button
                onClick={toggleAuthMode}
                className="cursor-pointer font-medium text-amber-400 hover:underline"
                >
                {isSignUp
                    ? "Ai deja cont? Autentifică-te"
                    : "Nu ai cont? Creează unul acum"}
                </button>
            </div>
            </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  );
}

// Componenta principală exportată, care înfășoară logica în Suspense
export default function LoginPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">Se încarcă...</div>}>
            <LoginContent />
        </Suspense>
    );
}
