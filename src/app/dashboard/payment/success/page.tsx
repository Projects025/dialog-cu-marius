
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2 } from 'lucide-react';

export default function PaymentSuccessPage() {
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
                        Poți acum să creezi formulare noi și să folosești link-ul tău de client la capacitate maximă.
                    </p>
                    <Button asChild className="w-full">
                        <Link href="/dashboard/abonament">Mergi la pagina de abonament</Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
