
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
    
    const restoreFullMaster = async () => {
    if (!confirm("Ești sigur că vrei să suprascrii Formularul Master cu versiunea completă (3 scenarii)?")) return;
    if (!user) {
        toast({variant: "destructive", title: "Eroare", description: "Utilizator neautentificat."});
        return;
    }
    
    try {
      const masterData = {
        title: "Analiză Completă (Master - Toate Scenariile)",
        description: "Include fluxurile complete pentru Deces, Pensionare și Viitorul Copiilor.",
        startStepId: "ask_topic",
        ownerId: user.uid,
        isTemplate: true,
        createdAt: serverTimestamp(), 
        flow: {
          ask_topic: {
            message: "Salut!\n\nSunt Marius, agentul tău de asigurări.\n\nÎn următoarele 3 minute te invit la un moment de reflecție și de analiză prin care să descoperi care este gradul tău de expunere financiară.\n\nAceastă analiză nu implică nicio obligație din partea ta.\n\nDespre ce subiect vrei să discutăm?",
            actionType: "buttons",
            options: [
              { label: "Deces (Siguranța Familiei)", nextStep: "deces_intro_1" },
              { label: "Pensionare", nextStep: "pensie_intro_1" },
              { label: "Viitorul Copiilor", nextStep: "studii_intro_1" }
            ]
          },
          deces_intro_1: {
            message: "Cât ești de pregătit financiar pentru surprizele vieții?\nFă o scurtă analiză și descoperă unde ești vulnerabil.\n\nViața produce pierderi financiare semnificative în patru situații majore.",
            actionType: "buttons",
            options: ["Continuă"],
            nextStep: "deces_intro_2"
          },
          deces_intro_2: {
            message: "Dintre acestea, două situații sunt previzibile, precis așezate pe axa vieții, iar două sunt total imprevizibile („ceasul rău, pisica neagră”).\n\n**Previzibile:**\n1. Pensionarea\n2. Studiile copiilor\n\n**Imprevizibile:**\n1. Decesul\n2. Bolile grave",
            actionType: "buttons",
            options: ["Continuă"],
            nextStep: "deces_intro_3"
          },
          deces_intro_3: {
            message: "Un deces afectează negativ profund și pe termen lung atât **planul existențial** (drama care însoțește pierderea persoanei dragi), cât și **planul financiar** (dispariția opțiunilor, apariția presiunilor financiare).",
            actionType: "buttons",
            options: ["Continuă"],
            nextStep: "deces_intro_4"
          },
          deces_intro_4: {
            message: "Vei răspunde la 6 întrebări pentru a stabili suma de bani de care ar avea nevoie familia ta pentru a ameliora impactul financiar negativ al decesului asupra:\n(1.) standardului de viață\n(2.) proiectelor în desfășurare\n(3.) creditelor / datoriilor",
            actionType: "buttons",
            options: ["Sunt gata"],
            nextStep: "deces_ask_period"
          },
          deces_ask_period: {
            message: "1. În cazul unui posibil deces, câți ani ar avea nevoie familia ta de susținere financiară pentru a-și menține nivelul de trai fără să fie nevoită să facă ajustări majore?",
            actionType: "buttons",
            options: ["3 ani", "4 ani", "5 ani"],
            nextStep: "deces_ask_monthly_sum"
          },
          deces_ask_monthly_sum: {
            message: "Care ar fi suma de bani lunară necesară în această perioadă (în lei)?",
            actionType: "input",
            options: { type: "number", placeholder: "Ex: 5000" },
            nextStep: "deces_show_deficit_1"
          },
          deces_show_deficit_1: {
            message: "Am notat primul deficit pentru menținerea standardului de viață (Suma x Perioada x 12). Continuăm cu cheltuielile specifice.",
            actionType: "buttons",
            options: ["Da"],
            nextStep: "deces_ask_event_costs"
          },
          deces_ask_event_costs: {
            message: "2. În cazul unui posibil deces, evenimentul în sine este însoțit de anumite cheltuieli (ex. înmormântare, taxe succesorale). Care ar fi această sumă?",
            actionType: "input",
            options: { type: "number", placeholder: "Ex: 20000" },
            nextStep: "deces_ask_projects"
          },
          deces_ask_projects: {
            message: "3. Există proiecte în desfășurare (construcție, sport performanță copii) care ar avea de suferit? Care ar fi suma totală necesară finalizării lor?",
            actionType: "input",
            options: { type: "number", placeholder: "Ex: 50000" },
            nextStep: "deces_ask_debts"
          },
          deces_ask_debts: {
            message: "4. Rămân pe umerii familiei anumite responsabilități financiare de tip credite, datorii? Care ar fi suma necesară pentru a le stinge?",
            actionType: "input",
            options: { type: "number", placeholder: "Ex: 150000" },
            nextStep: "deces_ask_insurance"
          },
          deces_ask_insurance: {
            message: "5. Familia ta ar beneficia de vreo asigurare de viață pe numele tău (cu beneficiar familia)? Dacă da, care este suma?",
            actionType: "input",
            options: { type: "number", placeholder: "Ex: 0" },
            nextStep: "deces_ask_savings"
          },
          deces_ask_savings: {
            message: "6. Familia ta ar putea accesa anumite economii sau investiții imediate? Care este suma disponibilă?",
            actionType: "input",
            options: { type: "number", placeholder: "Ex: 10000" },
            nextStep: "deces_show_final_result"
          },
          deces_show_final_result: {
            message: "Calcul finalizat. Acesta este deficitul financiar (Moștenirea Negativă) cu care familia ta ar păși în viitor.",
            actionType: "buttons",
            options: ["Vezi Rezultatul"],
            nextStep: "deces_ask_feeling"
          },
          deces_ask_feeling: {
            message: "Cum ți se pare această sumă? Care este sentimentul pe care îl simți acum?",
            actionType: "input",
            options: { type: "text", placeholder: "Scrie un gând..." },
            nextStep: "deces_ask_dramatic_options"
          },
          deces_ask_dramatic_options: {
            message: "În acest scenariu de imaginație sumbru, ce opțiuni ar avea cei dragi? Bifează opțiunile realiste:",
            actionType: "interactive_scroll_list",
            options: {
              buttonText: "Am bifat",
              options: [
                "Să se mute cu părinții",
                "Să se mute în alt oraș",
                "Să muncească suplimentar (și să dispară din viața copiilor)",
                "Să vândă din bunurile personale",
                "Să vândă casa / apartamentul",
                "Să reducă drastic cheltuielile",
                "Să renunțe la proiecte personale",
                "Să amâne educația copiilor",
                "Să ceară ajutor de la familie și prieteni",
                "Să renunțe la economii",
                "Să accepte orice compromis major",
                "Să se căsătorească din obligații financiare"
              ]
            },
            nextStep: "deces_present_solution"
          },
          deces_present_solution: {
            message: "Dacă nu ești mulțumit cu opțiunile, ai fi interesat să vezi o soluție personalizată care să ofere familiei o a doua șansă la o viață normală?",
            actionType: "buttons",
            options: ["Da, vreau detalii", "Nu"],
            nextStep: "final_contact"
          },
          pensie_intro_1: {
            message: "Pensionarea poate fi cel mai lung concediu al vieții sau cel mai chinuitor concediu al vieții.",
            actionType: "buttons",
            options: ["Continuă"],
            nextStep: "pensie_intro_2"
          },
          pensie_intro_2: {
            message: "Reducerea veniturilor la pensie va afecta:\n1. Opțiunile personale (stil de viață)\n2. Demnitatea și stima de sine\n3. Tranziția de la rolul de susținător la susținut",
            actionType: "buttons",
            options: ["Continuă"],
            nextStep: "pensie_intro_3"
          },
          pensie_intro_3: {
            message: "Când crezi că ar fi cel mai potrivit moment să începi să-ți planifici pensionarea?",
            actionType: "buttons",
            options: ["ACUM"],
            nextStep: "pensie_intro_4"
          },
          pensie_intro_4: {
            message: "Vei răspunde la 5 întrebări pentru a stabili suma de bani necesară pentru a-ți menține standardul de viață dacă mâine ai ieși la pensie.",
            actionType: "buttons",
            options: ["Continuă"],
            nextStep: "pensie_ask_years"
          },
          pensie_ask_years: {
            message: "1. Exercițiu de imaginație: ai 65 ani și ieși la pensie. Câți ani speri să mai trăiești din acest moment?",
            actionType: "buttons",
            options: ["10 ani", "15 ani", "20 ani"],
            nextStep: "pensie_ask_monthly"
          },
          pensie_ask_monthly: {
            message: "Care ar fi suma de bani lunară de care ai avea nevoie în completarea pensiei de stat pentru a-ți menține standardul de viață (lei)?",
            actionType: "input",
            options: { type: "number", placeholder: "Ex: 2000" },
            nextStep: "pensie_show_deficit_1"
          },
          pensie_show_deficit_1: {
            message: "Am calculat necesarul de bază (Suma x Ani x 12).",
            actionType: "buttons",
            options: ["Continuă"],
            nextStep: "pensie_ask_projects"
          },
          pensie_ask_projects: {
            message: "2. Ce planuri/proiecte ai pentru pensie (călătorii, hobby-uri, nepoți)? Care ar fi suma de bani anuală necesară?",
            actionType: "input",
            options: { type: "number", placeholder: "Ex: 5000" },
            nextStep: "pensie_ask_debts"
          },
          pensie_ask_debts: {
            message: "3. La vârsta pensionării, te aștepți să mai ai de plătit credite? Care ar fi suma necesară achitării integrale?",
            actionType: "input",
            options: { type: "number", placeholder: "Ex: 0" },
            nextStep: "pensie_ask_insurance"
          },
          pensie_ask_insurance: {
            message: "4. Ai vreo asigurare de viață cu economisire/investiție pentru pensie? Ce sumă s-a strâns?",
            actionType: "input",
            options: { type: "number", placeholder: "Ex: 0" },
            nextStep: "pensie_ask_savings"
          },
          pensie_ask_savings: {
            message: "5. Ai economii (Pilon 2, 3, investiții) accesibile la pensie? Ce sumă?",
            actionType: "input",
            options: { type: "number", placeholder: "Ex: 40000" },
            nextStep: "pensie_show_final_result"
          },
          pensie_show_final_result: {
            message: "Calcul finalizat. Acesta este deficitul financiar cu care tu ai ieși la pensie.",
            actionType: "buttons",
            options: ["Vezi Rezultatul"],
            nextStep: "pensie_ask_feeling"
          },
          pensie_ask_feeling: {
            message: "Cum ți se pare această sumă? Care este sentimentul pe care îl simți acum?",
            actionType: "input",
            options: { type: "text", placeholder: "Scrie aici..." },
            nextStep: "pensie_dramatic_options"
          },
          pensie_dramatic_options: {
            message: "În acest scenariu, cum crezi că ți s-ar ajusta standardul de viață? Bifează opțiunile realiste:",
            actionType: "interactive_scroll_list",
            options: {
              buttonText: "Am bifat",
              options: [
                "Reducerea calității alimentelor",
                "Limitarea utilităților",
                "Limitarea accesului la servicii medicale",
                "Împrumuturi noi",
                "Apel la banii copiilor",
                "Vânzarea de bunuri",
                "Munca la vârstă înaintată",
                "Renunțarea la hobby-uri",
                "Izolare socială",
                "Schimbarea domiciliului"
              ]
            },
            nextStep: "pensie_solution"
          },
          pensie_solution: {
            message: "Dacă nu ești mulțumit, ai fi interesat să vezi o soluție care să-ți mențină demnitatea și standardul de viață la pensie?",
            actionType: "buttons",
            options: ["Da, vreau detalii", "Nu"],
            nextStep: "final_contact"
          },
          studii_intro_1: {
            message: "Menirea ta ca părinte este să îi dai copilului aripi în viață!\n\nEști de acord cu afirmația: „Cu cât vrei să zboare mai sus, cu atât sunt mai scumpe aripile”?",
            actionType: "buttons",
            options: ["De acord"],
            nextStep: "studii_intro_2"
          },
          studii_intro_2: {
            message: "Vei răspunde la 6 întrebări pentru a stabili suma necesară pentru: educație formală, dezvoltare personală, proiecte majore și familie.",
            actionType: "buttons",
            options: ["Continuă"],
            nextStep: "studii_ask_years"
          },
          studii_ask_years: {
            message: "1. Câți ani ești dispus să-ți susții financiar copilul în studenție?",
            actionType: "buttons",
            options: ["3 ani", "4 ani", "5 ani", "6 ani"],
            nextStep: "studii_ask_annual_cost"
          },
          studii_ask_annual_cost: {
            message: "Care ar fi suma anuală necesară pentru studii (taxă, cazare, masă, gadgeturi, cărți)? Încearcă să nu pui sumele „din burtă”.",
            actionType: "input",
            options: { type: "number", placeholder: "Ex: 30000" },
            nextStep: "studii_show_deficit_1"
          },
          studii_show_deficit_1: {
            message: "Am calculat costul de bază al studiilor (Ani x Sumă anuală).",
            actionType: "buttons",
            options: ["Continuă"],
            nextStep: "studii_ask_extra"
          },
          studii_ask_extra: {
            message: "2. Pentru dezvoltare personală (tabere, hobby-uri, călătorii, viață socială), care ar fi suma anuală necesară?",
            actionType: "input",
            options: { type: "number", placeholder: "Ex: 5000" },
            nextStep: "studii_ask_projects"
          },
          studii_ask_projects: {
            message: "3. Debutul în viață: Proiecte majore (mașină, afacere, avans casă). Care este suma necesară?",
            actionType: "input",
            options: { type: "number", placeholder: "Ex: 10000" },
            nextStep: "studii_ask_wedding"
          },
          studii_ask_wedding: {
            message: "4. Nunta copilului. Care ar fi contribuția ta financiară?",
            actionType: "input",
            options: { type: "number", placeholder: "Ex: 20000" },
            nextStep: "studii_ask_savings"
          },
          studii_ask_savings: {
            message: "5. Există economii sau investiții pe care copilul le-ar putea accesa pentru aceste cheltuieli?",
            actionType: "input",
            options: { type: "number", placeholder: "Ex: 5000" },
            nextStep: "studii_ask_insurance"
          },
          studii_ask_insurance: {
            message: "6. Există vreo asigurare de viață cu economisire destinată copilului?",
            actionType: "input",
            options: { type: "number", placeholder: "Ex: 0" },
            nextStep: "studii_ask_children_count"
          },
          studii_ask_children_count: {
            message: "Pentru a finaliza: Câți copii ai? (Voi înmulți deficitul cu acest număr).",
            actionType: "input",
            options: { type: "number", placeholder: "Ex: 1" },
            nextStep: "studii_show_final_result"
          },
          studii_show_final_result: {
            message: "Deficitul financiar pe care trebuie să îl acoperi pentru a asigura startul în viață este:",
            actionType: "buttons",
            options: ["Vezi Rezultatul"],
            nextStep: "studii_ask_feeling"
          },
          studii_ask_feeling: {
            message: "Cum ți se pare această sumă? Ce simți?",
            actionType: "input",
            options: { type: "text", placeholder: "Scrie aici..." },
            nextStep: "studii_dramatic_intro"
          },
          studii_dramatic_intro: {
             message: "Cum s-ar schimba viitorul copiilor dacă nu ar putea conta pe sprijinul tău financiar?",
             actionType: "buttons",
             options: ["Continuă"],
             nextStep: "studii_dramatic_options"
          },
          studii_dramatic_options: {
            message: "Bifează scenariile posibile:",
            actionType: "interactive_scroll_list",
            options: {
              buttonText: "Am înțeles",
              options: [
                "Renunțarea la hobby-uri",
                "Abandon școlar",
                "Acces limitat la educație",
                "Izolare față de prieteni",
                "Scăderea încrederii în sine",
                "Dependență financiară",
                "Muncă excesivă în facultate",
                "Anxietate și teamă de viitor"
              ]
            },
            nextStep: "studii_solution"
          },
          studii_solution: {
            message: "Ai fi interesat de o soluție care să-ți eșaloneze efortul și să garanteze viitorul copilului, indiferent de ce ți se întâmplă ție?",
            actionType: "buttons",
            options: ["Da, vreau detalii", "Nu"],
            nextStep: "final_contact"
          },
          final_contact: {
            message: "Perfect. Te rog lasă-mi datele de contact pentru a-ți trimite analiza completă.",
            actionType: "form",
            options: {
              buttonText: "Trimite",
              gdpr: "Sunt de acord cu prelucrarea datelor personale.",
              fields: [
                { name: "name", placeholder: "Nume Prenume", type: "text", required: true },
                { name: "email", placeholder: "Email", type: "email", required: true },
                { name: "phone", placeholder: "Telefon", type: "tel", required: true }
              ]
            },
            nextStep: "thank_you_final"
          },
          thank_you_final: {
            message: "Mulțumesc! Datele au fost transmise.",
            actionType: "end",
            nextStep: ""
          }
        }
      };
      await setDoc(doc(db, "formTemplates", "master_standard_v1"), masterData);
      toast({title: "Master Form Complet Restaurat!", description: "Baza de date a fost actualizată cu succes."});
      await fetchForms(user);
    } catch (error: any) {
      console.error("Eroare la restaurare:", error);
      toast({variant: "destructive", title: "Eroare la Restaurare", description: error.message});
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
                             <Button variant="destructive" size="sm" onClick={restoreFullMaster}>
                                Creează Șablonul Master
                            </Button>
                            <p className="text-xs text-muted-foreground mt-2">
                                Creează/Resetează șablonul "Analiză Completă (Master)" cu 3 ramuri.
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

    



    

    

    