
"use client";

import { useState, useEffect, Suspense, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { db, auth } from '@/lib/firebaseConfig';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Save, ArrowUp, ArrowDown, Trash2, GitBranch } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type StepData = {
    id: string;
    message: string | string[];
    actionType: 'buttons' | 'input' | 'date' | 'multi_choice' | 'end' | 'form' | 'interactive_scroll_list';
    options?: any;
    nextStep?: string; 
    [key: string]: any;
};

// Componenta pentru cardul unui pas
const StepCard = ({ step, index, totalSteps, onStepChange, onMove, onDelete, allStepIds }: {
    step: StepData,
    index: number,
    totalSteps: number,
    onStepChange: (index: number, field: keyof StepData, value: any) => void,
    onMove: (index: number, direction: 'up' | 'down') => void,
    onDelete: (index: number) => void,
    allStepIds: string[]
}) => {
    
    const handleAddButtonOption = () => {
        const newOptions = [...(step.options || []), { label: 'Opțiune nouă', nextStep: '' }];
        onStepChange(index, 'options', newOptions);
    };

    const handleButtonOptionChange = (optionIndex: number, field: 'label' | 'nextStep', value: string) => {
        const newOptions = [...step.options];
        newOptions[optionIndex] = { ...newOptions[optionIndex], [field]: value };
        onStepChange(index, 'options', newOptions);
    };

    const handleDeleteButtonOption = (optionIndex: number) => {
        const newOptions = step.options.filter((_: any, i: number) => i !== optionIndex);
        onStepChange(index, 'options', newOptions);
    };

    const renderBranchingSummary = () => {
        if (step.actionType !== 'buttons' || !Array.isArray(step.options) || step.options.length === 0) {
            return null;
        }

        return (
            <div className="mt-2 text-xs text-muted-foreground space-y-1">
                <div className="flex items-center gap-2 font-semibold">
                    <GitBranch className="h-3 w-3" />
                    <span>Ramificație:</span>
                </div>
                <ul className="pl-5 list-disc space-y-0.5">
                    {step.options.map((opt, i) => (
                        <li key={i}>
                           <span className="font-medium text-foreground">"{opt.label}"</span> → <span className="font-mono bg-muted px-1 py-0.5 rounded text-xs">{opt.nextStep || '...'}</span>
                        </li>
                    ))}
                </ul>
            </div>
        );
    };

    return (
        <div key={step.id} className="border-l-4 border-primary pl-4 py-4 rounded-r-lg bg-muted/30">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-4">
                    <span className="font-bold text-lg text-foreground">Pasul {index + 1}</span>
                    <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onMove(index, 'up')} disabled={index === 0}>
                            <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onMove(index, 'down')} disabled={index === totalSteps - 1}>
                            <ArrowDown className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
                <Button variant="destructive" size="sm" onClick={() => onDelete(index)}>
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
                        <Label htmlFor={`actionType-${step.id}`}>Tip Acțiune Utilizator</Label>
                        <Select
                            value={step.actionType}
                            onValueChange={(value) => onStepChange(index, 'actionType', value as StepData['actionType'])}
                        >
                            <SelectTrigger id={`actionType-${step.id}`}>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="buttons">Butoane (Ramificație)</SelectItem>
                                <SelectItem value="input">Câmp de text</SelectItem>
                                <SelectItem value="interactive_scroll_list">Listă interactivă (Scroll)</SelectItem>
                                <SelectItem value="multi_choice">Selecție Multiplă</SelectItem>
                                <SelectItem value="date">Selector de Dată</SelectItem>
                                <SelectItem value="form">Formular Contact (Final)</SelectItem>
                                <SelectItem value="end">Final Conversație</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                 <div className="space-y-2">
                    <Label htmlFor={`message-${step.id}`}>Mesaj Agent (suportă linii goale pentru mesaje multiple)</Label>
                    <Textarea
                        id={`message-${step.id}`}
                        value={Array.isArray(step.message) ? step.message.join('\n\n') : step.message}
                        onChange={(e) => onStepChange(index, 'message', e.target.value)}
                        rows={5}
                        placeholder="Ce mesaj vede utilizatorul în acest pas?"
                    />
                </div>

                {step.actionType === 'buttons' && (
                    <div className="space-y-4 border-t border-dashed pt-4 mt-4">
                        <Label className="font-semibold">Configurare Butoane și Ramificații</Label>
                        {Array.isArray(step.options) && step.options.map((opt, optIndex) => (
                            <div key={optIndex} className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
                                <div className="flex-grow grid grid-cols-2 gap-2">
                                     <div className="space-y-1">
                                        <Label htmlFor={`btn-label-${step.id}-${optIndex}`} className="text-xs">Text Buton</Label>
                                        <Input
                                            id={`btn-label-${step.id}-${optIndex}`}
                                            value={opt.label || ''}
                                            onChange={(e) => handleButtonOptionChange(optIndex, 'label', e.target.value)}
                                            placeholder="Ex: Vreau pensie"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label htmlFor={`btn-next-${step.id}-${optIndex}`} className="text-xs">Duce la Pasul</Label>
                                         <Select
                                            value={opt.nextStep || ''}
                                            onValueChange={(value) => handleButtonOptionChange(optIndex, 'nextStep', value)}
                                        >
                                            <SelectTrigger id={`btn-next-${step.id}-${optIndex}`}>
                                                <SelectValue placeholder="Selectează destinația" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="end_dialog_friendly">Final Prietenos</SelectItem>
                                                <SelectItem value="final_contact">Formular Contact</SelectItem>
                                                {allStepIds.filter(id => id !== step.id).map(stepId => (
                                                    <SelectItem key={stepId} value={stepId}>{stepId}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDeleteButtonOption(optIndex)}
                                    className="self-end mb-1 flex-shrink-0"
                                >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                            </div>
                        ))}
                         <Button variant="outline" size="sm" onClick={handleAddButtonOption}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Adaugă Opțiune Buton
                        </Button>
                    </div>
                )}
            </div>
             {renderBranchingSummary()}
        </div>
    );
};


