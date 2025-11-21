
"use client";

import { useState, useEffect, useCallback } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { collection, doc, getDoc, getDocs, updateDoc, setDoc, serverTimestamp, query, addDoc, deleteField, deleteDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebaseConfig";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { useRouter, type NextRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { FilePlus2, Edit, Copy, Trash2, CheckCircle, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";


// Componenta FormCard extrasă pentru a asigura stabilitatea event handler-elor
const FormCard = ({
    form,
    isTemplate,
    activeFormId,
    cloning,
    handleClone,
    handleDeleteClick,
    router,
    handleSetActiveForm
}: {
    form: any,
    isTemplate: boolean,
    activeFormId: string | null,
    cloning: string | null,
    handleClone: (id: string) => void,
    handleDeleteClick: (id: string) => void,
    router: NextRouter,
    handleSetActiveForm: (id: string) => void,
}) => (
     <Card key={form.id} className={cn(
        "flex flex-col h-full",
        activeFormId === form.id && !isTemplate && "border-primary"
     )}>
        <CardHeader className="p-4">
            <div className="flex justify-between items-start">
                <CardTitle className="text-base font-bold pr-2">{form.title}</CardTitle>
                 <Badge variant={isTemplate ? "secondary" : "outline"} className="text-xs whitespace-nowrap">
                    {isTemplate ? "Șablon" : "Personalizat"}
                </Badge>
            </div>
             <CardDescription className="text-xs">
                {form.createdAt?.toDate ? `Creat la: ${form.createdAt.toDate().toLocaleDateString('ro-RO')}` : 'Dată necunoscută'}
            </CardDescription>
        </CardHeader>
        <CardContent className="flex-grow p-4 pt-0">
             {activeFormId === form.id && !isTemplate && (
                <div className="flex items-center gap-2 font-semibold text-sm">
                    <Badge variant="default" className="bg-green-600 text-white hover:bg-green-700 text-xs">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Activ
                    </Badge>
                </div>
            )}
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row justify-end gap-2 mt-auto p-3 border-t bg-muted/30">
            {isTemplate ? (
                <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleClone(form.id)}
                    disabled={cloning === form.id}
                    className="w-full sm:w-auto h-8 text-xs"
                >
                    <Copy className="mr-2 h-3 w-3" />
                    {cloning === form.id ? "Se clonează..." : "Clonează"}
                </Button>
            ) : (
                <>
                    <Button size="sm" variant="destructive" onClick={() => handleDeleteClick(form.id)} className="w-full sm:w-auto h-8 text-xs">
                        <Trash2 className="mr-2 h-3 w-3" />
                        Șterge
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => router.push(`/dashboard/form-editor?id=${form.id}`)} className="w-full sm:w-auto h-8 text-xs">
                        <Edit className="mr-2 h-3 w-3" />
                        Editează
                    </Button>
                    {activeFormId !== form.id && (
                         <Button size="sm" onClick={() => handleSetActiveForm(form.id)} className="w-full sm:w-auto h-8 text-xs">Setează Activ</Button>
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

    // State for the delete confirmation modal
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [formToDelete, setFormToDelete] = useState<string | null>(null);


    const fetchForms = useCallback(async (currentUser: User) => {
        if (!currentUser) return;
        setLoading(true);
        try {
            const agentRef = doc(db, "agents", currentUser.uid);
            const agentDoc = await getDoc(agentRef);
            if (agentDoc.exists()) {
                setActiveFormId(agentDoc.data().activeFormId);
            }
            
            const q = query(collection(db, "formTemplates"));
            const querySnapshot = await getDocs(q);
            const allForms = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            const personal = allForms.filter(form => form.ownerId === currentUser.uid).sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
            const standard = allForms.filter(form => !form.ownerId || form.isTemplate).sort((a,b) => a.title.localeCompare(b.title));
            
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
    }, [toast]); // removed sourceTemplateId from dependencies

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                await fetchForms(currentUser);
            } else {
                 router.push("/login");
            }
        });
        return () => unsubscribe();
    }, [router, fetchForms]);
    
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
            let startStepId = 'welcome_1';
            if (sourceTemplateId !== 'blank') {
                const templateRef = doc(db, "formTemplates", sourceTemplateId);
                const templateDoc = await getDoc(templateRef);

                if (!templateDoc.exists()) {
                    throw new Error("Șablonul selectat nu a fost găsit.");
                }
                const templateData = templateDoc.data();
                flow = templateData.flow;
                startStepId = templateData.startStepId || startStepId;
            } else {
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
                startStepId: startStepId,
            };

            const newFormDoc = await addDoc(collection(db, "formTemplates"), newFormPayload);
            
            await fetchForms(user);
            
            toast({
                title: "Succes!",
                description: "Formularul a fost creat. Acum poți să-l editezi.",
            });

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

    const handleDeleteClick = (formId: string) => {
        setFormToDelete(formId);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!formToDelete || !user) return;
        
        try {
            const formRef = doc(db, "formTemplates", formToDelete);
            await deleteDoc(formRef);

            if (activeFormId === formToDelete) {
                const agentRef = doc(db, "agents", user.uid);
                await updateDoc(agentRef, { activeFormId: null });
                setActiveFormId(null);
            }
            
            await fetchForms(user);
    
            toast({ title: "Succes", description: "Formularul a fost șters." });
    
        } catch (error: any) {
            console.error("Eroare critică la ștergere:", error);
            toast({
                variant: "destructive",
                title: "Eroare la ștergere",
                description: `Nu s-a putut șterge formularul. Eroare: ${error.message}`,
            });
        } finally {
            setIsDeleteModalOpen(false);
            setFormToDelete(null);
        }
    };


    const handleSetActiveForm = async (formId: string) => {
        if (!user) return;
        try {
            const agentRef = doc(db, "agents", user.uid);
            await setDoc(agentRef, { activeFormId: formId }, { merge: true });
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
            delete newFormPayload.isTemplate;

            const newFormDoc = await addDoc(collection(db, "formTemplates"), newFormPayload);
            
            await fetchForms(user);

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
    
    const restoreDatabase = async () => {
        if (!user) return;
        const templateData = {
            title: "Analiză Financiară - Deces (Standard)",
            startStepId: "intro_analysis_1",
            ownerId: null,
            isTemplate: true,
            createdAt: serverTimestamp(),
            flow: {
                "intro_analysis_1": { "message": "Un deces afectează negativ pe multiple planuri, două dintre acestea fiind extrem de profunde și de durată - planul existențial și planul financiar.", "actionType": "buttons", "options": [], "autoContinue": true, "delay": 2000, "nextStep": "intro_analysis_2" },
                "intro_analysis_2": { "message": "În momentele următoare, vom răspunde la 6 întrebări prin care să stabilim care este suma de bani de care ar avea nevoie familia pentru a ameliora impactul financiar negativ.", "actionType": "buttons", "options": [], "autoContinue": true, "delay": 2000, "nextStep": "ask_period" },
                "ask_period": { "message": "1. În cazul unui posibil deces, care ar fi perioada de timp în care familia ta ar avea nevoie de susținere financiară (ani)?", "actionType": "buttons", "options": ["3 ani", "4 ani", "5 ani"], "nextStep": "ask_monthly_sum" },
                "ask_monthly_sum": { "message": "Care ar fi suma lunară necesară (în lei) pentru menținerea actualului standard de viață?", "actionType": "input", "options": { "type": "number", "placeholder": "Ex: 5000" }, "nextStep": "show_deficit_1" },
                "show_deficit_1": { "message": "Am calculat primul deficit. Continuăm cu cheltuielile specifice.", "actionType": "buttons", "options": [], "autoContinue": true, "delay": 2000, "nextStep": "ask_event_costs" },
                "ask_event_costs": { "message": "2. Ce sumă unică (în lei) ar fi necesară pentru cheltuieli imediate (înmormântare, taxe succesorale)?", "actionType": "input", "options": { "type": "number", "placeholder": "Ex: 20000" }, "nextStep": "ask_projects" },
                "ask_projects": { "message": "3. Există proiecte în desfășurare (construcții, studii) care necesită finanțare? Care este suma totală necesară?", "actionType": "input", "options": { "type": "number", "placeholder": "Ex: 50000" }, "nextStep": "ask_debts" },
                "ask_debts": { "message": "4. Există credite sau datorii care ar trebui stinse? Care este valoarea lor totală?", "actionType": "input", "options": { "type": "number", "placeholder": "Ex: 150000" }, "nextStep": "show_brute_deficit" },
                "show_brute_deficit": { "message": "Am calculat necesarul total brut. Acum haide să vedem ce resurse există deja.", "actionType": "buttons", "options": [], "autoContinue": true, "delay": 2500, "nextStep": "ask_insurance" },
                "ask_insurance": { "message": "5. Familia ar beneficia de vreo asigurare de viață existentă (necesionată băncii)? Care este suma?", "actionType": "input", "options": { "type": "number", "placeholder": "Ex: 0" }, "nextStep": "ask_savings" },
                "ask_savings": { "message": "6. Există economii sau investiții care pot fi accesate imediat? Care este valoarea lor?", "actionType": "input", "options": { "type": "number", "placeholder": "Ex: 10000" }, "nextStep": "show_final_deficit" },
                "show_final_deficit": { "message": "Calcul finalizat. Acesta este deficitul real care ar rămâne descoperit.", "actionType": "buttons", "options": [], "autoContinue": true, "delay": 3000, "nextStep": "ask_feeling" },
                "ask_feeling": { "message": "Cum ți se pare această sumă? Care este sentimentul pe care îl simți acum?", "actionType": "input", "options": { "type": "text", "placeholder": "Scrie aici..." }, "nextStep": "ask_dramatic_options" },
                "ask_dramatic_options": { "message": "În lipsa acestei sume, ce opțiuni realiste ar avea familia? Bifează-le:", "actionType": "interactive_scroll_list", "options": { "buttonText": "Am bifat", "options": ["Să se mute cu părinții", "Să vândă casa", "Să își ia un al doilea job", "Să renunțe la educația copiilor", "Să ceară ajutor prietenilor"] }, "nextStep": "present_solution" },
                "present_solution": { "message": "Dacă nu ești mulțumit cu aceste opțiuni, dorești să vezi o soluție personalizată care să acopere acest deficit?", "actionType": "buttons", "options": ["Da, vreau detalii", "Nu"], "nextStep": "ask_contact_details" },
                "ask_contact_details": { "message": "Perfect. Te rog lasă-mi datele de contact pentru a-ți trimite analiza completă.", "actionType": "form", "options": { "buttonText": "Trimite", "gdpr": "Sunt de acord cu prelucrarea datelor.", "fields": [{ "name": "name", "placeholder": "Nume", "type": "text", "required": true }, { "name": "email", "placeholder": "Email", "type": "email", "required": true }, { "name": "phone", "placeholder": "Telefon", "type": "tel", "required": true }] }, "nextStep": "thank_you_final" },
                "thank_you_final": { "message": "Mulțumesc! Datele au fost transmise.", "actionType": "end", "nextStep": "" }
            }
        };
        try {
            console.log("Încep restaurarea șablonului...");
            await setDoc(doc(db, "formTemplates", "deces_standard_v1"), templateData);
            toast({ title: "Succes!", description: "Șablonul 'Analiză Financiară - Deces (Standard)' a fost restaurat." });
            if (user) await fetchForms(user);
        } catch (e: any) {
            console.error("Eroare la restaurare:", e);
            toast({ variant: "destructive", title: "Eroare la restaurare", description: e.message });
        }
    };
    
    const restoreMasterTemplate = async () => {
        if (!user) return;

        const masterFormData = {
          title: "Analiză Completă (Master)",
          startStepId: "ask_topic",
          ownerId: user.uid,
          isTemplate: true,
          createdAt: serverTimestamp(),
          flow: {
            "ask_topic": {
              "message": "Salut! Sunt Marius. Pentru a te putea ajuta, spune-mi ce te interesează acum?",
              "actionType": "buttons",
              "options": [
                { "label": "Deces", "nextStep": "deces_intro" },
                { "label": "Boli Grave", "nextStep": "boala_intro" },
                { "label": "Pensie", "nextStep": "pensie_intro" },
                { "label": "Studii Copii", "nextStep": "studii_intro" }
              ]
            },
            "deces_intro": {
              "message": "Un deces afectează negativ pe multiple planuri...",
              "actionType": "buttons",
              "options": ["Continuă"],
              "nextStep": "deces_intro_2"
            },
            "deces_intro_2": {
              "message": "În momentele următoare, vom răspunde la 6 întrebări...",
              "actionType": "buttons",
              "options": ["Continuă"],
              "nextStep": "deces_ask_period"
            },
            "deces_ask_period": {
              "message": "1. În cazul unui posibil deces, care ar fi perioada de timp...?",
              "actionType": "buttons",
              "options": ["3 ani", "4 ani", "5 ani"],
              "nextStep": "deces_ask_monthly_sum"
            },
            "deces_ask_monthly_sum": {
              "message": "Care ar fi suma lunară necesară...?",
              "actionType": "input",
              "options": { "type": "number", "placeholder": "Ex: 5000" },
              "nextStep": "deces_ask_event_costs"
            },
            "deces_ask_event_costs": {
              "message": "2. Ce sumă unică ar fi necesară pentru cheltuieli imediate...?",
              "actionType": "input",
              "options": { "type": "number", "placeholder": "Ex: 20000" },
              "nextStep": "deces_ask_projects"
            },
            "deces_ask_projects": {
              "message": "3. Există proiecte în desfășurare...?",
              "actionType": "input",
              "options": { "type": "number", "placeholder": "Ex: 50000" },
              "nextStep": "deces_ask_debts"
            },
            "deces_ask_debts": {
              "message": "4. Există credite sau datorii...?",
              "actionType": "input",
              "options": { "type": "number", "placeholder": "Ex: 150000" },
              "nextStep": "deces_ask_insurance"
            },
            "deces_ask_insurance": {
              "message": "5. Familia ar beneficia de vreo asigurare de viață...?",
              "actionType": "input",
              "options": { "type": "number", "placeholder": "Ex: 0" },
              "nextStep": "deces_ask_savings"
            },
            "deces_ask_savings": {
              "message": "6. Există economii sau investiții...?",
              "actionType": "input",
              "options": { "type": "number", "placeholder": "Ex: 10000" },
              "nextStep": "deces_ask_dramatic_options"
            },
            "deces_ask_dramatic_options": {
              "message": "Ce opțiuni realiste ar avea familia?",
              "actionType": "multi_choice",
              "options": [
                {"label": "Să se mute cu părinții", "id": "muta_parinti"},
                {"label": "Să vândă casa", "id": "vinde_casa"},
                {"label": "Să își ia un al doilea job", "id": "job_extra"},
                {"label": "Să renunțe la educația copiilor", "id": "renunta_educatie"},
                {"label": "Să ceară ajutor prietenilor", "id": "ajutor_prieteni"}
              ],
              "nextStep": "deces_present_solution"
            },
            "deces_present_solution": {
              "message": "Vrei o soluție personalizată?",
              "actionType": "buttons",
              "options": ["Da, vreau detalii", "Nu"],
              "nextStep": "final_contact"
            },
            "pensie_intro": {
              "message": "Excelent. Planificarea pensiei este vitală. Câți ani ai acum?",
              "actionType": "input",
              "options": { "type": "number", "placeholder": "Ex: 35" },
              "nextStep": "final_contact"
            },
            "boala_intro": {
              "message": "Sănătatea e prioritară. Ai un istoric medical în familie?",
              "actionType": "buttons",
              "options": ["Da", "Nu"],
              "nextStep": "final_contact"
            },
            "studii_intro": {
              "message": "Investiția în copii. Câți ani are copilul?",
              "actionType": "input",
              "options": { "type": "number", "placeholder": "Ex: 5" },
              "nextStep": "final_contact"
            },
            "final_contact": {
              "message": "Pentru a-ți trimite analiza completă, am nevoie de datele tale.",
              "actionType": "form",
              "options": {
                "buttonText": "Trimite",
                "gdpr": "Accept termeni",
                "fields": [
                  { "name": "name", "placeholder": "Nume", "type": "text", "required": true },
                  { "name": "email", "placeholder": "Email", "type": "email", "required": true },
                  { "name": "phone", "placeholder": "Telefon", "type": "tel", "required": true }
                ]
              },
              "nextStep": "final_end"
            },
            "final_end": {
              "message": "Mulțumesc! Te voi contacta.",
              "actionType": "end",
              "nextStep": ""
            }
          }
        };

        try {
            console.log("Încep restaurarea șablonului MASTER...");
            await setDoc(doc(db, "formTemplates", "master_standard_v1"), masterFormData);
            toast({ title: "Succes!", description: "Șablonul 'Analiză Completă (Master)' a fost creat/actualizat." });
            if (user) await fetchForms(user);
        } catch (e: any) {
            console.error("Eroare la restaurare master:", e);
            toast({ variant: "destructive", title: "Eroare la restaurare master", description: e.message });
        }
    };


    return (
        <>
            <div className="flex items-center justify-between">
                <h1 className="text-xl font-bold md:text-2xl">Management Formulare</h1>
                 <Button onClick={() => setIsCreateModalOpen(true)} disabled={loading} size="sm">
                    <FilePlus2 className="mr-2 h-4 w-4" />
                    Creează Formular
                </Button>
            </div>
             <p className="text-muted-foreground mt-2 text-xs md:text-sm">
                Creează formulare noi de la zero, clonează un șablon standard pentru a-l personaliza sau administrează formularele tale deja create.
            </p>

            <div className="mt-8">
                <h2 className="text-lg font-semibold mb-4 md:text-xl">Formularele Tale</h2>
                {loading ? <p>Se încarcă...</p> : userForms.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {userForms.map(form => (
                            <FormCard 
                                key={form.id}
                                form={form}
                                isTemplate={false}
                                activeFormId={activeFormId}
                                cloning={cloning}
                                handleClone={handleClone}
                                handleDeleteClick={handleDeleteClick}
                                router={router}
                                handleSetActiveForm={handleSetActiveForm}
                            />
                        ))}
                    </div>
                ) : (
                    <p className="text-muted-foreground text-sm">Nu ai niciun formular personalizat. Apasă pe "Creează Formular" pentru a începe.</p>
                )}
            </div>

            <div className="mt-12">
                <h2 className="text-lg font-semibold mb-4 md:text-xl">Șabloane Standard</h2>
                 {loading ? <p>Se încarcă...</p> : templateForms.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {templateForms.map(form => (
                             <FormCard 
                                key={form.id}
                                form={form}
                                isTemplate={true}
                                activeFormId={activeFormId}
                                cloning={cloning}
                                handleClone={handleClone}
                                handleDeleteClick={handleDeleteClick}
                                router={router}
                                handleSetActiveForm={handleSetActiveForm}
                            />
                        ))}
                    </div>
                ) : (
                    <p className="text-muted-foreground text-sm">Nu există șabloane disponibile.</p>
                )}
            </div>

             <div className="mt-12 border-t pt-8">
                 <Card className="bg-muted/30 border-dashed">
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="text-destructive h-5 w-5"/> Zonă de Mentenanță</CardTitle>
                        <CardDescription className="text-xs">Acțiunile din această secțiune sunt pentru depanare. Folosește-le cu precauție.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col sm:flex-row gap-4">
                         <div>
                             <Button variant="destructive" size="sm" onClick={restoreDatabase}>
                                Resetează Șablonul Standard
                            </Button>
                            <p className="text-xs text-muted-foreground mt-2">
                                Suprascrie șablonul "Deces (Standard)" cu versiunea originală.
                            </p>
                        </div>
                        <div>
                             <Button variant="destructive" size="sm" onClick={restoreMasterTemplate}>
                                Creează Șablonul Master
                            </Button>
                            <p className="text-xs text-muted-foreground mt-2">
                                Creează/Resetează șablonul "Analiză Completă (Master)" cu 4 ramuri.
                            </p>
                        </div>
                    </CardContent>
                 </Card>
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

             <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Ștergere Formular</DialogTitle>
                        <DialogDescription>
                           Ești sigur că vrei să ștergi acest formular? Această acțiune este ireversibilă și va șterge toate datele asociate.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>Anulează</Button>
                        <Button variant="destructive" onClick={confirmDelete}>Șterge Definitiv</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </>
    );
}

    



    