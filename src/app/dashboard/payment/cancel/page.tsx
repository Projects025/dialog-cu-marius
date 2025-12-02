
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { XCircle } from 'lucide-react';

export default function PaymentCancelPage() {
    return (
        <div className="flex items-center justify-center min-h-[80vh]">
            <Card className="w-full max-w-md text-center">
                <CardHeader>
                     <div className="mx-auto bg-red-100 p-3 rounded-full mb-4 dark:bg-red-900/30">
                        <XCircle className="h-10 w-10 text-destructive" />
                    </div>
                    <CardTitle className="text-2xl font-bold">Plată Anulată</CardTitle>
                    <CardDescription>
                       Procesul de plată a fost anulat.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground mb-6">
                        Nu ai fost taxat. Te poți întoarce oricând pentru a finaliza procesul.
                    </p>
                    <Button asChild className="w-full">
                        <Link href="/dashboard/abonament">Înapoi la Abonament</Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
