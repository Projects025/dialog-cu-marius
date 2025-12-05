
"use client";

import { useState, useEffect, useMemo } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { collection, query, where, getDocs, orderBy, doc, updateDoc, addDoc, serverTimestamp, deleteDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { format, isValid, parseISO } from 'date-fns';
import { DateRange } from 'react-day-picker';

import { auth, db } from "@/lib/firebaseConfig";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError, type SecurityRuleContext } from "@/firebase/errors";
import { Badge } from "@/components/ui/badge";
import { FilePlus2, User as UserIcon, Search, Calendar as CalendarIcon, X, History, Trash2 } from "lucide-react";
import LeadCard from "@/components/dashboard/LeadCard";
import { ScrollArea } from "@/components/ui/scroll-area";
import ExportButtons from "@/components/dashboard/ExportButtons";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

// --- Tipuri noi pentru gruparea lead-urilor ---
interface Lead {
  id: string;
  contact?: { name?: string; email?: string; phone?: string };
  timestamp: any;
  status?: string;
  source?: string;
  [key: string]: any;
}

interface GroupedLead {
  id: string; // Folosim email-ul ca ID unic pentru grup
  latestLead: Lead;
  history: Lead[];
  count: number;
}

const groupLeadsByEmail = (leads: Lead[]): GroupedLead[] => {
    if (!leads || leads.length === 0) return [];

    const grouped = new Map<string, Lead[]>();

    leads.forEach(lead => {
        const email = lead.contact?.email?.toLowerCase() || `_manual_${lead.id}`;
        if (!grouped.has(email)) {
            grouped.set(email, []);
        }
        grouped.get(email)!.push(lead);
    });

    const result: GroupedLead[] = [];
    grouped.forEach((history, email) => {
        const sortedHistory = [...history].sort((a, b) => {
            const dateA = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(0);
            const dateB = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(0);
            return dateB.getTime() - dateA.getTime();
        });

        result.push({
            id: email,
            latestLead: sortedHistory[0],
            history: sortedHistory,
            count: sortedHistory.length,
        });
    });

    return result.sort((a, b) => {
        const dateA = a.latestLead.timestamp?.toDate ? a.latestLead.timestamp.toDate() : new Date(0);
        const dateB = b.latestLead.timestamp?.toDate ? b.latestLead.timestamp.toDate() : new Date(0);
        return dateB.getTime() - dateA.getTime();
    });
};


const LeadDetailItem = ({ label, value }: { label: string, value: any }) => {
    if (value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)) {
        return null;
    }

    let displayValue;
    let dateToFormat: Date | null = null;
    
    if (value && typeof value.toDate === 'function') {
        dateToFormat = value.toDate();
    } else if (value instanceof Date) {
        dateToFormat = value;
    } else if (typeof value === 'string') {
        const parsedDate = parseISO(value);
        if (isValid(parsedDate)) {
            dateToFormat = parsedDate;
        }
    }

    if (dateToFormat && isValid(dateToFormat)) {
        displayValue = format(dateToFormat, 'dd/MM/yyyy HH:mm');
    } else if (typeof value === 'number') {
        displayValue = value.toLocaleString('ro-RO');
    } else if (typeof value === 'boolean') {
        displayValue = value ? 'Da' : 'Nu';
    } else if (Array.isArray(value)) {
        displayValue = value.join(', ');
    } else {
        displayValue = String(value);
    }
    
    return (
        <div className="grid grid-cols-2 gap-2 py-2.5">
            <dt className="text-sm font-medium text-muted-foreground truncate">{label}</dt>
            <dd className="text-sm text-foreground font-semibold text-right">{displayValue}</dd>
        </div>
    )
};


