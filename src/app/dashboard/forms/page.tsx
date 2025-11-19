
"use client";

import { useState, useEffect, useCallback } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { collection, doc, getDoc, getDocs, updateDoc, setDoc, serverTimestamp, query, addDoc, deleteDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebaseConfig";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { useRouter, type NextRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { FilePlus2, Edit, Copy, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";


// Componenta FormCard extrasă pentru a asigura stabilitatea event handler-elor
const FormCard = ({
    form,
    isTemplate,
    activeFormId,
    cloning,
    handleClone,
    handleDelete,
    router,
    handleSetActiveForm
}: {
    form: any,
    isTemplate: boolean,
    activeFormId: string | null,
    cloning: string | null,
    handleClone: (id: string) => void,
    handleDelete: (id: string) => void,
    router: NextRouter,
    handleSetActiveForm: (id: string) => void,
}) => (
     <Card key={form.id} className="flex flex-col">
        <CardHeader>
            <div className="flex justify-between items-start">
                <CardTitle className="text-lg">{form.title}</CardTitle>
                 <Badge variant={isTemplate ? "secondary" : "outline"}>
                    {isTemplate ? "Șablon" : "Personalizat"}
                </Badge>
            </div>
             <CardDescription>
                {form.createdAt?.toDate ? `Creat la: ${form.createdAt.toDate().toLocaleDateString('ro-RO')}` : 'Dată necunoscută'}
            </CardDescription>
        </CardHeader>
        <CardContent className="flex-grow">
             {activeFormId === form.id && !isTemplate && (
                <div className="flex items-center gap-2 font-semibold text-sm mb-4">
                    <Badge variant="default" className="bg-green-600 text-white hover:bg-green-700">Activ pe Link</Badge>
                </div>
            )}
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
            {isTemplate ? (
                <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleClone(form.id)}
                    disabled={cloning === form.id}
                >
                    <Copy className="mr-2 h-4 w-4" />
                    {cloning === form.id ? "Se clonează..." : "Clonează"}
                </Button>
            ) : (
                <>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(form.id)}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Șterge
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => router.push(`/dashboard/form-editor?id=${form.id}`)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Editează
                    </Button>
                    {activeFormId !== form.id && (
                         <Button size="sm" onClick={() => handleSetActiveForm(form.id)}>Setează Activ</Button>
                    )}
                </>
            )}
        </CardFooter>
    </Card>
);


