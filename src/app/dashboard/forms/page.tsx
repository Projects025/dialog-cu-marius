
"use client";

import { useState, useEffect } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { collection, doc, getDoc, getDocs, updateDoc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebaseConfig";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";

export default function FormsPage() {
    const [user, setUser] = useState<User | null>(null);
    const [formTemplates, setFormTemplates] = useState<any[]>([]);
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
            }
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const fetchTemplates = async () => {
            setLoading(true);
            try {
                const templatesCollection = collection(db, "formTemplates");
                const templatesSnapshot = await getDocs(templatesCollection);
                const templatesList = templatesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setFormTemplates(templatesList);
            } catch (error) {
                console.error("Error fetching form templates:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchTemplates();
    }, []);

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
            // 1. Read the template
            const templateRef = doc(db, "formTemplates", templateId);
            const templateDoc = await getDoc(templateRef);

            if (!templateDoc.exists()) {
                throw new Error("Șablonul nu a fost găsit.");
            }
            const templateData = templateDoc.data();
            
            // 2. Create a new unique ID
            const newFormId = `${user.uid}_custom_${Date.now()}`;

            // 3. Create the copy with ownerId
            const newFormRef = doc(db, "formTemplates", newFormId);
            await setDoc(newFormRef, {
                ...templateData,
                title: `${templateData.title} (Copie)`,
                ownerId: user.uid,
                isTemplate: false, // Marcam ca fiind o copie
                createdAt: new Date(),
            });

            // 4. Update agent's activeFormId
            const agentRef = doc(db, "agents", user.uid);
            await updateDoc(agentRef, { activeFormId: newFormId });
            setActiveFormId(newFormId);
            
            // Add the new form to the local state to see it immediately
            setFormTemplates(prev => [...prev, {id: newFormId, ...templateData, title: `${templateData.title} (Copie)`, ownerId: user.uid, isTemplate: false}]);

            // 5. Redirect to the editor
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
                <h1 className="text-lg font-semibold md:text-2xl">Formularele Mele</h1>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Selectează Formularul Activ</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <p>Se încarcă formularele...</p>
                    ) : formTemplates.length > 0 ? (
                        <div className="space-y-4">
                            {formTemplates
                                .filter(form => form.isTemplate || form.ownerId === user?.uid) // Show templates and user's own forms
                                .map(form => (
                                <div key={form.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-secondary rounded-lg shadow-sm gap-4">
                                    <div className="flex items-center gap-3">
                                        <p className="font-medium text-secondary-foreground">{form.title || "Formular fără titlu"}</p>
                                        {form.isTemplate && <Badge variant="outline">Șablon</Badge>}
                                        {form.ownerId === user?.uid && <Badge variant="default">Personalizat</Badge>}
                                    </div>
                                    <div className="flex items-center gap-2 self-end sm:self-center">
                                        {activeFormId === form.id ? (
                                            <Badge variant="secondary" className="bg-primary/20 text-primary font-bold">
                                                ACTIV
                                            </Badge>
                                        ) : (
                                            <Button size="sm" onClick={() => handleSetActiveForm(form.id)}>
                                                Setează Activ
                                            </Button>
                                        )}
                                        
                                        {form.isTemplate && (
                                             <Button 
                                                size="sm" 
                                                variant="outline"
                                                onClick={() => handleCloneAndEdit(form.id)}
                                                disabled={cloning === form.id}
                                            >
                                                {cloning === form.id ? "Se clonează..." : "Clonare & Personalizare"}
                                            </Button>
                                        )}
                                        {form.ownerId === user?.uid && (
                                             <Button size="sm" variant="outline" onClick={() => router.push(`/dashboard/form-editor?id=${form.id}`)}>
                                                Editează
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p>Nu există formulare disponibile.</p>
                    )}
                </CardContent>
            </Card>
        </>
    );
}
