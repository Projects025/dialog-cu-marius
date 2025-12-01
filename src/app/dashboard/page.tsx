
"use client";

import { useState, useEffect } from "react";
import Link from 'next/link';
import { User, onAuthStateChanged } from "firebase/auth";
import { collection, query, where, getDocs, doc, getDoc, Timestamp, updateDoc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebaseConfig";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, Target, BarChart, Copy, CalendarClock, UserCheck, UserX, TrendingUp, Goal, Edit, Flame, Activity, BrainCircuit, PhoneForwarded, Star } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import StatChart from "@/components/dashboard/StatChart";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { format, subDays, startOfWeek, endOfWeek, isSameDay, differenceInCalendarDays } from 'date-fns';

interface LeadData {
    status: string;
    timestamp: Timestamp;
    finalDeficit?: number;
    contact?: { name: string };
}

interface Stats {
    totalVisitors: number;
    totalLeads: number;
    conversionRate: number;
    convertedLeads: number;
    closingRate: number;
    monthlyComparison: { name: string; 'Luna curentă': number; 'Luna trecută': number }[];
    last7DaysLeads: { date: string; Leaduri: number }[];
}

interface Insights {
    streak: number;
    leadsThisWeek: number;
    newLeadsFromYesterday: number;
    priorityLead: { name: string; deficit: number } | null;
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

const InsightCard = ({ icon: Icon, title, children }: { icon: React.ElementType, title: React.ReactNode, children: React.ReactNode }) => {
    return (
        <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/30 border border-border/50">
            <Icon className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
            <div className="flex-grow min-w-0">
                <h4 className="font-semibold text-foreground">{title}</h4>
                <div className="text-sm text-muted-foreground">{children}</div>
            </div>
        </div>
    )
}

export default function DashboardSummaryPage() {
    const [user, setUser] = useState<User | null>(null);
    const [stats, setStats] = useState<Stats | null>(null);
    const [insights, setInsights] = useState<Insights | null>(null);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();
    
    const [monthlyGoal, setMonthlyGoal] = useState(10);
    const [convertedThisMonth, setConvertedThisMonth] = useState(0);
    const [isEditingGoal, setIsEditingGoal] = useState(false);
    const [newGoal, setNewGoal] = useState(monthlyGoal);


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
                    // Fetch Agent Data (including monthly goal)
                    const agentRef = doc(db, "agents", user.uid);
                    const agentDoc = await getDoc(agentRef);
                    if (agentDoc.exists()) {
                        const agentData = agentDoc.data();
                        setMonthlyGoal(agentData.monthlyGoal || 10);
                        setNewGoal(agentData.monthlyGoal || 10);
                    }

                    // Fetch Leads Data for agent
                    const leadsQuery = query(
                        collection(db, "leads"),
                        where("agentId", "==", user.uid)
                    );
                    const leadsSnapshot = await getDocs(leadsQuery);
                    const allLeads: LeadData[] = leadsSnapshot.docs.map(doc => doc.data() as LeadData);

                    // Fetch Analytics Data (Visitors) for agent
                    const analyticsQuery = query(
                        collection(db, 'analytics'),
                        where('agentId', '==', user.uid),
                        where('type', '==', 'conversation_start')
                    );
                    const analyticsSnapshot = await getDocs(analyticsQuery);
                    const allVisitors = analyticsSnapshot.docs.map(doc => doc.data() as { timestamp: Timestamp });

                    // --- CALCULATE METRICS ---
                    const now = new Date();
                    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

                    // Leads
                    const leadsThisMonth = allLeads.filter(l => l.timestamp && l.timestamp.toDate() >= startOfThisMonth).length;
                    const leadsLastMonth = allLeads.filter(l => {
                        const d = l.timestamp?.toDate();
                        return d && d >= startOfLastMonth && d <= endOfLastMonth;
                    }).length;

                    // Converted Leads
                    const convertedThisMonthCount = allLeads.filter(l => l.status === 'Convertit' && l.timestamp && l.timestamp.toDate() >= startOfThisMonth).length;
                    setConvertedThisMonth(convertedThisMonthCount);
                    const convertedLastMonth = allLeads.filter(l => {
                        const d = l.timestamp?.toDate();
                        return d && l.status === 'Convertit' && d >= startOfLastMonth && d <= endOfLastMonth;
                    }).length;
                    
                     // Visitors
                    const visitorsThisMonth = allVisitors.filter(v => v.timestamp.toDate() >= startOfThisMonth).length;

                    // Rates
                    const conversionRate = visitorsThisMonth > 0 ? (leadsThisMonth / visitorsThisMonth) * 100 : 0;
                    const closingRate = leadsThisMonth > 0 ? (convertedThisMonthCount / leadsThisMonth) * 100 : 0;

                    // Last 7 days leads
                    const last7DaysData = Array.from({ length: 7 }).map((_, i) => {
                        const date = subDays(now, i);
                        return { date: format(date, 'dd/MM'), Leaduri: 0 };
                    }).reverse();

                    allLeads.forEach(lead => {
                         if (lead.timestamp) {
                            const leadDate = lead.timestamp.toDate();
                            const formattedDate = format(leadDate, 'dd/MM');
                            const dayData = last7DaysData.find(d => d.date === formattedDate);
                            if (dayData) {
                                dayData.Leaduri++;
                            }
                        }
                    });

                    setStats({
                        totalVisitors: allVisitors.length,
                        totalLeads: allLeads.length,
                        conversionRate: Math.round(conversionRate),
                        convertedLeads: allLeads.filter(l => l.status === 'Convertit').length,
                        closingRate: Math.round(closingRate),
                        monthlyComparison: [
                            { name: 'Lead-uri', 'Luna curentă': leadsThisMonth, 'Luna trecută': leadsLastMonth },
                            { name: 'Convertiți', 'Luna curentă': convertedThisMonthCount, 'Luna trecută': convertedLastMonth },
                        ],
                        last7DaysLeads: last7DaysData
                    });

                    // --- CALCULATE INSIGHTS ---
                    const leadDates = allLeads
                        .map(l => l.timestamp?.toDate())
                        .filter((d): d is Date => !!d)
                        .map(d => startOfWeek(d, { weekStartsOn: 1 })); // Normalize to start of day

                    const uniqueLeadDays = new Set(leadDates.map(d => d.toISOString().split('T')[0]));
                    
                    let streak = 0;
                    let currentDate = new Date();
                    currentDate.setHours(0,0,0,0);
                    while (uniqueLeadDays.has(currentDate.toISOString().split('T')[0])) {
                        streak++;
                        currentDate.setDate(currentDate.getDate() - 1);
                    }
                    
                    const startOfCurrentWeek = startOfWeek(now, { weekStartsOn: 1 });
                    const endOfCurrentWeek = endOfWeek(now, { weekStartsOn: 1 });
                    const leadsThisWeek = allLeads.filter(l => {
                        const d = l.timestamp?.toDate();
                        return d && d >= startOfCurrentWeek && d <= endOfCurrentWeek;
                    }).length;
                    
                    const yesterday = subDays(now, 1);
                    const newLeadsFromYesterday = allLeads.filter(l => {
                        const d = l.timestamp?.toDate();
                        return d && isSameDay(d, yesterday) && (l.status === 'Nou' || !l.status);
                    }).length;

                    const priorityLeadData = allLeads
                        .filter(l => l.finalDeficit && l.finalDeficit > 0)
                        .sort((a, b) => (b.finalDeficit || 0) - (a.finalDeficit || 0))[0];

                    setInsights({
                        streak,
                        leadsThisWeek,
                        newLeadsFromYesterday,
                        priorityLead: priorityLeadData ? { name: priorityLeadData.contact?.name || 'N/A', deficit: priorityLeadData.finalDeficit || 0 } : null
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
    
    const handleSaveGoal = async () => {
        if (!user) return;
        const goalValue = Number(newGoal);
        if (isNaN(goalValue) || goalValue <= 0) {
            toast({ variant: 'destructive', title: 'Obiectiv invalid', description: 'Te rog introdu un număr pozitiv.' });
            return;
        }

        const agentRef = doc(db, 'agents', user.uid);
        try {
            await updateDoc(agentRef, { monthlyGoal: goalValue });
            setMonthlyGoal(goalValue);
            setIsEditingGoal(false);
            toast({ title: 'Succes!', description: 'Obiectivul a fost actualizat.' });
        } catch (error) {
            // If the document doesn't exist, create it.
             if ((error as any).code === 'not-found') {
                 await setDoc(agentRef, { monthlyGoal: goalValue }, { merge: true });
                 setMonthlyGoal(goalValue);
                 setIsEditingGoal(false);
                 toast({ title: 'Succes!', description: 'Obiectivul a fost salvat.' });
             } else {
                console.error("Error updating goal:", error);
                toast({ variant: 'destructive', title: 'Eroare', description: 'Nu s-a putut salva obiectivul.' });
             }
        }
    };

    const goalProgress = monthlyGoal > 0 ? (convertedThisMonth / monthlyGoal) * 100 : 0;

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
                       <Link href="/dashboard/leads"><StatCard title="Total Lead-uri" value={stats.totalLeads} icon={Users} description="Clienți care au finalizat analiza" /></Link>
                       <StatCard title="Rată de Conversie" value={`${stats.conversionRate}%`} icon={TrendingUp} description="Vizitatori → Lead-uri (Luna Curentă)" />
                       <Link href="/dashboard/leads"><StatCard title="Total Clienți Convertiți" value={stats.convertedLeads} icon={UserCheck} description="Lead-uri cu status 'Convertit'" /></Link>
                       <StatCard title="Rată de Închidere" value={`${stats.closingRate}%`} icon={Target} description="Lead-uri → Convertiți (Luna Curentă)" />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Acțiuni Recomandate</CardTitle>
                                <CardDescription>Asistentul tău proactiv.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {insights?.newLeadsFromYesterday && insights.newLeadsFromYesterday > 0 ? (
                                    <InsightCard icon={PhoneForwarded} title={`Sună cei ${insights.newLeadsFromYesterday} clienți de ieri`}>
                                        Nu lăsa lead-urile să se "răcească". <Link href="/dashboard/leads" className="text-primary hover:underline font-semibold">Vezi clienții</Link>
                                    </InsightCard>
                                ) : (
                                    <InsightCard icon={PhoneForwarded} title="Ești la zi cu telefoanele">
                                        Nu ai clienți noi de contactat de ieri. Super!
                                    </InsightCard>
                                )}
                                 {insights?.priorityLead ? (
                                    <InsightCard icon={Star} title={
                                        <div className="flex items-center flex-wrap">
                                            <span>Prioritizează pe&nbsp;</span>
                                            <span className="font-bold truncate">{insights.priorityLead.name}</span>
                                        </div>
                                    }>
                                        Acest client are un deficit calculat de <span className="font-bold">{insights.priorityLead.deficit.toLocaleString('ro-RO')} lei</span>.
                                    </InsightCard>
                                ) : (
                                    <InsightCard icon={Star} title="Nicio prioritate urgentă">
                                        Toate lead-urile cu deficit par a fi gestionate.
                                    </InsightCard>
                                )}
                            </CardContent>
                        </Card>
                         <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Consistență & Activitate</CardTitle>
                                <CardDescription>Obiceiurile fac campionii.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <InsightCard icon={Flame} title={`${insights?.streak || 0} zile consecutive de activitate`}>
                                   {insights && insights.streak > 1 ? 'Felicitări, continuă tot așa!' : 'Generează un lead azi pentru a continua.'}
                                </InsightCard>
                                <InsightCard icon={Activity} title={`${insights?.leadsThisWeek || 0} lead-uri săptămâna aceasta`}>
                                   Un start bun pentru această săptămână.
                                </InsightCard>
                            </CardContent>
                        </Card>
                         <Card className="h-full flex flex-col bg-gradient-to-br from-muted/30 to-muted/10 border-border/80">
                             <CardHeader>
                                 <CardTitle>Obiectiv Lunar</CardTitle>
                                 <CardDescription>Clienți convertiți luna aceasta.</CardDescription>
                             </CardHeader>
                             <CardContent className="flex-grow flex flex-col justify-center items-center gap-4">
                                <div className="relative w-32 h-32 sm:w-40 sm:h-40">
                                    <svg className="w-full h-full" viewBox="0 0 36 36">
                                        <path className="text-muted/50" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="2.5"></path>
                                        <path className="text-primary drop-shadow-[0_2px_4px_hsl(var(--primary)/0.5)]" strokeLinecap="round" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="2.5" strokeDasharray={`${goalProgress}, 100`}></path>
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className="text-3xl font-bold">{convertedThisMonth}</span>
                                        <span className="text-sm text-muted-foreground">din {monthlyGoal}</span>
                                    </div>
                                </div>
                                {isEditingGoal ? (
                                    <div className="flex items-center gap-2 w-full max-w-[200px] mx-auto">
                                        <Input 
                                            type="number" 
                                            value={newGoal}
                                            onChange={(e) => setNewGoal(Number(e.target.value))}
                                            className="h-9 text-center"
                                            onKeyDown={(e) => e.key === 'Enter' && handleSaveGoal()}
                                        />
                                        <Button size="sm" onClick={handleSaveGoal}>Salvează</Button>
                                    </div>
                                ) : (
                                    <Button variant="ghost" size="sm" onClick={() => setIsEditingGoal(true)}>
                                        <Edit className="h-3 w-3 mr-2" /> Setează Obiectiv
                                    </Button>
                                )}
                             </CardContent>
                         </Card>
                    </div>

                    <div className="grid gap-6 grid-cols-1">
                         <StatChart 
                            title="Performanță Comparativă (Lunar)"
                            description="Comparativ cu luna precedentă"
                            type="bar"
                            data={stats.monthlyComparison}
                            categories={['Luna curentă', 'Luna trecută']}
                        />
                    </div>
                     <div className="grid grid-cols-1">
                        <StatChart
                            title="Lead-uri în Ultimele 7 Zile"
                            description="Evoluția numărului de clienți noi."
                            type="line"
                            data={stats.last7DaysLeads}
                            dataKey="Leaduri"
                        />
                    </div>
                </>
            ) : (
                <p>Nu s-au putut încărca statisticile.</p>
            )}
        </div>
    );
}
