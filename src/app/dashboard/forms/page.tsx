"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, type User } from "firebase/auth";
// 1. FIX IMPORTURI: Separăm config-ul de funcțiile SDK
import { db, auth } from "@/lib/firebaseConfig";
import { 
  doc, 
  getDoc, 
  setDoc, 
  addDoc, 
  deleteDoc, 
  updateDoc, 
  collection, 
  query, 
  getDocs, 
  serverTimestamp 
} from "firebase/firestore";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit, Trash2, Copy, AlertTriangle, FilePlus2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FormTemplate {
  id: string;
  title: string;
  description?: string;
  ownerId?: string;
  isTemplate?: boolean;
  createdAt?: any;
}

// Definim email-ul administratorului aici
const ADMIN_EMAIL = "admin@email.com";

export default function FormsPage() {
  const router = useRouter();
  const { toast } = useToast();
  
  // State principal
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formTemplates, setFormTemplates] = useState<FormTemplate[]>([]);
  const [activeFormId, setActiveFormId] = useState<string | null>(null);

  // Modale
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newFormTitle, setNewFormTitle] = useState("");
  const [sourceTemplateId, setSourceTemplateId] = useState<string>("");
  const [isCreating, setIsCreating] = useState(false);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [formToDelete, setFormToDelete] = useState<string | null>(null);

  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  // FIX STATE INIT: Inițializăm cu o funcție goală, nu async
  const [confirmAction, setConfirmAction] = useState<() => void>(() => {});
  const [confirmTitle, setConfirmTitle] = useState("");
  const [confirmDescription, setConfirmDescription] = useState("");
  const [confirmButtonText, setConfirmButtonText] = useState("Confirmă");
  const [confirmButtonVariant, setConfirmButtonVariant] = useState<"default" | "destructive">("default");
  
  // Admin
  const [showMaintenance, setShowMaintenance] = useState(false);

  // 1. Auth & Data Fetching (Simplificat pentru a evita loop-uri)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.push("/login");
      } else {
        setUser(currentUser);
        // Verificăm dacă utilizatorul este admin
        setIsAdmin(currentUser.email === ADMIN_EMAIL);
        // Fetch data imediat ce avem userul
        fetchData(currentUser);
      }
    });
    return () => unsubscribe();
  }, [router]);

  const fetchData = async (currentUser: User) => {
    try {
      setLoading(true);
      // 1. Formular Activ Agent
      const agentDoc = await getDoc(doc(db, "agents", currentUser.uid));
      if (agentDoc.exists()) {
        setActiveFormId(agentDoc.data().activeFormId || null);
      }

      // 2. Toate Formularele
      const q = query(collection(db, "formTemplates"));
      const snap = await getDocs(q);
      const forms = snap.docs.map(d => ({ id: d.id, ...d.data() })) as FormTemplate[];
      setFormTemplates(forms);

      // 3. Default selection
      const standard = forms.filter(f => f.isTemplate);
      if (standard.length > 0) setSourceTemplateId(standard[0].id);

    } catch (e) {
      console.error("Fetch error:", e);
    } finally {
      setLoading(false);
    }
  };

  // --- HANDLERS ---

  const handleSetActiveForm = (formId: string) => {
    setConfirmTitle("Activare Formular");
    setConfirmDescription("Vrei să activezi acest formular pe link-ul tău?");
    setConfirmButtonText("Setează Activ");
    setConfirmButtonVariant("default");
    
    // Setăm acțiunea ca un callback simplu
    setConfirmAction(() => () => {
      if (!auth.currentUser) return;
      updateDoc(doc(db, "agents", auth.currentUser.uid), { activeFormId: formId })
        .then(() => {
            setActiveFormId(formId);
            toast({ title: "Succes", description: "Formular activat." });
            setConfirmModalOpen(false);
        })
        .catch(e => toast({ variant: "destructive", title: "Eroare", description: e.message }));
    });
    
    setConfirmModalOpen(true);
  };

  const handleDeleteClick = (formId: string) => {
    setFormToDelete(formId);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!formToDelete || !user) return;
    try {
      await deleteDoc(doc(db, "formTemplates", formToDelete));
      setFormTemplates(prev => prev.filter(f => f.id !== formToDelete));
      
      if (activeFormId === formToDelete) {
         await updateDoc(doc(db, "agents", user.uid), { activeFormId: null });
         setActiveFormId(null);
      }
      toast({ title: "Șters", description: "Formular șters." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Eroare", description: e.message });
    } finally {
      setIsDeleteModalOpen(false);
    }
  };

  const handleCreateForm = async () => {
    if (!newFormTitle.trim() || !user) return;
    setIsCreating(true);
    try {
      let flowData = {};
      let startStep = "welcome_1";

      if (sourceTemplateId === 'blank') {
          flowData = {
              welcome_1: { message: "Salut!", actionType: "buttons", options: ["Start"], nextStep: "end" },
              end: { message: "Final.", actionType: "end", nextStep: "" }
          };
      } else {
          const tmpl = await getDoc(doc(db, "formTemplates", sourceTemplateId));
          if (tmpl.exists()) {
              flowData = tmpl.data().flow || {};
              startStep = tmpl.data().startStepId || "welcome_1";
          }
      }

      const newForm = {
        title: newFormTitle,
        ownerId: user.uid,
        isTemplate: false,
        createdAt: serverTimestamp(),
        flow: flowData,
        startStepId: startStep
      };

      const ref = await addDoc(collection(db, "formTemplates"), newForm);
      setFormTemplates(prev => [...prev, { id: ref.id, ...newForm } as any]);
      
      await updateDoc(doc(db, "agents", user.uid), { activeFormId: ref.id });
      setActiveFormId(ref.id);

      setIsCreateModalOpen(false);
      setNewFormTitle("");
      router.push(`/dashboard/form-editor/${ref.id}`);
    } catch (e) {
      console.error(e);
    } finally {
      setIsCreating(false);
    }
  };

  const restoreMasterTemplate = () => {
    setConfirmTitle("Regenerare Master");
    setConfirmDescription("ATENȚIE: Se va regenera formularul Master cu cele 4 fluxuri. Ești sigur?");
    setConfirmButtonText("Da, Regenerează");
    setConfirmButtonVariant("destructive");

    setConfirmAction(() => async () => {
      try {
        await deleteDoc(doc(db, "formTemplates", "master_standard_v1")).catch(() => {});

        const masterData = {
          title: "Analiză Completă (Master)",
          description: "Include: Deces, Pensie, Studii, Sănătate - Premium Flow",
          startStepId: "intro_sequence",
          ownerId: null, 
          isTemplate: true, 
          createdAt: new Date(),
          flow: {
            // === 1. INTRODUCERE & ROUTER ===
            intro_sequence: {
              message: [
                "Viața produce pierderi financiare semnificative în patru situații majore.",
                "Dintre acestea, două situații sunt previzibile, precis așezate pe axa vieții, iar două sunt total imprevizibile („ceasul rău, pisica neagră”).",
                "**Previzibile:**\n1. Pensionarea – reducerea drastică a opțiunilor\n2. Studiile copiilor – cheltuieli complexe\n\n**Imprevizibile:**\n1. Decesul – detonează standardul de viață\n2. Bolile grave – impact major asupra economiilor"
              ],
              actionType: "buttons", options: ["Continuă"], nextStep: "ask_topic"
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

            // === 2. SCENARIUL DECES ===
            deces_intro_1: { message: ["Un deces afectează negativ profund și pe termen lung atât **planul existențial** (drama pierderii), cât și **planul financiar**."], actionType: "buttons", options: ["Continuă"], nextStep: "deces_intro_2" },
            deces_intro_2: { message: "Vei răspunde la 6 întrebări pentru a stabili suma necesară familiei pentru:\n(1.) standardul de viață\n(2.) proiecte în desfășurare\n(3.) credite / datorii", actionType: "buttons", options: ["Sunt gata"], nextStep: "deces_ask_period" },
            deces_ask_period: { message: "1. În cazul unui posibil deces, câți ani ar avea nevoie familia ta de susținere financiară?", actionType: "buttons", options: ["3 ani", "4 ani", "5 ani"], nextStep: "deces_ask_monthly_sum" },
            deces_ask_monthly_sum: { message: "Care ar fi suma de bani lunară necesară în această perioadă (în lei)?", actionType: "input", options: { type: "number", placeholder: "Ex: 5000" }, nextStep: "deces_show_deficit_1" },
            deces_show_deficit_1: { message: ["Am notat primul deficit: **{deficit1} lei**.", "Această sumă reprezintă deficitul pentru menținerea standardului de viață.", "Continuăm cu cheltuielile specifice."], actionType: "buttons", options: ["Da"], nextStep: "deces_ask_event_costs" },
            deces_ask_event_costs: { message: "2. Ce sumă unică (în lei) ar fi necesară pentru cheltuieli imediate (înmormântare, taxe)?", actionType: "input", options: { type: "number", placeholder: "Ex: 20000" }, nextStep: "deces_ask_projects" },
            deces_ask_projects: { message: "3. Există proiecte în desfășurare (construcție, sport copii)? Care ar fi suma necesară finalizării lor?", actionType: "input", options: { type: "number", placeholder: "Ex: 50000" }, nextStep: "deces_ask_debts" },
            deces_ask_debts: { message: "4. Rămân pe umerii familiei credite sau datorii? Care ar fi suma necesară pentru a le stinge?", actionType: "input", options: { type: "number", placeholder: "Ex: 150000" }, nextStep: "deces_ask_insurance" },
            deces_ask_insurance: { message: "5. Familia ta ar beneficia de vreo asigurare de viață pe numele tău (doar cele pentru familie)? Dacă da, care este suma?", actionType: "input", options: { type: "number", placeholder: "Ex: 0" }, nextStep: "deces_ask_savings" },
            deces_ask_savings: { message: "6. Familia ta ar putea accesa anumite economii sau investiții imediate? Care este suma disponibilă?", actionType: "input", options: { type: "number", placeholder: "Ex: 10000" }, nextStep: "deces_show_final_result" },
            deces_show_final_result: { message: ["Calcul finalizat.", "Deficitul financiar (Moștenirea Negativă) cu care familia ta ar păși în viitor este:\n\n**{finalDeficit} lei**"], actionType: "buttons", options: ["Vezi Rezultatul"], nextStep: "deces_ask_feeling" },
            deces_ask_feeling: { message: "Cum ți se pare această sumă?", actionType: "input", options: { type: "text", placeholder: "Scrie un gând..." }, nextStep: "deces_ask_feeling_2" },
            deces_ask_feeling_2: { message: "Care este sentimentul pe care îl simți acum?", actionType: "input", options: { type: "text", placeholder: "Scrie un sentiment..." }, nextStep: "deces_ask_dramatic_options" },
            deces_ask_dramatic_options: { message: "În acest scenariu sumbru, ce opțiuni realiste ar avea cei dragi? Bifează-le:", actionType: "interactive_scroll_list", options: { buttonText: "Am bifat", options: ["Să se mute cu părinții", "Să se mute în alt oraș", "Să muncească suplimentar", "Să vândă din bunurile personale", "Să vândă casa", "Să reducă drastic cheltuielile", "Să renunțe la proiecte", "Să amâne educația copiilor", "Să ceară ajutor", "Să renunțe la economii"] }, nextStep: "deces_present_solution" },
            deces_present_solution: { message: ["Dacă nu ești mulțumit, ai fi interesat să vezi o soluție personalizată?", "Practic, o soluție prin care dragostea ta continuă chiar și după tine."], actionType: "buttons", options: ["Da, vreau detalii", "Nu"], nextStep: "final_contact" },

            // === 3. SCENARIUL PENSIE ===
            pensie_intro_1: { message: ["Pensionarea poate fi cel mai lung concediu al vieții sau cel mai chinuitor.", "Reducerea veniturilor va afecta: opțiunile personale, demnitatea și rolul în familie."], actionType: "buttons", options: ["Continuă"], nextStep: "pensie_ask_start_time" },
            pensie_ask_start_time: { message: "Când crezi că ar fi cel mai potrivit moment să începi să-ți planifici pensionarea?", actionType: "buttons", options: ["ACUM"], nextStep: "pensie_quiz_intro" },
            pensie_quiz_intro: { message: "Vei răspunde la 5 întrebări pentru a stabili suma necesară pentru a-ți menține standardul de viață.", actionType: "buttons", options: ["Sunt gata"], nextStep: "pensie_ask_years" },
            pensie_ask_years: { message: "1. Exercițiu: ai 65 ani și ieși la pensie. Câți ani speri să mai trăiești din acest moment?", actionType: "buttons", options: ["10 ani", "15 ani", "20 ani"], nextStep: "pensie_ask_monthly_needed" },
            pensie_ask_monthly_needed: { message: "Care ar fi suma lunară necesară în completarea pensiei de stat (în lei)?", actionType: "input", options: { type: "number", placeholder: "Ex: 2000" }, nextStep: "pensie_show_deficit_1" },
            pensie_show_deficit_1: { message: "Am calculat. Necesarul total pentru acești ani este:\n\n**{deficit1} lei**\n\n(sumă lunară x perioadă x 12). Continuăm.", actionType: "buttons", options: ["Continuă"], nextStep: "pensie_ask_projects_list" },
            
            pensie_ask_projects_list: { message: "2. Ce planuri ai pentru pensie? Bifează activitățile de interes:", actionType: "interactive_scroll_list", options: { buttonText: "Am selectat", options: ["Călătorii", "Cursuri", "Sport", "Voluntariat", "Hobby-uri", "Nepoți", "Grădinărit", "Business"] }, nextStep: "pensie_ask_projects" },
            pensie_ask_projects: { message: "Acum, fă un calcul total mental pentru aceste activități. Suma anuală necesară?", actionType: "input", options: { type: "number", placeholder: "Ex: 5000" }, nextStep: "pensie_ask_debts" },
            
            pensie_ask_debts: { message: "3. La vârsta pensionării, te aștepți să mai ai de plătit credite? Suma necesară achitării lor?", actionType: "input", options: { type: "number", placeholder: "Ex: 0" }, nextStep: "pensie_ask_insurance" },
            pensie_ask_insurance: { message: "4. Ai vreo asigurare de viață cu economisire pentru pensie? Ce sumă s-a strâns?", actionType: "input", options: { type: "number", placeholder: "Ex: 0" }, nextStep: "pensie_ask_savings" },
            pensie_ask_savings: { message: "5. Ai economii (Pilon 2, 3, investiții) accesibile la pensie? Ce sumă?", actionType: "input", options: { type: "number", placeholder: "Ex: 40000" }, nextStep: "pensie_show_final_result" },
            pensie_show_final_result: { message: "Calcul finalizat. Deficitul financiar cu care tu ai ieși la pensie este:\n\n**{finalDeficit} lei**", actionType: "buttons", options: ["Vezi Rezultatul"], nextStep: "pensie_ask_feeling" },
            pensie_ask_feeling: { message: "Cum ți se pare această sumă?", actionType: "input", options: { type: "text", placeholder: "Scrie..." }, nextStep: "pensie_ask_feeling_2" },
            pensie_ask_feeling_2: { message: "Care este sentimentul pe care îl simți acum?", actionType: "input", options: { type: "text", placeholder: "Scrie..." }, nextStep: "pensie_dramatic_options" },
            pensie_dramatic_options: { message: "Cum ți s-ar ajusta standardul de viață? Bifează:", actionType: "interactive_scroll_list", options: { buttonText: "Am înțeles", options: ["Reducerea alimentelor", "Limitarea utilităților", "Limitare medicală", "Munca la bătrânețe", "Apel la copii", "Izolare socială"] }, nextStep: "pensie_solution" },
            pensie_solution: { message: "Dacă nu ești mulțumit, vrei să vezi o soluție care să-ți mențină demnitatea?", actionType: "buttons", options: ["Da, vreau detalii", "Nu"], nextStep: "final_contact" },

            // === 4. SCENARIUL STUDII ===
            studii_intro_1: { message: ["Menirea ta ca părinte este să îi dai copilului aripi în viață!", "Ești de acord cu afirmația: „Cu cât vrei să zboare mai sus, cu atât sunt mai scumpe aripile”?"], actionType: "buttons", options: ["De acord"], nextStep: "studii_intro_2" },
            studii_intro_2: { message: "Vei răspunde la 6 întrebări pentru a stabili suma necesară pentru: educație, dezvoltare, proiecte.\n*Calculele sunt pentru un singur copil.", actionType: "buttons", options: ["Continuă"], nextStep: "studii_ask_years" },
            studii_ask_years: { message: "1. Câți ani ești dispus să-ți susții financiar copilul în studenție?", actionType: "buttons", options: ["3 ani", "4 ani", "5 ani", "6 ani"], nextStep: "studii_ask_annual_cost_list" },
            
            studii_ask_annual_cost_list: { message: "Bifează cheltuielile studentului (taxă, chirie, masă, gadgeturi):", actionType: "interactive_scroll_list", options: { buttonText: "Am selectat", options: ["Taxă școlarizare", "Cazare/Chirie", "Mâncare", "Transport", "Gadgeturi", "Cărți"] }, nextStep: "studii_ask_annual_cost" },
            studii_ask_annual_cost: { message: "Fă un calcul total mental: Care ar fi suma ANUALĂ necesară (în lei)?", actionType: "input", options: { type: "number", placeholder: "Ex: 30000" }, nextStep: "studii_show_deficit_1" },
            studii_show_deficit_1: { message: "Cost de bază: **{deficit1} lei** (Sumă anuală x Ani). Continuăm.", actionType: "buttons", options: ["Continuă"], nextStep: "studii_ask_extra_list" },
            
            studii_ask_extra_list: { message: "2. Pentru dezvoltare personală (hobby, viață socială). Bifează:", actionType: "interactive_scroll_list", options: { buttonText: "Selectat", options: ["Tabere", "Hobby", "Ieșiri", "Călătorii", "Haine"] }, nextStep: "studii_ask_extra" },
            studii_ask_extra: { message: "Care ar fi suma anuală necesară pentru acestea?", actionType: "input", options: { type: "number", placeholder: "Ex: 5000" }, nextStep: "studii_ask_projects_list" },
            
            studii_ask_projects_list: { message: "3. Proiecte majore la debutul în viață. Bifează:", actionType: "interactive_scroll_list", options: { buttonText: "Am selectat", options: ["Afacere personală", "Mașină", "Avans casă"] }, nextStep: "studii_ask_projects" },
            studii_ask_projects: { message: "Suma necesară pentru aceste proiecte?", actionType: "input", options: { type: "number", placeholder: "Ex: 10000" }, nextStep: "studii_ask_wedding" },
            
            studii_ask_wedding: { message: "4. Contribuția ta la nuntă? (Suma)", actionType: "input", options: { type: "number", placeholder: "Ex: 20000" }, nextStep: "studii_ask_savings" },
            studii_ask_savings: { message: "5. Economii existente pentru copil?", actionType: "input", options: { type: "number", placeholder: "Ex: 5000" }, nextStep: "studii_ask_insurance" },
            studii_ask_insurance: { message: "6. Asigurări existente pentru copil?", actionType: "input", options: { type: "number", placeholder: "Ex: 0" }, nextStep: "studii_ask_children_count" },
            studii_ask_children_count: { message: "Pentru a finaliza: Câți copii ai? (Vom înmulți deficitul).", actionType: "input", options: { type: "number", placeholder: "Ex: 1" }, nextStep: "studii_show_final_result" },
            studii_show_final_result: { message: "Deficitul financiar TOTAL pe care trebuie să îl acoperi este:\n\n**{finalDeficit} lei**", actionType: "buttons", options: ["Vezi Rezultatul"], nextStep: "studii_ask_feeling" },
            studii_ask_feeling: { message: "Cum ți se pare această sumă?", actionType: "input", options: { type: "text", placeholder: "Scrie..." }, nextStep: "studii_ask_feeling_2" },
            studii_ask_feeling_2: { message: "Ce simți?", actionType: "input", options: { type: "text", placeholder: "Scrie..." }, nextStep: "studii_dramatic_intro" },
            studii_dramatic_intro: { message: ["Ar mai fi o nuanță... și nu e pozitivă.", "Cum s-ar schimba viitorul lor dacă nu ar putea conta pe sprijinul tău?"], actionType: "buttons", options: ["Continuă"], nextStep: "studii_dramatic_options" },
            studii_dramatic_options: { message: "Bifează scenariile posibile:", actionType: "interactive_scroll_list", options: { buttonText: "Am înțeles", options: ["Abandon școlar", "Muncă excesivă", "Scăderea încrederii", "Dependență financiară", "Anxietate"] }, nextStep: "studii_solution" },
            studii_solution: { message: "Ai fi interesat de o soluție care să garanteze viitorul copilului?", actionType: "buttons", options: ["Da, vreau detalii", "Nu"], nextStep: "final_contact" },

            // === 5. SĂNĂTATE ===
            sanatate_intro_1: { message: ["„Un om sănătos are 1.000 de gânduri, un om bolnav are un singur gând.”", "Când sănătatea este pusă la încercare, ai nevoie de bani și acces rapid la tratament."], actionType: "buttons", options: ["Continuă"], nextStep: "sanatate_intro_2" },
            sanatate_intro_2: { message: "Boala nu așteaptă să fii pregătit financiar. Ar fi de interes să vezi cât de pregătită este familia ta pentru un scenariu medical sever?", actionType: "buttons", options: ["Da", "Nu"], nextStep: "sanatate_info_types" },
            sanatate_info_types: { message: ["Unele situații sunt ușoare, altele grave și necesită resurse.", "**Întrebare-cheie:** Dacă mâine ai fi diagnosticat, ce sumă ți-ar oferi liniște?"], actionType: "buttons", options: ["50.000 lei", "100.000 lei", "200.000 lei", "Peste 200.000 lei"], nextStep: "sanatate_ask_access" },
            sanatate_ask_access: { message: "Cât de important este accesul rapid la servicii private (Scală 1-10)?", actionType: "input", options: { type: "number", placeholder: "Ex: 10" }, nextStep: "sanatate_ask_control" },
            sanatate_ask_control: { message: "Ce preferi?", actionType: "buttons", options: ["Vreau bani", "Acces în RO", "Acces Extern", "Ambele"], nextStep: "sanatate_ask_current" },
            sanatate_ask_current: { message: "Unde te afli acum?", actionType: "buttons", options: ["Doar stat", "Privat", "Economii", "Nu știu"], nextStep: "sanatate_dramatic_options" },
            sanatate_dramatic_options: { message: "Dacă nu ai bani, ce ai face? Bifează:", actionType: "interactive_scroll_list", options: { buttonText: "Am înțeles", options: ["Împrumuturi", "Vând casa", "Renunț la economii", "Sistemul public", "Amân tratamentul"] }, nextStep: "sanatate_solution" },
            sanatate_solution: { message: ["Ești mulțumit cu aceste opțiuni?", "Vrei o soluție de protecție?"], actionType: "buttons", options: ["Da", "Nu"], nextStep: "final_contact" },

            // === 6. FINAL ===
            final_contact: {
              message: "Perfect. Lasă-mi datele tale pentru analiză.",
              actionType: "form",
              options: {
                buttonText: "Trimite",
                gdpr: "Sunt de acord.",
                fields: [
                  { name: "name", placeholder: "Nume Prenume", type: "text", required: true },
                  { name: "email", placeholder: "Email", type: "email", required: true },
                  { name: "phone", placeholder: "Telefon", type: "tel", required: true }
                ]
              },
              nextStep: "thank_you_final"
            },
            thank_you_final: { message: "Mulțumesc! Datele au fost transmise.", actionType: "end", nextStep: "" }
          }
        };

        await setDoc(doc(db, "formTemplates", "master_standard_v1"), masterData);
        setConfirmModalOpen(false);
        toast({ title: "Succes", description: "Master Form a fost regenerat!" });
        window.location.reload();

      } catch (e: any) {
        setConfirmModalOpen(false);
        toast({ variant: "destructive", title: "Eroare la regenerare", description: e.message });
      }
    });
    setConfirmModalOpen(true);
  };
  
  if (loading) return <div className="p-8 text-white text-center">Se încarcă...</div>;

  const userForms = formTemplates.filter(f => f.ownerId === user?.uid);
  const standardForms = formTemplates.filter(f => !f.ownerId || f.isTemplate);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto text-white space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Management Formulare</h1>
        <Button onClick={() => setIsCreateModalOpen(true)} className="bg-amber-500 text-black font-bold">
           <FilePlus2 className="mr-2 h-4 w-4"/> Creează Formular Nou
        </Button>
      </div>

      {/* --- Grila de Formulare Personale --- */}
      <h2 className="text-xl font-semibold text-gray-300 border-b border-gray-700 pb-2">Formularele Tale</h2>
      {userForms.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {userForms.map(form => (
            <Card key={form.id} className={`bg-gray-900 border ${activeFormId === form.id ? 'border-green-500' : 'border-gray-800'}`}>
              <CardHeader>
                <CardTitle>{form.title}</CardTitle>
                <CardDescription>Personalizat</CardDescription>
              </CardHeader>
              <CardFooter className="flex flex-col sm:flex-row gap-2 pt-4 border-t border-gray-800">
                <div className="flex w-full sm:w-auto gap-2">
                  <Button variant="destructive" size="sm" onClick={() => handleDeleteClick(form.id)}><Trash2 className="w-4 h-4"/></Button>
                  <Button variant="secondary" size="sm" onClick={() => router.push(`/dashboard/form-editor/${form.id}`)}><Edit className="w-4 h-4"/></Button>
                </div>
                {activeFormId !== form.id ? (
                  <Button size="sm" className="w-full sm:flex-1 bg-amber-500 text-black" onClick={() => handleSetActiveForm(form.id)}>Setează Activ</Button>
                ) : (
                  <Button size="sm" disabled className="w-full sm:flex-1 bg-green-600/20 text-green-500 border border-green-500">Activ</Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="p-6 border-2 border-dashed border-gray-800 rounded-lg text-center text-gray-500">
          <p>Nu ai niciun formular personalizat.</p>
          <p className="text-sm">Poți clona un șablon pentru a începe.</p>
        </div>
      )}

      {/* --- Șabloane Standard --- */}
      <div className="mt-12">
          <h2 className="text-xl font-semibold mb-4 text-gray-300 border-b border-gray-700 pb-2">Șabloane Standard</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {standardForms.map(form => (
                  <div key={form.id} className="flex items-center justify-between p-4 bg-gray-800 rounded-lg border border-gray-700">
                      <span className="font-medium">{form.title}</span>
                      <Button size="sm" variant="outline" onClick={() => { setSourceTemplateId(form.id); setNewFormTitle(form.title + " (Copie)"); setIsCreateModalOpen(true); }}>
                          <Copy className="w-4 h-4 mr-2"/> Clonează
                      </Button>
                  </div>
              ))}
          </div>
      </div>

      {/* --- Zona de Administrare --- */}
      <div className="mt-12 pt-6 border-t border-gray-800">
        <button onClick={() => setShowMaintenance(!showMaintenance)} className="text-xs text-gray-600 hover:text-gray-400">
            🛠️ Opțiuni Avansate
        </button>
        {showMaintenance && (
            <div className="mt-4 p-4 bg-red-900/10 border border-red-900/30 rounded">
                <Button variant="destructive" onClick={restoreMasterTemplate}>
                    <AlertTriangle className="w-4 h-4 mr-2"/> Regenerează Șablon Master
                </Button>
            </div>
        )}
      </div>

      {/* --- DIALOGURI MODALE --- */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Creează un Formular Nou</DialogTitle></DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-form-title">Nume Formular</Label>
              <Input id="new-form-title" placeholder="Ex: Analiză Rapidă Pensie" value={newFormTitle} onChange={e => setNewFormTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="source-template">Pornește de la un Șablon</Label>
              <Select value={sourceTemplateId} onValueChange={setSourceTemplateId}>
                  <SelectTrigger id="source-template"><SelectValue placeholder="Sursă" /></SelectTrigger>
                  <SelectContent>
                      <SelectItem value="blank">Formular Gol</SelectItem>
                      {standardForms.map(f => <SelectItem key={f.id} value={f.id}>{f.title}</SelectItem>)}
                  </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter><Button onClick={handleCreateForm} disabled={isCreating}>{isCreating ? "Se creează..." : "Creează"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Confirmare Ștergere</DialogTitle><DialogDescription>Această acțiune este ireversibilă. Ești sigur?</DialogDescription></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>Anulează</Button>
            <Button variant="destructive" onClick={confirmDelete}>Da, Șterge</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmModalOpen} onOpenChange={setConfirmModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{confirmTitle}</DialogTitle><DialogDescription>{confirmDescription}</DialogDescription></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmModalOpen(false)}>Anulează</Button>
            <Button variant={confirmButtonVariant} onClick={() => confirmAction()}>{confirmButtonText}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}