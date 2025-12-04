"use client";

import { useState, useEffect } from 'react';
import { onAuthStateChanged, updateProfile, updatePassword, signOut, type User } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { doc, getDoc, updateDoc, collection, addDoc, onSnapshot, query, where, setDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { auth, db, functions } from '@/lib/firebaseConfig';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { Loader2, LogOut, ExternalLink, CheckCircle2, XCircle, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// Lista statică de produse cu ID-urile de preț reale din Stripe.
const productPlans = [
    {
        id: 'prod_TWi5UrIFpY0u6R',
        name: 'Basic - PoliSafe',
        description: 'Ideal pentru consultanții la început de drum.',
        priceId: 'price_1SZefIPb5IYvItKJhsm8xybf',
        price: 75,
        interval: 'lună',
        features: [
            "CRM pentru managementul clienților",
            "Link personalizat",
            "Dashboard cu statistici",
            "Suport tehnic prin email",
        ]
    },
    {
        id: 'prod_TX4ETTsdLydidt',
        name: 'Pro - PoliSafe',
        description: 'Planul perfect pentru consultantul individual.',
        isPopular: true,
        priceId: 'price_1Sa05gPb5IYvItKJyVlgBvxZ',
        price: 100,
        interval: 'lună',
        features: [
            "Toate beneficiile 'Basic'",
            "Export & Print rapoarte clienți",
            "5 formulare personalizate",
        ]
    },
    {
        id: 'prod_TX4ED5ZsoiCwFx',
        name: 'Team - PoliSafe',
        description: 'Pentru liderii de echipă care vor performanță.',
        priceId: 'price_1Sa06TPb5IYvItKJbzhZuc7R',
        price: 125,
        interval: 'lună',
        features: [
            "Toate beneficiile 'Pro'",
            "Formulare nelimitate",
            "Cont de administrator de echipă",
            "Rapoarte de performanță lunare",
        ]
    }
];


export default function ProfilePage() {
    const [user, setUser] = useState<User | null>(null);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(true);
    const [isSavingName, setIsSavingName] = useState(false);
    const [isSavingPassword, setIsSavingPassword] = useState(false);
    
    // Subscription state
    const [subscription, setSubscription] = useState<any>(null);
    const [loadingSubscription, setLoadingSubscription] = useState(true);
    const [isProcessingCheckout, setIsProcessingCheckout] = useState<string | null>(null);
    const [isManagingSubscription, setIsManagingSubscription] = useState(false);

    const { toast } = useToast();
    const router = useRouter();

    // Fetch User and Profile Data
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                setEmail(currentUser.email || '');
                const agentRef = doc(db, 'agents', currentUser.uid);
                const agentDoc = await getDoc(agentRef);
                if (agentDoc.exists()) {
                    setName(agentDoc.data().name || currentUser.displayName || '');
                } else {
                    setName(currentUser.displayName || '');
                }
            } else {
                router.push("/login");
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, [router]);

    // Fetch Subscription Data
    useEffect(() => {
        if (!user) return;

        setLoadingSubscription(true);
        const subscriptionsQuery = query(
            collection(db, 'customers', user.uid, 'subscriptions'),
            where('status', 'in', ['trialing', 'active'])
        );
        
        const unsubscribeSub = onSnapshot(subscriptionsQuery, (snapshot) => {
            if (!snapshot.empty) {
                const subData = snapshot.docs[0].data();
                setSubscription({ id: snapshot.docs[0].id, ...subData });
            } else {
                setSubscription(null);
            }
            setLoadingSubscription(false);
        }, (error) => {
            console.error("Subscription snapshot error:", error);
            toast({ variant: 'destructive', title: 'Eroare Abonament', description: 'Nu s-a putut verifica statusul abonamentului.' });
            setLoadingSubscription(false);
        });

        return () => unsubscribeSub();
    }, [user, toast]);

    const handleSaveChanges = async () => {
        if (!user || !name.trim()) {
            toast({ variant: 'destructive', title: 'Numele nu poate fi gol.' });
            return;
        }
        setIsSavingName(true);
        try {
            await updateProfile(user, { displayName: name });
            const agentRef = doc(db, 'agents', user.uid);
            await updateDoc(agentRef, { name: name });
            toast({ title: 'Succes!', description: 'Numele a fost actualizat.' });
        } catch (error: any) {
            console.error('Error updating profile:', error);
            toast({ variant: 'destructive', title: 'Eroare', description: 'Nu s-a putut actualiza profilul.' });
        } finally {
            setIsSavingName(false);
        }
    };

    const handleChangePassword = async () => {
        if (newPassword !== confirmPassword) {
            toast({ variant: 'destructive', title: 'Parolele nu se potrivesc.' });
            return false;
        }
        if (newPassword.length < 6) {
            toast({ variant: 'destructive', title: 'Parola este prea scurtă (minim 6 caractere).' });
            return false;
        }
        if (!user) return false;

        setIsSavingPassword(true);
        try {
            await updatePassword(user, newPassword);
            setNewPassword('');
            setConfirmPassword('');
            toast({ title: 'Succes!', description: 'Parola a fost schimbată.' });
            return true; // Indicate success to close dialog
        } catch (error: any) {
            console.error('Error updating password:', error);
             if (error.code === 'auth/requires-recent-login') {
                 toast({ variant: 'destructive', title: 'Sesiune expirată', description: 'Pentru securitate, te rugăm să te re-autentifici înainte de a schimba parola.' });
             } else {
                toast({ variant: 'destructive', title: 'Eroare', description: 'Nu s-a putut schimba parola.' });
             }
             return false; // Indicate failure
        } finally {
            setIsSavingPassword(false);
        }
    };

    const handleLogout = async () => {
        try {
            await signOut(auth);
            router.push("/login");
        } catch (error) {
            console.error("Error signing out:", error);
            toast({ variant: 'destructive', title: 'Eroare', description: 'Nu s-a putut efectua deconectarea.' });
        }
    };

    const handleCheckout = async (priceId: string) => {
        if (!user) return;
        setIsProcessingCheckout(priceId);
        toast({ title: 'Se pregătește sesiunea de plată...', description: 'Vei fi redirecționat către Stripe în câteva secunde.' });

        try {
            const checkoutSessionRef = await addDoc(collection(db, 'customers', user.uid, 'checkout_sessions'), {
                price: priceId,
                success_url: `${window.location.origin}/dashboard/payment/success`,
                cancel_url: `${window.location.origin}/dashboard/payment/cancel`,
                allow_promotion_codes: true,
            });

            onSnapshot(checkoutSessionRef, (snap) => {
                const { error, url } = snap.data() as { error?: { message: string }; url?: string };
                if (error) {
                    toast({ variant: 'destructive', title: 'Eroare la creare sesiune', description: error.message });
                    setIsProcessingCheckout(null);
                }
                if (url) {
                    window.location.assign(url);
                }
            });

        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Eroare la crearea sesiunii', description: error.message });
            setIsProcessingCheckout(null);
        }
    };

    const handleManageSubscription = async () => {
        if (!user) return;
        setIsManagingSubscription(true);
        toast({ title: "Se deschide portalul...", description: "Te redirecționăm către Stripe." });
        
        try {
            const functionRef = httpsCallable(functions, 'ext-firestore-stripe-payments-createPortalLink');
            
            const { data }: any = await functionRef({
                returnUrl: window.location.href,
                locale: 'ro',
            });

            if (data?.url) {
                window.location.assign(data.url);
            } else {
                throw new Error("Nu s-a primit URL-ul de la Stripe.");
            }
        } catch (e: any) {
            console.error("Eroare Portal:", e);
            toast({ variant: "destructive", title: "Eroare", description: e.message || "Asigură-te că ai un abonament activ și că Portalul este activat în Stripe." });
            setIsManagingSubscription(false);
        }
    };

    const getStatusText = (status: string | null) => {
        switch (status) {
            case 'active': return { text: 'Activ', icon: <CheckCircle2 className="h-5 w-5 text-green-500" />, variant: 'secondary' as const };
            case 'trialing': return { text: 'În Perioada de Probă', icon: <CheckCircle2 className="h-5 w-5 text-green-500" />, variant: 'secondary' as const };
            default: return { text: 'Inactiv', icon: <XCircle className="h-5 w-5 text-muted-foreground" />, variant: 'outline' as const };
        }
    };

    if (loading) {
        return <p>Se încarcă profilul...</p>;
    }
    
    const currentStatus = getStatusText(subscription?.status || null);
    const isActive = subscription?.status === 'active' || subscription?.status === 'trialing';
    const activeProductId = subscription?.items[0]?.price?.product;


    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-xl font-bold md:text-2xl">Profil & Abonament</h1>
                <p className="text-muted-foreground">Gestionează-ți datele personale, securitatea contului și planul tarifar.</p>
            </div>
            
            <Separator />
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Profile & Security Card */}
                <Card>
                    <CardHeader>
                        <CardTitle>Setări Cont</CardTitle>
                        <CardDescription>Aceste informații sunt vizibile doar pentru tine.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Nume Prenume</Label>
                            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Adresă de Email</Label>
                            <Input id="email" type="email" value={email} disabled />
                        </div>
                    </CardContent>
                    <CardFooter className="flex flex-col sm:flex-row items-stretch sm:items-center sm:justify-between gap-3">
                         <Button onClick={handleSaveChanges} disabled={isSavingName}>
                            {isSavingName && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Salvează Numele
                        </Button>
                         <Dialog>
                            <DialogTrigger asChild>
                                <Button variant="outline">Schimbă Parola</Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[425px]">
                                <DialogHeader>
                                    <DialogTitle>Schimbă Parola</DialogTitle>
                                    <DialogDescription>
                                        Actualizează-ți parola în mod regulat pentru a-ți proteja contul.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                     <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="new-password">Parola Nouă</Label>
                                        <Input id="new-password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Minim 6 caractere" className="col-span-3"/>
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="confirm-password">Confirmă</Label>
                                        <Input id="confirm-password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="col-span-3"/>
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button onClick={handleChangePassword} disabled={isSavingPassword}>
                                        {isSavingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Actualizează Parola
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </CardFooter>
                </Card>

                {/* Subscription Card */}
                <Card>
                    <CardHeader>
                        <CardTitle>Planul Tău Actual</CardTitle>
                        <CardDescription>Aici poți vedea și administra planul tău curent.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         {loadingSubscription ? (
                             <div className="flex items-center justify-center h-24 border rounded-lg bg-muted/40">
                                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                            </div>
                        ) : (
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 rounded-lg bg-muted/50 border">
                                {isActive ? (
                                    <>
                                        <div className="flex items-center gap-3">
                                            <span className="font-semibold text-lg">{productPlans.find(p => p.id === activeProductId)?.name || 'Plan Activ'}</span>
                                            <Badge variant={currentStatus.variant} className="gap-2">
                                                {currentStatus.icon}
                                                {currentStatus.text}
                                            </Badge>
                                        </div>
                                        <p className="text-muted-foreground text-sm mt-2 sm:mt-0">
                                            Se reînnoiește: {subscription?.current_period_end ? new Date(subscription.current_period_end.seconds * 1000).toLocaleDateString('ro-RO') : 'N/A'}
                                        </p>
                                    </>
                                ) : (
                                    <div className="flex items-center gap-3">
                                        <span className="font-semibold text-lg">Niciun plan</span>
                                         <Badge variant={currentStatus.variant} className="gap-2">
                                            {currentStatus.icon}
                                            {currentStatus.text}
                                        </Badge>
                                    </div>
                                )}
                            </div>
                        )}
                    </CardContent>
                    <CardFooter>
                        <Button onClick={handleManageSubscription} disabled={!isActive || isManagingSubscription}>
                            {isManagingSubscription ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <ExternalLink className="mr-2 h-4 w-4"/>}
                            {isManagingSubscription ? 'Se deschide...' : 'Gestionează în portalul Stripe'}
                        </Button>
                    </CardFooter>
                </Card>
            </div>

            {loadingSubscription ? (
                 <div className="mt-8 text-center text-muted-foreground">Se încarcă planurile...</div>
            ) : !isActive && (
                <>
                <Separator className="my-8"/>
                 <div>
                    <h2 className="text-lg font-semibold mb-4">Alege un plan</h2>
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {productPlans.map((plan) => (
                            <Card key={plan.id} className={cn(
                                "flex flex-col transition-all duration-300 relative",
                                plan.isPopular ? "border-amber-500 shadow-amber-500/10 shadow-lg" : "hover:border-primary"
                            )}>
                                 {plan.isPopular && (
                                    <Badge variant="secondary" className="absolute -top-3 left-1/2 -translate-x-1/2">Cel mai popular</Badge>
                                 )}
                                <CardHeader>
                                    <CardTitle className={cn(plan.isPopular && "text-amber-400")}>{plan.name}</CardTitle>
                                    <CardDescription>{plan.description}</CardDescription>
                                </CardHeader>
                                <CardContent className="flex-grow space-y-6">
                                    <p className="text-4xl font-bold">
                                        {plan.price}
                                        <span className="text-sm font-normal text-muted-foreground"> RON / {plan.interval}</span>
                                    </p>
                                    <ul className="space-y-3 text-sm text-muted-foreground">
                                        {plan.features.map((feature) => (
                                            <li key={feature} className="flex items-start">
                                                <Check className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                                                <span>{feature}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </CardContent>
                                <CardFooter>
                                    <Button 
                                        className={cn("w-full", plan.isPopular ? "bg-amber-500 text-black hover:bg-amber-400" : "")}
                                        variant={plan.isPopular ? "default" : "outline"}
                                        onClick={() => handleCheckout(plan.priceId)}
                                        disabled={!!isProcessingCheckout}
                                    >
                                        {isProcessingCheckout === plan.priceId ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                                        {isProcessingCheckout === plan.priceId ? 'Se procesează...' : 'Alege Planul'}
                                    </Button>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                </div>
                </>
            )}
            
            <Separator className="my-8" />
            
             <div className="flex justify-start">
                <Button variant="outline" onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Deconectare
                </Button>
            </div>
        </div>
    );
}