const sortStepsByFlow = (flowObject: { [key: string]: any }, startStepId?: string): StepData[] => {
    if (!flowObject || Object.keys(flowObject).length === 0) return [];
    
    const allStepsArray: StepData[] = Object.entries(flowObject).map(([id, data]) => ({ id, ...(data as any) }));
    const stepsMap = new Map(allStepsArray.map(step => [step.id, step]));
    
    let startNode = startStepId ? stepsMap.get(startStepId) : null;
    
    if (!startNode) {
        const allNextSteps = new Set<string>();
        allStepsArray.forEach(step => {
            if (step.nextStep) allNextSteps.add(step.nextStep);
            if (step.actionType === 'buttons' && Array.isArray(step.options)) {
                step.options.forEach((opt: any) => {
                    if (opt.nextStep) allNextSteps.add(opt.nextStep);
                });
            }
        });
        
        startNode = allStepsArray.find(step => !allNextSteps.has(step.id)) || allStepsArray[0];
    }
    
    if (!startNode) return allStepsArray;

    const sorted: StepData[] = [];
    const visited = new Set<string>();
    const queue: string[] = [startNode.id];

    while(queue.length > 0) {
        const currentId = queue.shift();
        if (!currentId || visited.has(currentId) || !stepsMap.has(currentId)) continue;
        
        const currentStep = stepsMap.get(currentId)!;

        visited.add(currentId);
        sorted.push(currentStep);

        const nextSteps = new Set<string>();
        if (currentStep.nextStep && !visited.has(currentStep.nextStep)) {
             nextSteps.add(currentStep.nextStep);
        }
        if (currentStep.actionType === 'buttons' && Array.isArray(currentStep.options)) {
             currentStep.options.forEach((opt: any) => {
                if (opt.nextStep && !visited.has(opt.nextStep)) {
                    nextSteps.add(opt.nextStep);
                }
             });
        }
        
        queue.unshift(...Array.from(nextSteps));
    }
    
    const orphanedSteps = allStepsArray.filter(step => !visited.has(step.id));
    return [...sorted, ...orphanedSteps];
};


