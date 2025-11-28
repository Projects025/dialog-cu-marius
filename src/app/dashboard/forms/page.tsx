
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
        <CardFooter className="flex flex-wrap justify-end gap-2 p-3 border-t bg-muted/30">
            {isTemplate ? (
                <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleClone(form.id)}
                    disabled={cloning === form.id}
                    className="flex-1 sm:flex-none whitespace-nowrap h-8 text-xs"
                >
                    <Copy className="mr-2 h-3 w-3" />
                    {cloning === form.id ? "Se clonează..." : "Clonează"}
                </Button>
            ) : (
                <>
                    <Button size="sm" variant="destructive" onClick={() => handleDeleteClick(form.id)} className="flex-1 sm:flex-none whitespace-nowrap h-8 text-xs">
                        <Trash2 className="mr-2 h-3 w-3" />
                        Șterge
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => router.push(`/dashboard/form-editor?id=${form.id}`)} className="flex-1 sm:flex-none whitespace-nowrap h-8 text-xs">
                        <Edit className="mr-2 h-3 w-3" />
                        Editează
                    </Button>
                    {activeFormId !== form.id && (
                         <Button size="sm" onClick={() => handleSetActiveForm(form.id)} className="flex-1 sm:flex-none whitespace-nowrap h-8 text-xs">Setează Activ</Button>
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

    // State for the generic confirmation modal
    const [confirmModalOpen, setConfirmModalOpen] = useState(false);
    const [confirmAction, setConfirmAction] = useState<() => void>(() => () => {});
    const [confirmTitle, setConfirmTitle] = useState("");
    const [confirmDescription, setConfirmDescription] = useState("");
    const [confirmButtonText, setConfirmButtonText] = useState("Confirmă");
    const [confirmButtonVariant, setConfirmButtonVariant] = useState<"default" | "destructive">("default");


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

    const handleConfirmAction = () => {
        confirmAction();
        setConfirmModalOpen(false);
    };

    const handleSetActiveForm = async (formId: string) => {
        const action = async () => {
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

        setConfirmTitle("Setare Formular Activ");
        setConfirmDescription("Ești sigur că vrei să setezi acest formular ca fiind cel activ? Link-ul tău public se va schimba.");
        setConfirmAction(() => action);
        setConfirmButtonText("Setează Activ");
        setConfirmButtonVariant("default");
        setConfirmModalOpen(true);
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
    
  const restoreMasterTemplate = () => {
    // 1. Configuram Modalul
    setConfirmTitle("Regenerare Șablon Master");
    setConfirmDescription("ATENȚIE: Această acțiune va șterge și regenera complet șablonul 'Analiză Completă (Master)' cu toate cele 4 fluxuri. Ești sigur?");
    setConfirmButtonText("Da, Regenerează");
    setConfirmButtonVariant("destructive");

    // 2. Definim ce se intampla cand apasa "Confirma" in modal
    setConfirmAction(() => async () => {
      try {
        await deleteDoc(doc(db, "formTemplates", "master_standard_v1"));

        const masterData = {
            title: "Analiză Completă (Master - 4 Scenarii)",
            description: "Include fluxurile complete pentru Deces, Pensionare, Studii și Sănătate.",
            startStepId: "intro_sequence",
            ownerId: null,
            isTemplate: true,
            createdAt: new Date(),
            flow: {
              intro_sequence: {
                message: [
                  "Viața produce pierderi financiare semnificative în patru situații majore.",
                  "Dintre acestea, două situații sunt previzibile, precis așezate pe axa vieții, iar două sunt total imprevizibile („ceasul rău, pisica neagră”).",
                  "**Previzibile:**\n1. Pensionarea – reducerea drastică a opțiunilor\n2. Studiile copiilor – cheltuieli complexe\n\n**Imprevizibile:**\n1. Decesul – detonează standardul de viață\n2. Bolile grave – impact major asupra economiilor"
                ],
                actionType: "buttons",
                options: ["Continuă"],
                nextStep: "ask_topic"
              },
              ask_topic: {
                message: [
                  "Salut! Sunt Marius, agentul tău de asigurări.",
                  "În următoarele 3 minute te invit la un moment de reflecție și de analiză prin care să descoperi care este gradul tău de expunere financiară.",
                  "Această analiză nu implică nicio obligație din partea ta.",
                  "**Care dintre aceste subiecte ar fi de interes pentru tine la acest moment?**"
                ],
                actionType: "buttons",
                options: [
                  { label: "Deces (Siguranța Familiei)", nextStep: "deces_intro_1" },
                  { label: "Pensionare", nextStep: "pensie_intro_1" },
                  { label: "Viitorul Copiilor", nextStep: "studii_intro_1" },
                  { label: "Sănătate (Boli Grave)", nextStep: "sanatate_intro_1" }
                ]
              },
              deces_intro_1: {
                message: "Un deces afectează negativ profund și pe termen lung atât **planul existențial** (drama pierderii), cât și **planul financiar** (dispariția opțiunilor).",
                actionType: "buttons",
                options: ["Continuă"],
                nextStep: "deces_intro_2"
              },
              deces_intro_2: {
                message: "Vei răspunde la 6 întrebări pentru a stabili suma necesară familiei pentru:\n(1.) standardul de viață\n(2.) proiecte în desfășurare\n(3.) credite / datorii",
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
                message: "Am notat primul deficit: **{deficit1} lei**.\n(Suma x Perioada x 12). Continuăm cu cheltuielile specifice.",
                actionType: "buttons",
                options: ["Da"],
                nextStep: "deces_ask_event_costs"
              },
              deces_ask_event_costs: {
                message: "2. În cazul unui posibil deces, evenimentul este însoțit de cheltuieli (ex. înmormântare, taxe succesorale). Care ar fi această sumă?",
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
                message: "5. Familia ta ar beneficia de vreo asigurare de viață pe numele tău? (Doar cele cu beneficiar familia). Dacă da, care este suma?",
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
                message: "Calcul finalizat. Deficitul financiar (Moștenirea Negativă) cu care familia ta ar păși în viitor este:\n\n**{finalDeficit} lei**",
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
                message: "În acest scenariu sumbru, ce opțiuni realiste ar avea cei dragi? Bifează-le:",
                actionType: "interactive_scroll_list",
                options: {
                  buttonText: "Am bifat",
                  options: [
                    "Să se mute cu părinții",
                    "Să se mute în alt oraș",
                    "Să muncească suplimentar",
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
                message: "Dacă nu ești mulțumit, ai fi interesat să vezi o soluție personalizată care să ofere familiei o a doua șansă la o viață normală?",
                actionType: "buttons",
                options: ["Da, vreau detalii", "Nu"],
                nextStep: "final_contact"
              },
              pensie_intro_1: {
                message: "Pensionarea poate fi cel mai lung concediu al vieții sau cel mai chinuitor.\n\nReducerea veniturilor va afecta: opțiunile personale, demnitatea și rolul în familie.",
                actionType: "buttons",
                options: ["Continuă"],
                nextStep: "pensie_intro_2"
              },
              pensie_intro_2: {
                message: "Când crezi că ar fi cel mai potrivit moment să începi să-ți planifici pensionarea?",
                actionType: "buttons",
                options: ["ACUM"],
                nextStep: "pensie_intro_3"
              },
              pensie_intro_3: {
                message: "Vei răspunde la 5 întrebări pentru a stabili suma de bani necesară pentru a-ți menține standardul de viață.",
                actionType: "buttons",
                options: ["Continuă"],
                nextStep: "pensie_ask_years"
              },
              pensie_ask_years: {
                message: "1. Exercițiu: ai 65 ani și ieși la pensie. Câți ani speri să mai trăiești din acest moment?",
                actionType: "buttons",
                options: ["10 ani", "15 ani", "20 ani"],
                nextStep: "pensie_ask_monthly_needed"
              },
              pensie_ask_monthly_needed: {
                message: "Care ar fi suma lunară necesară în completarea pensiei de stat pentru a-ți menține standardul (lei)?",
                actionType: "input",
                options: { type: "number", placeholder: "Ex: 2000" },
                nextStep: "pensie_show_deficit_1"
              },
              pensie_show_deficit_1: {
                message: "Am calculat. Necesarul total pentru acești ani este:\n\n**{deficit1} lei**\n\n(sumă lunară x perioadă x 12). Continuăm.",
                actionType: "buttons",
                options: ["Continuă"],
                nextStep: "pensie_ask_projects"
              },
              pensie_ask_projects: {
                message: "2. Ce planuri/proiecte ai pentru pensie (călătorii, hobby-uri)? Notează suma anuală necesară.",
                actionType: "input",
                options: { type: "number", placeholder: "Ex: 5000" },
                nextStep: "pensie_ask_debts"
              },
              pensie_ask_debts: {
                message: "3. La vârsta pensionării, te aștepți să mai ai de plătit credite? Care ar fi suma necesară achitării lor?",
                actionType: "input",
                options: { type: "number", placeholder: "Ex: 0" },
                nextStep: "pensie_ask_insurance"
              },
              pensie_ask_insurance: {
                message: "4. Ai vreo asigurare de viață cu economisire pentru pensie? Ce sumă s-a strâns?",
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
                message: "Calcul finalizat. Deficitul financiar cu care tu ai ieși la pensie este:\n\n**{finalDeficit} lei**",
                actionType: "buttons",
                options: ["Vezi Rezultatul"],
                nextStep: "pensie_ask_feeling"
              },
              pensie_ask_feeling: {
                message: "Cum ți se pare această sumă? Ce simți?",
                actionType: "input",
                options: { type: "text", placeholder: "Scrie aici..." },
                nextStep: "pensie_dramatic_options"
              },
              pensie_dramatic_options: {
                message: "În acest scenariu, cum ți s-ar ajusta standardul de viață? Bifează opțiunile:",
                actionType: "interactive_scroll_list",
                options: {
                  buttonText: "Am înțeles",
                  options: [
                    "Reducerea calității alimentelor",
                    "Limitarea utilităților",
                    "Limitarea accesului medical",
                    "Munca la vârstă înaintată",
                    "Apel la banii copiilor",
                    "Vânzarea de bunuri",
                    "Renunțarea la hobby-uri",
                    "Izolare socială"
                  ]
                },
                nextStep: "pensie_solution"
              },
              pensie_solution: {
                message: "Dacă nu ești mulțumit, ai fi interesat să vezi o soluție care să-ți mențină demnitatea la pensie?",
                actionType: "buttons",
                options: ["Da, vreau detalii", "Nu"],
                nextStep: "final_contact"
              },
              studii_intro_1: {
                message: [
                  "Menirea ta ca părinte este să îi dai copilului aripi în viață!",
                  "Ești de acord cu afirmația: „Cu cât vrei să zboare mai sus, cu atât sunt mai scumpe aripile”?"
                ],
                actionType: "buttons",
                options: ["De acord"],
                nextStep: "studii_intro_2"
              },
              studii_intro_2: {
                message: "Vei răspunde la 6 întrebări pentru a stabili suma necesară pentru: educație, dezvoltare, proiecte și familie.\n*Calculele sunt pentru un singur copil.",
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
                message: "Care ar fi suma anuală necesară pentru studii (taxă, chirie, masă, gadgeturi)? Încearcă să nu pui sumele „din burtă”.",
                actionType: "input",
                options: { type: "number", placeholder: "Ex: 30000" },
                nextStep: "studii_show_deficit_1"
              },
              studii_show_deficit_1: {
                message: "Am calculat costul de bază: **{deficit1} lei** (Sumă anuală x Ani). Continuăm.",
                actionType: "buttons",
                options: ["Continuă"],
                nextStep: "studii_ask_extra"
              },
              studii_ask_extra: {
                message: "2. Pentru dezvoltare personală (hobby-uri, viață socială, călătorii), care ar fi suma anuală necesară?",
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
                message: "4. Contribuția ta la nunta copilului. Care ar fi suma?",
                actionType: "input",
                options: { type: "number", placeholder: "Ex: 20000" },
                nextStep: "studii_ask_savings"
              },
              studii_ask_savings: {
                message: "5. Există economii sau investiții pe care copilul le-ar putea accesa acum?",
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
                message: "Deficitul financiar TOTAL pe care trebuie să îl acoperi este:\n\n**{finalDeficit} lei**",
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
                message: "Cum s-ar schimba viitorul lor dacă nu ar putea conta pe sprijinul tău?",
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
                    "Abandon școlar",
                    "Muncă excesivă în facultate",
                    "Scăderea încrederii în sine",
                    "Renunțarea la hobby-uri",
                    "Dependență financiară",
                    "Anxietate și teamă de viitor",
                    "Izolare față de prieteni"
                  ]
                },
                nextStep: "studii_solution"
              },
              studii_solution: {
                message: "Ai fi interesat de o soluție care să garanteze viitorul copilului?",
                actionType: "buttons",
                options: ["Da, vreau detalii", "Nu"],
                nextStep: "final_contact"
              },
              sanatate_intro_1: {
                 message: [
                   "„Un om sănătos are 1.000 de gânduri, un om bolnav are un singur gând.”",
                   "Când sănătatea este pusă la încercare, ai nevoie de bani și acces rapid la tratament."
                 ],
                 actionType: "buttons",
                 options: ["Continuă"],
                 nextStep: "sanatate_intro_2"
              },
              sanatate_intro_2: {
                 message: "Boala nu așteaptă să fii pregătit financiar. Ar fi de interes să vezi cât de pregătită este familia ta pentru un scenariu medical sever?",
                 actionType: "buttons",
                 options: ["Da", "Nu"],
                 nextStep: "sanatate_ask_sum"
              },
              sanatate_ask_sum: {
                 message: "Dacă mâine ai fi diagnosticat sau ai suferi un accident sever, ce sumă ți-ar oferi liniște financiară?",
                 actionType: "buttons",
                 options: ["50.000 lei", "100.000 lei", "200.000 lei", "Peste 200.000 lei"],
                 nextStep: "sanatate_ask_access"
              },
              sanatate_ask_access: {
                 message: "Cât de important este pentru tine accesul rapid la servicii medicale private de top? (Nota 1-10)",
                 actionType: "input",
                 options: { type: "number", placeholder: "Ex: 10" },
                 nextStep: "sanatate_ask_control"
              },
              sanatate_ask_control: {
                 message: "Care variantă te reprezintă cel mai bine?",
                 actionType: "buttons",
                 options: ["Vreau bani și decid eu", "Acces garantat în RO", "Acces garantat în Străinătate", "Le vreau pe ambele"],
                 nextStep: "sanatate_ask_current"
              },
              sanatate_ask_current: {
                 message: "Raportat la ce îți dorești, unde te afli acum?",
                 actionType: "buttons",
                 options: ["Doar asigurare de stat", "Am abonament/asigurare privată", "Am economii", "Nu am niciun plan"],
                 nextStep: "sanatate_dramatic_options"
              },
              sanatate_dramatic_options: {
                 message: "Dacă veniturile actuale nu sunt suficiente, ce opțiuni ai avea?",
                 actionType: "interactive_scroll_list",
                 options: {
                   buttonText: "Am înțeles",
                   options: [
                     "Să fac împrumuturi",
                     "Să vând bunuri/locuința",
                     "Să renunți la economii",
                     "Să reduci drastic cheltuielile",
                     "Să amâni proiecte personale",
                     "Să limitezi accesul la tratamente",
                     "Să depinzi exclusiv de stat"
                   ]
                 },
                 nextStep: "sanatate_solution"
              },
              sanatate_solution: {
                 message: "Ai vrea să vezi ce tip de protecție ți s-ar potrivi cel mai bine (bani + acces)?",
                 actionType: "buttons",
                 options: ["Da", "Nu"],
                 nextStep: "final_contact"
              },
              final_contact: {
                message: "Perfect. Te rog lasă-mi datele de contact pentru a-ți trimite analiza completă.",
                actionType: "form",
                options: {
                  buttonText: "Trimite Analiza",
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
                message: "Mulțumesc! Datele au fost transmise securizat.",
                actionType: "end",
                nextStep: ""
              }
            }
          };

        await setDoc(doc(db, "formTemplates", "master_standard_v1"), masterData);

        toast({
          title: "Succes!",
          description: "Șablonul Master a fost regenerat."
        });

        if (user) {
          fetchForms(user);
        }

      } catch (error: any) {
        console.error("Eroare la restaurare:", error);
        toast({
            variant: "destructive",
            title: "Eroare la restaurare",
            description: error.message
        });
      }
    });

    // 3. Deschidem Modalul
    setConfirmModalOpen(true);
  };
    if (loading) return <div className="text-center mt-8">Se încarcă formularele...</div>;

    return (
        <div className="flex flex-col gap-8">
            <div className="flex items-center justify-between">
                <h1 className="text-xl font-bold md:text-2xl">Formularele Tale</h1>
                 <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm"><FilePlus2 className="mr-2 h-4 w-4" /> Formular Nou</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Creează un Formular Nou</DialogTitle>
                            <DialogDescription>
                                Alege un șablon de start sau începe cu unul gol pe care îl poți personaliza.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                             <div className="grid gap-2">
                                <Label htmlFor="form-name">Nume Formular</Label>
                                <Input 
                                    id="form-name" 
                                    placeholder="Ex: Formular deces simplificat" 
                                    value={newFormTitle} 
                                    onChange={(e) => setNewFormTitle(e.target.value)}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="template-source">Pornește de la un șablon</Label>
                                <Select onValueChange={setSourceTemplateId} value={sourceTemplateId}>
                                    <SelectTrigger id="template-source">
                                        <SelectValue placeholder="Selectează un șablon" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="blank">Formular Gol</SelectItem>
                                        {templateForms.map(template => (
                                            <SelectItem key={template.id} value={template.id}>{template.title}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <DialogFooter>
                             <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>Anulează</Button>
                            <Button onClick={handleCreateForm} disabled={isCreating}>
                                {isCreating ? "Se creează..." : "Creează și Editează"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                 </Dialog>
            </div>

            {userForms.length === 0 && !loading && (
                <Card className="text-center p-8 border-dashed">
                    <CardHeader>
                        <CardTitle>Niciun formular personalizat</CardTitle>
                        <CardDescription>Nu ai încă niciun formular personal. Poți crea unul nou sau poți clona un șablon de mai jos pentru a începe.</CardDescription>
                    </CardHeader>
                </Card>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                 {userForms.map((form) => (
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

            <div className="mt-8">
                 <h2 className="text-lg font-bold md:text-xl mb-4">Șabloane Standard</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {templateForms.map((form) => (
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
            </div>
            
            {user?.email === "alinmflavius@gmail.com" && (
              <div className="mt-12 pt-8 border-t border-dashed border-destructive/30">
                  <h2 className="text-lg font-bold text-destructive mb-2">Zonă de Mentenanță</h2>
                  <p className="text-sm text-muted-foreground mb-4">Aceste acțiuni sunt ireversibile și pot afecta funcționarea aplicației. Folosește-le cu prudență.</p>
                  <div className="flex gap-4">
                      <Button variant="destructive" onClick={restoreMasterTemplate}>
                          <AlertTriangle className="mr-2 h-4 w-4" />
                          Regenerează Șablon Master (Admin)
                      </Button>
                  </div>
              </div>
            )}


            {/* --- Modale de Confirmare --- */}

            <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirmare Ștergere</DialogTitle>
                        <DialogDescription>
                            Ești absolut sigur că vrei să ștergi acest formular? Acțiunea este permanentă și nu poate fi anulată.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>Anulează</Button>
                        <Button variant="destructive" onClick={confirmDelete}>Da, Șterge</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            
             <Dialog open={confirmModalOpen} onOpenChange={setConfirmModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{confirmTitle}</DialogTitle>
                        <DialogDescription>
                            {confirmDescription}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setConfirmModalOpen(false)}>Anulează</Button>
                        <Button variant={confirmButtonVariant} onClick={handleConfirmAction}>{confirmButtonText}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div>
    );
}

    

