
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

const ADMIN_EMAIL = "alinmflavius@gmail.com";

export default function FormsPage() {
  const router = useRouter();
  const { toast } = useToast();
  
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formTemplates, setFormTemplates] = useState<FormTemplate[]>([]);
  const [activeFormId, setActiveFormId] = useState<string | null>(null);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newFormTitle, setNewFormTitle] = useState("");
  const [sourceTemplateId, setSourceTemplateId] = useState<string>("");
  const [isCreating, setIsCreating] = useState(false);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [formToDelete, setFormToDelete] = useState<string | null>(null);

  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<(() => void) | (() => Promise<void>)>(() => {});
  const [confirmTitle, setConfirmTitle] = useState("");
  const [confirmDescription, setConfirmDescription] = useState("");
  const [confirmButtonText, setConfirmButtonText] = useState("Confirmă");
  const [confirmButtonVariant, setConfirmButtonVariant] = useState<"default" | "destructive">("default");
  
  const [showMaintenance, setShowMaintenance] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.push("/login");
      } else {
        setUser(currentUser);
        setIsAdmin(currentUser.email === ADMIN_EMAIL);
        fetchData(currentUser);
      }
    });
    return () => unsubscribe();
  }, [router]);

  const fetchData = async (currentUser: User) => {
    try {
      setLoading(true);
      const agentDoc = await getDoc(doc(db, "agents", currentUser.uid));
      if (agentDoc.exists()) {
        setActiveFormId(agentDoc.data().activeFormId || null);
      }

      const q = query(collection(db, "formTemplates"));
      const snap = await getDocs(q);
      const forms = snap.docs.map(d => ({ id: d.id, ...d.data() })) as FormTemplate[];
      setFormTemplates(forms);

      const standard = forms.filter(f => f.isTemplate);
      if (standard.length > 0 && !sourceTemplateId) {
        setSourceTemplateId(standard[0].id);
      }

    } catch (e) {
      console.error("Fetch error:", e);
      toast({ variant: "destructive", title: "Eroare la încărcare", description: "Nu s-au putut prelua datele." });
    } finally {
      setLoading(false);
    }
  };

  const handleSetActiveForm = (formId: string) => {
    setConfirmTitle("Activare Formular");
    setConfirmDescription("Vrei să activezi acest formular pe link-ul tău?");
    setConfirmButtonText("Setează Activ");
    setConfirmButtonVariant("default");
    
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
      setFormToDelete(null);
    }
  };

  const handleCreateAndEdit = async () => {
    if (!newFormTitle.trim() || !user) return;
    setIsCreating(true);
    try {
      let flowData = {};
      let startStep = "welcome_1";
      if (sourceTemplateId === 'blank') {
          flowData = {
              welcome_1: { message: "Salut!", actionType: "buttons", options: [{label: "Start"}], nextStep: "end" },
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
      
      setIsCreateModalOpen(false);
      setNewFormTitle("");
      
      await fetchData(user);
      router.push(`/dashboard/form-editor/${ref.id}`);

    } catch (e: any) {
      toast({ variant: "destructive", title: "Eroare la creare", description: e.message });
    } finally {
      setIsCreating(false);
    }
  };
  
  const restoreMasterTemplate = () => {
    setConfirmTitle("Actualizare Texte Master");
    setConfirmDescription("Această acțiune va actualiza toate textele din formularul Master cu versiunea finală din documente. Structura logică se păstrează. Continui?");
    setConfirmButtonText("Da, Actualizează");
    setConfirmButtonVariant("default");

    setConfirmAction(() => async () => {
      try {
        await deleteDoc(doc(db, "formTemplates", "master_standard_v1")).catch(() => {});

        const masterData = {
          title: "Analiză Completă (Master)",
          description: "Versiunea finală cu textele complete pentru Deces, Pensie, Studii și Sănătate.",
          startStepId: "secventa_intro",
          ownerId: null, 
          isTemplate: true,
          createdAt: new Date(),
          flow: {
            secventa_intro: {
              message: [
                "Viața produce pierderi financiare semnificative în patru situații majore.",
                "Dintre acestea, două situații sunt previzibile, precis așezate pe axa vieții, iar două sunt total imprevizibile („ceasul rău, pisica neagră”).",
                "**Previzibile:**\n1. Pensionarea – reducerea drastică a opțiunilor\n2. Studiile copiilor – cheltuieli complexe\n\n**Imprevizibile:**\n1. Decesul – detonează standardul de viață\n2. Bolile grave – impact major asupra economiilor"
              ],
              isProgressStep: true,
              actionType: "buttons", 
              options: [{label: "Continuă"}], 
              nextStep: "alege_subiect"
            },
            alege_subiect: {
              message: [
                "Salut! Sunt Marius, agentul tău de asigurări.",
                "În următoarele 3 minute te invit la un moment de reflecție și de analiză prin care să descoperi care este gradul tău de expunere financiară.",
                "Această analiză nu implică nicio obligație din partea ta.",
                "**Care dintre aceste subiecte ar fi de interes pentru tine la acest moment?**"
              ],
              actionType: "buttons",
              branchStart: true,
              options: [
                { label: "Deces (Siguranța Familiei)", nextStep: "deces_intro_1" },
                { label: "Pensionare", nextStep: "pensie_intro_1" },
                { label: "Viitorul Copiilor", nextStep: "studii_intro_1" },
                { label: "Sănătate (Boli Grave)", nextStep: "sanatate_intro_1" }
              ]
            },
            deces_intro_1: { 
                isProgressStep: true,
                message: ["Un deces afectează negativ profund și pe termen lung atât **planul existențial** (drama care însoțește pierderea persoanei dragi), cât și **planul financiar** (dispariția opțiunilor, apariția presiunilor financiare și a necesității de a ajusta nivelul de trai la noile realități)."], 
                actionType: "buttons", options: [{label: "Continuă"}], nextStep: "deces_intro_2" 
            },
            deces_intro_2: { 
                isProgressStep: true,
                message: "Vei răspunde la 6 întrebări pentru a stabili suma de bani de care ar avea nevoie familia ta pentru a ameliora impactul financiar negativ al decesului asupra:\n(1.) standardului de viață\n(2.) proiectelor în desfășurare\n(3.) creditelor / datoriilor", 
                actionType: "buttons", options: [{label: "Sunt gata"}], nextStep: "deces_perioada_suport" 
            },
            deces_perioada_suport: { 
                isProgressStep: true,
                message: "1. În cazul unui posibil deces, câți ani ar avea nevoie familia ta de susținere financiară pentru a-și menține nivelul de trai fără să fie nevoită să facă ajustări majore în stilul de viață (ex. vânzarea unor bunuri, lichidarea unor investiții, muncă suplimentară etc.)", 
                actionType: "buttons", options: ["3 ani", "4 ani", "5 ani"], nextStep: "deces_suma_lunara" 
            },
            deces_suma_lunara: { 
                isProgressStep: true,
                message: "Care ar fi suma de bani lunară necesară în această perioadă (în lei)?\n(Gândește-te la suma pe care o produci tu lunar).", 
                actionType: "input", options: { type: "number", placeholder: "Ex: 5000" }, nextStep: "deces_afisare_deficit_1" 
            },
            deces_afisare_deficit_1: { 
                message: ["<span class=\"text-2xl font-bold\">{deficit1} lei</span>\n(calcul: sumă lunară x perioadă x 12)", "Această sumă reprezintă deficitul pentru perioada selectată pentru menținerea standardului de viață, respectiv pentru liniștea sufletească și confortul financiar necesar celor dragi.", "Continuăm cu cheltuielile specifice."], 
                actionType: "buttons", options: [{label: "Da"}], nextStep: "deces_costuri_eveniment" 
            },
            deces_costuri_eveniment: { 
                isProgressStep: true,
                message: "2. În cazul unui posibil deces, evenimentul în sine este însoțit de anumite cheltuieli (ex. înmormântare, taxe succesorale etc.)\n\nCare ar fi această sumă?", 
                actionType: "input", options: { type: "number", placeholder: "Ex: 20000" }, nextStep: "deces_proiecte_in_desfasurare" 
            },
            deces_proiecte_in_desfasurare: { 
                isProgressStep: true,
                message: "3. În cazul unui posibil deces, există anumite proiecte în desfășurare la acest moment care ar avea de suferit (ex. o construcție la stadiu „la roșu” sau un sport de performanță al copiilor sau alte proiecte care sunt susținute din finanțele tale lunare)?\n\nCare ar fi suma totală de bani (în lei) necesară finalizării acestor proiecte?", 
                actionType: "input", options: { type: "number", placeholder: "Ex: 50000" }, nextStep: "deces_datorii_credite" 
            },
            deces_datorii_credite: { 
                isProgressStep: true,
                message: "4. În cazul unui posibil deces, rămân pe umerii familiei anumite responsabilități financiare de tip credite, datorii, obligații financiare etc.?\n\nCare ar fi suma de bani de care ar avea nevoie pentru a stinge aceste obligații (în lei)?", 
                actionType: "input", options: { type: "number", placeholder: "Ex: 150000" }, nextStep: "deces_afisare_deficit_brut" 
            },
            deces_afisare_deficit_brut: { 
                message: "Am calculat necesarul total brut: **{bruteDeficit} lei**.\nAcum haide să vedem ce resurse există deja.", 
                actionType: "buttons", options: [{label: "Continuă"}], nextStep: "deces_asigurari_existente" 
            },
            deces_asigurari_existente: { 
                isProgressStep: true,
                message: "5. În cazul unui posibil deces, familia ta ar beneficia de vreo asigurare de viață pe numele tău?\nDacă da, care este suma (în lei)?", 
                actionType: "input", options: { type: "number", placeholder: "Ex: 0" }, nextStep: "deces_economii_existente" 
            },
            deces_economii_existente: { 
                isProgressStep: true,
                message: "6. În cazul unui posibil deces, familia ta ar putea accesa anumite economii sau investiții (ex. chirii, vânzarea unui imobil etc.) pentru standardului de viață?\nDacă da, care este suma de bani disponibilă?", 
                actionType: "input", options: { type: "number", placeholder: "Ex: 10000" }, nextStep: "deces_pregatire_rezultat" 
            },
            deces_pregatire_rezultat: {
                message: "Calcul finalizat.",
                actionType: 'buttons',
                options: [{label: "Vezi Rezultatul"}],
                nextStep: "deces_afisare_rezultat_final"
            },
            deces_afisare_rezultat_final: { 
                message: "Deficitul financiar cu care familia ta ar păși în acest viitor sumbru dacă n-ar mai putea conta pe sprijinul tău financiar este:\n\n<span class=\"text-2xl font-bold\">{finalDeficit} lei</span>", 
                actionType: 'buttons',
                options: [{label: "Continuă"}],
                nextStep: "deces_intrebare_sentiment_1" 
            },
            deces_intrebare_sentiment_1: { 
                isProgressStep: true,
                message: "Cum ți se pare această sumă?", 
                actionType: "input", options: { type: "text", placeholder: "Scrie un gând..." }, nextStep: "deces_intrebare_sentiment_2" 
            },
            deces_intrebare_sentiment_2: { 
                isProgressStep: true,
                message: "Care este sentimentul pe care îl simți acum?", 
                actionType: "input", options: { type: "text", placeholder: "Scrie un sentiment..." }, nextStep: "deces_optiuni_dramatice" 
            },
            deces_optiuni_dramatice: { 
                isProgressStep: true,
                message: "În acest scenariu de imaginație sumbru, ce opțiuni ar avea cei dragi ai tăi pentru a menține un oarecare echilibru în standardul de viață?\n\nBifează opțiunile realiste și cu care tu te simți confortabil pentru ai tăi:", 
                actionType: "interactive_scroll_list", 
                options: { buttonText: "Am bifat", options: ["Să se mute cu părinții", "Să se mute în alt oraș", "Să muncească suplimentar sau la al doilea job", "Să vândă din bunurile personale", "Să vândă casa / apartamentul", "Să reducă drastic cheltuieli / să renunțe la hobby-uri", "Să renunțe la proiecte personale", "Să amâne educația copiilor", "Să ceară ajutor de la familie și de la prieteni", "Să renunțe la economiile / investițiile existente", "Să se mute în locuință mai mică", "Să accepte orice compromis major", "Să se căsătorească din obligații financiare", "Altceva"] }, 
                nextStep: "deces_prezentare_solutie" 
            },
            deces_prezentare_solutie: { 
                isProgressStep: true,
                message: ["Dacă nu ești foarte mulțumit cu opțiunile pe care familia ta le are, ai fi interesat să vezi o soluție personalizată care să ofere celor dragi ție o a doua șansă la o viață relativ normală, fără poveri financiare?", "Practic, o soluție prin care dragostea ta și grija ta pentru ei va continua chiar și după tine.", "Poți crea instant o moștenire care să îi ajute financiar pe cei dragi ție chiar și (mai ales!) în absența ta!"], 
                actionType: "buttons", 
                options: [
                  { label: "Da, vreau detalii", nextStep: "formular_contact" },
                  { label: "Nu", nextStep: "final_dialog_prietenos" }
                ],
            },
            pensie_intro_1: { 
                isProgressStep: true,
                message: ["Pensionarea poate fi cel mai lung concediu al vieții sau cel mai chinuitor concediu al vieții.", "Reducerea semnificativă a veniturilor la vârsta pensionării va afecta calitatea și standardul vieții tale în cel puțin 3 domenii:\n\n1. opțiunile personale (stil de viață, hobby-uri)\n2. demnitatea și stima de sine (dependență)\n3. tranziția de la rolul de susținător la susținut"], 
                actionType: "buttons", options: [{label: "Continuă"}], nextStep: "pensie_moment_planificare" 
            },
            pensie_moment_planificare: { 
                isProgressStep: true,
                message: "Când crezi că ar fi cel mai potrivit moment să începi să-ți planifici pensionarea?", 
                actionType: "buttons", options: [{label: "ACUM"}], nextStep: "pensie_intro_quiz" 
            },
            pensie_intro_quiz: { 
                isProgressStep: true,
                message: "Vei răspunde la 5 întrebări pentru a stabili suma de bani de care ai avea nevoie pentru a-ți menține standardul de viață dacă mâine ai ieși la pensie.", 
                actionType: "buttons", options: [{label: "Sunt gata"}], nextStep: "pensie_ani_speranta" 
            },
            pensie_ani_speranta: { 
                isProgressStep: true,
                message: "1. Facem un exercițiu de imaginație: ai 65 ani, ieși la pensie și instant pierzi din venituri.\n\nCâți ani speri să mai trăiești din acest moment?", 
                actionType: "buttons", options: ["10 ani", "15 ani", "20 ani"], nextStep: "pensie_suma_lunara_necesara" 
            },
            pensie_suma_lunara_necesara: { 
                isProgressStep: true,
                message: "Care ar fi suma de bani lunară de care ai avea nevoie în completarea pensiei de stat pentru a-ți putea menține standardul de viață (în lei)?", 
                actionType: "input", options: { type: "number", placeholder: "Ex: 2000" }, nextStep: "pensie_afisare_deficit_1" 
            },
            pensie_afisare_deficit_1: { 
                message: "<span class=\"text-2xl font-bold\">{deficit1} lei</span>\n(calcul: sumă lunară x perioadă x 12).", 
                actionType: "buttons", options: [{label: "Continuă"}], nextStep: "pensie_lista_proiecte" 
            },
            pensie_lista_proiecte: { 
                isProgressStep: true,
                message: "2. Ce planuri / proiecte / obiective personale ți-ai propus pentru perioada pensionării?\n\nBifează activitățile de interes:", 
                actionType: "interactive_scroll_list", options: { buttonText: "Am selectat", options: ["Călătorii și excursii culturale", "Cursuri și workshop-uri de dezvoltare", "Activități sportive moderate", "Voluntariat în comunitate", "Hobby-uri creative", "Întâlniri sociale și cluburi", "Sprijin pentru familie și nepoți", "Participare la asociații culturale sau civice", "Grădinărit și îngrijirea casei", "Consultanță și mentoring", "Investitii imobiliare", "Deschiderea unui business"] }, nextStep: "pensie_suma_proiecte" 
            },
            pensie_suma_proiecte: { 
                isProgressStep: true,
                message: "Acum, fă un calcul total mental pentru aceste activități, apoi notează care ar fi suma de bani anuală necesară (în lei)?", 
                actionType: "input", options: { type: "number", placeholder: "Ex: 5000" }, nextStep: "pensie_datorii" 
            },
            pensie_datorii: { 
                isProgressStep: true,
                message: "3. La vârsta pensionării, te aștepți să mai ai de plătit credite sau alte obligații financiare? Care ar fi suma necesară achitarea integrală (în lei)?", 
                actionType: "input", options: { type: "number", placeholder: "Ex: 0" }, nextStep: "pensie_asigurari_existente" 
            },
            pensie_asigurari_existente: { 
                isProgressStep: true,
                message: "4. La acest moment, ai vreo asigurare de viață cu economisire / cu investiție pentru suplimentarea veniturilor la pensionare? Ce sumă s-a strâns (în lei)?", 
                actionType: "input", options: { type: "number", placeholder: "Ex: 0" }, nextStep: "pensie_economii_existente" 
            },
            pensie_economii_existente: { 
                isProgressStep: true,
                message: "5. La acest moment, ai economii (ex. pensie pilon 2 sau pilonul 3) sau investiții pe care să le accesezi la pensionare? Ce sumă (în lei)?", 
                actionType: "input", options: { type: "number", placeholder: "Ex: 40000" }, nextStep: "pensie_pregatire_rezultat" 
            },
             pensie_pregatire_rezultat: {
                message: "Calcul finalizat.",
                actionType: 'buttons',
                options: [{label: "Vezi Rezultatul"}],
                nextStep: "pensie_afisare_rezultat_final"
            },
            pensie_afisare_rezultat_final: { 
                message: "Deficitul financiar cu care tu ai ieși la pensie este:\n\n<span class=\"text-2xl font-bold\">{finalDeficit} lei</span>",
                actionType: 'buttons', 
                options: [{label: "Continuă"}],
                nextStep: "pensie_intrebare_sentiment_1" 
            },
            pensie_intrebare_sentiment_1: { 
                isProgressStep: true,
                message: "Cum ți se pare această sumă?", 
                actionType: "input", options: { type: "text", placeholder: "Scrie..." }, nextStep: "pensie_intrebare_sentiment_2" 
            },
            pensie_intrebare_sentiment_2: { 
                isProgressStep: true,
                message: "Care este sentimentul pe care îl simți acum?", 
                actionType: "input", options: { type: "text", placeholder: "Scrie..." }, nextStep: "pensie_optiuni_dramatice" 
            },
            pensie_optiuni_dramatice: { 
                isProgressStep: true,
                message: "În acest scenariu de imaginație și la acest deficit financiar, cum crezi ca ți s-ar ajusta standardul de viață? Bifează opțiunile realiste:", 
                actionType: "interactive_scroll_list", options: { buttonText: "Am bifat", options: ["Reducerea (calității) alimentelor", "Limitarea utilităților", "Limitarea accesului la servicii medicale", "Împrumuturi noi", "Apel la banii copiilor", "Vânzarea de bunuri", "Munca la vârstă înaintată", "Renunțarea la hobby-uri", "Anularea călătoriilor", "Izolare socială", "Schimbarea domiciliului", "Altceva"] }, nextStep: "pensie_prezentare_solutie" 
            },
            pensie_prezentare_solutie: { 
                isProgressStep: true,
                message: "Dacă nu ești foarte mulțumit cu aceste opțiuni, ai fi interesat să vezi o soluție personalizată care să-ți ofere posibilitatea de a-ți menține standardul de viață, opțiunile personale, demnitatea și statutul de susținător al familiei chiar și în etapa pensionării?", 
                 actionType: "buttons", 
                options: [
                  { label: "Da, vreau detalii", nextStep: "formular_contact" },
                  { label: "Nu", nextStep: "final_dialog_prietenos" }
                ],
            },
            studii_intro_1: { 
                isProgressStep: true,
                message: ["Menirea ta ca părinte nu e doar să-ți crești copilul până va fi major, ci menirea ta este să îi dai aripi în viață!", "Ești de acord cu afirmația: „Cu cât vrei să zboare mai sus în viață, cu atât sunt mai scumpe aripile”?"], 
                actionType: "buttons", options: [{label: "De acord"}], nextStep: "studii_intro_2" 
            },
            studii_intro_2: { 
                isProgressStep: true,
                message: "Vei răspunde la 6 întrebări pentru a stabili suma de bani de care va avea nevoie copilul tău pentru a avea asigurat un start cu dreptul în viață\n\nÎn acest calcul, vom include sumele de bani care vor acoperi 4 tipuri de costuri:\n(1.) educație formală,\n(2.) dezvoltare personală, socială și hobby-uri,\n(3.) lansare proiecte majore,\n(4.) întemeierea unei familii.", 
                actionType: "buttons", options: [{label: "Continuă"}], nextStep: "studii_intro_3" 
            },
            studii_intro_3: { 
                message: "* Aceste calcule sunt pentru un singur copil! La final, poți înmulți suma obținută cu numărul copiilor tăi pentru costurile totale.", 
                actionType: "buttons", options: [{label: "Am înțeles"}], nextStep: "studii_ani_sustinere" 
            },
            studii_ani_sustinere: { 
                isProgressStep: true,
                message: "1. Câți ani ești dispus să-ți susții financiar copilul în studenție?", 
                actionType: "buttons", options: ["3 ani", "4 ani", "5 ani", "6 ani"], nextStep: "studii_lista_cost_anual" 
            },
            studii_lista_cost_anual: { 
                isProgressStep: true,
                message: "Bifează cheltuielile pe care le-ar avea copilul tău dacă azi ar fi student:", 
                actionType: "interactive_scroll_list", options: { buttonText: "Am selectat", options: ["Taxa de școlarizare anuală", "Cazare în cămin sau chirie", "Utilități și întreținere cazare", "Transport (combustibil)", "Gadgeturi (smartphone, laptop, tableta)", "Software și licențe profesionale", "Recuzită pentru laboratoare sau proiecte", "Cărți și manuale", "Formări și certificări profesionale", "Conferințe și training-uri", "Restanțe / Re-restanțe :)"] }, nextStep: "studii_suma_cost_anual" 
            },
            studii_suma_cost_anual: { 
                isProgressStep: true,
                message: "Fă un calcul total mental, apoi notează care ar fi suma de bani anuală necesară (în lei)?\n\nÎncearcă să nu pui sumele „din burtă” =)", 
                actionType: "input", options: { type: "number", placeholder: "Ex: 30000" }, nextStep: "studii_afisare_deficit_1" 
            },
            studii_afisare_deficit_1: { 
                message: "Am calculat costul de bază: **{deficit1} lei** (Sumă anuală x Ani). Continuăm.", 
                actionType: "buttons", options: [{label: "Continuă"}], nextStep: "studii_lista_extra" 
            },
            studii_lista_extra: { 
                isProgressStep: true,
                message: "2. Pe lângă formarea academică, copilul tău se va dezvolta personal și social prin activități extra-curriculare. Bifează activitățile de interes:", 
                actionType: "interactive_scroll_list", options: { buttonText: "Am selectat", options: ["Tabere și schimburi culturale (internaționale)", "Hobby-uri (pescuit, vlogging, lifestyle, gym)", "Activități recreative (sport, artă, muzică)", "Evenimente sociale și culturale", "Chefuri, majorate, aniversări, nunți", "Ieșiri cu prietenii – cafenele, restaurante, cluburi", "Călătorii și excursii (în țară sau în străinătate)", "Haine și accesorii", "Cadouri și atenții pentru prieteni/familie"] }, nextStep: "studii_suma_extra" 
            },
            studii_suma_extra: { 
                isProgressStep: true,
                message: "Fă un calcul total mental, apoi notează care ar fi suma de bani anuală necesară (în lei)?", 
                actionType: "input", options: { type: "number", placeholder: "Ex: 5000" }, nextStep: "studii_lista_proiecte" 
            },
            studii_lista_proiecte: { 
                isProgressStep: true,
                message: "3. Debutul în viață profesională a studentului / a absolventului poate fi asociat unor proiecte majore, costisitoare. Bifează activitățile de interes:", 
                actionType: "interactive_scroll_list", options: { buttonText: "Am selectat", options: ["Începerea unei afaceri personale", "Achiziționarea unui autoturism", "Achiziționarea unui imobil", "Avans pentru achiziționarea unui bun", "Altele"] }, nextStep: "studii_suma_proiecte" 
            },
            studii_suma_proiecte: { 
                isProgressStep: true,
                message: "Fă un calcul total mental, apoi notează care ar fi suma de bani de care ar fi nevoie (în lei)?", 
                actionType: "input", options: { type: "number", placeholder: "Ex: 10000" }, nextStep: "studii_nunta" 
            },
            studii_nunta: { 
                isProgressStep: true,
                message: "4. La un moment dat, copilul tău va îmbrăca rochia de mireasă / costumul de mire.\nCare ar fi contribuția ta financiară (în lei)?", 
                actionType: "input", options: { type: "number", placeholder: "Ex: 20000" }, nextStep: "studii_economii_existente" 
            },
            studii_economii_existente: { 
                isProgressStep: true,
                message: "5. La acest moment, există economii sau investiții pe care copilul tău le-ar putea accesa pentru a acoperi cele 4 tipuri de cheltuielile discutate anterior?\nDacă da, care este suma (în lei)?", 
                actionType: "input", options: { type: "number", placeholder: "Ex: 5000" }, nextStep: "studii_asigurari_existente" 
            },
            studii_asigurari_existente: { 
                isProgressStep: true,
                message: "6. La acest moment, există vreo asigurare de viață cu economisire destinată viitorului copilului?\nDacă da, care este suma (în lei)?", 
                actionType: "input", options: { type: "number", placeholder: "Ex: 0" }, nextStep: "studii_numar_copii" 
            },
            studii_numar_copii: { 
                message: "Deficitul financiar pe care trebuie să îl acoperi pentru a asigura copilului tău un start cu dreptul în viață este calculat.\n\nPentru a finaliza gradul tău de expunere financiară, ultima întrebare: **Câți copii ai?**\n(Vom înmulți deficitul cu acest număr).", 
                actionType: "input", options: { type: "number", placeholder: "Ex: 1" }, nextStep: "studii_pregatire_rezultat" 
            },
             studii_pregatire_rezultat: {
                message: "Calcul finalizat.",
                actionType: 'buttons',
                options: [{label: "Vezi Rezultatul"}],
                nextStep: "studii_afisare_rezultat_final"
            },
            studii_afisare_rezultat_final: { 
                message: "Deficitul financiar TOTAL pe care trebuie să îl acoperi este:\n\n<span class=\"text-2xl font-bold\">{finalDeficit} lei</span>", 
                actionType: 'buttons',
                options: [{label: "Continuă"}],
                nextStep: "studii_intro_dramatic" 
            },
            studii_intro_dramatic: { 
                isProgressStep: true,
                message: ["Ar mai fi o nuanță aici... și nu e pozitivă...", "Ca părinte, pentru copiii tău trăiești. Pentru ei și pentru viitorul lor, orice sacrifiu pare natural.", "Dar cum s-ar schimba prezentul și viitorul copiilor tăi dacă nu ar mai putea conta pe sprijinul tău financiar?"], 
                actionType: "buttons", 
                options: [{label: "Continuă"}], 
                nextStep: "studii_optiuni_dramatice" 
            },
            studii_optiuni_dramatice: { 
                isProgressStep: true,
                message: "Bifează scenariile posibile:", 
                actionType: "interactive_scroll_list", 
                options: { buttonText: "Am înțeles", options: ["Renunțarea la hobby-uri", "Renunțarea la activități sportive", "Abandon sau dezinteres școlar", "Acces limitat la activități educaționale", "Izolare față de prieteni", "Responsabilități asumate prea devreme", "Scăderea încrederii în sine", "Anxietate și teamă de viitor", "Frustrare față de colegi", "Dependență emoțională de părintele rămas", "Muncă excesivă și absența celuilalt părinte", "Sentiment de pierdere", "Vulnerabilitate la influențe", "Altceva"] }, 
                nextStep: "studii_prezentare_solutie" 
            },
            studii_prezentare_solutie: { 
                isProgressStep: true,
                message: ["Cel mai probabil, nu ești foarte mulțumit cu opțiunile pe care copilul tău le-ar avea.", "Ai fi interesat să vezi o soluție personalizată care îți oferă\n1. posibilitatea de a-ți eșalona efortul financiar pe 10 - 15 - 20 ani și\n2. garanția ca în permanență copilul tău va avea un tutore financiar care să îi asigure viitorul?"],
                actionType: "buttons", 
                options: [
                    { label: "Da, vreau detalii", nextStep: "formular_contact" },
                    { label: "Nu", nextStep: "final_dialog_prietenos" }
                ]
            },
            sanatate_intro_1: {
              message: [
                "„Un om sănătos are 1.000 de gânduri, un om bolnav are un singur gând.”",
                "Când sănătatea este pusă la încercare, ai nevoie să ai atât bani, cât și acces rapid la tratament."
              ],
              actionType: "buttons",
              options: [{ label: "Continuă" }],
              nextStep: "sanatate_intro_2"
            },
            sanatate_intro_2: {
              message: "Boala nu așteaptă să fii pregătit financiar sau emoțional – apare pur și simplu, schimbând totul peste noapte.\n\nAr fi de interes pentru tine să vezi cât de pregătită este familia ta pentru un scenariu medical sever?",
              actionType: "buttons",
              options: [
                { label: "Da", nextStep: "sanatate_info_1" },
                { label: "Nu", nextStep: "final_dialog_prietenos" }
              ]
            },
            sanatate_info_1: {
              message: [
                "Unele situații medicale sunt mai ușoare, apar frecvent și pun familia în dificultate, dar sunt dificultăți pe care le poți gestiona cu resursele potrivite. Alte situații sunt grave, mai rare, dar când apar pot schimba destinul unei familii pentru totdeauna, necesitând resurse substanțiale și acces rapid la tratament.",
                "Forme mai ușoare / frecvente:\n• Fracturi, arsuri\n• Spitalizare\n• Intervenții chirurgicale minore\n• Incapacitate temporară de muncă\n• Cheltuieli medicale curente\n• Invaliditate parțială\n\nForme grave / critice:\n• Cancer\n• Infarct miocardic\n• AVC\n• Transplant de organe\n• Intervenții chirurgicale majore\n• Insuficiență renală cronică\n• Boală hepatică avansată\n• Scleroză multiplă\n• Parkinson avansat\n• Boli autoimune severe"
              ],
              actionType: "buttons",
              options: [{ label: "Continuă" }],
              nextStep: "sanatate_suma_liniste_financiara"
            },
            sanatate_suma_liniste_financiara: {
              message: "**Întrebare-cheie:**\nDacă mâine ai fi diagnosticat sau ai suferi un accident sever, ce sumă ți-ar oferi liniște financiară?",
              actionType: "buttons",
              options: ["20.000 lei", "50.000 lei", "100.000 lei", "150.000 lei", "200.000 lei", "Peste 200.000 lei"],
              nextStep: "sanatate_acces_servicii"
            },
            sanatate_acces_servicii: {
              message: "PASUL 2 – ACCES (tratament de calitate)\n\nCât de important este pentru tine accesul rapid la servicii medicale private de top? (Scală 1-10)",
              actionType: "input",
              options: { type: "number", placeholder: "Scorul tău: __ / 10" },
              nextStep: "sanatate_control_tratament"
            },
            sanatate_control_tratament: {
              message: "PASUL 3 – CONTROL\nCare variantă te reprezintă cel mai bine?",
              actionType: "buttons",
              options: [
                "Vreau servicii medicale de stat",
                "Vreau bani și decid eu unde mă tratez",
                "Vreau acces garantat la servicii medicale de top în România",
                "Vreau acces garantat la servicii medicale de top în străinătate",
                "Le vreau pe ambele (bani + acces)",
                "Nu m-am gândit niciodată la asta"
              ],
              nextStep: "sanatate_situatie_curenta"
            },
            sanatate_situatie_curenta: {
              message: "PASUL 4 – OPȚIUNILE TALE ÎN ACEST MOMENT\nRaportat la ce îți dorești și la situația ta actuală, unde te afli acum?",
              actionType: "buttons",
              options: [
                "Am asigurare medicală la stat",
                "Am deja o formă de protecție privată",
                "Am și economii pentru situații medicale",
                "Nu am niciun plan clar",
                "Nu știu exact ce acoperire am"
              ],
              nextStep: "sanatate_optiuni_dramatice"
            },
            sanatate_optiuni_dramatice: {
              message: "PASUL 5 – OPȚIUNI ÎN CAZ DE RESURSE LIMITATE\nDacă veniturile tale actuale nu sunt momentan la nivelul care să-ți ofere liniștea financiară și acces rapid la tratament în cazul unei boli grave, ce opțiuni crezi că ai avea?",
              actionType: "interactive_scroll_list",
              options: {
                buttonText: "Am înțeles realitatea",
                options: [
                  "să faci împrumuturi sau să folosești carduri de credit",
                  "să vinzi bunuri personale sau chiar locuința",
                  "să renunți la economii sau investiții",
                  "să reduci drastic cheltuielile și stilul de viață",
                  "să amâni proiecte personale sau educația copiilor",
                  "să limitezi accesul la tratamente de calitate sau să le primești întârziat",
                  "să depinzi exclusiv de sistemul public sau de ajutor extern",
                  "ca familia să preia roluri suplimentare (îngrijire, transport, asistență)",
                  "să amâni recuperarea completă din lipsă de resurse"
                ]
              },
              nextStep: "sanatate_satisfactie_optiuni"
            },
            sanatate_satisfactie_optiuni: {
              message: "Întrebare de reflecție:\nCât de mulțumit ești cu aceste opțiuni bifate pentru tine și familia ta?",
              actionType: "buttons",
              options: ["Foarte mulțumit", "Parțial mulțumit", "Deloc mulțumit", "Nu știu / Nu m-am gândit"],
              nextStep: "sanatate_constientizare"
            },
            sanatate_constientizare: {
              message: "Acest pas te ajută să conștientizezi cât de important este să ai bani și acces, înainte ca evenimentul medical să apară.",
              actionType: "buttons",
              options: [{ label: "Continuă" }],
              nextStep: "sanatate_prezentare_solutie"
            },
            sanatate_prezentare_solutie: {
              message: "CONVERSIA CĂTRE SOLUȚIE\nPe baza răspunsurilor tale, se poate construi o soluție care să îți ofere exact nivelul de:\n✔ bani\n✔ acces\n✔ siguranță\n\nÎn momente critice, diferența nu o face norocul, ci pregătirea.\nAi vrea să vezi ce tip de protecție ți s-ar potrivi cel mai bine?",
              actionType: "buttons",
              options: [
                { label: "Da", nextStep: "formular_contact" },
                { label: "Nu", nextStep: "final_dialog_prietenos" }
              ]
            },
            formular_contact: {
              isProgressStep: true,
              message: "Am nevoie de datele tale de contact (nume, telefon, email), iar în cel mai scurt timp posibil, te voi contacta pentru construirea soluției.\n\nDe asemenea, am rugămintea să semnezi și un acord GDPR.",
              actionType: "form",
              options: {
                buttonText: "Trimite Analiza",
                gdpr: "Sunt de acord cu prelucrarea datelor personale.",
                fields: [
                  { name: "name", placeholder: "Nume Prenume", type: "text", required: true },
                  { name: "email", placeholder: "Email", type: "email", required: true },
                  { name: "phone", placeholder: "Telefon", type: "tel", required: true }
                ],
                 radio_fields: [
                    { 
                        name: "contact_preference", 
                        label: "Când preferi să fii contactat?",
                        required: true,
                        options: ["Dimineața", "După-masa", "Seara"]
                    }
                ]
              },
              nextStep: "multumire_final"
            },
            multumire_final: {
              message: "Mulțumesc! Datele au fost trimise. Te voi contacta în curând! O zi frumoasă!",
              actionType: "end",
              nextStep: ""
            },
            final_dialog_prietenos: {
                message: "Am înțeles. Îți mulțumesc pentru timpul acordat! Dacă te răzgândești, știi unde mă găsești. O zi frumoasă!",
                actionType: 'end',
                nextStep: ''
            }
          }
        };

        await setDoc(doc(db, "formTemplates", "master_standard_v1"), masterData);
        setConfirmModalOpen(false);
        toast({ title: "Succes", description: "Master Form a fost regenerat!" });
        fetchData(auth.currentUser as User);
      } catch (e: any) {
        setConfirmModalOpen(false);
        toast({ variant: "destructive", title: "Eroare la regenerare", description: e.message });
      }
    });
    setConfirmModalOpen(true);
  };


  if (loading) return <div className="p-8 text-white text-center">Se încarcă...</div>;

  const userForms = formTemplates.filter(f => f.ownerId === user?.uid);
  const standardForms = formTemplates.filter(f => f.isTemplate);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto text-white space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Management Formulare</h1>
        <Button onClick={() => setIsCreateModalOpen(true)} className="bg-amber-500 text-black font-bold">
           <FilePlus2 className="mr-2 h-4 w-4"/> Creează Formular Nou
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
         {userForms.map(form => (
            <Card key={form.id} className={`flex flex-col bg-gray-900 border ${activeFormId === form.id ? 'border-green-500' : 'border-gray-800'}`}>
                <CardHeader>
                    <CardTitle>{form.title}</CardTitle>
                    <CardDescription>Personalizat</CardDescription>
                </CardHeader>
                 <CardContent className="flex-grow">
                </CardContent>
                <CardFooter className="flex flex-wrap gap-2 pt-4 border-t border-gray-800">
                    <Button variant="destructive" size="sm" className="flex-1 min-w-[80px]" onClick={() => { setFormToDelete(form.id); setIsDeleteModalOpen(true); }}><Trash2 className="w-4 h-4 mr-1"/> Șterge</Button>
                    <Button variant="secondary" size="sm" className="flex-1 min-w-[80px]" onClick={() => router.push(`/dashboard/form-editor/${form.id}`)}><Edit className="w-4 h-4 mr-1"/> Editează</Button>
                    {activeFormId !== form.id ? (
                        <Button size="sm" className="flex-1 bg-amber-500 text-black min-w-[80px]" onClick={() => handleSetActiveForm(form.id)}>Setează Activ</Button>
                    ) : (
                         <Button size="sm" disabled className="flex-1 bg-green-600/20 text-green-500 border border-green-500 min-w-[80px]">Activ</Button>
                    )}
                </CardFooter>
            </Card>
         ))}
      </div>

      <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-300">Șabloane Standard</h2>
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

      {isAdmin && (
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
      )}

      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogContent>
              <DialogHeader>
                <DialogTitle>Creează un formular nou</DialogTitle>
                <DialogDescription>
                    Poți porni de la un șablon sau de la zero.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="form-title">Numele formularului</Label>
                    <Input id="form-title" placeholder="Ex: Analiză Deces v2" value={newFormTitle} onChange={e => setNewFormTitle(e.target.value)} />
                  </div>
                   <div className="space-y-2">
                    <Label htmlFor="form-source">Pornește de la</Label>
                    <Select value={sourceTemplateId} onValueChange={setSourceTemplateId}>
                        <SelectTrigger id="form-source"><SelectValue placeholder="Sursă" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="blank">Formular Gol</SelectItem>
                            {standardForms.map(f => <SelectItem key={f.id} value={f.id}>{f.title}</SelectItem>)}
                        </SelectContent>
                    </Select>
                  </div>
              </div>
              <DialogFooter className="sm:justify-between gap-2">
                    <Button variant="secondary" onClick={handleCreateAndEdit} disabled={isCreating}>
                      {isCreating ? "Se creează..." : "Creează și Editează"}
                    </Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>

      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
          <DialogContent>
              <DialogHeader>
                <DialogTitle>Ești absolut sigur?</DialogTitle>
                <DialogDescription>
                    Această acțiune nu poate fi anulată. Formularul va fi șters permanent.
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
              <DialogHeader><DialogTitle>{confirmTitle}</DialogTitle><DialogDescription>{confirmDescription}</DialogDescription></DialogHeader>
              <DialogFooter>
                  <Button variant="outline" onClick={() => setConfirmModalOpen(false)}>Anulează</Button>
                  <Button variant={confirmButtonVariant} onClick={() => { if(confirmAction) confirmAction(); }}>{confirmButtonText}</Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>
    </div>
  );
}
