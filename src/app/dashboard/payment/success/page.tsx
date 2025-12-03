
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function PaymentSuccessPage() {
    const router = useRouter();

    // Redirecționează automat după câteva secunde pentru o experiență mai bună
    useEffect(() => {
        const timer = setTimeout(() => {
            router.push('/dashboard/profile');
        }, 4000);

        return () => clearTimeout(timer);
    }, [router]);

    return (
        <div className="flex items-center justify-center min-h-[80vh]">
            <Card className="w-full max-w-md text-center">
                <CardHeader>
                    <div className="mx-auto bg-green-100 p-3 rounded-full mb-4 dark:bg-green-900/30">
                        <CheckCircle2 className="h-10 w-10 text-green-500" />
                    </div>
                    <CardTitle className="text-2xl font-bold">Plată Reușită!</CardTitle>
                    <CardDescription>
                        Abonamentul tău "Agent Pro" este acum activ. Felicitări!
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground mb-6">
                        Vei fi redirecționat automat către panoul de control.
                    </p>
                    <Button asChild className="w-full">
                        <Link href="/dashboard/profile">Mergi la pagina de abonament</Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
