"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, type User } from "firebase/auth";
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

export default function FormsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [formTemplates, setFormTemplates] = useState<FormTemplate[]>([]);
  const [activeFormId, setActiveFormId] = useState<string | null>(null);

  // Modals State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newFormTitle, setNewFormTitle] = useState("");
  const [sourceTemplateId, setSourceTemplateId] = useState<string>("");
  const [isCreating, setIsCreating] = useState(false);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [formToDelete, setFormToDelete] = useState<string | null>(null);

  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<() => Promise<void>>(async () => {});
  const [confirmTitle, setConfirmTitle] = useState("");
  const [confirmDescription, setConfirmDescription] = useState("");
  const [confirmButtonText, setConfirmButtonText] = useState("Confirmă");
  const [confirmButtonVariant, setConfirmButtonVariant] = useState<"default" | "destructive">("default");

  const [showMaintenance, setShowMaintenance] = useState(false);

  // 1. Auth & Data Fetching
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.push("/login");
      } else {
        setUser(currentUser);
        fetchData(currentUser);
      }
    });
    return () => unsubscribe();
  }, [router]);

  const fetchData = async (currentUser: User) => {
    try {
      setLoading(true);
      const agentDoc = await getDoc(doc(db, "agents", currentUser.uid));
      if (agentDoc.exists()) setActiveFormId(agentDoc.data().activeFormId || null);

      const q = query(collection(db, "formTemplates"));
      const snap = await getDocs(q);
      const forms = snap.docs.map(d => ({ id: d.id, ...d.data() })) as FormTemplate[];
      setFormTemplates(forms);

      const standard = forms.filter(f => f.isTemplate);
      if (standard.length > 0) setSourceTemplateId(standard[0].id);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // 2. Actions
  const handleSetActiveForm = (formId: string) => {
    setConfirmTitle("Activare Formular");
    setConfirmDescription("Vrei să activezi acest formular pe link-ul tău?");
    setConfirmButtonText("Setează Activ");
    setConfirmButtonVariant("default");
    setConfirmAction(() => async () => {
      if (!user) return;
      await updateDoc(doc(db, "agents", user.uid), { activeFormId: formId });
      setActiveFormId(formId);
      toast({ title: "Succes", description: "Formular activat." });
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
    } catch (e) {
      toast({ variant: "destructive", title: "Eroare", description: "Nu s-a putut șterge." });
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
              end: { message: "Final.", actionType: "end" }
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
      router.push(`/dashboard/form-editor?id=${ref.id}`);
    } catch (e) {
      console.error(e);
    } finally {
      setIsCreating(false);
    }
  };

  const restoreMasterTemplate = async () => {
    if (!window.confirm("ATENȚIE: Această acțiune va regenera formularul Master cu structura FINALĂ (Checklist + Sume + Ritm Controlat). Continui?")) return;

    try {
      // 1. Curățare
      await deleteDoc(doc(db, "formTemplates", "master_standard_v1")).catch(() => {});

      // 2. Definire Date
      const masterData = {
        title: "Analiză Completă (Master)",
        description: "Deces, Pensie, Studii, Sănătate - Cu liste de verificare.",
        startStepId: "intro_sequence",
        ownerId: null, 
        isTemplate: true,
        createdAt: new Date(),
        flow: {
          // ============================================================
          // 1. INTRODUCERE GENERALĂ
          // ============================================================
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

          // ============================================================
          // 2. SCENARIUL DECES
          // ============================================================
          deces_intro_1: {
            message: ["Un deces afectează negativ profund și pe termen lung atât **planul existențial** (drama care însoțește pierderea persoanei dragi), cât și **planul financiar** (dispariția opțiunilor, apariția presiunilor financiare și a necesității de a ajusta nivelul de trai la noile realități)."],
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
            message: "1. În cazul unui posibil deces, câți ani ar avea nevoie familia ta de susținere financiară pentru a-și menține nivelul de trai fără să fie nevoită să facă ajustări majore în stilul de viață (ex. vânzarea unor bunuri, lichidarea unor investiții, muncă suplimentară etc.)",
            actionType: "buttons",
            options: ["3 ani", "4 ani", "5 ani"],
            nextStep: "deces_ask_monthly_sum"
          },
          deces_ask_monthly_sum: {
            message: "Care ar fi suma de bani lunară necesară în această perioadă (în lei)?\n\n(Poți să te gândești la suma pe care o produci tu lunar).",
            actionType: "input",
            options: { type: "number", placeholder: "Ex: 5000" },
            nextStep: "deces_show_deficit_1"
          },
          deces_show_deficit_1: {
            message: [
                "Am notat primul deficit: **{deficit1} lei**.",
                "Această sumă reprezintă deficitul pentru menținerea standardului de viață pe {deces_ask_period} (liniștea sufletească și confortul financiar).",
                "Continuăm cu cheltuielile specifice."
            ],
            actionType: "buttons",
            options: ["Da, continuăm"],
            nextStep: "deces_ask_event_costs"
          },
          deces_ask_event_costs: {
            message: "2. În cazul unui posibil deces, evenimentul în sine este însoțit de anumite cheltuieli (ex. înmormântare, taxe succesorale etc.).\n\nCare ar fi această sumă?",
            actionType: "input",
            options: { type: "number", placeholder: "Ex: 20000" },
            nextStep: "deces_ask_projects"
          },
          deces_ask_projects: {
            message: "3. În cazul unui posibil deces, există anumite proiecte în desfășurare la acest moment care ar avea de suferit (ex. o construcție la stadiu „la roșu” sau un sport de performanță al copiilor)?\n\nCare ar fi suma totală de bani (în lei) necesară finalizării acestor proiecte?",
            actionType: "input",
            options: { type: "number", placeholder: "Ex: 50000" },
            nextStep: "deces_ask_debts"
          },
          deces_ask_debts: {
            message: "4. În cazul unui posibil deces, rămân pe umerii familiei anumite responsabilități financiare de tip credite, datorii, obligații financiare etc.?\n\nCare ar fi suma de bani de care ar avea nevoie pentru a stinge aceste obligații (în lei)?",
            actionType: "input",
            options: { type: "number", placeholder: "Ex: 150000" },
            nextStep: "deces_show_brute_deficit"
          },
          deces_show_brute_deficit: {
             message: "Am calculat necesarul total brut: **{bruteDeficit} lei**.\n\nPentru a avea o imagine clară și corectă a necesarului financiar, vom mai explora două domenii care ajută în astfel de situații.",
             actionType: "buttons",
             options: ["Continuă"],
             nextStep: "deces_ask_insurance"
          },
          deces_ask_insurance: {
            message: "5. În cazul unui posibil deces, familia ta ar beneficia de vreo asigurare de viață pe numele tău? (Nu mă refer la cele cesionate băncii, ci acele asigurări care să aibă ca beneficiar - familia ta).\n\nDacă da, care este suma?",
            actionType: "input",
            options: { type: "number", placeholder: "Ex: 0" },
            nextStep: "deces_ask_savings"
          },
          deces_ask_savings: {
            message: "6. În cazul unui posibil deces, familia ta ar putea accesa anumite economii sau investiții (ex. chirii, vânzarea unui imobil etc.)?\n\nDacă da, care este suma de bani disponibilă?",
            actionType: "input",
            options: { type: "number", placeholder: "Ex: 10000" },
            nextStep: "deces_show_final_intro"
          },
          deces_show_final_intro: {
             message: "Calcul finalizat. Voi scădea resursele existente din necesarul total...",
             actionType: "buttons",
             options: ["Continuă"],
             nextStep: "deces_show_final_result"
          },
          deces_show_final_result: {
            message: "Deficitul financiar (Moștenirea Negativă) cu care familia ta ar păși în acest viitor sumbru dacă n-ar mai putea conta pe sprijinul tău financiar este:\n\n**{finalDeficit} lei**",
            actionType: "buttons",
            options: ["Vezi Rezultatul"],
            nextStep: "deces_ask_feeling"
          },
          deces_ask_feeling: {
            message: "Cum ți se pare această sumă?",
            actionType: "input",
            options: { type: "text", placeholder: "Scrie un gând..." },
            nextStep: "deces_ask_feeling_2"
          },
          deces_ask_feeling_2: {
            message: "Care este sentimentul pe care îl simți acum?",
            actionType: "input",
            options: { type: "text", placeholder: "Scrie un sentiment..." },
            nextStep: "deces_ask_dramatic_options"
          },
          deces_ask_dramatic_options: {
            message: "În acest scenariu de imaginație sumbru, ce opțiuni ar avea cei dragi ai tăi pentru a menține un oarecare echilibru în standardul de viață?\n\nBifează opțiunile realiste:",
            actionType: "interactive_scroll_list",
            options: {
              buttonText: "Am bifat",
              options: [
                "Să se mute cu părinții",
                "Să se mute în alt oraș",
                "Să muncească suplimentar (și să dispară din viața copiilor)",
                "Să vândă din bunurile personale",
                "Să vândă casa / apartamentul",
                "Să reducă drastic cheltuielile / să renunțe la hobby-uri",
                "Să renunțe la proiecte personale",
                "Să amâne educația copiilor",
                "Să ceară ajutor de la familie și prieteni",
                "Să renunțe la economii / investiții",
                "Să accepte orice compromis major",
                "Să se căsătorească din obligații financiare"
              ]
            },
            nextStep: "deces_present_solution"
          },
          deces_present_solution: {
            message: [
                "Dacă nu ești foarte mulțumit cu opțiunile pe care familia ta le are pentru a menține standardul actual de viață, ai fi interesat să vezi o soluție personalizată?",
                "Practic, o soluție prin care dragostea ta și grija ta pentru ei va continua chiar și după tine.",
                "Poți crea instant o moștenire care să îi ajute financiar pe cei dragi ție chiar și (mai ales!) în absența ta!"
            ],
            actionType: "buttons",
            options: ["Da, vreau detalii", "Nu"],
            nextStep: "final_contact"
          },

          // ============================================================
          // 3. SCENARIUL PENSIONARE_editat Marius_pensionare.md.txt]
          // ============================================================
          pensie_intro_1: {
            message: "Pensionarea poate fi cel mai lung concediu al vieții sau cel mai chinuitor concediu al vieții.",
            actionType: "buttons",
            options: ["Continuă"],
            nextStep: "pensie_intro_2"
          },
          pensie_intro_2: {
            message: "Reducerea semnificativă a veniturilor la vârsta pensionării va afecta calitatea și standardul vieții tale în cel puțin 3 domenii:\n\n1. Opțiunile personale (stil de viață, hobby-uri, plăceri)\n2. Demnitatea și stima de sine (dependență financiară)\n3. Tranziția de la rolul de susținător la susținut (impact psihologic)",
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
            message: "Vei răspunde la 5 întrebări pentru a stabili suma de bani de care ai avea nevoie pentru a-ți menține standardul de viață dacă mâine ai ieși la pensie.",
            actionType: "buttons",
            options: ["Sunt gata"],
            nextStep: "pensie_ask_years"
          },
          pensie_ask_years: {
            message: "1. Facem un exercițiu de imaginație: ai 65 ani, ieși la pensie și instant pierzi din venituri.\n\nCâți ani speri să mai trăiești din acest moment?",
            actionType: "buttons",
            options: ["10 ani", "15 ani", "20 ani"],
            nextStep: "pensie_ask_monthly_needed"
          },
          pensie_ask_monthly_needed: {
            message: "Care ar fi suma de bani lunară de care ai avea nevoie în completarea pensiei de stat pentru a-ți putea menține standardul de viață (în lei)?",
            actionType: "input",
            options: { type: "number", placeholder: "Ex: 2000" },
            nextStep: "pensie_show_deficit_1"
          },
          pensie_show_deficit_1: {
            message: "Am calculat. Necesarul total pentru acești ani este:\n\n**{deficit1} lei**\n\n(sumă lunară x perioadă x 12).",
            actionType: "buttons",
            options: ["Continuă"],
            nextStep: "pensie_ask_projects_list"
          },
          
          // --- Checklist Pensie ---
          pensie_ask_projects_list: {
            message: "2. Ce planuri / proiecte / obiective personale ți-ai propus pentru perioada pensionării? Bifează activitățile de interes:",
            actionType: "interactive_scroll_list",
            options: {
                buttonText: "Am selectat",
                options: [
                    "Călătorii și excursii culturale",
                    "Cursuri și workshop-uri de dezvoltare",
                    "Activități sportive moderate",
                    "Voluntariat în comunitate",
                    "Hobby-uri creative",
                    "Întâlniri sociale și cluburi",
                    "Sprijin pentru familie și nepoți",
                    "Participare la asociații culturale sau civice",
                    "Grădinărit și îngrijirea casei",
                    "Consultanță și mentoring",
                    "Investiții imobiliare",
                    "Deschiderea unui business"
                ]
            },
            nextStep: "pensie_ask_projects_sum"
          },
          pensie_ask_projects_sum: {
            message: "Acum, fă un calcul total mental pentru aceste activități, apoi notează care ar fi suma de bani anuală necesară (în lei)?",
            actionType: "input",
            options: { type: "number", placeholder: "Ex: 5000" },
            nextStep: "pensie_ask_debts"
          },

          pensie_ask_debts: {
            message: "3. La vârsta pensionării, te aștepți să mai ai de plătit credite sau alte obligații financiare? Care ar fi suma necesară achitării integrale (în lei)?",
            actionType: "input",
            options: { type: "number", placeholder: "Ex: 0" },
            nextStep: "pensie_ask_insurance"
          },
          pensie_ask_insurance: {
            message: "4. La acest moment, ai vreo asigurare de viață cu economisire / cu investiție pentru suplimentarea veniturilor la pensionare? Ce sumă s-a strâns (în lei)?",
            actionType: "input",
            options: { type: "number", placeholder: "Ex: 0" },
            nextStep: "pensie_ask_savings"
          },
          pensie_ask_savings: {
            message: "5. La acest moment, ai economii (ex. pensie pilon 2 sau pilonul 3) sau investiții pe care să le accesezi la pensionare? Ce sumă (în lei)?",
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
            message: "Cum ți se pare această sumă?",
            actionType: "input",
            options: { type: "text", placeholder: "Scrie aici..." },
            nextStep: "pensie_ask_feeling_2"
          },
          pensie_ask_feeling_2: {
            message: "Care este sentimentul pe care îl simți acum?",
            actionType: "input",
            options: { type: "text", placeholder: "Scrie aici..." },
            nextStep: "pensie_dramatic_options"
          },
          pensie_dramatic_options: {
            message: "În acest scenariu de imaginație și la acest deficit financiar, cum crezi ca ți s-ar ajusta standardul de viață? Bifează opțiunile realiste:",
            actionType: "interactive_scroll_list",
            options: {
              buttonText: "Am bifat",
              options: [
                "Reducerea (calității) alimentelor",
                "Limitarea utilităților",
                "Limitarea accesului la servicii medicale",
                "Împrumuturi noi",
                "Apel la banii copiilor",
                "Vânzarea de bunuri",
                "Munca la vârstă înaintată",
                "Renunțarea la hobby-uri",
                "Anularea călătoriilor",
                "Izolare socială",
                "Schimbarea domiciliului"
              ]
            },
            nextStep: "pensie_solution"
          },
          pensie_solution: {
            message: "Dacă nu ești foarte mulțumit cu aceste opțiuni, ai fi interesat să vezi o soluție personalizată care să-ți ofere posibilitatea de a-ți menține standardul de viață, opțiunile personale, demnitatea și statutul de susținător al familiei chiar și în etapa pensionării?",
            actionType: "buttons",
            options: ["Da, vreau detalii", "Nu"],
            nextStep: "final_contact"
          },

          // ============================================================
          // 4. SCENARIUL STUDII COPII_viitorul copiilor_Marius_09.10[1].md]
          // ============================================================
          studii_intro_1: {
            message: "Menirea ta ca părinte nu e doar să-ți crești copilul până va fi major, ci să îi dai aripi în viață!\n\nEști de acord cu afirmația: „Cu cât vrei să zboare mai sus, cu atât sunt mai scumpe aripile”?",
            actionType: "buttons",
            options: ["De acord"],
            nextStep: "studii_intro_2"
          },
          studii_intro_2: {
            message: "Vei răspunde la 6 întrebări pentru a stabili suma de bani de care va avea nevoie copilul tău pentru a avea asigurat un start cu dreptul în viață\n\nÎn acest calcul, vom include sumele de bani care vor acoperi 4 tipuri de costuri:\n1. Educație formală\n2. Dezvoltare personală\n3. Lansare proiecte majore\n4. Întemeierea unei familii",
            actionType: "buttons",
            options: ["Continuă"],
            nextStep: "studii_intro_3"
          },
          studii_intro_3: {
            message: "* Aceste calcule sunt pentru un singur copil! La final, poți înmulți suma obținută cu numărul copiilor tăi pentru costurile totale.",
            actionType: "buttons",
            options: ["Am înțeles"],
            nextStep: "studii_ask_years"
          },
          studii_ask_years: {
            message: "1. Câți ani ești dispus să-ți susții financiar copilul în studenție?",
            actionType: "buttons",
            options: ["3 ani", "4 ani", "5 ani", "6 ani"],
            nextStep: "studii_ask_annual_cost_list"
          },
          
          // --- Checklist Studii 1 ---
          studii_ask_annual_cost_list: {
            message: "Bifează cheltuielile pe care le-ar avea copilul tău dacă azi ar fi student:",
            actionType: "interactive_scroll_list",
            options: {
                buttonText: "Am selectat",
                options: [
                    "Taxa de școlarizare anuală",
                    "Cazare în cămin sau chirie",
                    "Utilități și întreținere cazare",
                    "Transport (combustibil)",
                    "Gadgeturi (smartphone, laptop, tableta)",
                    "Software și licențe profesionale",
                    "Recuzită pentru laboratoare sau proiecte",
                    "Cărți și manuale",
                    "Formări și certificări profesionale",
                    "Conferințe și training-uri",
                    "Restanțe / Re-restanțe :)"
                ]
            },
            nextStep: "studii_ask_annual_cost"
          },
          studii_ask_annual_cost: {
            message: "Fă un calcul total mental, apoi notează care ar fi suma de bani anuală necesară (în lei)?\n\nÎncearcă să nu pui sumele „din burtă” =)",
            actionType: "input",
            options: { type: "number", placeholder: "Ex: 30000" },
            nextStep: "studii_show_deficit_1"
          },
          studii_show_deficit_1: {
            message: "Am calculat costul de bază: **{deficit1} lei** (Sumă anuală x Ani). Continuăm.",
            actionType: "buttons",
            options: ["Continuă"],
            nextStep: "studii_ask_extra_list"
          },

          // --- Checklist Studii 2 ---
          studii_ask_extra_list: {
             message: "2. Pe lângă formarea academică, copilul tău se va dezvolta personal și social prin activități extra-curriculare. Bifează activitățile de interes:",
             actionType: "interactive_scroll_list",
             options: {
                 buttonText: "Am selectat",
                 options: [
                     "Tabere și schimburi culturale (internaționale)",
                     "Hobby-uri (pescuit, vlogging, lifestyle, gym)",
                     "Activități recreative (sport, artă, muzică)",
                     "Evenimente sociale și culturale",
                     "Chefuri, majorate, aniversări, nunți",
                     "Ieșiri cu prietenii – cafenele, restaurante, cluburi",
                     "Călătorii și excursii (în țară sau în străinătate)",
                     "Haine și accesorii",
                     "Cadouri și atenții pentru prieteni/familie"
                 ]
             },
             nextStep: "studii_ask_extra"
          },
          studii_ask_extra: {
            message: "Fă un calcul total mental, apoi notează care ar fi suma de bani anuală necesară (în lei)?\n\nÎncearcă să nu pui sumele „din burtă” =)",
            actionType: "input",
            options: { type: "number", placeholder: "Ex: 5000" },
            nextStep: "studii_ask_projects_list"
          },

          // --- Checklist Studii 3 ---
          studii_ask_projects_list: {
            message: "3. Debutul în viață profesională a studentului poate fi asociat unor proiecte majore, costisitoare. Bifează activitățile de interes:",
            actionType: "interactive_scroll_list",
             options: {
                 buttonText: "Am selectat",
                 options: [
                     "Începerea unei afaceri personale",
                     "Achiziționarea unui autoturism",
                     "Achiziționarea unui imobil",
                     "Avans pentru achiziționarea unui bun"
                 ]
             },
             nextStep: "studii_ask_projects"
          },
          studii_ask_projects: {
            message: "Fă un calcul total mental, apoi notează care ar fi suma de bani de care ar fi nevoie (în lei)?",
            actionType: "input",
            options: { type: "number", placeholder: "Ex: 10000" },
            nextStep: "studii_ask_wedding"
          },
          studii_ask_wedding: {
            message: "4. La un moment dat, copilul tău va îmbrăca rochia de mireasă / costumul de mire.\nCare ar fi contribuția ta financiară (în lei)?",
            actionType: "input",
            options: { type: "number", placeholder: "Ex: 20000" },
            nextStep: "studii_ask_savings"
          },
          studii_ask_savings: {
            message: "5. La acest moment, există economii sau investiții pe care copilul le-ar putea accesa pentru a acoperi cele 4 tipuri de cheltuieli discutate anterior?\n\nDacă da, care este suma (în lei)?",
            actionType: "input",
            options: { type: "number", placeholder: "Ex: 5000" },
            nextStep: "studii_ask_insurance"
          },
          studii_ask_insurance: {
            message: "6. La acest moment, există vreo asigurare de viață cu economisire destinată viitorului copilului?\n\nDacă da, care este suma (în lei)?",
            actionType: "input",
            options: { type: "number", placeholder: "Ex: 0" },
            nextStep: "studii_ask_children_count"
          },
          studii_ask_children_count: {
            message: "Deficitul financiar pe care trebuie să îl acoperi pentru a asigura copilului tău un start cu dreptul în viață este calculat.\n\nPentru a finaliza gradul tău de expunere financiară, ultima întrebare: **Câți copii ai?**",
            actionType: "input",
            options: { type: "number", placeholder: "Ex: 1" },
            nextStep: "studii_show_final_result"
          },
          studii_show_final_result: {
            message: "Deficitul financiar TOTAL pe care trebuie să îl acoperi este:\n\n**{finalDeficit} lei**\n\n(calcul automat al deficitului final)",
            actionType: "buttons",
            options: ["Vezi Rezultatul"],
            nextStep: "studii_ask_feeling"
          },
          studii_ask_feeling: {
            message: "Cum ți se pare această sumă?",
            actionType: "input",
            options: { type: "text", placeholder: "Scrie aici..." },
            nextStep: "studii_ask_feeling_2"
          },
          studii_ask_feeling_2: {
            message: "Care este sentimentul pe care îl simți acum?",
            actionType: "input",
            options: { type: "text", placeholder: "Scrie aici..." },
            nextStep: "studii_dramatic_intro"
          },
          studii_dramatic_intro: {
            message: "Ar mai fi o nuanță aici... și nu e pozitivă...\nCa părinte, pentru copiii tău trăiești. Dar cum s-ar schimba prezentul și viitorul lor dacă nu ar mai putea conta pe sprijinul tău financiar?",
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
                "Renunțarea la activități sportive",
                "Abandon sau dezinteres școlar",
                "Acces limitat la activități educaționale",
                "Izolare față de prieteni",
                "Responsabilități asumate prea devreme",
                "Scăderea încrederii în sine",
                "Anxietate și teamă de viitor",
                "Frustrare față de colegi",
                "Dependență emoțională de părintele rămas",
                "Muncă excesivă și absența celuilalt părinte",
                "Sentiment de pierdere",
                "Vulnerabilitate la influențe"
              ]
            },
            nextStep: "studii_solution"
          },
          studii_solution: {
            message: "Cel mai probabil, nu ești foarte mulțumit cu opțiunile pe care copilul tău le-ar avea.\n\nAi fi interesat să vezi o soluție personalizată care îți oferă:\n1. posibilitatea de a-ți eșalona efortul financiar și\n2. garanția ca în permanență copilul tău va avea un tutore financiar?",
            actionType: "buttons",
            options: ["Da, vreau detalii", "Nu"],
            nextStep: "final_contact"
          },

          // ============================================================
          // 5. SCENARIUL SĂNĂTATE_editat Marius_Sanatate_26.11.md.txt]
          // ============================================================
          sanatate_intro_1: {
             message: [
               "„Un om sănătos are 1.000 de gânduri, un om bolnav are un singur gând.”",
               "Când sănătatea este pusă la încercare, ai nevoie să ai atât bani, cât și acces rapid la tratament."
             ],
             actionType: "buttons",
             options: ["Continuă"],
             nextStep: "sanatate_intro_2"
          },
          sanatate_intro_2: {
             message: "Boala nu așteaptă să fii pregătit financiar sau emoțional – apare pur și simplu, schimbând totul peste noapte.\n\nAr fi de interes pentru tine să vezi cât de pregătită este familia ta pentru un scenariu medical sever?",
             actionType: "buttons",
             options: ["Da", "Nu"],
             nextStep: "sanatate_info_1"
          },
          sanatate_info_1: {
             message: [
                "Unele situații medicale sunt mai ușoare, apar frecvent și pun familia în dificultate, dar sunt dificultăți pe care le poți gestiona cu resursele potrivite.",
                "Alte situații sunt grave, mai rare, dar când apar pot schimba destinul unei familii pentru totdeauna, necesitând resurse substanțiale și acces rapid la tratament.",
                "**Forme frecvente:** Fracturi, arsuri, spitalizare, intervenții chirurgicale minore.\n\n**Forme critice:** Cancer, Infarct, AVC, Transplant, Boli autoimune severe."
             ],
             actionType: "buttons",
             options: ["Continuă"],
             nextStep: "sanatate_ask_sum"
          },
          sanatate_ask_sum: {
             message: "Întrebare-cheie:\nDacă mâine ai fi diagnosticat sau ai suferi un accident sever, ce sumă ți-ar oferi liniște financiară?",
             actionType: "buttons",
             options: ["20.000 lei", "50.000 lei", "100.000 lei", "150.000 lei", "200.000 lei", "Peste 200.000 lei"],
             nextStep: "sanatate_ask_access"
          },
          sanatate_ask_access: {
             message: "PASUL 2 – ACCES (tratament de calitate)\n\nCât de important este pentru tine accesul rapid la servicii medicale private de top? (Scală 1-10)",
             actionType: "input",
             options: { type: "number", placeholder: "Ex: 10" },
             nextStep: "sanatate_ask_control"
          },
          sanatate_ask_control: {
             message: "PASUL 3 – CONTROL\nCare variantă te reprezintă cel mai bine?",
             actionType: "buttons",
             options: ["Vreau bani și decid eu", "Acces garantat în RO", "Acces garantat în Străinătate", "Le vreau pe ambele (bani + acces)", "Nu m-am gândit"],
             nextStep: "sanatate_ask_current"
          },
          sanatate_ask_current: {
             message: "PASUL 4 – OPȚIUNILE TALE ÎN ACEST MOMENT\nRaportat la ce îți dorești și la situația ta actuală, unde te afli acum?",
             actionType: "buttons",
             options: ["Am asigurare medicală la stat", "Am deja o formă de protecție privată", "Am și economii pentru situații medicale", "Nu am niciun plan clar", "Nu știu exact ce acoperire am"],
             nextStep: "sanatate_dramatic_options"
          },
          sanatate_dramatic_options: {
             message: "PASUL 5 – OPȚIUNI ÎN CAZ DE RESURSE LIMITATE\nDacă veniturile actuale nu sunt suficiente, ce opțiuni crezi că ai avea? Bifează:",
             actionType: "interactive_scroll_list",
             options: {
               buttonText: "Am înțeles realitatea",
               options: [
                 "Să faci împrumuturi sau carduri de credit",
                 "Să vinzi bunuri personale sau locuința",
                 "Să renunți la economii sau investiții",
                 "Să reduci drastic cheltuielile",
                 "Să amâni proiecte personale sau educația copiilor",
                 "Să limitezi accesul la tratamente de calitate",
                 "Să depinzi exclusiv de sistemul public sau ajutor extern",
                 "Ca familia să preia roluri suplimentare",
                 "Să amâni recuperarea completă"
               ]
             },
             nextStep: "sanatate_ask_satisfaction"
          },
          sanatate_ask_satisfaction: {
             message: "Întrebare de reflecție:\nCât de mulțumit ești cu aceste opțiuni bifate pentru tine și familia ta?",
             actionType: "buttons",
             options: ["Foarte mulțumit", "Parțial mulțumit", "Deloc mulțumit", "Nu știu"],
             nextStep: "sanatate_solution"
          },
          sanatate_solution: {
             message: [
                "Acest pas te ajută să conștientizezi cât de important este să ai bani și acces, înainte ca evenimentul medical să apară.",
                "CONVERSIA CĂTRE SOLUȚIE\nPe baza răspunsurilor tale, se poate construi o soluție care să îți ofere bani, acces și siguranță.",
                "Ai vrea să vezi ce tip de protecție ți s-ar potrivi cel mai bine?"
             ],
             actionType: "buttons",
             options: ["Da", "Nu"],
             nextStep: "final_contact"
          },

          // ============================================================
          // 6. FINAL COMUN (CONTACT)
          // ============================================================
          final_contact: {
            message: "Am nevoie de datele tale de contact (nume, telefon, email), iar în cel mai scurt timp posibil, te voi contacta pentru construirea soluției.\n\nDe asemenea, am rugămintea să semnezi și un acord GDPR.",
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
            nextStep: "thank_you_contact"
          },
          thank_you_contact: {
            message: "Mulțumesc pentru că mi-ai răspuns la întrebări, te voi contacta în curând!\n\nCând preferi să fii contactat?",
            actionType: "buttons",
            options: ["Dimineața", "După-masa", "Seara"],
            nextStep: "thank_you_final"
          },
          thank_you_final: {
            message: "Mulțumesc! O zi frumoasă!",
            actionType: "end",
            nextStep: ""
          }
        }
      };

      // 3. Scriem datele noi
      await setDoc(doc(db, "formTemplates", "master_standard_v1"), masterData);

      // 4. Feedback și reîncărcare
      setConfirmModalOpen(false);
      alert("Șablonul Master a fost regenerat cu succes! Toate cele 4 fluxuri sunt acum active.");
      window.location.reload();

    } catch (error: any) {
      console.error("Eroare la restaurare:", error);
      alert("Eroare: " + error.message);
    }
  });

    setConfirmModalOpen(true);
};