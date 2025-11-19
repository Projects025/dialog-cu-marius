
"use client";

import { useState, useEffect } from "react";
import { User, onAuthStateChanged } from "firebase/auth";
import { collection, query, where, getDocs } from "firebase/firestore";
import { auth, db } from "@/lib/firebaseConfig";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Target, ShieldCheck, AreaChart } from 'lucide-react';

interface Stats {
    totalClients: number;
    convertedClients: number;
    totalDeficit: number;
    conversionRate: number;
}

const StatCard = ({ title, value, icon: Icon, formatAsCurrency = false, formatAsPercent=false }: { title: string, value: string | number, icon: React.ElementType, formatAsCurrency?: boolean, formatAsPercent?: boolean }) => {
    
    let displayValue = value;
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
            const fetchStats = async () => {
                setLoading(true);
                try {
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
                    console.error("Error fetching stats:", error);
                } finally {
                    setLoading(false);
                }
            };
            fetchStats();
        }
    }, [user]);

    return (
        <>
            <div className="flex items-center">
                <h1 className="text-lg font-semibold md:text-2xl">Sumar & Statistici</h1>
            </div>
            {loading ? (
                <p>Se încarcă statisticile...</p>
            ) : stats ? (
                <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
                   <StatCard title="Total Clienți" value={stats.totalClients} icon={Users} />
                   <StatCard title="Total Deficit Asigurat" value={stats.totalDeficit} icon={ShieldCheck} formatAsCurrency={true} />
                   <StatCard title="Clienți Convertiți" value={stats.convertedClients} icon={Target} />
                   <StatCard title="Rata de Conversie" value={stats.conversionRate} icon={AreaChart} formatAsPercent={true} />
                </div>
            ) : (
                <p>Nu s-au putut încărca statisticile.</p>
            )}
             <div className="grid gap-4 md:gap-8 mt-8">
                 <Card>
                    <CardHeader>
                        <CardTitle>Link-ul tău de Client</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center gap-4">
                        {user && (
                            <a href={`/?agentId=${user.uid}`} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline break-all text-center">
                                {`${window.location.origin}/?agentId=${user.uid}`}
                            </a>
                        )}
                    </CardContent>
                </Card>
            </div>
        </>
    );
}