function FormEditor() {
    const searchParams = useSearchParams();
    const formId = searchParams.get('id');
    const [user, setUser] = useState<User | null>(null);
    const [formTemplate, setFormTemplate] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [steps, setSteps] = useState<StepData[]>([]);
    const [formTitle, setFormTitle] = useState("");
    const { toast } = useToast();
    const [isAddStepModalOpen, setIsAddStepModalOpen] = useState(false);
    const [newStepId, setNewStepId] = useState("");

    const fetchForm = useCallback(async () => {
        if (!user || !formId) { if (user && !formId) { setError("Niciun formular selectat."); setLoading(false); } return; }
        setLoading(true); setError(null);
        try {
            const formRef = doc(db, 'formTemplates', formId);
            const formDoc = await getDoc(formRef);
            if (!formDoc.exists()) throw new Error("Formularul nu a fost găsit.");
            const formData = formDoc.data();
            if (formData.ownerId !== user.uid) throw new Error("Nu ai permisiunea de a edita acest formular.");
            setFormTemplate(formData); setFormTitle(formData.title);
            if (formData.flow) { setSteps(sortStepsByFlow(formData.flow, formData.startStepId)); }
        } catch (err: any) { setError(err.message); } finally { setLoading(false); }
    }, [formId, user]);


    useEffect(() => { const unsubscribe = onAuthStateChanged(auth, (currentUser) => { setUser(currentUser); }); return () => unsubscribe(); }, []);
    useEffect(() => { fetchForm(); }, [formId, user, fetchForm]);

    const handleStepChange = (index: number, field: keyof StepData, value: any) => {
        setSteps(prev => {
            const newSteps = [...prev];
            const stepToUpdate = { ...newSteps[index] };
    
            if (field === 'actionType') {
                stepToUpdate.actionType = value;
            } else {
                stepToUpdate[field as string] = value;
            }
            
            newSteps[index] = stepToUpdate;
            return newSteps;
        });
    };
    
    const handleAddStep = () => {
        if (!newStepId.trim()) { toast({ variant: "destructive", title: "ID-ul pasului este obligatoriu." }); return; }
        if (steps.some(step => step.id === newStepId.trim())) { toast({ variant: "destructive", title: "ID-ul pasului trebuie să fie unic." }); return; }
        const newStep: StepData = { id: newStepId.trim(), message: "Mesaj nou...", actionType: "buttons", options: [{label: "Continuă", nextStep: ""}] };
        setSteps(prev => [...prev, newStep]); setIsAddStepModalOpen(false); setNewStepId("");
        toast({ title: "Succes!", description: `Pasul "${newStep.id}" a fost adăugat. Nu uita să salvezi.` });
    };

    const handleDeleteStep = (index: number) => {
        const stepIdToDelete = steps[index].id;
         if (!window.confirm(`Ești sigur că vrei să ștergi pasul "${stepIdToDelete}"? Această acțiune este permanentă.`)) return;
        setSteps(prev => prev.filter((_, i) => i !== index));
        toast({ title: "Succes!", description: `Pasul a fost șters local. Salvează pentru a confirma.` });
    };

    const moveStep = (index: number, direction: 'up' | 'down') => {
        if ( (direction === 'up' && index === 0) || (direction === 'down' && index === steps.length - 1) ) return;
        setSteps(prev => {
            const newSteps = [...prev];
            const targetIndex = direction === 'up' ? index - 1 : index + 1;
            [newSteps[index], newSteps[targetIndex]] = [newSteps[targetIndex], newSteps[index]];
            return newSteps;
        });
    };

      const handleSaveAll = async () => {
    if (!formTemplate || !formId) return;

    setSaving(true);
    try {
      // 1. Procesăm pașii pentru a stabili legăturile și formatul mesajelor
      const processedStepsArray = steps.map((step, index) => {
        const newStep = { ...step };

        // A. AUTO-LINKING: Doar pentru pașii non-ramificați
        if (newStep.actionType !== 'buttons' && index < steps.length - 1) {
          newStep.nextStep = steps[index + 1].id;
        } else if (newStep.actionType !== 'buttons' && index === steps.length - 1 && newStep.actionType !== 'end') {
          newStep.nextStep = 'final_contact'; 
        }

        // B. SMART SPLIT: Gestionăm mesajele multiple
        if (typeof newStep.message === 'string') {
           if (newStep.message.includes('\n\n')) {
               newStep.message = newStep.message.split('\n\n').map(s => s.trim()).filter(Boolean);
           }
        }
        
        if (Array.isArray(newStep.message) && newStep.message.length === 1) {
            newStep.message = newStep.message[0];
        }

        return newStep;
      });

      // 2. Convertim Array-ul înapoi în Obiect (Map) pentru Firestore
      const flowObject = processedStepsArray.reduce((acc, step) => {
        const {id, ...data} = step;
        acc[id] = data;
        return acc;
      }, {} as any);

      // 3. Pregătim datele de update
      const updateData = {
        title: formTitle,
        flow: flowObject,
        startStepId: steps.length > 0 ? steps[0].id : null,
        lastModified: serverTimestamp()
      };

      // 4. Trimitem la Firestore
      const formRef = doc(db, "formTemplates", formId as string);
      await updateDoc(formRef, updateData);

      toast({title: "Salvat!", description: "Formularul a fost actualizat. Legăturile automate au fost aplicate."});
      fetchForm();

    } catch (error: any) {
      console.error("Error saving form:", error);
      toast({variant: "destructive", title: "Eroare la salvare", description: error.message});
    } finally {
      setSaving(false);
    }
  };

    if (loading) return <p className="text-center mt-8">Se încarcă editorul...</p>;
    if (error) return <p className="text-destructive text-center mt-8">{error}</p>;
    if (!formTemplate) return <p className="text-center mt-8">Selectează un formular pentru a-l edita.</p>;

    const allStepIds = steps.map(s => s.id);

    return (
        <div className="max-w-4xl mx-auto pb-24">
            <Card>
                <CardHeader>
                    <CardTitle>Editor de Flux Conversațional</CardTitle>
                    <CardDescription>Modifică titlul, adaugă pași și configurează butoane cu ramificații logice.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                    <div className="space-y-2">
                        <Label htmlFor="form-title" className="text-lg font-semibold">Titlul Formularului</Label>
                        <Input id="form-title" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} className="text-xl h-12" />
                    </div>
                    
                    <div className="space-y-4">
                        {steps.map((step, index) => (
                           <StepCard
                                key={step.id} step={step} index={index} totalSteps={steps.length}
                                onStepChange={handleStepChange} onMove={moveStep} onDelete={handleDeleteStep}
                                allStepIds={allStepIds}
                           />
                        ))}
                    </div>

                    <div className="mt-8 border-t pt-6 flex justify-center">
                        <Button variant="outline" onClick={() => setIsAddStepModalOpen(true)}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Adaugă un Pas Nou
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-sm border-t z-50">
                 <div className="max-w-4xl mx-auto flex justify-center">
                    <Button size="lg" onClick={handleSaveAll} disabled={saving} className="shadow-2xl w-full sm:w-auto">
                        <Save className="mr-2 h-5 w-5" /> 
                        {saving ? "Se salvează..." : "Salvează Fluxul"}
                    </Button>
                 </div>
            </div>

            <Dialog open={isAddStepModalOpen} onOpenChange={setIsAddStepModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Adaugă un Pas Nou</DialogTitle>
                        <DialogDescription>Introdu un ID unic pentru noul pas. Ex: 'intrebare_contact'.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="step-id">ID Pas Nou</Label>
                            <Input id="step-id" placeholder="ex: intrebare_buget" value={newStepId} onChange={(e) => setNewStepId(e.target.value.toLowerCase().replace(/\s+/g, '_'))} className="font-mono"/>
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
    return ( <Suspense fallback={<div className="text-center mt-8">Se încarcă...</div>}> <FormEditor /> </Suspense> );
}
    

    

    