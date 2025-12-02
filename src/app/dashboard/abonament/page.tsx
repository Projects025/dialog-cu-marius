
"use client";

import { useState, useEffect } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { collection, query, where, getDocs, addDoc, onSnapshot, doc } from 'firebase/firestore';
import { loadStripe } from '@stripe/stripe-js';
import { auth, db } from '@/lib/firebaseConfig';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { CheckCircle2, XCircle, Loader2, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

// Asigură-te că cheia publicabilă este definită în variabilele de mediu
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface Product {
    id: string;
    name: string;
    description: string;
    role: string | null;
    prices: { id: string; unit_amount: number; currency: string; interval: string }[];
}

const SubscriptionPage = () => {
    const { toast } = useToast();
    const [user, setUser] = useState<User | null>(null);
    const [products, setProducts] = useState<Product[]>([]);
    const [subscription, setSubscription] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isProcessingCheckout, setIsProcessingCheckout] = useState<string | null>(null);
    const [hasCheckedSubscription, setHasCheckedSubscription] = useState(false);

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            if (!currentUser) {
                setLoading(false);
                setHasCheckedSubscription(true);
            }
        });
        return () => unsubscribeAuth();
    }, []);

    // Fetch Products and Prices
    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const productsQuery = query(collection(db, 'products'), where('active', '==', true));
                const querySnapshot = await getDocs(productsQuery);
                const fetchedProducts: Product[] = [];

                for (const productDoc of querySnapshot.docs) {
                    const productData = productDoc.data();
                    const pricesQuery = query(collection(db, 'products', productDoc.id, 'prices'));
                    const pricesSnapshot = await getDocs(pricesQuery);
                    const productPrices: Product['prices'] = [];
                    
                    pricesSnapshot.forEach(priceDoc => {
                        const priceData = priceDoc.data();
                        // Doar prețurile recurente
                        if (priceData.active === true && priceData.type === 'recurring') {
                            productPrices.push({
                                id: priceDoc.id,
                                unit_amount: priceData.unit_amount,
                                currency: priceData.currency,
                                interval: priceData.interval,
                            });
                        }
                    });

                    if (productPrices.length > 0) {
                         fetchedProducts.push({
                            id: productDoc.id,
                            name: productData.name,
                            description: productData.description,
                            role: productData.role || null,
                            prices: productPrices,
                        });
                    }
                }
                // Sortează produsele pe baza primului preț (de la cel mai mic la cel mai mare)
                fetchedProducts.sort((a, b) => a.prices[0].unit_amount - b.prices[0].unit_amount);
                setProducts(fetchedProducts);
            } catch(e) {
                console.error("Error fetching products:", e);
                toast({ variant: 'destructive', title: 'Eroare Produse', description: 'Nu s-au putut încărca planurile de abonament.' });
            }
        };

        fetchProducts();
    }, [toast]);

    // Listen for Subscription status
    useEffect(() => {
        if (!user) return;

        const subscriptionsQuery = query(
            collection(db, 'customers', user.uid, 'subscriptions'),
            where('status', 'in', ['trialing', 'active'])
        );
        
        const unsubscribeSub = onSnapshot(subscriptionsQuery, (snapshot) => {
            setLoading(true);
            if (!snapshot.empty) {
                const subData = snapshot.docs[0].data();
                setSubscription({ id: snapshot.docs[0].id, ...subData });
            } else {
                setSubscription(null);
            }
            setLoading(false);
            setHasCheckedSubscription(true);
        }, (error) => {
            console.error("Subscription snapshot error:", error);
            toast({ variant: 'destructive', title: 'Eroare', description: 'Nu s-a putut verifica statusul abonamentului.' });
            setLoading(false);
            setHasCheckedSubscription(true);
        });

        return () => unsubscribeSub();
    }, [user, toast]);

    const handleCheckout = async (priceId: string) => {
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

    const currentStatus = getStatusText(subscription?.status || null);
    const isActive = subscription?.status === 'active' || subscription?.status === 'trialing';

    if (!hasCheckedSubscription) {
         return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-4 text-muted-foreground">Se verifică statusul abonamentului...</p>
            </div>
        );
    }
    
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
                                <span className="font-semibold text-lg">{subscription.items[0].price.product.name}</span>
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
                    {products.length === 0 && !loading ? (
                         <p className="text-muted-foreground col-span-full text-center">Niciun plan de abonament nu este disponibil momentan.</p>
                    ) : products.map((product) => (
                        <Card key={product.id} className="flex flex-col hover:border-primary transition-colors duration-300">
                            <CardHeader>
                                <CardTitle>{product.name}</CardTitle>
                                <CardDescription>{product.description}</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-grow">
                                <p className="text-4xl font-bold">
                                    {(product.prices[0].unit_amount / 100).toLocaleString('ro-RO', { style: 'currency', currency: 'RON' })}
                                    <span className="text-sm font-normal text-muted-foreground"> / {product.prices[0].interval === 'month' ? 'lună' : 'an'}</span>
                                </p>
                                {/* Aici se pot adăuga în viitor listă de features */}
                            </CardContent>
                            <CardFooter>
                                <Button 
                                    className="w-full" 
                                    onClick={() => handleCheckout(product.prices[0].id)}
                                    disabled={!!isProcessingCheckout}
                                >
                                    {isProcessingCheckout === product.prices[0].id ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                                    {isProcessingCheckout === product.prices[0].id ? 'Se procesează...' : 'Alege Planul'}
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
