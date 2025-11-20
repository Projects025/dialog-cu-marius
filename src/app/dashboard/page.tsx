
"use client";

import { useState, useEffect } from "react";
import { User, onAuthStateChanged } from "firebase/auth";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebaseConfig";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, Target, AreaChart, Copy } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

interface Stats {
    totalClients: number;
    convertedClients: number;
    conversionRate: number;
}

const StatCard = ({ title, value, icon: Icon, formatAsPercent=false }: { title: string, value: string | number, icon: React.ElementType, formatAsPercent?: boolean }) => {
    
    let displayValue: string | number = value;
     if (formatAsPercent) {
        displayValue = `${value}%`;
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-4 pt-0">
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

                    querySnapshot.forEach(doc => {
                        const lead = doc.data();
                        totalClients++;
                        if (lead.status === 'Convertit') {
                            convertedClients++;
                        }
                    });

                    const conversionRate = totalClients > 0 ? (convertedClients / totalClients) * 100 : 0;
                    
                    setStats({
                        totalClients,
                        convertedClients,
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
                <h1 className="text-xl font-bold md:text-2xl">Sumar & Statistici</h1>
            </div>
            {loading ? (
                <p>Se încarcă statisticile...</p>
            ) : stats ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                   <StatCard title="Total Clienți" value={stats.totalClients} icon={Users} />
                   <StatCard title="Clienți Convertiți" value={stats.convertedClients} icon={Target} />
                   <StatCard title="Rata de Conversie" value={stats.conversionRate} icon={AreaChart} formatAsPercent={true} />
                </div>
            ) : (
                <p>Nu s-au putut încărca statisticile.</p>
            )}
             <div className="grid gap-4 md:gap-8 mt-6">
                 <Card>
                    <CardHeader className="p-4">
                        <CardTitle className="text-base">Link-ul tău de Client</CardTitle>
                        <CardDescription className="text-xs">Acesta este link-ul pe care îl poți trimite clienților tăi. Formularul activ este cel setat din pagina "Formulare".</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col sm:flex-row items-center gap-2 p-4 pt-0">
                         {!activeFormId && !loading && (
                            <Badge variant="destructive" className="w-full sm:w-auto text-xs">Niciun formular activ setat. Link-ul nu va funcționa.</Badge>
                        )}
                        {user && (
                             <div className="flex-1 w-full bg-muted text-muted-foreground p-2 rounded-md text-xs text-center sm:text-left overflow-x-auto">
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

    
