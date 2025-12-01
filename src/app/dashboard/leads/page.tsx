
"use client";

import { useState, useEffect, useMemo } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { collection, query, where, getDocs, orderBy, doc, updateDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { format, parseISO } from 'date-fns';
import { DateRange } from 'react-day-picker';

import { auth, db } from "@/lib/firebaseConfig";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError, type SecurityRuleContext } from "@/firebase/errors";
import { Badge } from "@/components/ui/badge";
import { FilePlus2, User as UserIcon, Search, Calendar as CalendarIcon, X } from "lucide-react";
import LeadCard from "@/components/dashboard/LeadCard";
import { ScrollArea } from "@/components/ui/scroll-area";
import ExportButtons from "@/components/dashboard/ExportButtons";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const LeadDetailItem = ({ label, value }: { label: string, value: any }) => {
    if (value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)) {
        return null;
    }

    let displayValue;
    if (typeof value === 'number') {
        displayValue = value.toLocaleString('ro-RO');
    } else if (value instanceof Date || (typeof value === 'string' && !isNaN(Date.parse(value)))) {
        const date = value instanceof Date ? value : parseISO(value);
        displayValue = format(date, 'dd/MM/yyyy HH:mm');
    } else if (typeof value === 'boolean') {
        displayValue = value ? 'Da' : 'Nu';
    } else if (Array.isArray(value)) {
        displayValue = value.join(', ');
    }
    else {
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
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newStatus, setNewStatus] = useState("Nou");
  const [isSaving, setIsSaving] = useState(false);
  const [selectedLead, setSelectedLead] = useState<any | null>(null);

  // Filters State
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
          const leadsData = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              timestamp: data.timestamp?.toDate()
            }
          });
          setLeads(leadsData);
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

   const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
        const nameMatch = searchTerm ? lead.contact?.name?.toLowerCase().includes(searchTerm.toLowerCase()) : true;
        const statusMatch = statusFilter !== 'all' ? lead.status === statusFilter : true;
        const sourceMatch = sourceFilter !== 'all' ? lead.source === sourceFilter : true;

        let dateMatch = true;
        if (dateRange?.from && lead.timestamp) {
            const leadDate = lead.timestamp;
            dateMatch = leadDate >= dateRange.from;
            if (dateRange.to) {
                // Set the time to the end of the day for the 'to' date
                const toDate = new Date(dateRange.to);
                toDate.setHours(23, 59, 59, 999);
                dateMatch = dateMatch && leadDate <= toDate;
            }
        } else if (dateRange?.from && !lead.timestamp) {
            // If a date range is selected but the lead has no timestamp, exclude it
            dateMatch = false;
        }

        return nameMatch && statusMatch && sourceMatch && dateMatch;
    });
}, [leads, searchTerm, statusFilter, sourceFilter, dateRange]);


  const handleStatusChange = async (leadId: string, newStatus: string) => {
    try {
        const leadRef = doc(db, "leads", leadId);
        await updateDoc(leadRef, { status: newStatus });
        setLeads(prevLeads => 
            prevLeads.map(lead => 
                lead.id === leadId ? { ...lead, status: newStatus } : lead
            )
        );
    } catch (error) {
        console.error("Error updating status:", error);
    }
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
        setLeads(prev => [{ id: docRef.id, ...newClientData, timestamp: new Date() }, ...prev]);
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

  const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
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
            <ExportButtons leads={filteredLeads} />
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
          <CardContent className="p-4 flex flex-col md:flex-row gap-4">
              <div className="relative flex-grow">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Caută după nume..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
              </div>
              <div className="grid grid-cols-2 md:flex gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Toate Statusurile</SelectItem><SelectItem value="Nou">Nou</SelectItem><SelectItem value="De contactat">De contactat</SelectItem><SelectItem value="Contactat">Contactat</SelectItem><SelectItem value="Ofertă trimisă">Ofertă trimisă</SelectItem><SelectItem value="Convertit">Convertit</SelectItem><SelectItem value="Inactiv">Inactiv</SelectItem></SelectContent></Select>
                <Select value={sourceFilter} onValueChange={setSourceFilter}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Toate Sursele</SelectItem><SelectItem value="Link Client">Link Client</SelectItem><SelectItem value="Manual">Manual</SelectItem></SelectContent></Select>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal"><CalendarIcon className="mr-2 h-4 w-4" />{dateRange?.from ? (dateRange.to ? `${format(dateRange.from, "LLL dd, y")} - ${format(dateRange.to, "LLL dd, y")}` : format(dateRange.from, "LLL dd, y")) : <span>Alege data</span>}</Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0"><Calendar mode="range" selected={dateRange} onSelect={setDateRange} numberOfMonths={2} /></PopoverContent>
                </Popover>
                 {(searchTerm || statusFilter !== 'all' || sourceFilter !== 'all' || dateRange) && <Button variant="ghost" onClick={clearFilters}><X className="h-4 w-4 mr-2"/>Curăță</Button>}
              </div>
          </CardContent>
          <CardContent className="p-4 pt-0 border-t">
            <div className="flex justify-between items-center text-sm text-muted-foreground">
              <span>Afișare <span className="font-bold text-foreground">{filteredLeads.length}</span> din <span className="font-bold text-foreground">{leads.length}</span> clienți.</span>
            </div>
          </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:hidden no-print">
          {loading ? <p className="text-center text-sm py-4">Se încarcă clienții...</p> : filteredLeads.length > 0 ? (
              filteredLeads.map(lead => <LeadCard key={lead.id} lead={lead} onStatusChange={handleStatusChange} onCardClick={() => setSelectedLead(lead)} />)
          ) : <div className="text-center text-sm py-4 text-muted-foreground">Niciun client găsit. Încearcă alte filtre.</div> }
      </div>
      
      <div id="print-area">
        <Card className="hidden md:block">
            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader><TableRow><TableHead>Dată</TableHead><TableHead>Nume</TableHead><TableHead>Contact</TableHead><TableHead>Sursă</TableHead><TableHead>Status</TableHead><TableHead className="no-print text-right">Acțiuni</TableHead></TableRow></TableHeader>
                        <TableBody>
                        {loading ? <TableRow><TableCell colSpan={6} className="text-center h-24">Se încarcă...</TableCell></TableRow> : filteredLeads.length > 0 ? (
                            filteredLeads.map((lead) => (
                            <TableRow key={lead.id} className="hover:bg-muted/30">
                                <TableCell className="text-xs">{lead.timestamp ? format(lead.timestamp, 'dd/MM/yyyy') : 'N/A'}</TableCell>
                                <TableCell className="font-medium">{lead.contact?.name || "N/A"}</TableCell>
                                <TableCell><div className="flex flex-col"><span className="text-xs">{lead.contact?.email || ""}</span><span className="text-xs text-muted-foreground">{lead.contact?.phone || ""}</span></div></TableCell>
                                <TableCell><Badge variant={lead.source === 'Manual' ? 'secondary' : 'default'} className="text-xs">{lead.source || 'N/A'}</Badge></TableCell>
                                <TableCell><Badge variant={getStatusBadgeVariant(lead.status)} className="text-xs">{lead.status || "N/A"}</Badge></TableCell>
                                <TableCell className="text-right no-print">
                                    <Button variant="ghost" size="sm" onClick={() => setSelectedLead(lead)}>Detalii</Button>
                                    <Select value={lead.status || "Nou"} onValueChange={(newStatus) => handleStatusChange(lead.id, newStatus)}>
                                      <SelectTrigger className="w-32 h-8 text-xs inline-flex ml-2"><SelectValue /></SelectTrigger>
                                      <SelectContent><SelectItem value="Nou">Nou</SelectItem><SelectItem value="De contactat">De contactat</SelectItem><SelectItem value="Contactat">Contactat</SelectItem><SelectItem value="Ofertă trimisă">Ofertă trimisă</SelectItem><SelectItem value="Convertit">Convertit</SelectItem><SelectItem value="Inactiv">Inactiv</SelectItem></SelectContent>
                                    </Select>
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

      <Dialog open={!!selectedLead} onOpenChange={(isOpen) => !isOpen && setSelectedLead(null)}>
            <DialogContent className="sm:max-w-lg no-print p-0">
                 <DialogHeader className="p-6 pb-4">
                    <div className="flex items-center gap-4">
                        <Avatar className="h-12 w-12"><AvatarFallback className="bg-primary/20 text-primary font-bold"><UserIcon /></AvatarFallback></Avatar>
                        <div>
                             <DialogTitle className="text-xl mb-1">{selectedLead?.contact?.name || 'Detalii Client'}</DialogTitle>
                             <div className="flex items-center gap-2">
                                <Badge variant={selectedLead?.source === 'Manual' ? 'secondary' : 'default'}>{selectedLead?.source || 'N/A'}</Badge>
                                <Badge variant={getStatusBadgeVariant(selectedLead?.status)}>{selectedLead?.status || 'N/A'}</Badge>
                             </div>
                        </div>
                    </div>
                </DialogHeader>
                <ScrollArea className="max-h-[60vh] px-6">
                    <div className="space-y-4">
                        <div className="p-4 rounded-lg bg-muted/50">
                             <h3 className="text-sm font-semibold mb-2 text-foreground">Informații Contact</h3>
                             <dl className="divide-y divide-muted-foreground/20">
                                <LeadDetailItem label="Email" value={selectedLead?.contact?.email} />
                                <LeadDetailItem label="Telefon" value={selectedLead?.contact?.phone} />
                                <LeadDetailItem label="Data creare" value={selectedLead?.timestamp} />
                             </dl>
                        </div>
                        <div className="p-4 rounded-lg bg-muted/50">
                            <h3 className="text-sm font-semibold mb-2 text-foreground">Detalii Analiză Financiară</h3>
                            <dl className="divide-y divide-muted-foreground/20">
                                {selectedLead && Object.entries(selectedLead).map(([key, value]) => {
                                    if (['id', 'agentId', 'timestamp', 'status', 'source', 'contact'].includes(key)) return null;
                                    const displayKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                                    return <LeadDetailItem key={key} label={displayKey} value={value} />;
                                })}
                                {Object.keys(selectedLead || {}).length <= 6 && <p className="text-sm text-muted-foreground py-4 text-center">Acest client a fost adăugat manual, fără analiză.</p>}
                            </dl>
                        </div>
                    </div>
                </ScrollArea>
                <DialogFooter className="p-6 bg-muted/50 border-t"><Button variant="outline" onClick={() => setSelectedLead(null)}>Închide</Button></DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
  );
}

    