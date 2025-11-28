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

export default function FormsPage() {
  const router = useRouter();
  const { toast } = useToast();
  
  // State principal
  const [user, setUser] = useState<User | null>(null);
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

  const restoreMasterTemplate = async () => {
    if (!window.confirm("REGENERARE FINALĂ: Adaug listele de bifat înainte de sume. Continui?")) return;

    try {
      await deleteDoc(doc(db, "formTemplates", "master_standard_v1")).catch(() => {});

      const masterData = {
        title: "Analiză Completă (Master - Final)",
        description: "Include Checklist-uri obligatorii înainte de sume.",
        startStepId: "intro_sequence",
        ownerId: null, 
        isTemplate: true,
        createdAt: new Date(),
        flow: {
          // === 1. INTRODUCERE GENERALĂ ===
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

          // =================================================
          // 2. SCENARIUL DECES (Rămâne neschimbat, e corect)
          // =================================================
          deces_intro_1: { message: ["Un deces afectează negativ profund și pe termen lung atât **planul existențial**, cât și **planul financiar**."], actionType: "buttons", options: ["Continuă"], nextStep: "deces_intro_2" },
          deces_intro_2: { message: "Vei răspunde la 6 întrebări pentru a stabili suma necesară familiei pentru:\n(1.) standardul de viață\n(2.) proiecte în desfășurare\n(3.) credite / datorii", actionType: "buttons", options: ["Sunt gata"], nextStep: "deces_ask_period" },
          deces_ask_period: { message: "1. În cazul unui posibil deces, câți ani ar avea nevoie familia ta de susținere financiară?", actionType: "buttons", options: ["3 ani", "4 ani", "5 ani"], nextStep: "deces_ask_monthly_sum" },
          deces_ask_monthly_sum: { message: "Care ar fi suma de bani lunară necesară în această perioadă (în lei)?\n(Gândește-te la suma pe care o produci tu lunar).", actionType: "input", options: { type: "number", placeholder: "Ex: 5000" }, nextStep: "deces_show_deficit_1" },
          deces_show_deficit_1: { message: ["Am notat primul deficit: **{deficit1} lei**.", "Această sumă reprezintă deficitul pentru menținerea standardului de viață.", "Continuăm cu cheltuielile specifice."], actionType: "buttons", options: ["Da"], nextStep: "deces_ask_event_costs" },
          deces_ask_event_costs: { message: "2. Costuri imediate (înmormântare, taxe)?", actionType: "input", options: { type: "number", placeholder: "Ex: 20000" }, nextStep: "deces_ask_projects" },
          deces_ask_projects: { message: "3. Proiecte în desfășurare (sumă necesară)?", actionType: "input", options: { type: "number", placeholder: "Ex: 50000" }, nextStep: "deces_ask_debts" },
          deces_ask_debts: { message: "4. Datorii/Credite de stins?", actionType: "input", options: { type: "number", placeholder: "Ex: 150000" }, nextStep: "deces_ask_insurance" },
          deces_ask_insurance: { message: "5. Asigurări de viață existente? (Doar cele pentru familie).", actionType: "input", options: { type: "number", placeholder: "Ex: 0" }, nextStep: "deces_ask_savings" },
          deces_ask_savings: { message: "6. Economii disponibile?", actionType: "input", options: { type: "number", placeholder: "Ex: 10000" }, nextStep: "deces_show_final_result" },
          deces_show_final_result: { message: ["Calcul finalizat.", "Deficitul financiar (Moștenirea Negativă) este:\n\n**{finalDeficit} lei**"], actionType: "buttons", options: ["Vezi Rezultatul"], nextStep: "deces_ask_feeling" },
          deces_ask_feeling: { message: "Cum ți se pare această sumă?", actionType: "input", options: { type: "text", placeholder: "Scrie..." }, nextStep: "deces_ask_dramatic_options" },
          deces_ask_dramatic_options: { message: "Ce opțiuni ar avea familia? Bifează:", actionType: "interactive_scroll_list", options: { buttonText: "Am bifat", options: ["Vând casa", "Se mută", "Alt job"] }, nextStep: "deces_present_solution" },
          deces_present_solution: { message: ["Vrei o soluție personalizată?", "Poți crea o moștenire instant."], actionType: "buttons", options: ["Da, vreau detalii", "Nu"], nextStep: "final_contact" },

          // =================================================
          // 3. SCENARIUL PENSIE (FIXAT: Checklist -> Sumă)
          // =================================================
          pensie_intro_1: { message: ["Pensionarea: concediu sau chin?", "Reducerea veniturilor afectează demnitatea."], actionType: "buttons", options: ["Continuă"], nextStep: "pensie_ask_years" },
          pensie_ask_years: { message: "1. Exercițiu: ai 65 ani. Câți ani speri să mai trăiești?", actionType: "buttons", options: ["15 ani", "20 ani", "25 ani"], nextStep: "pensie_ask_monthly_needed" },
          pensie_ask_monthly_needed: { message: "Suma lunară necesară în completare?", actionType: "input", options: { type: "number", placeholder: "Ex: 2000" }, nextStep: "pensie_show_deficit_1" },
          pensie_show_deficit_1: { message: "Necesar bază: **{deficit1} lei**. Continuăm.", actionType: "buttons", options: ["Continuă"], nextStep: "pensie_ask_projects_list" },
          
          // --- AICI ESTE SCHIMBAREA PENTRU PENSIE ---
          pensie_ask_projects_list: { 
            message: "2. Ce planuri ai? Bifează activitățile:", 
            actionType: "interactive_scroll_list", 
            options: { 
                buttonText: "Am selectat", 
                options: [
                    "Călătorii și excursii culturale_editat Marius_pensionare.md.txt]", 
                    "Cursuri și workshop-uri_editat Marius_pensionare.md.txt]", 
                    "Activități sportive_editat Marius_pensionare.md.txt]", 
                    "Voluntariat_editat Marius_pensionare.md.txt]", 
                    "Hobby-uri creative_editat Marius_pensionare.md.txt]", 
                    "Sprijin pentru nepoți_editat Marius_pensionare.md.txt]", 
                    "Grădinărit_editat Marius_pensionare.md.txt]", 
                    "Investiții imobiliare_editat Marius_pensionare.md.txt]"
                ] 
            }, 
            nextStep: "pensie_ask_projects_sum" 
          },
          pensie_ask_projects_sum: { 
            message: "Acum, fă un calcul mental total. Care ar fi suma ANUALĂ necesară pentru aceste activități (în lei)?", 
            actionType: "input", 
            options: { type: "number", placeholder: "Ex: 5000" }, 
            nextStep: "pensie_ask_debts" 
          },
          // ------------------------------------------

          pensie_ask_debts: { message: "3. Datorii la pensie?", actionType: "input", options: { type: "number", placeholder: "Ex: 0" }, nextStep: "pensie_ask_insurance" },
          pensie_ask_insurance: { message: "4. Asigurări/Pilon 3?", actionType: "input", options: { type: "number", placeholder: "Ex: 0" }, nextStep: "pensie_ask_savings" },
          pensie_ask_savings: { message: "5. Alte economii?", actionType: "input", options: { type: "number", placeholder: "Ex: 40000" }, nextStep: "pensie_show_final" },
          pensie_show_final: { message: "Deficit Pensie: **{finalDeficit} lei**.", actionType: "buttons", options: ["Vezi"], nextStep: "pensie_ask_feeling" },
          pensie_ask_feeling: { message: "Cum ți se pare suma?", actionType: "input", options: { type: "text" } , nextStep: "pensie_dramatic_options" },
          pensie_dramatic_options: { message: "Cum ți s-ar ajusta standardul de viață?", actionType: "interactive_scroll_list", options: { buttonText: "Am înțeles", options: ["Reducerea alimentelor", "Limitare medicală", "Munca la bătrânețe", "Apel la copii"] }, nextStep: "pensie_solution" },
          pensie_solution: { message: "Vrei o soluție?", actionType: "buttons", options: ["Da", "Nu"], nextStep: "final_contact" },

          // =================================================
          // 4. SCENARIUL STUDII (FIXAT: Checklist -> Sumă)
          // =================================================
          studii_intro_1: { message: "Vrei să le dai aripi copiilor?", actionType: "buttons", options: ["Da"], nextStep: "studii_ask_years" },
          studii_ask_years: { message: "1. Câți ani îi susții la facultate?", actionType: "buttons", options: ["3 ani", "4 ani", "5 ani", "6 ani"], nextStep: "studii_ask_cost_list" },
          
          // --- STUDII Q1 ---
          studii_ask_cost_list: { 
              message: "Bifează cheltuielile studentului:", 
              actionType: "interactive_scroll_list", 
              options: { buttonText: "Am selectat", options: ["Taxă școlarizare", "Cazare/Chirie", "Mâncare", "Transport", "Gadgeturi", "Cărți"] }, 
              nextStep: "studii_ask_annual_cost" 
          },
          studii_ask_annual_cost: { message: "Care ar fi costul ANUAL total?", actionType: "input", options: { type: "number" }, nextStep: "studii_show_deficit_1" },
          
          studii_show_deficit_1: { message: "Cost bază: **{deficit1} lei**. Continuăm.", actionType: "buttons", options: ["Continuă"], nextStep: "studii_ask_extra_list" },
          
          // --- STUDII Q2 ---
          studii_ask_extra_list: { 
              message: "2. Dezvoltare personală? Bifează:", 
              actionType: "interactive_scroll_list", 
              options: { buttonText: "Selectat", options: ["Hobby", "Tabere", "Haine", "Distracție"] }, 
              nextStep: "studii_ask_extra" 
          },
          studii_ask_extra: { message: "Cost anual extra?", actionType: "input", options: { type: "number" }, nextStep: "studii_ask_projects_list" },
          
          // --- STUDII Q3 ---
          studii_ask_projects_list: {
              message: "3. Proiecte majore la debut? Bifează:",
              actionType: "interactive_scroll_list",
              options: { buttonText: "Selectat", options: ["Afacere personală", "Mașină", "Avans casă"] },
              nextStep: "studii_ask_projects"
          },
          studii_ask_projects: { message: "Suma necesară?", actionType: "input", options: { type: "number" }, nextStep: "studii_ask_wedding" },
          
          studii_ask_wedding: { message: "4. Nuntă?", actionType: "input", options: { type: "number" }, nextStep: "studii_ask_savings" },
          studii_ask_savings: { message: "5. Economii existente?", actionType: "input", options: { type: "number" }, nextStep: "studii_ask_insurance" },
          studii_ask_insurance: { message: "6. Asigurări existente?", actionType: "input", options: { type: "number" }, nextStep: "studii_ask_children_count" },
          studii_ask_children_count: { message: "Câți copii ai?", actionType: "input", options: { type: "number" }, nextStep: "studii_show_final" },
          studii_show_final: { message: "Deficit Total Studii: **{finalDeficit} lei**.", actionType: "buttons", options: ["Vezi"], nextStep: "studii_solution" },
          studii_solution: { message: "Vrei o soluție?", actionType: "buttons", options: ["Da", "Nu"], nextStep: "final_contact" },

          // === 5. SANATATE ===
          sanatate_intro_1: { message: ["Sănătatea costă.", "Boala nu anunță."], actionType: "buttons", options: ["Continuă"], nextStep: "sanatate_ask_sum" },
          sanatate_ask_sum: { message: "Ce sumă ți-ar oferi liniște?", actionType: "buttons", options: ["50.000", "100.000", "200.000"], nextStep: "sanatate_ask_access" },
          sanatate_ask_access: { message: "Importanță acces (1-10)?", actionType: "input", options: { type: "number" }, nextStep: "sanatate_ask_control" },
          sanatate_ask_control: { message: "Ce preferi?", actionType: "buttons", options: ["Bani", "Acces RO", "Acces Extern"], nextStep: "sanatate_ask_current" },
          sanatate_ask_current: { message: "Unde te afli acum?", actionType: "buttons", options: ["Doar stat", "Privat", "Economii"], nextStep: "sanatate_dramatic_options" },
          sanatate_dramatic_options: { message: "Fără bani, ce ai face?", actionType: "interactive_scroll_list", options: { buttonText: "Am înțeles", options: ["Împrumuturi", "Vând casa", "Sistem public"] }, nextStep: "sanatate_solution" },
          sanatate_solution: { message: ["Ești mulțumit?", "Vrei o soluție?"], actionType: "buttons", options: ["Da", "Nu"], nextStep: "final_contact" },

          // === 6. FINAL ===
          final_contact: {
            message: "Lasă-mi datele tale.",
            actionType: "form",
            options: { buttonText: "Trimite", gdpr: "Accept", fields: [{name:"name", placeholder:"Nume", type:"text", required:true}, {name:"phone", placeholder:"Telefon", type:"tel", required:true}, {name:"email", placeholder:"Email", type:"email", required:true}] },
            nextStep: "thank_you_final"
          },
          thank_you_final: { message: "Mulțumesc! Datele au fost transmise.", actionType: "end", nextStep: "" }
        }
      };

      await setDoc(doc(db, "formTemplates", "master_standard_v1"), masterData);
      toast({ title: "Succes!", description: "Șablonul Master a fost regenerat." });
      setConfirmModalOpen(false);
      window.location.reload();

    } catch (error: any) {
      console.error("Eroare la restaurare:", error);
      alert("Eroare: " + error.message);
    }
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