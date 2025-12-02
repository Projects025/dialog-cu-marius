
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
// Vom adăuga aceasta variabilă de mediu mai târziu.
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
    const [loadingProducts, setLoadingProducts] = useState(true);
    const [isProcessingCheckout, setIsProcessingCheckout] = useState<string | null>(null);

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            if (!currentUser) {
                setLoadingProducts(false);
            }
        });
        return () => unsubscribeAuth();
    }, []);

    // Fetch Products and Prices
    useEffect(() => {
        const fetchProducts = async () => {
            setLoadingProducts(true);
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
                    if (priceData.type === 'recurring') {
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
            setProducts(fetchedProducts);
            setLoadingProducts(false);
        };

        fetchProducts();
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
        });

        return () => unsubscribeSub();
    }, [user]);

    const handleCheckout = async (priceId: string) => {
        if (!user) return;
        setIsProcessingCheckout(priceId);
        toast({ title: 'Se pregătește sesiunea de plată...', description: 'Vei fi redirecționat către Stripe în câteva secunde.' });

        try {
            const checkoutSessionRef = await addDoc(collection(db, 'customers', user.uid, 'checkout_sessions'), {
                price: priceId,
                success_url: window.location.origin + '/dashboard/abonament',
                cancel_url: window.location.origin + '/dashboard/abonament',
            });

            onSnapshot(checkoutSessionRef, (snap) => {
                const { error, url } = snap.data() as { error?: { message: string }; url?: string };
                if (error) {
                    toast({ variant: 'destructive', title: 'Eroare', description: error.message });
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
        
        const portalLinkRef = await addDoc(collection(db, 'customers', user.uid, 'portal_links'), {
            return_url: window.location.href,
        });

        onSnapshot(portalLinkRef, (snap) => {
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

    if (loadingProducts || !user) {
         return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
                        <CardDescription>Mulțumim că ești un membru PRO!</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 rounded-lg bg-muted/50">
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
                            Gestionează Abonamentul
                        </Button>
                    </CardFooter>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {products.map((product) => (
                        <Card key={product.id} className="flex flex-col">
                            <CardHeader>
                                <CardTitle>{product.name}</CardTitle>
                                <CardDescription>{product.description}</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-grow">
                                <p className="text-4xl font-bold">
                                    {(product.prices[0].unit_amount / 100).toLocaleString('ro-RO', { style: 'currency', currency: 'RON' })}
                                    <span className="text-sm font-normal text-muted-foreground"> / {product.prices[0].interval === 'month' ? 'lună' : 'an'}</span>
                                </p>
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
            )}
        </div>
    );
};

export default SubscriptionPage;
