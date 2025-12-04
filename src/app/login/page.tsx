
"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, sendPasswordResetEmail } from "firebase/auth";
import { doc, setDoc, collection, addDoc, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/lib/firebaseConfig";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Navbar from "@/components/ui/Navbar";
import Footer from "@/components/ui/Footer";
import { Check, Loader2, Mail, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";


const plans = [
  {
    name: "Basic",
    priceId: 'price_1SZefIPb5IYvItKJhsm8xybf',
    price: 75,
    description: "Ideal pentru început.",
  },
  {
    name: "Pro",
    priceId: 'price_1Sa05gPb5IYvItKJyVlgBvxZ',
    price: 100,
    description: "Cel mai popular.",
    isPopular: true
  },
  {
    name: "Team",
    priceId: 'price_1Sa06TPb5IYvItKJbzhZuc7R',
    price: 125,
    description: "Pentru echipe.",
  }
];

function ResetPasswordDialog() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handlePasswordReset = async () => {
    setError(null);
    if (!email) {
      setError("Te rog introdu adresa de email.");
      return;
    }
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      // Indiferent dacă userul există sau nu, afișăm succes pentru securitate.
      setIsSuccess(true);
    } catch (err: any) {
      if (err.code === 'auth/invalid-email') {
        setError("Adresa de email nu are un format valid.");
      } else {
        // Pentru orice altă eroare (ex: network), tot afișăm succes pentru a nu expune informații.
        setIsSuccess(true);
        console.error("Password reset error:", err); // Logăm eroarea în consolă pentru debug.
      }
    } finally {
      setLoading(false);
    }
  };
  
  const handleOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      // Reset state on close
      setTimeout(() => {
        setEmail('');
        setError(null);
        setLoading(false);
        setIsSuccess(false);
      }, 300);
    }
  }

  return (
    <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <button className="text-xs text-amber-400 hover:underline mt-2 text-right w-full">Ai uitat parola?</button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Resetare Parolă</DialogTitle>
          <DialogDescription>
            {isSuccess ? "Verifică-ți emailul pentru instrucțiuni." : "Introdu adresa de email asociată contului tău."}
          </DialogDescription>
        </DialogHeader>
        {isSuccess ? (
          <div className="py-4 space-y-4">
              <div className="text-center p-6 bg-green-900/20 rounded-lg">
                <Mail className="mx-auto h-12 w-12 text-green-500 mb-4" />
                <p className="text-foreground">Un email de resetare a fost trimis către <span className="font-bold">{email}</span>.</p>
              </div>
              <Alert variant="default" className="bg-amber-500/10 border-amber-500/30 text-amber-300">
                <AlertTriangle className="h-4 w-4 !text-amber-400" />
                <AlertDescription>
                    Nu uita să verifici și folderul Spam / Junk dacă nu găsești email-ul.
                </AlertDescription>
              </Alert>
          </div>
        ) : (
          <div className="py-4 space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="reset-email">Email</Label>
              <Input
                id="reset-email"
                type="email"
                placeholder="exemplu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handlePasswordReset()}
              />
               {error && <p className="text-sm text-red-500">{error}</p>}
            </div>
          </div>
        )}
        <DialogFooter>
          {isSuccess ? (
            <Button variant="outline" onClick={() => handleOpenChange(false)}>Închide</Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>Anulează</Button>
              <Button onClick={handlePasswordReset} disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {loading ? "Se trimite..." : "Trimite"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


// Componenta care conține logica, pentru a putea fi înfășurată în Suspense
function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [isSignUp, setIsSignUp] = useState(false);

  useEffect(() => {
      if (searchParams.get('mode') === 'signup') {
          setIsSignUp(true);
      } else {
          setIsSignUp(false);
      }
  }, [searchParams]);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<string | null>(plans.find(p => p.isPopular)?.priceId || null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCheckout = async (userId: string, priceId: string) => {
      setLoading(true);
      toast({ title: 'Se pregătește sesiunea de plată...', description: 'Vei fi redirecționat către Stripe în câteva secunde.' });

      try {
          const checkoutSessionRef = await addDoc(collection(db, 'customers', userId, 'checkout_sessions'), {
              price: priceId,
              success_url: `${window.location.origin}/dashboard/payment/success`,
              cancel_url: `${window.location.origin}/dashboard/payment/cancel`,
              allow_promotion_codes: true,
          });

          onSnapshot(checkoutSessionRef, (snap) => {
              const { error, url } = snap.data() as { error?: { message: string }; url?: string };
              if (error) {
                  toast({ variant: 'destructive', title: 'Eroare la creare sesiune', description: error.message });
                  setLoading(false);
                  router.push('/dashboard/abonament'); // Redirect to allow manual selection
              }
              if (url) {
                  window.location.assign(url);
              }
          });

      } catch (error: any) {
          toast({ variant: 'destructive', title: 'Eroare la crearea sesiunii', description: error.message });
          setLoading(false);
          router.push('/dashboard/abonament');
      }
  };


  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (isSignUp) {
      if (!name.trim()) {
        setError("Numele este obligatoriu.");
        setLoading(false);
        return;
      }
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        await setDoc(doc(db, "agents", user.uid), {
            name: name,
            email: email,
            uid: user.uid,
            activeFormId: "master_standard_v1",
            createdAt: new Date()
        });

        if (selectedPlan) {
            // Plan selectat - mergem la checkout
            await handleCheckout(user.uid, selectedPlan);
        } else {
            // Niciun plan selectat - mergem direct în dashboard
            router.push("/dashboard");
        }

      } catch (err: any) {
        if (err.code === 'auth/email-already-in-use') {
          setError("Acest email este deja folosit. Încearcă să te loghezi.");
        } else if (err.code === 'auth/weak-password') {
          setError("Parola este prea slabă. Trebuie să aibă cel puțin 6 caractere.");
        } else {
          setError("A apărut o eroare la înregistrare. Te rog să încerci din nou.");
        }
        console.error(err);
        setLoading(false);
      }
    } else {
      try {
        await signInWithEmailAndPassword(auth, email, password);
        router.push("/dashboard");
      } catch (err) {
        setError("Email sau parolă incorectă. Te rog să încerci din nou.");
        console.error(err);
        setLoading(false);
      }
    }
  };

  const toggleAuthMode = () => {
      const newMode = !isSignUp;
      setIsSignUp(newMode);
      setError(null);
      setName("");
      setEmail("");
      setPassword("");
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
      <div className="flex-grow flex items-center justify-center relative z-10 px-4 py-12">
        <Card className="w-full max-w-lg mx-4 bg-slate-900/40 border-white/10 backdrop-blur-lg">
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
                    <Input id="name" type="text" placeholder="Ex: Popescu Ion" value={name} onChange={(e) => setName(e.target.value)} required className="h-12 bg-white/5 border-white/10 placeholder:text-slate-500" />
                </div>
                )}
                <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-300">Email</Label>
                <Input id="email" type="email" placeholder="agent@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-12 bg-white/5 border-white/10 placeholder:text-slate-500" />
                </div>
                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <Label htmlFor="password" className="text-slate-300">Parolă</Label>
                         {!isSignUp && <ResetPasswordDialog />}
                    </div>
                    <Input id="password" type="password" value={password} placeholder="Minim 6 caractere" onChange={(e) => setPassword(e.target.value)} required className="h-12 bg-white/5 border-white/10 placeholder:text-slate-500" />
                </div>

                {isSignUp && (
                    <div className="space-y-4 pt-4">
                        <Label className="text-center block text-slate-300">Alege un abonament (opțional)</Label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {plans.map(plan => (
                                <div key={plan.priceId} onClick={() => setSelectedPlan(plan.priceId)} className={cn(
                                    "relative p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 text-center",
                                    selectedPlan === plan.priceId ? "border-amber-500 bg-amber-500/10" : "border-white/20 hover:border-amber-500/50"
                                )}>
                                    {plan.isPopular && <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-slate-900 text-xs px-2 py-0.5 rounded-full font-bold">POPULAR</div>}
                                    <h4 className="font-bold">{plan.name}</h4>
                                    <p className="text-xl font-bold">{plan.price} <span className="text-xs text-slate-400">RON/lună</span></p>
                                    <p className="text-xs text-slate-400 mt-1">{plan.description}</p>
                                    {selectedPlan === plan.priceId && <div className="absolute top-2 right-2 w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center"><Check className="w-3 h-3 text-slate-900"/></div>}
                                </div>
                            ))}
                        </div>
                         <div onClick={() => setSelectedPlan(null)} className={cn(
                            "p-3 rounded-lg border-2 cursor-pointer transition-all duration-200 text-center",
                            selectedPlan === null ? "border-amber-500 bg-amber-500/10" : "border-white/20 hover:border-amber-500/50"
                         )}>
                            <h4 className="font-semibold text-sm">Voi decide mai târziu</h4>
                            <p className="text-xs text-slate-400">Începe fără abonament și explorează platforma.</p>
                         </div>
                    </div>
                )}

                {error && (
                <p className="text-sm text-center text-red-400">{error}</p>
                )}
                <Button type="submit" className="w-full h-12 font-semibold bg-amber-500 text-slate-900 hover:bg-amber-400 transition-colors" disabled={loading}>
                  {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Se procesează...</> : (isSignUp ? (selectedPlan ? "Creează Cont și Plătește" : "Creează Cont Gratuit") : "Intră în cont")}
                </Button>
            </form>
            <div className="mt-6 text-center text-sm">
                <button onClick={toggleAuthMode} className="cursor-pointer font-medium text-amber-400 hover:underline">
                {isSignUp ? "Ai deja cont? Autentifică-te" : "Nu ai cont? Creează unul acum"}
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
