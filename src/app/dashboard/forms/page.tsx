
"use client";

import { useState, useEffect } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { collection, doc, getDoc, getDocs, updateDoc, setDoc, serverTimestamp, query } from "firebase/firestore";
import { auth, db } from "@/lib/firebaseConfig";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";

export default function FormsPage() {
    const [user, setUser] = useState<User | null>(null);
    const [allForms, setAllForms] = useState<any[]>([]);
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
                
                console.log("Templates fetched:", templatesList);
                setAllForms(templatesList);

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
            
            // Add new form to local state to avoid re-fetching
            setUserForms(prev => [...prev, {id: newFormId, ...newFormData, createdAt: new Date() }]);

            // Set it as active
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
    
    return (
        <>
            <div className="flex items-center">
                <h1 className="text-lg font-semibold md:text-2xl">Formulare</h1>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Formularele Tale Personalizate</CardTitle>
                    <CardDescription>Acestea sunt formularele pe care le-ai clonat și pe care le poți edita. Alege unul pentru a-l activa.</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? <p>Se încarcă...</p> : userForms.length > 0 ? (
                        <div className="space-y-4">
                            {userForms.map(form => (
                                <div key={form.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-secondary rounded-lg shadow-sm gap-4">
                                    <div className="flex items-center gap-3">
                                        <p className="font-medium text-secondary-foreground">{form.title}</p>
                                    </div>
                                    <div className="flex items-center gap-2 self-end sm:self-center">
                                        {activeFormId === form.id ? (
                                            <Badge variant="secondary" className="bg-primary/20 text-primary font-bold">ACTIV</Badge>
                                        ) : (
                                            <Button size="sm" onClick={() => handleSetActiveForm(form.id)}>Setează Activ</Button>
                                        )}
                                        <Button size="sm" variant="outline" onClick={() => router.push(`/dashboard/form-editor?id=${form.id}`)}>Editează</Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p>Nu ai niciun formular personalizat. Clonează un șablon pentru a începe.</p>
                    )}
                </CardContent>
            </Card>

            <Card className="mt-8">
                <CardHeader>
                    <CardTitle>Șabloane Standard</CardTitle>
                     <CardDescription>Acestea sunt șabloane predefinite. Le poți clona pentru a le personaliza.</CardDescription>
                </CardHeader>
                <CardContent>
                     {loading ? <p>Se încarcă...</p> : templateForms.length > 0 ? (
                        <div className="space-y-4">
                             {templateForms.map(form => (
                                <div key={form.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-secondary rounded-lg shadow-sm gap-4">
                                    <p className="font-medium text-secondary-foreground">{form.title}</p>
                                    <div className="flex items-center gap-2 self-end sm:self-center">
                                         <Button 
                                            size="sm" 
                                            variant="outline"
                                            onClick={() => handleCloneAndEdit(form.id)}
                                            disabled={cloning === form.id}
                                        >
                                            {cloning === form.id ? "Se clonează..." : "Clonează & Personalizează"}
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p>Nu există șabloane disponibile.</p>
                    )}
                </CardContent>
            </Card>
        </>
    );

    