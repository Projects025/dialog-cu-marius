
"use client";

import { useState, useEffect, Suspense, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { db, auth } from '@/lib/firebaseConfig';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Save, ArrowUp, ArrowDown } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type StepData = {
    id: string;
    message: string;
    actionType: 'buttons' | 'input' | 'date' | 'multi_choice' | 'end';
    options?: any;
    nextStep?: string;
    [key: string]: any;
};

function FormEditor() {
    const searchParams = useSearchParams();
    const formId = searchParams.get('id');
    const [user, setUser] = useState<User | null>(null);
    const [form, setForm] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [steps, setSteps] = useState<StepData[]>([]);
    const [formTitle, setFormTitle] = useState("");
    const { toast } = useToast();

    const [isAddStepModalOpen, setIsAddStepModalOpen] = useState(false);
    const [newStepId, setNewStepId] = useState("");

    const fetchForm = useCallback(async () => {
        if (!user || !formId) {
            if (user && !formId) {
                setError("Niciun formular selectat.");
                setLoading(false);
            }
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const formRef = doc(db, 'formTemplates', formId);
            const formDoc = await getDoc(formRef);

            if (!formDoc.exists()) throw new Error("Formularul nu a fost găsit.");
            
            const formData = formDoc.data();
            if (formData.ownerId !== user.uid) {
                throw new Error("Nu ai permisiunea de a edita acest formular.");
            }
            
            setForm(formData);
            setFormTitle(formData.title);

            if (formData.flow) {
                const flowArray = Object.entries(formData.flow).map(([id, data]) => ({
                    id,
                    ...(data as any)
                }));
                // Simple sort for now, will be replaced by a better logic if needed
                flowArray.sort((a,b) => a.id.localeCompare(b.id));
                setSteps(flowArray);
            }

        } catch (err: any) {
            setError(err.message);
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

    const handleStepChange = (index: number, field: keyof StepData, value: any) => {
        setSteps(prev => {
            const newSteps = [...prev];
            const stepToUpdate = { ...newSteps[index] };
    
            if (field === 'options' && (stepToUpdate.actionType === 'buttons' || stepToUpdate.actionType === 'multi_choice')) {
                 if (typeof value === 'string') {
                    const optionsArray = value.split(',').map(s => s.trim()).filter(Boolean);
                    if (stepToUpdate.actionType === 'multi_choice') {
                         stepToUpdate.options = optionsArray.map(opt => ({ label: opt, id: opt.toLowerCase().replace(/\s+/g, '_') }));
                    } else {
                         stepToUpdate.options = optionsArray;
                    }
                }
            } else {
                stepToUpdate[field] = value;
            }
            
            newSteps[index] = stepToUpdate;
            return newSteps;
        });
    };
    
    const handleAddStep = () => {
        if (!newStepId.trim()) {
             toast({ variant: "destructive", title: "ID-ul pasului este obligatoriu." });
            return;
        }
        if (steps.some(step => step.id === newStepId.trim())) {
            toast({ variant: "destructive", title: "ID-ul pasului trebuie să fie unic." });
            return;
        }

        const newStep: StepData = {
            id: newStepId.trim(),
            message: "Mesaj nou...",
            actionType: "buttons",
            options: ["Continuă"],
            nextStep: ""
        };
        setSteps(prev => [...prev, newStep]);
        setIsAddStepModalOpen(false);
        setNewStepId("");
        toast({ title: "Succes!", description: `Pasul "${newStep.id}" a fost adăugat local. Nu uita să salvezi.` });
    };

    const handleDeleteStep = (index: number) => {
        const stepIdToDelete = steps[index].id;
         if (!window.confirm(`Ești sigur că vrei să ștergi pasul "${stepIdToDelete}"?`)) return;
        setSteps(prev => prev.filter((_, i) => i !== index));
        toast({ title: "Succes!", description: `Pasul a fost șters local. Nu uita să salvezi.` });
    };

    const moveStep = (index: number, direction: 'up' | 'down') => {
        if (
            (direction === 'up' && index === 0) ||
            (direction === 'down' && index === steps.length - 1)
        ) {
            return;
        }

        setSteps(prev => {
            const newSteps = [...prev];
            const targetIndex = direction === 'up' ? index - 1 : index + 1;
            const temp = newSteps[index];
            newSteps[index] = newSteps[targetIndex];
            newSteps[targetIndex] = temp;
            return newSteps;
        });
    };

    const handleSaveAll = async () => {
        if (!formId) return;

        // Auto-link steps
        const linkedSteps = steps.map((step, index) => {
            const nextStepId = (index < steps.length - 1) ? steps[index + 1].id : 'end_dialog_friendly';
            return { ...step, nextStep: nextStepId };
        });

        // Convert array back to map for Firestore
        const flowObject = linkedSteps.reduce((acc: {[key: string]: any}, step) => {
            const { id, ...data } = step;
            acc[id] = data;
            return acc;
        }, {});

        try {
            const formRef = doc(db, 'formTemplates', formId);
            await updateDoc(formRef, {
                title: formTitle,
                flow: flowObject
            });

            toast({
                title: "Salvat!",
                description: `Formularul a fost actualizat cu succes.`,
            });
            // Re-fetch to confirm and re-sync
            await fetchForm();
        } catch (err) {
            console.error("Error saving form:", err);
            toast({
                variant: "destructive",
                title: "Eroare la salvare",
                description: "Nu s-au putut salva modificările.",
            });
        }
    };

    if (loading) return <p className="text-center mt-8">Se încarcă editorul...</p>;
    if (error) return <p className="text-destructive text-center mt-8">{error}</p>;
    if (!form) return <p className="text-center mt-8">Selectează un formular pentru a-l edita.</p>;

    return (
        <div className="max-w-4xl mx-auto pb-24">
            <Card>
                <CardHeader>
                    <CardTitle>Editare Formular</CardTitle>
                    <CardDescription>Modifică titlul, adaugă, șterge și reordonează pașii. Legăturile se fac automat.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                    <div className="space-y-2">
                        <Label htmlFor="form-title" className="text-lg font-semibold">Titlul Formularului</Label>
                        <Input 
                            id="form-title"
                            value={formTitle}
                            onChange={(e) => setFormTitle(e.target.value)}
                            className="text-xl h-12"
                        />
                    </div>
                    
                    <div className="space-y-4">
                        {steps.map((step, index) => {
                             const optionsAsString = Array.isArray(step.options) 
                                ? step.options.map(opt => typeof opt === 'object' ? opt.label : opt).join(', ')
                                : '';
                            
                            return (
                            <div key={step.id} className="border-l-4 border-primary pl-4 py-4 rounded-r-lg bg-muted/30">
                                <div className="flex justify-between items-center mb-4">
                                    <div className="flex items-center gap-4">
                                        <span className="font-mono text-sm text-primary">{step.id}</span>
                                        <div className="flex gap-1">
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => moveStep(index, 'up')} disabled={index === 0}>
                                                <ArrowUp className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => moveStep(index, 'down')} disabled={index === steps.length - 1}>
                                                <ArrowDown className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                    <Button variant="destructive" size="sm" onClick={() => handleDeleteStep(index)}>Șterge</Button>
                                </div>
                                <div className="space-y-4 p-4 bg-background rounded-md">
                                    <div className="space-y-2">
                                        <Label htmlFor={`message-${step.id}`}>Text Mesaj</Label>
                                        <Textarea
                                            id={`message-${step.id}`}
                                            value={step.message}
                                            onChange={(e) => handleStepChange(index, 'message', e.target.value)}
                                            rows={3}
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor={`actionType-${step.id}`}>Tip Acțiune</Label>
                                            <Select
                                                value={step.actionType}
                                                onValueChange={(value) => handleStepChange(index, 'actionType', value)}
                                            >
                                                <SelectTrigger id={`actionType-${step.id}`}>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="buttons">Butoane (Opțiuni Simple)</SelectItem>
                                                    <SelectItem value="multi_choice">Butoane (Selecție Multiplă)</SelectItem>
                                                    <SelectItem value="input">Câmp de text (Input)</SelectItem>
                                                    <SelectItem value="date">Selector de Dată</SelectItem>
                                                    <SelectItem value="end">Final Conversație</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                         {(step.actionType === 'buttons' || step.actionType === 'multi_choice') && (
                                            <div className="space-y-2">
                                                <Label htmlFor={`options-${step.id}`}>Opțiuni (separate prin virgulă)</Label>
                                                <Input
                                                    id={`options-${step.id}`}
                                                    value={optionsAsString}
                                                    onChange={(e) => handleStepChange(index, 'options', e.target.value)}
                                                    placeholder="Ex: Da, Nu, Poate"
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )})}
                    </div>

                    <div className="mt-8 border-t pt-6 flex justify-center">
                        <Button variant="outline" onClick={() => setIsAddStepModalOpen(true)}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Adaugă un Pas Nou
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
                 <Button size="lg" onClick={handleSaveAll} className="shadow-2xl">
                    <Save className="mr-2 h-5 w-5" />
                    Salvează și Actualizează Fluxul
                </Button>
            </div>

            <Dialog open={isAddStepModalOpen} onOpenChange={setIsAddStepModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Adaugă un Pas Nou</DialogTitle>
                        <DialogDescription>
                            Introdu un ID unic pentru noul pas. Folosește litere mici și underscore. Ex: 'intrebare_contact'.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="step-id">ID Pas Nou</Label>
                            <Input
                                id="step-id"
                                placeholder="ex: intrebare_buget"
                                value={newStepId}
                                onChange={(e) => setNewStepId(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
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

    