
"use client";

import { useState, useEffect } from "react";
import { User, onAuthStateChanged } from "firebase/auth";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebaseConfig";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, Target, ShieldCheck, AreaChart, Copy } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface Stats {
    totalClients: number;
    convertedClients: number;
    totalDeficit: number;
    conversionRate: number;
}

const StatCard = ({ title, value, icon: Icon, formatAsCurrency = false, formatAsPercent=false }: { title: string, value: string | number, icon: React.ElementType, formatAsCurrency?: boolean, formatAsPercent?: boolean }) => {
    
    let displayValue: string | number = value;
    if (formatAsCurrency) {
        displayValue = `${Number(value).toLocaleString('ro-RO')} RON`;
    }
     if (formatAsPercent) {
        displayValue = `${value}%`;
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{displayValue}</div>
            </CardContent>
        </Card>
    )
}

export default function DashboardSummaryPage() {
    const [user, setUser] = useState<User | null>(null);
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();
    const [activeFormId, setActiveFormId] = useState<string | null>(null);


    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
            } else {
                // Handled by layout
            }
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (user) {
            const fetchDashboardData = async () => {
                setLoading(true);
                try {
                    // Fetch Agent Data (including active form)
                    const agentRef = doc(db, "agents", user.uid);
                    const agentDoc = await getDoc(agentRef);
                    if (agentDoc.exists()) {
                        setActiveFormId(agentDoc.data().activeFormId);
                    }

                    // Fetch Leads for Stats
                    const leadsQuery = query(
                        collection(db, "leads"),
                        where("agentId", "==", user.uid)
                    );
                    const querySnapshot = await getDocs(leadsQuery);
                    
                    let totalClients = 0;
                    let convertedClients = 0;
                    let totalDeficit = 0;

                    querySnapshot.forEach(doc => {
                        const lead = doc.data();
                        totalClients++;
                        if (lead.status === 'Convertit') {
                            convertedClients++;
                        }
                        if (lead.finalDeficit && typeof lead.finalDeficit === 'number') {
                             totalDeficit += lead.finalDeficit;
                        }
                    });

                    const conversionRate = totalClients > 0 ? (convertedClients / totalClients) * 100 : 0;
                    
                    setStats({
                        totalClients,
                        convertedClients,
                        totalDeficit,
                        conversionRate: Math.round(conversionRate * 100) / 100, // round to 2 decimals
                    });

                } catch (error) {
                    console.error("Error fetching dashboard data:", error);
                    toast({variant: "destructive", title: "Eroare", description: "Nu s-au putut încărca datele."});
                } finally {
                    setLoading(false);
                }
            };
            fetchDashboardData();
        }
    }, [user, toast]);

    const copyToClipboard = () => {
        if (!user) return;
        const link = `${window.location.origin}/?agentId=${user.uid}`;
        navigator.clipboard.writeText(link).then(() => {
            toast({
                title: "Copiat!",
                description: "Link-ul tău de client a fost copiat în clipboard.",
            });
        }, (err) => {
            console.error('Could not copy text: ', err);
            toast({
                variant: "destructive",
                title: "Eroare",
                description: "Nu s-a putut copia link-ul.",
            });
        });
    };

    return (
        <>
            <div className="flex items-center">
                <h1 className="text-2xl font-bold md:text-3xl">Sumar & Statistici</h1>
            </div>
            {loading ? (
                <p>Se încarcă statisticile...</p>
            ) : stats ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                   <StatCard title="Total Clienți" value={stats.totalClients} icon={Users} />
                   <StatCard title="Total Deficit Asigurat" value={stats.totalDeficit} icon={ShieldCheck} formatAsCurrency={true} />
                   <StatCard title="Clienți Convertiți" value={stats.convertedClients} icon={Target} />
                   <StatCard title="Rata de Conversie" value={stats.conversionRate} icon={AreaChart} formatAsPercent={true} />
                </div>
            ) : (
                <p>Nu s-au putut încărca statisticile.</p>
            )}
             <div className="grid gap-4 md:gap-8 mt-6">
                 <Card>
                    <CardHeader>
                        <CardTitle>Link-ul tău de Client</CardTitle>
                        <CardDescription>Acesta este link-ul pe care îl poți trimite clienților tăi. Formularul activ este cel setat din pagina "Formulare".</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col sm:flex-row items-center gap-4">
                         {!activeFormId && !loading && (
                            <Badge variant="destructive" className="w-full sm:w-auto">Niciun formular activ setat. Link-ul nu va funcționa.</Badge>
                        )}
                        {user && (
                             <div className="flex-1 w-full bg-muted text-muted-foreground p-2 rounded-md text-sm text-center sm:text-left overflow-x-auto">
                                {`${window.location.origin}/?agentId=${user.uid}`}
                            </div>
                        )}
                        <Button onClick={copyToClipboard} size="sm" className="w-full sm:w-auto" disabled={!user}>
                            <Copy className="mr-2 h-4 w-4" />
                            Copiază Link
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}
