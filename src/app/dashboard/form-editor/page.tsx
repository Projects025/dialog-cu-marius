
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
import { PlusCircle, Save, ArrowUp, ArrowDown, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type StepData = {
    id: string;
    message: string;
    actionType: 'buttons' | 'input' | 'date' | 'multi_choice' | 'end' | 'form';
    options?: any;
    nextStep?: string;
    [key: string]: any;
};

// Algoritm de sortare a pașilor ca o listă înlănțuită
const sortStepsByFlow = (flowObject: { [key: string]: any }, startStepId?: string): StepData[] => {
    if (!flowObject || Object.keys(flowObject).length === 0) {
        return [];
    }

    const stepsArray: StepData[] = Object.entries(flowObject).map(([id, data]) => ({
        id,
        ...(data as any)
    }));

    const stepsMap = new Map(stepsArray.map(step => [step.id, step]));
    
    // Încearcă să folosești startStepId dacă este disponibil
    let startStep: StepData | undefined = startStepId ? stepsMap.get(startStepId) : undefined;
    
    // Dacă nu există startStepId sau nu găsește pasul, revine la logica veche de a găsi primul nod
    if (!startStep) {
        const nextStepTargets = new Set(stepsArray.map(step => step.nextStep).filter(Boolean));
        startStep = stepsArray.find(step => !nextStepTargets.has(step.id));
        
        // Căutare de fallback pentru starturi comune
        if (!startStep) {
            const commonStarts = ['welcome_1', 'intro_1'];
            const foundStart = commonStarts.find(id => stepsMap.has(id));
            if (foundStart) {
                startStep = stepsMap.get(foundStart);
            } else { // Dacă tot nu găsește, sortează alfabetic și ia primul
                 stepsArray.sort((a,b) => a.id.localeCompare(b.id));
                 startStep = stepsArray[0];
            }
        }
    }
    
    if (!startStep) return stepsArray; // Returnează nesortat dacă tot nu găsește nimic

    const sorted: StepData[] = [];
    const visited = new Set<string>();
    let currentStep: StepData | undefined = startStep;
    
    // Parcurge lista înlănțuită, cu protecție pentru bucle infinite
    while (currentStep && !visited.has(currentStep.id)) {
        sorted.push(currentStep);
        visited.add(currentStep.id);
        currentStep = stepsMap.get(currentStep.nextStep!);
    }

    // Adaugă pașii "orfani" (care nu fac parte din lanțul principal) la final pentru a nu se pierde
    const orphanedSteps = stepsArray.filter(step => !visited.has(step.id));
    
    return [...sorted, ...orphanedSteps];
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
                const sortedFlow = sortStepsByFlow(formData.flow, formData.startStepId);
                setSteps(sortedFlow);
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
    
            if (field === 'actionType') {
                stepToUpdate.actionType = value;
                if (value === 'form') {
                    stepToUpdate.options = {
                        buttonText: "Trimite",
                        gdpr: "Sunt de acord cu prelucrarea datelor.",
                        fields: [
                            { name: "name", placeholder: "Nume", type: "text", required: true },
                            { name: "email", placeholder: "Email", type: "email", required: true },
                            { name: "phone", placeholder: "Telefon", type: "tel", required: true }
                        ]
                    };
                } else if (value === 'buttons' || value === 'multi_choice') {
                    stepToUpdate.options = [];
                } else {
                    delete stepToUpdate.options;
                }
            } else if (field === 'options') {
                if (stepToUpdate.actionType === 'buttons' || stepToUpdate.actionType === 'multi_choice') {
                    if (typeof value === 'string') {
                        const optionsArray = value.split(',').map(s => s.trim()).filter(Boolean);
                         if (stepToUpdate.actionType === 'multi_choice') {
                            stepToUpdate.options = optionsArray.map(opt => ({ label: opt, id: opt.toLowerCase().replace(/\s+/g, '_') }));
                        } else {
                            stepToUpdate.options = optionsArray;
                        }
                    }
                } else if (stepToUpdate.actionType === 'form') {
                     // Asigură că 'options' este un obiect înainte de a-l actualiza
                    const currentOptions = typeof stepToUpdate.options === 'object' && stepToUpdate.options !== null && !Array.isArray(stepToUpdate.options)
                        ? stepToUpdate.options
                        : {};
                    stepToUpdate.options = { ...currentOptions, ...value };
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
        toast({ title: "Succes!", description: `Pasul "${newStep.id}" a fost adăugat. Nu uita să salvezi.` });
    };

    const handleDeleteStep = (index: number) => {
        const stepIdToDelete = steps[index].id;
         if (!window.confirm(`Ești sigur că vrei să ștergi pasul "${stepIdToDelete}"? Această acțiune este permanentă.`)) return;
        setSteps(prev => prev.filter((_, i) => i !== index));
        toast({ title: "Succes!", description: `Pasul a fost șters local. Salvează pentru a confirma.` });
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
            [newSteps[index], newSteps[targetIndex]] = [newSteps[targetIndex], newSteps[index]];
            return newSteps;
        });
    };

    const handleSaveAll = async () => {
        if (!formId || !user) {
            toast({ variant: "destructive", title: "Eroare", description: "Formular sau utilizator neidentificat." });
            return;
        }
        if (steps.length === 0) {
             toast({ variant: "destructive", title: "Atenție", description: "Nu există niciun pas de salvat." });
             return;
        }

        const startStepId = steps[0].id;

        const linkedSteps = steps.map((step, index) => {
            const nextStepId = (index < steps.length - 1) ? steps[index + 1].id : 'end_dialog_friendly';
            if (step.actionType === 'end') {
                return step;
            }
            return { ...step, nextStep: nextStepId };
        });

        const flowObject = linkedSteps.reduce((acc: {[key: string]: any}, step) => {
            const { id, ...data } = step;
            acc[id] = data;
            return acc;
        }, {});

        try {
            const formRef = doc(db, 'formTemplates', formId);
            await updateDoc(formRef, {
                title: formTitle,
                flow: flowObject,
                startStepId: startStepId,
            });

            toast({
                title: "Salvat!",
                description: `Formularul și ordinea au fost actualizate cu succes.`,
            });
            await fetchForm();
        } catch (err) {
            console.error("Error saving form:", err);
            toast({
                variant: "destructive",
                title: "Eroare la salvare",
                description: "Nu s-au putut salva modificările. Verifică consola.",
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
                    <CardTitle>Editor de Flux Conversațional</CardTitle>
                    <CardDescription>Modifică titlul, adaugă, șterge și reordonează pașii. Legăturile dintre pași se creează automat la salvare.</CardDescription>
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
                                        <span className="font-bold text-lg text-foreground">Pasul {index + 1}</span>
                                        <div className="flex gap-1">
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => moveStep(index, 'up')} disabled={index === 0}>
                                                <ArrowUp className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => moveStep(index, 'down')} disabled={index === steps.length - 1}>
                                                <ArrowDown className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                    <Button variant="destructive" size="sm" onClick={() => handleDeleteStep(index)}>
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Șterge
                                    </Button>
                                </div>
                                <div className="space-y-4 p-4 bg-background rounded-md">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                         <div className="space-y-2">
                                            <Label htmlFor={`id-${step.id}`}>ID Pas (nemodificabil)</Label>
                                            <Input id={`id-${step.id}`} value={step.id} disabled className="font-mono text-muted-foreground"/>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor={`actionType-${step.id}`}>Tip Răspuns Utilizator</Label>
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
                                                    <SelectItem value="form">Formular Contact (Final)</SelectItem>
                                                    <SelectItem value="end">Final Conversație</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor={`message-${step.id}`}>Mesaj Agent</Label>
                                        <Textarea
                                            id={`message-${step.id}`}
                                            value={step.message}
                                            onChange={(e) => handleStepChange(index, 'message', e.target.value)}
                                            rows={3}
                                            placeholder="Ce mesaj vede utilizatorul în acest pas?"
                                        />
                                    </div>
                                     {(step.actionType === 'buttons' || step.actionType === 'multi_choice') && (
                                        <div className="space-y-2">
                                            <Label htmlFor={`options-${step.id}`}>Opțiuni Butoane (separate prin virgulă)</Label>
                                            <Input
                                                id={`options-${step.id}`}
                                                value={optionsAsString}
                                                onChange={(e) => handleStepChange(index, 'options', e.target.value)}
                                                placeholder="Ex: Da, Nu, Poate"
                                            />
                                        </div>
                                    )}
                                     {step.actionType === 'form' && step.options && (
                                        <div className="space-y-4 border-t border-dashed pt-4 mt-4">
                                            <p className="text-sm text-muted-foreground">Acest pas va afișa formularul standard de contact (Nume, Email, Telefon).</p>
                                            <div className="space-y-2">
                                                <Label htmlFor={`form-button-${step.id}`}>Text Buton Trimitere</Label>
                                                <Input
                                                    id={`form-button-${step.id}`}
                                                    value={step.options.buttonText || ""}
                                                    onChange={(e) => handleStepChange(index, 'options', { buttonText: e.target.value })}
                                                    placeholder="Ex: Trimite datele"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor={`form-gdpr-${step.id}`}>Text Acord GDPR</Label>
                                                <Textarea
                                                    id={`form-gdpr-${step.id}`}
                                                    value={step.options.gdpr || ""}
                                                    onChange={(e) => handleStepChange(index, 'options', { gdpr: e.target.value })}
                                                    rows={2}
                                                />
                                            </div>
                                        </div>
                                    )}
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

            <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-sm border-t z-50">
                 <div className="max-w-4xl mx-auto flex justify-center">
                    <Button size="lg" onClick={handleSaveAll} className="shadow-2xl w-full sm:w-auto">
                        <Save className="mr-2 h-5 w-5" />
                        Salvează și Actualizează Fluxul
                    </Button>
                 </div>
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
