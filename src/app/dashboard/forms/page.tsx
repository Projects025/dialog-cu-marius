
"use client";

import { useState, useEffect } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { collection, doc, getDoc, getDocs, updateDoc, setDoc, serverTimestamp, query } from "firebase/firestore";
import { auth, db } from "@/lib/firebaseConfig";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { FilePlus2, Edit, Copy } from "lucide-react";

export default function FormsPage() {
    const [user, setUser] = useState<User | null>(null);
    const [userForms, setUserForms] = useState<any[]>([]);
    const [templateForms, setTemplateForms] = useState<any[]>([]);
    const [activeFormId, setActiveFormId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [cloning, setCloning] = useState<string | null>(null);
    const router = useRouter();


    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                const agentRef = doc(db, "agents", currentUser.uid);
                const agentDoc = await getDoc(agentRef);
                if (agentDoc.exists()) {
                    setActiveFormId(agentDoc.data().activeFormId);
                }
            } else {
                 router.push("/login");
            }
        });
        return () => unsubscribe();
    }, [router]);

    useEffect(() => {
        const fetchTemplates = async () => {
            if (!user) {
                setLoading(false);
                return;
            }
            setLoading(true);
            try {
                const q = query(collection(db, "formTemplates"));
                const querySnapshot = await getDocs(q);
                const templatesList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                
                // Filter on the client
                const personal = templatesList.filter(form => form.ownerId === user.uid);
                const standard = templatesList.filter(form => !form.ownerId);
                
                setUserForms(personal);
                setTemplateForms(standard);

            } catch (error) {
                console.error("Error fetching form templates:", error);
            } finally {
                setLoading(false);
            }
        };
        
        fetchTemplates();
    }, [user]);

    const handleSetActiveForm = async (formId: string) => {
        if (!user) return;
        try {
            const agentRef = doc(db, "agents", user.uid);
            await updateDoc(agentRef, { activeFormId: formId });
            setActiveFormId(formId);
        } catch (error) {
            console.error("Error setting active form:", error);
            alert("A apărut o eroare la setarea formularului activ.");
        }
    };
    
    const handleCloneAndEdit = async (templateId: string) => {
        if (!user) return;
        if (!templateId && templateForms.length > 0) {
            templateId = templateForms[0].id;
        } else if (!templateId) {
            alert("Nu există șabloane disponibile pentru a crea un formular nou.");
            return;
        }

        setCloning(templateId);
        try {
            const templateRef = doc(db, "formTemplates", templateId);
            const templateDoc = await getDoc(templateRef);

            if (!templateDoc.exists()) {
                throw new Error("Șablonul nu a fost găsit.");
            }
            const templateData = templateDoc.data();
            
            const newFormId = `${user.uid}_custom_${Date.now()}`;

            const newFormRef = doc(db, "formTemplates", newFormId);
            const newFormData = {
                ...templateData,
                title: `${templateData.title} (Copie)`,
                ownerId: user.uid,
                isTemplate: false, // Explicitly mark as not a template
                createdAt: serverTimestamp(),
            };
            await setDoc(newFormRef, newFormData);
            
            setUserForms(prev => [...prev, {id: newFormId, ...newFormData, createdAt: new Date() }]);

            const agentRef = doc(db, "agents", user.uid);
            await updateDoc(agentRef, { activeFormId: newFormId });
            setActiveFormId(newFormId);
            
            router.push(`/dashboard/form-editor?id=${newFormId}`);

        } catch (error) {
            console.error("Error cloning form:", error);
            alert("A apărut o eroare la clonarea formularului.");
        } finally {
            setCloning(null);
        }
    };
    
    const renderFormCard = (form: any, isTemplate: boolean) => (
         <Card key={form.id} className="flex flex-col">
            <CardHeader>
                <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{form.title}</CardTitle>
                     <Badge variant={isTemplate ? "secondary" : "outline"}>
                        {isTemplate ? "Standard" : "Personalizat"}
                    </Badge>
                </div>
                 <CardDescription>
                    Creat la: {form.createdAt?.toDate ? form.createdAt.toDate().toLocaleDateString('ro-RO') : 'Dată necunoscută'}
                </CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
                 {activeFormId === form.id && !isTemplate && (
                    <div className="flex items-center gap-2 text-green-500 font-semibold text-sm mb-4">
                        <Badge variant="secondary" className="bg-green-100 text-green-700">Activ pe Link</Badge>
                    </div>
                )}
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
                {isTemplate ? (
                    <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleCloneAndEdit(form.id)}
                        disabled={cloning === form.id}
                    >
                        <Copy className="mr-2 h-4 w-4" />
                        {cloning === form.id ? "Se clonează..." : "Clonează"}
                    </Button>
                ) : (
                    <>
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

    return (
        <>
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold md:text-3xl">Management Formulare</h1>
                 <Button onClick={() => handleCloneAndEdit(templateForms.length > 0 ? templateForms[0].id : '')} disabled={loading || templateForms.length === 0}>
                    <FilePlus2 className="mr-2 h-4 w-4" />
                    Creează Formular Nou
                </Button>
            </div>
             <p className="text-muted-foreground mt-2">
                Clonează un șablon standard pentru a-l personaliza sau administrează formularele tale deja create.
            </p>

            <div className="mt-8">
                <h2 className="text-xl font-semibold mb-4">Formularele Tale Personalizate</h2>
                {loading ? <p>Se încarcă...</p> : userForms.length > 0 ? (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {userForms.map(form => renderFormCard(form, false))}
                    </div>
                ) : (
                    <p className="text-muted-foreground">Nu ai niciun formular personalizat. Apasă pe "Creează Formular Nou" pentru a începe.</p>
                )}
            </div>

            <div className="mt-12">
                <h2 className="text-xl font-semibold mb-4">Șabloane Standard</h2>
                 {loading ? <p>Se încarcă...</p> : templateForms.length > 0 ? (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {templateForms.map(form => renderFormCard(form, true))}
                    </div>
                ) : (
                    <p className="text-muted-foreground">Nu există șabloane disponibile.</p>
                )}
            </div>
        </>
    );
}
