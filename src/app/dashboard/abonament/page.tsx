
"use client";

import { useState, useEffect } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { collection, query, where, getDocs, addDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebaseConfig';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { CheckCircle2, XCircle, Loader2, ExternalLink, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// Lista statică de produse. 
// IMPORTANT: Înlocuiește 'price_...' cu ID-ul real al prețului din contul tău Stripe.
// Poți găsi Price ID-ul în panoul Stripe, la secțiunea Products -> (produsul tău) -> Pricing.
const productPlans = [
    {
        id: 'prod_TWi5UrIFpY0u6R',
        name: 'Basic - PoliSafe',
        description: 'Ideal pentru consultanții la început de drum.',
        priceId: 'price_REPLACE_WITH_BASIC_PRICE_ID', // <--- ÎNLOCUIEȘTE AICI
        price: 75,
        interval: 'lună',
        features: [
            "Asistent virtual inteligent",
            "Analiză de vulnerabilitate",
            "CRM pentru managementul clienților",
            "Link personalizat și cod QR",
        ]
    },
    {
        id: 'prod_TX4ETTsdLydidt',
        name: 'Pro - PoliSafe',
        description: 'Planul perfect pentru consultantul individual.',
        isPopular: true,
        priceId: 'price_REPLACE_WITH_PRO_PRICE_ID', // <--- ÎNLOCUIEȘTE AICI
        price: 100,
        interval: 'lună',
        features: [
            "Toate beneficiile 'Basic'",
            "Dashboard cu statistici avansate",
            "Export & Print rapoarte clienți",
            "5 formulare personalizate",
        ]
    },
    {
        id: 'prod_TX4ED5ZsoiCwFx',
        name: 'Team - PoliSafe',
        description: 'Pentru liderii de echipă care vor performanță.',
        priceId: 'price_REPLACE_WITH_TEAM_PRICE_ID', // <--- ÎNLOCUIEȘTE AICI
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


const SubscriptionPage = () => {
    const { toast } = useToast();
    const [user, setUser] = useState<User | null>(null);
    const [subscription, setSubscription] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isProcessingCheckout, setIsProcessingCheckout] = useState<string | null>(null);

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            if (!currentUser) {
                setLoading(false);
            }
        });
        return () => unsubscribeAuth();
    }, []);

    // Listen for Subscription status
    useEffect(() => {
        if (!user) return;

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
            setLoading(false);
        }, (error) => {
            console.error("Subscription snapshot error:", error);
            toast({ variant: 'destructive', title: 'Eroare', description: 'Nu s-a putut verifica statusul abonamentului.' });
            setLoading(false);
        });

        return () => unsubscribeSub();
    }, [user, toast]);

    const handleCheckout = async (priceId: string) => {
        if (priceId.includes('REPLACE_WITH')) {
            toast({
                variant: 'destructive',
                title: 'Configurare Incompletă',
                description: 'ID-ul prețului nu a fost configurat în cod. Contactează suportul tehnic.',
            });
            return;
        }

        if (!user) return;
        setIsProcessingCheckout(priceId);
        toast({ title: 'Se pregătește sesiunea de plată...', description: 'Vei fi redirecționat către Stripe în câteva secunde.' });

        try {
            const checkoutSessionRef = await addDoc(collection(db, 'customers', user.uid, 'checkout_sessions'), {
                price: priceId,
                success_url: `${window.location.origin}/dashboard/payment/success`,
                cancel_url: `${window.location.origin}/dashboard/payment/cancel`,
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
        toast({ title: 'Se deschide portalul de client...' });
        
        const portalLinkRef = collection(db, 'customers', user.uid, 'portal_links');
        const docRef = await addDoc(portalLinkRef, {
            return_url: window.location.href,
        });

        onSnapshot(docRef, (snap) => {
            const { error, url } = snap.data() as { error?: { message: string }; url?: string };
            if (error) {
                toast({ variant: 'destructive', title: 'Eroare', description: error.message });
            }
            if (url) {
                window.location.assign(url);
            }
        });
    };

    const getStatusText = (status: string | null) => {
        switch (status) {
            case 'active': return { text: 'Activ', icon: <CheckCircle2 className="h-5 w-5 text-green-500" />, variant: 'secondary' as const };
            case 'trialing': return { text: 'În Perioada de Probă', icon: <CheckCircle2 className="h-5 w-5 text-green-500" />, variant: 'secondary' as const };
            default: return { text: 'Inactiv', icon: <XCircle className="h-5 w-5 text-muted-foreground" />, variant: 'outline' as const };
        }
    };
    
    if (loading) {
         return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-4 text-muted-foreground">Se verifică statusul abonamentului...</p>
            </div>
        );
    }
    
    const currentStatus = getStatusText(subscription?.status || null);
    const isActive = subscription?.status === 'active' || subscription?.status === 'trialing';
    const activeProductId = subscription?.items[0]?.price?.product;

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-xl font-bold md:text-2xl">Abonament & Facturare</h1>
                <p className="text-muted-foreground">Gestionează-ți planul și vezi opțiunile disponibile.</p>
            </div>

            {isActive ? (
                <Card>
                    <CardHeader>
                        <CardTitle>Planul Tău Actual</CardTitle>
                        <CardDescription>Mulțumim că ești un membru PRO! Aici poți vedea detaliile și poți gestiona abonamentul.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 rounded-lg bg-muted/50 border border-border">
                            <div className="flex items-center gap-3">
                                <span className="font-semibold text-lg">{productPlans.find(p => p.id === activeProductId)?.name || 'Plan Activ'}</span>
                                <Badge variant={currentStatus.variant} className="gap-2">
                                     {currentStatus.icon}
                                    {currentStatus.text}
                                </Badge>
                            </div>
                            <p className="text-muted-foreground text-sm mt-2 sm:mt-0">
                                Se reînnoiește pe: {subscription?.current_period_end ? new Date(subscription.current_period_end.seconds * 1000).toLocaleDateString('ro-RO') : 'N/A'}
                            </p>
                        </div>
                    </CardContent>
                    <CardFooter>
                         <Button onClick={handleManageSubscription}>
                            <ExternalLink className="mr-2 h-4 w-4"/>
                            Gestionează în portalul Stripe
                        </Button>
                    </CardFooter>
                </Card>
            ) : (
                <>
                <Card className="border-amber-500/50 bg-amber-950/20">
                     <CardHeader className="text-center">
                        <CardTitle>Nu ai un abonament activ</CardTitle>
                        <CardDescription>Alege unul dintre planurile de mai jos pentru a debloca toate funcționalitățile platformei.</CardDescription>
                    </CardHeader>
                </Card>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {productPlans.map((plan) => (
                        <Card key={plan.id} className={cn(
                            "flex flex-col transition-all duration-300",
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
                </>
            )}
        </div>
    );
};

export default SubscriptionPage;

    