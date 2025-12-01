
"use client";

import { useState, useEffect } from "react";
import Link from 'next/link';
import { User, onAuthStateChanged } from "firebase/auth";
import { collection, query, where, getDocs, doc, getDoc, Timestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebaseConfig";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, Target, BarChart, Copy, CalendarClock, UserCheck, UserX } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import StatChart from "@/components/dashboard/StatChart";

interface LeadData {
    status: string;
    timestamp: Timestamp;
}

interface Stats {
    totalVisitors: number;
    totalLeads: number;
    abandoned: number;
    convertedLeads: number;
    leadsThisWeek: number;
    leadsLast7Days: { date: string; count: number }[];
}

const StatCard = ({ title, value, icon: Icon, description }: { title: string, value: string | number, icon: React.ElementType, description?: string }) => {
    return (
        <Card className="transition-all hover:shadow-lg hover:-translate-y-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-4 pt-0">
                <div className="text-2xl font-bold">{value}</div>
                {description && <p className="text-xs text-muted-foreground">{description}</p>}
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
                    // Fetch Agent Data
                    const agentRef = doc(db, "agents", user.uid);
                    const agentDoc = await getDoc(agentRef);
                    if (agentDoc.exists()) {
                        setActiveFormId(agentDoc.data().activeFormId);
                    }

                    // Fetch Leads Data
                    const leadsQuery = query(
                        collection(db, "leads"),
                        where("agentId", "==", user.uid)
                    );
                    const leadsSnapshot = await getDocs(leadsQuery);
                    const allLeads: LeadData[] = leadsSnapshot.docs.map(doc => doc.data() as LeadData);
                    const totalLeads = allLeads.length;
                    
                    // Fetch Analytics Data (Visitors)
                    const analyticsQuery = query(
                        collection(db, 'analytics'),
                        where('agentId', '==', user.uid),
                        where('type', '==', 'conversation_start')
                    );
                    const analyticsSnapshot = await getDocs(analyticsQuery);
                    const totalVisitors = analyticsSnapshot.size;

                    // Calculate Metrics
                    const abandoned = totalVisitors - totalLeads;
                    const convertedLeads = allLeads.filter(lead => lead.status === 'Convertit').length;
                    
                    const sevenDaysAgo = new Date();
                    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                    sevenDaysAgo.setHours(0, 0, 0, 0);

                    const leadsThisWeek = allLeads.filter(lead => {
                         const timestamp = lead.timestamp?.toDate();
                         return timestamp && timestamp >= sevenDaysAgo;
                    }).length;
                    
                    // Prepare data for the 7-day chart
                    const leadsByDay: {[key: string]: number} = {};
                    for (let i = 0; i < 7; i++) {
                        const d = new Date();
                        d.setDate(d.getDate() - i);
                        const key = d.toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit'});
                        leadsByDay[key] = 0;
                    }

                    allLeads.forEach(lead => {
                        if (lead.timestamp) {
                            const leadDate = lead.timestamp.toDate();
                            if (leadDate >= sevenDaysAgo) {
                                const key = leadDate.toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit' });
                                if (leadsByDay[key] !== undefined) {
                                    leadsByDay[key]++;
                                }
                            }
                        }
                    });
                    
                    const leadsLast7Days = Object.entries(leadsByDay).map(([date, count]) => ({ date, count })).reverse();


                    setStats({
                        totalVisitors,
                        totalLeads,
                        abandoned,
                        convertedLeads,
                        leadsThisWeek,
                        leadsLast7Days,
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
    
    const abandonRate = stats ? (stats.totalVisitors > 0 ? ((stats.abandoned / stats.totalVisitors) * 100).toFixed(0) : 0) : 0;
    
    const funnelData = stats ? [
        { name: 'Conversații', value: stats.totalVisitors, fill: 'hsl(var(--chart-1))' },
        { name: 'Lead-uri', value: stats.totalLeads, fill: 'hsl(var(--chart-2))' },
        { name: 'Abandon', value: stats.abandoned, fill: 'hsl(var(--chart-4))' },
        { name: 'Convertiți', value: stats.convertedLeads, fill: 'hsl(var(--chart-3))' }
    ] : [];

    return (
        <div className="space-y-6">
            <div className="flex items-center">
                <h1 className="text-xl font-bold md:text-2xl">Sumar & Statistici</h1>
            </div>
            {loading ? (
                <p>Se încarcă statisticile...</p>
            ) : stats ? (
                <>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                       <StatCard title="Conversații Începute" value={stats.totalVisitors} icon={Users} description="Total vizitatori pe link-ul tău" />
                       <Link href="/dashboard/leads"><StatCard title="Lead-uri Generate" value={stats.totalLeads} icon={Target} description="Clienți care au completat formularul" /></Link>
                       <StatCard title="Conversații Abandonate" value={stats.abandoned} icon={UserX} description={`${abandonRate}% din total conversații`} />
                       <Link href="/dashboard/leads"><StatCard title="Clienți Convertiți" value={stats.convertedLeads} icon={UserCheck} description="Lead-uri cu status 'Convertit'" /></Link>
                    </div>

                    <div className="grid gap-6 grid-cols-1 lg:grid-cols-5">
                         <div className="lg:col-span-2">
                             <StatChart 
                                title="Performanță Funnel"
                                description="Distribuția evenimentelor principale"
                                type="bar"
                                data={funnelData}
                                dataKey="value"
                            />
                         </div>
                         <div className="lg:col-span-3">
                             <StatChart 
                                title="Activitate recentă"
                                description="Lead-uri noi generate în ultimele 7 zile"
                                type="line"
                                data={stats.leadsLast7Days}
                                dataKey="count"
                                categories={['date']}
                            />
                         </div>
                    </div>
                </>
            ) : (
                <p>Nu s-au putut încărca statisticile.</p>
            )}
             <div className="grid gap-4 md:gap-8">
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
        </div>
    );
}
