
"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebaseConfig";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function LoginPage() {
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
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">
            {isSignUp ? "Creează Cont Agent" : "Autentificare Agent"}
          </CardTitle>
           <CardDescription>
            {isSignUp ? "Completează datele pentru a începe" : "Introdu credențialele pentru a accesa panoul"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAuth} className="space-y-6">
            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="name">Nume Prenume</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Ex: Popescu Ion"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="h-12"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="agent@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Parolă</Label>
              <Input
                id="password"
                type="password"
                value={password}
                placeholder="Minim 6 caractere"
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-12"
              />
            </div>
            {error && (
              <p className="text-sm text-center text-destructive">{error}</p>
            )}
            <Button type="submit" className="w-full h-12 font-semibold" disabled={loading}>
              {loading ? "Se procesează..." : (isSignUp ? "Creează Cont" : "Intră în cont")}
            </Button>
          </form>
          <div className="mt-6 text-center text-sm">
            <button
              onClick={toggleAuthMode}
              className="cursor-pointer font-medium text-primary hover:underline"
            >
              {isSignUp
                ? "Ai deja cont? Autentifică-te"
                : "Nu ai cont? Creează unul acum"}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
