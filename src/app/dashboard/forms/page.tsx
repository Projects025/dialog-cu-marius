
"use client";

import { useState, useEffect } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { collection, doc, getDoc, getDocs, updateDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebaseConfig";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function FormsPage() {
    const [user, setUser] = useState<User | null>(null);
    const [formTemplates, setFormTemplates] = useState<any[]>([]);
    const [activeFormId, setActiveFormId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

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
                            {formTemplates.map(form => (
                                <div key={form.id} className="flex items-center justify-between p-4 bg-secondary rounded-lg shadow-sm">
                                    <p className="font-medium text-secondary-foreground">{form.title || "Formular fără titlu"}</p>
                                    {activeFormId === form.id ? (
                                        <span className="text-sm font-semibold text-primary px-3 py-1 rounded-full bg-primary/10">
                                            ACTIV
                                        </span>
                                    ) : (
                                        <Button size="sm" onClick={() => handleSetActiveForm(form.id)}>
                                            Setează ca Activ
                                        </Button>
                                    )}
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