export default function FormsPage() {
    const [user, setUser] = useState<User | null>(null);
    const [userForms, setUserForms] = useState<any[]>([]);
    const [templateForms, setTemplateForms] = useState<any[]>([]);
    const [activeFormId, setActiveFormId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [cloning, setCloning] = useState<string | null>(null);
    const router = useRouter();
    const { toast } = useToast();

    // State for the new form creation modal
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newFormTitle, setNewFormTitle] = useState("");
    const [sourceTemplateId, setSourceTemplateId] = useState<string>("");
    const [isCreating, setIsCreating] = useState(false);


    const fetchForms = useCallback(async (currentUser: User) => {
        setLoading(true);
        try {
            const agentRef = doc(db, "agents", currentUser.uid);
            const agentDoc = await getDoc(agentRef);
            if (agentDoc.exists()) {
                setActiveFormId(agentDoc.data().activeFormId);
            }
            
            const q = query(collection(db, "formTemplates"));
            const querySnapshot = await getDocs(q);
            const templatesList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            const personal = templatesList.filter(form => form.ownerId === currentUser.uid).sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
            const standard = templatesList.filter(form => !form.ownerId);
            
            setUserForms(personal);
            setTemplateForms(standard);

            if (standard.length > 0 && !sourceTemplateId) {
                setSourceTemplateId(standard[0].id);
            }

        } catch (error) {
            console.error("Error fetching form templates:", error);
            toast({ variant: "destructive", title: "Eroare", description: "Nu s-au putut încărca formularele." });
        } finally {
            setLoading(false);
        }
    }, [sourceTemplateId, toast]);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                fetchForms(currentUser);
            } else {
                 router.push("/login");
            }
        });
        return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [router]);
    
    const handleCreateForm = async () => {
        if (!user || !newFormTitle.trim() || !sourceTemplateId) {
            toast({
                variant: "destructive",
                title: "Eroare",
                description: "Te rog completează numele formularului și selectează un șablon.",
            });
            return;
        }

        setIsCreating(true);
        try {
            let flow = {};
            // If it's not a blank template, fetch the flow from the selected template
            if (sourceTemplateId !== 'blank') {
                const templateRef = doc(db, "formTemplates", sourceTemplateId);
                const templateDoc = await getDoc(templateRef);

                if (!templateDoc.exists()) {
                    throw new Error("Șablonul selectat nu a fost găsit.");
                }
                flow = templateDoc.data().flow;
            } else {
                // Define a minimal flow for a blank form
                flow = {
                    welcome_1: {
                        message: "Salut! Acesta este începutul conversației tale.",
                        actionType: 'buttons',
                        options: ['Continuă'],
                        nextStep: 'end_dialog_friendly',
                    },
                };
            }
            
            const newFormPayload = {
                title: newFormTitle,
                ownerId: user.uid,
                createdAt: serverTimestamp(),
                flow: flow,
            };

            const newFormDoc = await addDoc(collection(db, "formTemplates"), newFormPayload);

            const newFormForUI = {
                id: newFormDoc.id, 
                ...newFormPayload,
                createdAt: new Date() // Approximate timestamp for UI
            };

            setUserForms(prev => [newFormForUI, ...prev]);
            
            toast({
                title: "Succes!",
                description: "Formularul a fost creat. Acum poți să-l editezi.",
            });

            // Close modal and reset state
            setIsCreateModalOpen(false);
            setNewFormTitle("");
            if (templateForms.length > 0) setSourceTemplateId(templateForms[0].id);

            router.push(`/dashboard/form-editor?id=${newFormDoc.id}`);

        } catch (error) {
            console.error("Error creating form:", error);
            toast({
                variant: "destructive",
                title: "Eroare la Creare",
                description: "Nu s-a putut crea formularul.",
            });
        } finally {
            setIsCreating(false);
        }
    };

    const handleDelete = async (formId: string) => {
        if (!user) {
            alert("Utilizatorul nu este autentificat.");
            return;
        }
        if (!window.confirm("Sigur vrei să ștergi acest formular? Acțiunea este ireversibilă.")) return;
    
        try {
            const formRef = doc(db, "formTemplates", formId);
            await deleteDoc(formRef);
    
            setUserForms(prev => prev.filter(f => f.id !== formId));
    
            if (activeFormId === formId) {
                const agentRef = doc(db, "agents", user.uid);
                await updateDoc(agentRef, { activeFormId: null });
                setActiveFormId(null);
            }
    
            toast({ title: "Succes", description: "Formularul a fost șters." });
    
        } catch (error: any) {
            console.error("Eroare critică la ștergere:", error);
            toast({
                variant: "destructive",
                title: "Eroare la ștergere",
                description: `Nu s-a putut șterge formularul. Eroare: ${error.message}`,
            });
        }
    };


    const handleSetActiveForm = async (formId: string) => {
        if (!user) return;
        try {
            const agentRef = doc(db, "agents", user.uid);
            await updateDoc(agentRef, { activeFormId: formId });
            setActiveFormId(formId);
             toast({
                title: "Formular Activat",
                description: "Link-ul tău de client va folosi acum acest formular.",
            });
        } catch (error) {
            console.error("Error setting active form:", error);
            toast({
                variant: "destructive",
                title: "Eroare",
                description: "Nu s-a putut seta formularul activ.",
            });
        }
    };
    
    const handleClone = async (templateId: string) => {
        if (!user) return;
        
        setCloning(templateId);
        try {
            const templateRef = doc(db, "formTemplates", templateId);
            const templateDoc = await getDoc(templateRef);

            if (!templateDoc.exists()) throw new Error("Șablonul nu a fost găsit.");
            
            const templateData = templateDoc.data();
            const newTitle = `${templateData.title} (Copie)`;
            
            const newFormPayload = {
                ...templateData,
                title: newTitle,
                ownerId: user.uid,
                createdAt: serverTimestamp(),
            };
            // remove isTemplate if it exists
            delete newFormPayload.isTemplate;

            const newFormDoc = await addDoc(collection(db, "formTemplates"), newFormPayload);
            
            const newFormForUI = {
                id: newFormDoc.id,
                ...newFormPayload,
                createdAt: new Date() // Approximate timestamp for UI
            };

            setUserForms(prev => [newFormForUI, ...prev]);

             toast({
                title: "Formular Clonat",
                description: `O copie a formularului "${templateData.title}" a fost adăugată în lista ta.`,
            });
            
            router.push(`/dashboard/form-editor?id=${newFormDoc.id}`);

        } catch (error) {
            console.error("Error cloning form:", error);
            toast({
                variant: "destructive",
                title: "Eroare la Clonare",
                description: "Nu s-a putut clona formularul.",
            });
        } finally {
            setCloning(null);
        }
    };
    

    return (
        <>
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold md:text-3xl">Management Formulare</h1>
                 <Button onClick={() => setIsCreateModalOpen(true)} disabled={loading}>
                    <FilePlus2 className="mr-2 h-4 w-4" />
                    Creează Formular Nou
                </Button>
            </div>
             <p className="text-muted-foreground mt-2">
                Creează formulare noi de la zero, clonează un șablon standard pentru a-l personaliza sau administrează formularele tale deja create.
            </p>

            <div className="mt-8">
                <h2 className="text-xl font-semibold mb-4">Formularele Tale Personalizate</h2>
                {loading ? <p>Se încarcă...</p> : userForms.length > 0 ? (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {userForms.map(form => (
                            <FormCard 
                                key={form.id}
                                form={form}
                                isTemplate={false}
                                activeFormId={activeFormId}
                                cloning={cloning}
                                handleClone={handleClone}
                                handleDelete={handleDelete}
                                router={router}
                                handleSetActiveForm={handleSetActiveForm}
                            />
                        ))}
                    </div>
                ) : (
                    <p className="text-muted-foreground">Nu ai niciun formular personalizat. Apasă pe "Creează Formular Nou" pentru a începe.</p>
                )}
            </div>

            <div className="mt-12">
                <h2 className="text-xl font-semibold mb-4">Șabloane Standard</h2>
                 {loading ? <p>Se încarcă...</p> : templateForms.length > 0 ? (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {templateForms.map(form => (
                             <FormCard 
                                key={form.id}
                                form={form}
                                isTemplate={true}
                                activeFormId={activeFormId}
                                cloning={cloning}
                                handleClone={handleClone}
                                handleDelete={handleDelete}
                                router={router}
                                handleSetActiveForm={handleSetActiveForm}
                            />
                        ))}
                    </div>
                ) : (
                    <p className="text-muted-foreground">Nu există șabloane disponibile.</p>
                )}
            </div>

            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                <DialogContent className="sm:max-w-[480px]">
                    <DialogHeader>
                        <DialogTitle>Configurează Noul Formular</DialogTitle>
                        <DialogDescription>
                            Dă un nume noului tău formular și alege cum vrei să începi.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-6 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="form-title">Numele Formularului</Label>
                            <Input
                                id="form-title"
                                placeholder="Ex: Analiză Protecție Familie"
                                value={newFormTitle}
                                onChange={(e) => setNewFormTitle(e.target.value)}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="source-template">Punct de plecare</Label>
                            <Select onValueChange={setSourceTemplateId} value={sourceTemplateId}>
                                <SelectTrigger id="source-template">
                                    <SelectValue placeholder="Selectează o opțiune" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="blank">Formular Gol (de la zero)</SelectItem>
                                    {templateForms.map(template => (
                                        <SelectItem key={template.id} value={template.id}>
                                            Șablon: {template.title}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>Anulează</Button>
                        <Button onClick={handleCreateForm} disabled={isCreating || !newFormTitle.trim() || !sourceTemplateId}>
                            {isCreating ? "Se creează..." : "Creează și Editează"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </>
    );
}

    