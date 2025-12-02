
"use client";

import { useState, useEffect } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { loadStripe } from '@stripe/stripe-js';
import { auth, db } from '@/lib/firebaseConfig';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, XCircle, Loader2, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

// Asigură-te că cheia publicabilă este definită în variabilele de mediu
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

const SubscriptionPage = () => {
    const { toast } = useToast();
    const [user, setUser] = useState<User | null>(null);
    const [subscription, setSubscription] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            if (!currentUser) {
                setLoading(false);
            }
        });
        return () => unsubscribeAuth();
    }, []);

    useEffect(() => {
        if (!user) return;

        // Ascultă în timp real pentru modificări la abonamentele utilizatorului
        const unsubscribeSub = onSnapshot(doc(db, 'customers', user.uid), (doc) => {
            if (doc.exists()) {
                const customerData = doc.data();
                // De obicei, extensia stochează abonamentele într-o subcolecție.
                // Acest listener ar trebui adaptat la structura exactă pe care o creează extensia.
                // Momentan, presupunem o structură simplă pentru afișare.
                // TODO: Ascultă subcolecția `subscriptions`
                setSubscription(customerData.activeSubscription || null); // Exemplu
            } else {
                setSubscription(null);
            }
            setLoading(false);
        });

        return () => unsubscribeSub();
    }, [user]);

    const handleCheckout = async () => {
        if (!user) return;
        setIsProcessing(true);
        toast({ title: 'Se inițiază plata...', description: 'Vei fi redirecționat către Stripe.' });

        try {
            // Aici vom adăuga logica pentru a crea sesiunea de checkout
            // folosind extensia Firebase.
            // Momentan, aceasta este o simulare.
            console.log("Se inițiază checkout pentru user:", user.uid);
            // PASUL URMATOR: se creează un document în `customers/{uid}/checkout_sessions`
            
            // Simulare întârziere
            await new Promise(resolve => setTimeout(resolve, 2000));
            toast({ variant: 'destructive', title: 'Funcționalitate în dezvoltare', description: 'Logica de plată nu este încă implementată.'});

        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Eroare', description: error.message });
        } finally {
            setIsProcessing(false);
        }
    };
    
     const handleManageSubscription = async () => {
        if (!user) return;
        setIsProcessing(true);
        toast({ title: 'Se deschide portalul de client...', description: 'Vei fi redirecționat către Stripe.' });

        try {
            // Aici vom adăuga logica pentru a crea un link către portalul Stripe
            // folosind extensia Firebase.
            // Momentan, aceasta este o simulare.
            console.log("Se deschide portalul pentru user:", user.uid);
            
            await new Promise(resolve => setTimeout(resolve, 2000));
            toast({ variant: 'destructive', title: 'Funcționalitate în dezvoltare', description: 'Logica portalului nu este încă implementată.'});

        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Eroare', description: error.message });
        } finally {
            setIsProcessing(false);
        }
    };

    const getStatusText = (status: string | null) => {
        switch (status) {
            case 'active':
            case 'trialing':
                return { text: 'Activ', icon: <CheckCircle2 className="h-5 w-5 text-green-500" />, variant: 'secondary' as const };
            case 'past_due':
                return { text: 'Plată Eșuată', icon: <XCircle className="h-5 w-5 text-destructive" />, variant: 'destructive' as const };
            case 'canceled':
                return { text: 'Anulat', icon: <XCircle className="h-5 w-5 text-muted-foreground" />, variant: 'outline' as const };
            default:
                return { text: 'Inactiv', icon: <XCircle className="h-5 w-5 text-muted-foreground" />, variant: 'outline' as const };
        }
    };

    const currentStatus = getStatusText(subscription?.status || null);
    const isActive = subscription?.status === 'active' || subscription?.status === 'trialing';

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-xl font-bold md:text-2xl">Abonament</h1>
                <p className="text-muted-foreground">Gestionează-ți planul și detaliile de facturare.</p>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Planul Tău Actual</CardTitle>
                    <CardDescription>Mai jos poți vedea statusul curent al abonamentului tău.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {loading ? (
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Loader2 className="h-5 w-5 animate-spin" />
                            <span>Se încarcă statusul...</span>
                        </div>
                    ) : (
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 rounded-lg bg-muted/50">
                            <div className="flex items-center gap-3">
                                <span className="font-semibold text-lg">Agent Pro</span>
                                <Badge variant={currentStatus.variant} className="gap-2">
                                     {currentStatus.icon}
                                    {currentStatus.text}
                                </Badge>
                            </div>
                            <p className="text-muted-foreground text-sm mt-2 sm:mt-0">
                                {isActive
                                    ? `Următoarea plată: ${subscription?.current_period_end ? new Date(subscription.current_period_end.seconds * 1000).toLocaleDateString('ro-RO') : 'N/A'}`
                                    : 'Funcționalitățile PRO sunt dezactivate.'}
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>

             <Card>
                <CardHeader>
                    <CardTitle>Opțiuni Abonament</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? <p>Se încarcă...</p> : (
                        <div>
                        {isActive ? (
                            <div className="space-y-4">
                                <p className="text-muted-foreground">Abonamentul tău este activ. Poți gestiona detaliile de plată, anula abonamentul sau vizualiza facturile direct în portalul securizat Stripe.</p>
                                <Button onClick={handleManageSubscription} disabled={isProcessing}>
                                    {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <ExternalLink className="mr-2 h-4 w-4"/>}
                                    Gestionează Abonamentul
                                </Button>
                            </div>
                        ) : (
                             <div className="space-y-4">
                                <p className="text-muted-foreground">Treci la planul "Agent Pro" pentru 15€/lună și deblochează toate funcționalitățile platformei.</p>
                                <Button onClick={handleCheckout} disabled={isProcessing}>
                                     {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                                    Treci la PRO
                                </Button>
                            </div>
                        )}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default SubscriptionPage;