export default function LeadsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [allLeads, setAllLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newStatus, setNewStatus] = useState("Nou");
  const [isSaving, setIsSaving] = useState(false);
  
  // Stare pentru detalii client
  const [selectedGroup, setSelectedGroup] = useState<GroupedLead | null>(null);
  const [selectedHistoryEntry, setSelectedHistoryEntry] = useState<Lead | null>(null);

  // Filtre
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        if (currentUser) {
            setUser(currentUser);
        } else {
            router.push('/login');
        }
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    const fetchLeads = async (currentUserId: string) => {
        setLoading(true);
        try {
          const q = query(
            collection(db, "leads"),
            where("agentId", "==", currentUserId),
            orderBy("timestamp", "desc")
          );
          const querySnapshot = await getDocs(q);
          const leadsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Lead[];
          setAllLeads(leadsData);
        } catch (error) {
          console.error("Error fetching leads:", error);
        } finally {
            setLoading(false);
        }
      };

    if (user) {
      fetchLeads(user.uid);
    }
  }, [user]);

  const groupedLeads = useMemo(() => groupLeadsByEmail(allLeads), [allLeads]);
  
  const filteredGroupedLeads = useMemo(() => {
    return groupedLeads.filter(group => {
        const lead = group.latestLead;
        const nameMatch = searchTerm ? lead.contact?.name?.toLowerCase().includes(searchTerm.toLowerCase()) : true;
        
        let statusMatch = true;
        if (statusFilter !== 'all') {
            if (statusFilter === 'Nou') {
                statusMatch = lead.status === 'Nou' || !lead.status;
            } else {
                statusMatch = lead.status === statusFilter;
            }
        }

        const sourceMatch = sourceFilter !== 'all' ? lead.source === sourceFilter : true;

        let dateMatch = true;
        if (dateRange?.from && lead.timestamp) {
             const leadDate = lead.timestamp.toDate ? lead.timestamp.toDate() : new Date(lead.timestamp);
             if(isValid(leadDate)) {
                 dateMatch = leadDate >= dateRange.from;
                 if (dateRange.to) {
                     const toDate = new Date(dateRange.to);
                     toDate.setHours(23, 59, 59, 999);
                     dateMatch = dateMatch && leadDate <= toDate;
                 }
             } else {
                dateMatch = false;
             }
        } else if (dateRange?.from) {
            dateMatch = false;
        }

        return nameMatch && statusMatch && sourceMatch && dateMatch;
    });
  }, [groupedLeads, searchTerm, statusFilter, sourceFilter, dateRange]);

  const handleOpenDetails = (group: GroupedLead) => {
    setSelectedGroup(group);
    setSelectedHistoryEntry(group.latestLead); // Afiseaza cel mai recent la deschidere
  };

  const handleCloseDetails = () => {
    setSelectedGroup(null);
    setSelectedHistoryEntry(null);
  }

  const handleStatusChange = (leadId: string, newStatus: string) => {
    const leadRef = doc(db, "leads", leadId);
    updateDoc(leadRef, { status: newStatus }).then(() => {
      setAllLeads(prevLeads =>
        prevLeads.map(lead =>
          lead.id === leadId ? { ...lead, status: newStatus } : lead
        )
      );
    }).catch(error => {
      console.error("Error updating status:", error);
    });
  };

  const handleSaveClient = async () => {
    if (!user) return alert("Agentul nu este autentificat.");
    if (!newName.trim() || !newPhone.trim()) return alert("Numele și telefonul sunt obligatorii.");
    
    setIsSaving(true);
    const newClientData = {
        contact: { name: newName, email: newEmail, phone: newPhone }, status: newStatus,
        agentId: user.uid, timestamp: serverTimestamp(), source: 'Manual'
    };
    try {
        const docRef = await addDoc(collection(db, 'leads'), newClientData);
        setAllLeads(prev => [{ id: docRef.id, ...newClientData, timestamp: new Date() } as Lead, ...prev]);
        setIsModalOpen(false); setNewName(''); setNewEmail(''); setNewPhone(''); setNewStatus('Nou');
    } catch (serverError: any) {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: collection(db, 'leads').path, operation: 'create', requestResourceData: newClientData,
        }));
        alert(`A apărut o eroare la salvare: ${serverError.message}`);
    } finally {
        setIsSaving(false);
    }
  };

  const clearFilters = () => {
      setSearchTerm("");
      setStatusFilter("all");
      setSourceFilter("all");
      setDateRange(undefined);
  }

  const getStatusBadgeVariant = (status?: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
        case 'Nou': return 'default';
        case 'Convertit': return 'secondary';
        case 'Inactiv': return 'destructive';
        default: return 'outline';
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-xl font-bold md:text-2xl">Clienții Tăi</h1>
           <div className="flex items-center gap-2">
            <ExportButtons leads={filteredGroupedLeads.flatMap(g => g.history)} />
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogTrigger asChild>
                    <Button size="sm" className="w-full sm:w-auto"><FilePlus2 className="mr-2 h-4 w-4" /> Client Nou</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader><DialogTitle>Adaugă un Client Nou</DialogTitle></DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="name" className="text-right">Nume</Label><Input id="name" value={newName} onChange={(e) => setNewName(e.target.value)} className="col-span-3" required /></div>
                        <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="email" className="text-right">Email</Label><Input id="email" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="col-span-3" /></div>
                        <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="phone" className="text-right">Telefon</Label><Input id="phone" type="tel" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} className="col-span-3" required/></div>
                        <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="status" className="text-right">Status</Label><Select onValueChange={setNewStatus} defaultValue={newStatus}><SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Nou">Nou</SelectItem><SelectItem value="De contactat">De contactat</SelectItem><SelectItem value="Contactat">Contactat</SelectItem><SelectItem value="Ofertă trimisă">Ofertă trimisă</SelectItem><SelectItem value="Convertit">Convertit</SelectItem><SelectItem value="Inactiv">Inactiv</SelectItem></SelectContent></Select></div>
                    </div>
                    <DialogFooter><Button onClick={handleSaveClient} disabled={isSaving}>{isSaving ? "Se salvează..." : "Salvează Client"}</Button></DialogFooter>
                </DialogContent>
             </Dialog>
           </div>
      </div>

      <Card className="no-print">
          <CardContent className="p-4 flex flex-col gap-4">
              <div className="relative flex-grow">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Caută după nume..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:flex lg:flex-wrap gap-2">
                <div className="grid grid-cols-2 gap-2">
                    <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Toate Statusurile</SelectItem><SelectItem value="Nou">Nou</SelectItem><SelectItem value="De contactat">De contactat</SelectItem><SelectItem value="Contactat">Contactat</SelectItem><SelectItem value="Ofertă trimisă">Ofertă trimisă</SelectItem><SelectItem value="Convertit">Convertit</SelectItem><SelectItem value="Inactiv">Inactiv</SelectItem></SelectContent></Select>
                    <Select value={sourceFilter} onValueChange={setSourceFilter}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Toate Sursele</SelectItem><SelectItem value="Link Client">Link Client</SelectItem><SelectItem value="Manual">Manual</SelectItem></SelectContent></Select>
                </div>
                <div className="flex gap-2">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-start text-left font-normal"><CalendarIcon className="mr-2 h-4 w-4" />{dateRange?.from ? (dateRange.to ? `${format(dateRange.from, "LLL dd, y")} - ${format(dateRange.to, "LLL dd, y")}` : format(dateRange.from, "LLL dd, y")) : <span>Alege data</span>}</Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0"><Calendar mode="range" selected={dateRange} onSelect={setDateRange} numberOfMonths={2} /></PopoverContent>
                    </Popover>
                    {(searchTerm || statusFilter !== 'all' || sourceFilter !== 'all' || dateRange) && <Button variant="ghost" size="icon" onClick={clearFilters}><X className="h-4 w-4"/></Button>}
                </div>
              </div>
          </CardContent>
          <CardContent className="p-4 pt-0 border-t">
            <div className="flex justify-between items-center text-sm text-muted-foreground">
              <span>Afișare <span className="font-bold text-foreground">{filteredGroupedLeads.length}</span> din <span className="font-bold text-foreground">{groupedLeads.length}</span> clienți unici.</span>
            </div>
          </CardContent>
      </Card>

       <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:hidden no-print">
          {loading ? <p className="text-center text-sm py-4 col-span-full">Se încarcă clienții...</p> : filteredGroupedLeads.length > 0 ? (
              filteredGroupedLeads.map(group => <LeadCard key={group.id} lead={group.latestLead} count={group.count} onStatusChange={handleStatusChange} onCardClick={() => handleOpenDetails(group)} />)
          ) : <div className="text-center text-sm py-4 text-muted-foreground col-span-full">Niciun client găsit. Încearcă alte filtre.</div> }
      </div>
      
      <div id="print-area">
        <Card className="hidden md:block">
            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader><TableRow><TableHead>Dată</TableHead><TableHead>Nume</TableHead><TableHead>Contact</TableHead><TableHead>Sursă</TableHead><TableHead>Status</TableHead><TableHead className="no-print text-right">Acțiuni</TableHead></TableRow></TableHeader>
                        <TableBody>
                        {loading ? <TableRow><TableCell colSpan={6} className="text-center h-24">Se încarcă...</TableCell></TableRow> : filteredGroupedLeads.length > 0 ? (
                            filteredGroupedLeads.map((group) => (
                            <TableRow key={group.id} className="hover:bg-muted/30">
                                <TableCell className="text-xs">{group.latestLead.timestamp && isValid(group.latestLead.timestamp.toDate ? group.latestLead.timestamp.toDate() : new Date(group.latestLead.timestamp)) ? format(group.latestLead.timestamp.toDate ? group.latestLead.timestamp.toDate() : new Date(group.latestLead.timestamp), 'dd/MM/yyyy') : 'N/A'}</TableCell>
                                <TableCell className="font-medium flex items-center gap-2">
                                  {group.latestLead.contact?.name || "N/A"}
                                  {group.count > 1 && <Badge variant="secondary" className="text-xs">{group.count} Răsp.</Badge>}
                                </TableCell>
                                <TableCell><div className="flex flex-col"><span className="text-xs">{group.latestLead.contact?.email || ""}</span><span className="text-xs text-muted-foreground">{group.latestLead.contact?.phone || ""}</span></div></TableCell>
                                <TableCell><Badge variant={group.latestLead.source === 'Manual' ? 'secondary' : 'outline'} className="text-xs">{group.latestLead.source || 'N/A'}</Badge></TableCell>
                                <TableCell><Badge variant={getStatusBadgeVariant(group.latestLead.status)} className="text-xs">{group.latestLead.status || "Nou"}</Badge></TableCell>
                                <TableCell className="text-right no-print">
                                    <Button variant="default" size="sm" onClick={() => handleOpenDetails(group)}>Detalii</Button>
                                    <div className="inline-block" onClick={(e) => e.stopPropagation()}>
                                    <Select value={group.latestLead.status || "Nou"} onValueChange={(newStatus) => handleStatusChange(group.latestLead.id, newStatus)}>
                                      <SelectTrigger className="w-32 h-8 text-xs inline-flex ml-2"><SelectValue /></SelectTrigger>
                                      <SelectContent><SelectItem value="Nou">Nou</SelectItem><SelectItem value="De contactat">De contactat</SelectItem><SelectItem value="Contactat">Contactat</SelectItem><SelectItem value="Ofertă trimisă">Ofertă trimisă</SelectItem><SelectItem value="Convertit">Convertit</SelectItem><SelectItem value="Inactiv">Inactiv</SelectItem></SelectContent>
                                    </Select>
                                    </div>
                                </TableCell>
                            </TableRow>
                            ))
                        ) : <TableRow><TableCell colSpan={6} className="h-24 text-center">Niciun client găsit conform filtrelor selectate.</TableCell></TableRow>}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
      </div>

      <Dialog open={!!selectedGroup} onOpenChange={(isOpen) => !isOpen && handleCloseDetails()}>
            <DialogContent className="max-w-4xl no-print p-0">
                 <DialogHeader className="p-6 pb-4 border-b">
                    <div className="flex items-center gap-4">
                        <Avatar className="h-12 w-12"><AvatarFallback className="bg-primary/20 text-primary font-bold"><UserIcon /></AvatarFallback></Avatar>
                        <div>
                             <DialogTitle className="text-xl mb-1">{selectedGroup?.latestLead.contact?.name || 'Detalii Client'}</DialogTitle>
                             <div className="flex items-center gap-2">
                                <Badge variant={selectedHistoryEntry?.source === 'Manual' ? 'secondary' : 'outline'}>{selectedHistoryEntry?.source || 'N/A'}</Badge>
                                <Badge variant={getStatusBadgeVariant(selectedHistoryEntry?.status)}>{selectedHistoryEntry?.status || 'Nou'}</Badge>
                             </div>
                        </div>
                    </div>
                </DialogHeader>
                <div className={cn("grid", selectedGroup && selectedGroup.count > 1 ? "grid-cols-1 md:grid-cols-[200px_1fr]" : "grid-cols-1")}>
                  {selectedGroup && selectedGroup.count > 1 && (
                    <div className="border-r">
                      <h3 className="text-sm font-semibold p-4 border-b">Istoric Completări</h3>
                      <ScrollArea className="h-[60vh]">
                        <ul>
                          {selectedGroup.history.map(entry => (
                            <li key={entry.id}>
                              <button 
                                onClick={() => setSelectedHistoryEntry(entry)}
                                className={cn(
                                  "w-full text-left p-4 text-sm hover:bg-muted/50 transition-colors",
                                  selectedHistoryEntry?.id === entry.id && "bg-muted font-semibold"
                                )}
                              >
                                {entry.timestamp && isValid(entry.timestamp.toDate ? entry.timestamp.toDate() : new Date(entry.timestamp)) 
                                    ? format(entry.timestamp.toDate ? entry.timestamp.toDate() : new Date(entry.timestamp), 'dd MMM yyyy, HH:mm') 
                                    : 'Dată invalidă'}
                              </button>
                            </li>
                          ))}
                        </ul>
                      </ScrollArea>
                    </div>
                  )}

                  <ScrollArea className="max-h-[60vh] md:max-h-auto">
                    <div className="p-6 space-y-4">
                        <div className="p-4 rounded-lg bg-muted/50">
                             <h3 className="text-sm font-semibold mb-2 text-foreground">Informații Contact</h3>
                             <dl className="divide-y divide-muted-foreground/20">
                                <LeadDetailItem label="Email" value={selectedHistoryEntry?.contact?.email} />
                                <LeadDetailItem label="Telefon" value={selectedHistoryEntry?.contact?.phone} />
                                <LeadDetailItem label="Data creare" value={selectedHistoryEntry?.timestamp} />
                             </dl>
                        </div>
                        <div className="p-4 rounded-lg bg-muted/50">
                            <h3 className="text-sm font-semibold mb-2 text-foreground">Detalii Analiză Financiară</h3>
                            <dl className="divide-y divide-muted-foreground/20">
                                {selectedHistoryEntry && Object.entries(selectedHistoryEntry).map(([key, value]) => {
                                    if (['id', 'agentId', 'timestamp', 'status', 'source', 'contact'].includes(key)) return null;
                                    const displayKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                                    return <LeadDetailItem key={key} label={displayKey} value={value} />;
                                })}
                                {selectedHistoryEntry && Object.keys(selectedHistoryEntry).length <= 6 && <p className="text-sm text-muted-foreground py-4 text-center">Acest client a fost adăugat manual, fără analiză.</p>}
                            </dl>
                        </div>
                    </div>
                </ScrollArea>
              </div>
              <DialogFooter className="p-6 bg-muted/50 border-t"><Button variant="outline" onClick={handleCloseDetails}>Închide</Button></DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
  );
}

    