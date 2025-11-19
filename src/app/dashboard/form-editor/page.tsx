
"use client";

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { db, auth } from '@/lib/firebaseConfig';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

function FormEditor() {
    const searchParams = useSearchParams();
    const formId = searchParams.get('id');
    const [user, setUser] = useState<User | null>(null);
    const [form, setForm] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [editedMessages, setEditedMessages] = useState<{ [key: string]: string }>({});
    const { toast } = useToast();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const fetchForm = async () => {
            if (!user || !formId) {
                if (user && !formId) {
                    setError("Niciun formular selectat. Te rog selectează un formular pentru a-l edita.");
                    setLoading(false);
                }
                return;
            }

            setLoading(true);
            setError(null);
            try {
                const formRef = doc(db, 'formTemplates', formId);
                const formDoc = await getDoc(formRef);

                if (!formDoc.exists()) {
                    throw new Error("Formularul nu a fost găsit.");
                }

                const formData = formDoc.data();
                if (formData.ownerId !== user.uid) {
                    throw new Error("Nu ai permisiunea de a edita acest formular. Trebuie mai întâi să îl clonezi.");
                }

                setForm({ id: formDoc.id, ...formData });
                // Initialize editedMessages with current messages from the form
                const initialMessages: { [key: string]: string } = {};
                if (formData.flow) {
                    Object.keys(formData.flow).forEach(stepKey => {
                        // The message can be a function or a string, we want the string representation for editing
                        const messageSource = formData.flow[stepKey].message;
                         if (typeof messageSource === 'string') {
                            initialMessages[stepKey] = messageSource;
                        } else if (typeof messageSource === 'function') {
                            // This is a simple way to extract template literals. Might not cover all cases.
                            const funcString = messageSource.toString();
                            const match = funcString.match(/return\s*`([^`]*)`/);
                            initialMessages[stepKey] = match ? match[1] : '';
                        } else {
                            initialMessages[stepKey] = '';
                        }
                    });
                }
                setEditedMessages(initialMessages);

            } catch (err: any) {
                setError(err.message);
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchForm();
    }, [formId, user]);

    const handleMessageChange = (stepKey: string, value: string) => {
        setEditedMessages(prev => ({ ...prev, [stepKey]: value }));
    };

    const handleSave = async (stepKey: string) => {
        if (!formId) return;
        const newMessage = editedMessages[stepKey];
        try {
            const formRef = doc(db, 'formTemplates', formId);
            // Use dot notation to update a nested field
            const updatePath = `flow.${stepKey}.message`;
            await updateDoc(formRef, { [updatePath]: newMessage });
            
            toast({
                title: "Salvat!",
                description: `Pasul a fost actualizat cu succes.`,
            });
        } catch (err) {
            console.error("Error saving step:", err);
            toast({
                variant: "destructive",
                title: "Eroare la salvare",
                description: "Nu s-a putut salva modificarea.",
            });
        }
    };
    
    if (loading) {
        return <p>Se încarcă editorul...</p>;
    }

    if (error) {
        return <p className="text-destructive">{error}</p>;
    }
    
    if (!form) {
        return <p>Selectează un formular pentru a-l edita din secțiunea "Formulare".</p>;
    }
    
    const flowSteps = form.flow ? Object.entries(form.flow).sort(([keyA], [keyB]) => keyA.localeCompare(keyB)) : [];

    return (
        <Card>
            <CardHeader>
                <CardTitle>Editare Formular: {form.title}</CardTitle>
                <CardDescription>Modifică textele pentru fiecare pas al conversației. Salvarea se face la nivel de pas.</CardDescription>
            </CardHeader>
            <CardContent>
                <Accordion type="single" collapsible className="w-full">
                    {flowSteps.map(([stepKey, stepData]: [string, any]) => (
                        <AccordionItem value={stepKey} key={stepKey}>
                            <AccordionTrigger>{stepKey}</AccordionTrigger>
                            <AccordionContent className="space-y-4">
                                <div>
                                    <Label htmlFor={`message-${stepKey}`}>Textul Mesajului</Label>
                                    <Textarea
                                        id={`message-${stepKey}`}
                                        value={editedMessages[stepKey] || ''}
                                        onChange={(e) => handleMessageChange(stepKey, e.target.value)}
                                        rows={5}
                                        className="mt-1 bg-secondary"
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">Poți folosi tag-uri HTML simple precum {"<strong>"}, {"<br>"}, sau {"<em>"} și variabile precum {"${data.numeClient}"} pentru formatare.</p>
                                </div>
                                <Button size="sm" onClick={() => handleSave(stepKey)}>Salvează Pasul</Button>
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            </CardContent>
        </Card>
    );
}


export default function FormEditorPage() {
    return (
        // Suspense este necesar deoarece folosim useSearchParams, care
        // este un hook ce poate suspenda redarea pe partea de server.
        <Suspense fallback={<div>Se încarcă...</div>}>
            <FormEditor />
        </Suspense>
    );
}
