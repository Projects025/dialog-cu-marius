
"use client";

import { useState, useEffect, Suspense, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { doc, getDoc, updateDoc, deleteField, type FieldValue } from 'firebase/firestore';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
import { Trash2, PlusCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";


type StepData = {
    message: string;
    actionType: 'buttons' | 'input' | 'date' | 'multi_choice' | 'end';
    options?: any;
    nextStep?: string;
    handler?: string;
    [key: string]: any;
};

function FormEditor() {
    const searchParams = useSearchParams();
    const formId = searchParams.get('id');
    const [user, setUser] = useState<User | null>(null);
    const [form, setForm] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [editedSteps, setEditedSteps] = useState<{ [key: string]: Partial<StepData> }>({});
    const { toast } = useToast();

    // State for the new step modal
    const [isAddStepModalOpen, setIsAddStepModalOpen] = useState(false);
    const [newStepId, setNewStepId] = useState("");

    const fetchForm = useCallback(async () => {
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
            
            const fetchedForm = { id: formDoc.id, ...formData };
            setForm(fetchedForm);

            const initialEdits: { [key: string]: Partial<StepData> } = {};
            if (fetchedForm.flow) {
                Object.keys(fetchedForm.flow).forEach(stepKey => {
                    const originalStep = fetchedForm.flow[stepKey];
                    let messageString = '';

                    if (typeof originalStep.message === 'string') {
                        messageString = originalStep.message;
                    } else if (typeof originalStep.message === 'function') {
                         try {
                            const funcString = originalStep.message.toString();
                            const match = funcString.match(/return\s*`([^`]*)`/);
                            messageString = match ? match[1] : '';
                        } catch (e) { console.error("Could not stringify message function", e); }
                    }
                    
                    initialEdits[stepKey] = {
                        ...originalStep,
                        message: messageString,
                        options: Array.isArray(originalStep.options) ? originalStep.options.map((opt: any) => typeof opt === 'object' ? opt.label : opt).join(', ') : ''
                    };
                });
            }
            setEditedSteps(initialEdits);

        } catch (err: any) {
            setError(err.message);
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [formId, user]);


    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        fetchForm();
    }, [formId, user, fetchForm]);

    const handleStepChange = (stepKey: string, field: keyof StepData, value: string) => {
        setEditedSteps(prev => ({
            ...prev,
            [stepKey]: {
                ...prev[stepKey],
                [field]: value
            }
        }));
    };

    const handleSaveStep = async (stepKey: string) => {
        if (!formId || !editedSteps[stepKey]) return;

        const stepToSave = { ...editedSteps[stepKey] };
        
        // Convert options string back to array for certain action types
        if (stepToSave.actionType === 'buttons' || stepToSave.actionType === 'multi_choice') {
            if(typeof stepToSave.options === 'string' && stepToSave.options.trim() !== '') {
                stepToSave.options = stepToSave.options.split(',').map(s => s.trim());
                 if (stepToSave.actionType === 'multi_choice') {
                    stepToSave.options = stepToSave.options.map((opt: string) => ({ label: opt, id: opt.toLowerCase().replace(/\s+/g, '_') }));
                }
            } else {
                 stepToSave.options = [];
            }
        }

        try {
            const formRef = doc(db, 'formTemplates', formId);
            const updatePath = `flow.${stepKey}`;
            await updateDoc(formRef, { [updatePath]: stepToSave });
            
            toast({
                title: "Salvat!",
                description: `Pasul "${stepKey}" a fost actualizat cu succes.`,
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
    
    const handleAddStep = async () => {
        if (!formId || !newStepId.trim()) {
             toast({ variant: "destructive", title: "ID-ul pasului este obligatoriu." });
            return;
        }

        try {
            const formRef = doc(db, 'formTemplates', formId);
            const newStepData: StepData = {
                message: "Mesaj nou...",
                actionType: "buttons",
                options: ["Continuă"],
                nextStep: "end_dialog_friendly"
            };

            await updateDoc(formRef, { [`flow.${newStepId}`]: newStepData });

            toast({ title: "Succes!", description: `Pasul "${newStepId}" a fost adăugat.` });
            
            // Refresh form data
            await fetchForm();

            setIsAddStepModalOpen(false);
            setNewStepId("");

        } catch (error) {
            console.error("Error adding step:", error);
            toast({ variant: "destructive", title: "Eroare", description: "Nu s-a putut adăuga pasul." });
        }
    };

    const handleDeleteStep = async (stepKey: string) => {
        if (!formId || !window.confirm(`Ești sigur că vrei să ștergi pasul "${stepKey}"? Acțiunea este ireversibilă.`)) {
            return;
        }
        
        try {
            const formRef = doc(db, 'formTemplates', formId);
            await updateDoc(formRef, {
                [`flow.${stepKey}`]: deleteField() as FieldValue
            });

            toast({ title: "Succes!", description: `Pasul "${stepKey}" a fost șters.` });

            // Refresh form data from server
            await fetchForm();

        } catch (error) {
            console.error("Error deleting step:", error);
            toast({ variant: "destructive", title: "Eroare", description: "Nu s-a putut șterge pasul." });
        }
    };
    
    if (loading) {
        return <p className="text-center mt-8">Se încarcă editorul...</p>;
    }

    if (error) {
        return <p className="text-destructive text-center mt-8">{error}</p>;
    }
    
    if (!form) {
        return <p className="text-center mt-8">Selectează un formular pentru a-l edita din secțiunea "Formulare".</p>;
    }
    
    // Sort steps alphabetically for consistent order
    const flowSteps = form.flow ? Object.keys(form.flow).sort((a, b) => a.localeCompare(b)) : [];

    return (
        <div className="max-w-4xl mx-auto">
            <Card>
                <CardHeader>
                    <CardTitle>Editare Formular: {form.title}</CardTitle>
                    <CardDescription>Modifică pașii, mesajele și logica conversației. Salvarea se face la nivel de pas.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Accordion type="single" collapsible className="w-full">
                        {flowSteps.map(stepKey => (
                            <AccordionItem value={stepKey} key={stepKey}>
                                <AccordionTrigger>
                                    <div className="flex items-center justify-between w-full pr-4">
                                        <span className="font-mono text-primary text-sm">{stepKey}</span>
                                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8" onClick={(e) => { e.stopPropagation(); handleDeleteStep(stepKey); }}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="space-y-6 p-4 bg-muted/50 rounded-b-md">
                                    <div className="space-y-2">
                                        <Label htmlFor={`message-${stepKey}`} className="font-semibold">Textul Mesajului</Label>
                                        <Textarea
                                            id={`message-${stepKey}`}
                                            value={editedSteps[stepKey]?.message || ''}
                                            onChange={(e) => handleStepChange(stepKey, 'message', e.target.value)}
                                            rows={5}
                                            className="bg-background"
                                        />
                                        <p className="text-xs text-muted-foreground">Tag-uri HTML simple precum {"<strong>"}, {"<br>"}, {"<em>"} și variabile precum {"${data.numeClient}"} sunt permise.</p>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor={`actionType-${stepKey}`}>Tipul Acțiunii</Label>
                                            <Select
                                                value={editedSteps[stepKey]?.actionType}
                                                onValueChange={(value) => handleStepChange(stepKey, 'actionType', value)}
                                            >
                                                <SelectTrigger id={`actionType-${stepKey}`} className="bg-background">
                                                    <SelectValue placeholder="Selectează acțiune" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="buttons">Butoane (Opțiuni simple)</SelectItem>
                                                    <SelectItem value="multi_choice">Butoane (Selecție Multiplă)</SelectItem>
                                                    <SelectItem value="input">Câmp de text (Input)</SelectItem>
                                                    <SelectItem value="date">Selector de Dată</SelectItem>
                                                     <SelectItem value="end">Final Conversație</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor={`nextStep-${stepKey}`}>Pasul Următor (ID)</Label>
                                            <Input
                                                id={`nextStep-${stepKey}`}
                                                value={editedSteps[stepKey]?.nextStep || ''}
                                                onChange={(e) => handleStepChange(stepKey, 'nextStep', e.target.value)}
                                                placeholder="Ex: intrebare_2"
                                                className="bg-background"
                                            />
                                        </div>
                                    </div>
                                    
                                    {(editedSteps[stepKey]?.actionType === 'buttons' || editedSteps[stepKey]?.actionType === 'multi_choice') && (
                                        <div className="space-y-2">
                                            <Label htmlFor={`options-${stepKey}`}>Opțiuni (separate prin virgulă)</Label>
                                            <Input
                                                id={`options-${stepKey}`}
                                                value={editedSteps[stepKey]?.options || ''}
                                                onChange={(e) => handleStepChange(stepKey, 'options', e.target.value)}
                                                placeholder="Ex: Da, Nu, Poate"
                                                className="bg-background"
                                            />
                                        </div>
                                    )}

                                    <Button size="sm" onClick={() => handleSaveStep(stepKey)}>Salvează Modificările Pasului</Button>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>

                    <div className="mt-8 border-t pt-6 flex justify-center">
                         <Button variant="outline" onClick={() => setIsAddStepModalOpen(true)}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Adaugă un Pas Nou în Flux
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Dialog open={isAddStepModalOpen} onOpenChange={setIsAddStepModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Adaugă un Pas Nou</DialogTitle>
                        <DialogDescription>
                            Introdu un ID unic pentru noul pas. Acesta va fi folosit pentru a lega pașii între ei. Ex: 'intrebare_contact'.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="step-id" className="text-left">ID Pas Nou</Label>
                            <Input
                                id="step-id"
                                placeholder="ex: intrebare_buget"
                                value={newStepId}
                                onChange={(e) => setNewStepId(e.target.value)}
                                className="font-mono"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddStepModalOpen(false)}>Anulează</Button>
                        <Button onClick={handleAddStep}>Adaugă Pas</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

export default function FormEditorPage() {
    return (
        <Suspense fallback={<div className="text-center mt-8">Se încarcă...</div>}>
            <FormEditor />
        </Suspense>
    );
}
