
"use client";

import { useState, useEffect } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { collection, query, where, getDocs, orderBy, doc, updateDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";

import { auth, db } from "@/lib/firebaseConfig";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError, type SecurityRuleContext } from "@/firebase/errors";
import { Badge } from "@/components/ui/badge";
import { FilePlus2 } from "lucide-react";
import LeadCard from "@/components/dashboard/LeadCard";
import { ScrollArea } from "@/components/ui/scroll-area";


const LeadDetailItem = ({ label, value }: { label: string, value: any }) => {
    if (value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)) {
        return null;
    }

    let displayValue;
    if (typeof value === 'number') {
        displayValue = value.toLocaleString('ro-RO');
    } else if (value instanceof Date) {
        displayValue = value.toLocaleDateString('ro-RO');
    } else if (typeof value === 'boolean') {
        displayValue = value ? 'Da' : 'Nu';
    } else if (Array.isArray(value)) {
        displayValue = value.join(', ');
    }
    else {
        displayValue = String(value);
    }
    
    return (
        <div className="grid grid-cols-3 gap-4 py-2 border-b border-muted">
            <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
            <dd className="text-sm col-span-2">{displayValue}</dd>
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
          const leadsData = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            timestamp: doc.data().timestamp?.toDate()
          }));
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
    if (!user) {
        alert("Agentul nu este autentificat.");
        return;
    }
     if (!newName.trim() || !newPhone.trim()) {
        alert("Numele și telefonul sunt obligatorii.");
        return;
    }
    
    setIsSaving(true);
    
    const newClientData = {
        contact: { name: newName, email: newEmail, phone: newPhone },
        status: newStatus,
        agentId: user.uid,
        timestamp: serverTimestamp(),
        source: 'Manual'
    };

    const leadsCollection = collection(db, 'leads');

    try {
        const docRef = await addDoc(leadsCollection, newClientData);
        const clientForUI = {
            id: docRef.id,
            ...newClientData,
            timestamp: new Date() 
        };
        setLeads(prevLeads => [clientForUI, ...prevLeads]);

        setIsModalOpen(false);
        setNewName('');
        setNewEmail('');
        setNewPhone('');
        setNewStatus('Nou');

    } catch (serverError: any) {
        const permissionError = new FirestorePermissionError({
            path: leadsCollection.path,
            operation: 'create',
            requestResourceData: newClientData,
        } satisfies SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
        alert(`A apărut o eroare la salvare: ${serverError.message}`);

    } finally {
        setIsSaving(false);
    }
  };
  
  return (
    <>
      <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold md:text-2xl">Clienții Tăi</h1>
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
              <DialogTrigger asChild>
                  <Button size="sm"><FilePlus2 className="mr-2 h-4 w-4" /> Client Nou</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                      <DialogTitle>Adaugă un Client Nou</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="name" className="text-right">Nume</Label>
                          <Input id="name" value={newName} onChange={(e) => setNewName(e.target.value)} className="col-span-3" required />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="email" className="text-right">Email</Label>
                          <Input id="email" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="col-span-3" />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="phone" className="text-right">Telefon</Label>
                          <Input id="phone" type="tel" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} className="col-span-3" required/>
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="status" className="text-right">Status</Label>
                          <Select onValueChange={setNewStatus} defaultValue={newStatus}>
                              <SelectTrigger className="col-span-3">
                                  <SelectValue placeholder="Selectează status" />
                              </SelectTrigger>
                              <SelectContent>
                                  <SelectItem value="Nou">Nou</SelectItem>
                                  <SelectItem value="De contactat">De contactat</SelectItem>
                                  <SelectItem value="Contactat">Contactat</SelectItem>
                                  <SelectItem value="Ofertă trimisă">Ofertă trimisă</SelectItem>
                                  <SelectItem value="Convertit">Convertit</SelectItem>
                                  <SelectItem value="Inactiv">Inactiv</SelectItem>
                              </SelectContent>
                          </Select>
                      </div>
                  </div>
                  <DialogFooter>
                      <Button onClick={handleSaveClient} disabled={isSaving}>
                          {isSaving ? "Se salvează..." : "Salvează Client"}
                      </Button>
                  </DialogFooter>
              </DialogContent>
           </Dialog>
      </div>

       {/* Mobile View: List of Cards */}
      <div className="grid grid-cols-1 gap-4 md:hidden">
          {loading ? (
              <p className="text-center text-sm py-4">Se încarcă clienții...</p>
          ) : leads.length > 0 ? (
              leads.map(lead => <LeadCard key={lead.id} lead={lead} onStatusChange={handleStatusChange} onCardClick={() => setSelectedLead(lead)} />)
          ) : (
                <div className="text-center text-sm py-4 text-muted-foreground">
                  Nu ai niciun client momentan.
              </div>
          )}
      </div>

      {/* Desktop View: Table */}
      <Card className="hidden md:block">
          <CardContent className="p-0">
              <div className="overflow-x-auto">
                  <Table>
                      <TableHeader>
                      <TableRow>
                          <TableHead className="text-xs">Dată</TableHead>
                          <TableHead className="text-xs">Nume</TableHead>
                          <TableHead className="text-xs">Email</TableHead>
                          <TableHead className="text-xs">Telefon</TableHead>
                          <TableHead className="text-xs">Sursă</TableHead>
                          <TableHead className="text-xs">Status</TableHead>
                      </TableRow>
                      </TableHeader>
                      <TableBody>
                      {loading ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center text-sm py-4">Se încarcă clienții...</TableCell>
                          </TableRow>
                      ) : leads.length > 0 ? (
                          leads.map((lead) => (
                          <TableRow key={lead.id} onClick={() => setSelectedLead(lead)} className="cursor-pointer">
                              <TableCell className="text-sm py-2">
                                  {lead.timestamp ? new Date(lead.timestamp).toLocaleDateString('ro-RO') : 'N/A'}
                              </TableCell>
                              <TableCell className="text-sm py-2">{lead.contact?.name || "N/A"}</TableCell>
                              <TableCell className="text-sm py-2">{lead.contact?.email || "N/A"}</TableCell>
                              <TableCell className="text-sm py-2">{lead.contact?.phone || "N/A"}</TableCell>
                               <TableCell className="py-2">
                                {lead.source === 'Manual' 
                                    ? <Badge variant="secondary">Manual</Badge> 
                                    : <Badge variant="default">Link Client</Badge>}
                              </TableCell>
                              <TableCell className="text-sm py-2">
                                  <Select 
                                      value={lead.status || "Nou"}
                                      onValueChange={(newStatus) => handleStatusChange(lead.id, newStatus)}
                                  >
                                      <SelectTrigger className="w-full h-8 text-xs">
                                          <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                          <SelectItem value="Nou">Nou</SelectItem>
                                          <SelectItem value="De contactat">De contactat</SelectItem>
                                          <SelectItem value="Contactat">Contactat</SelectItem>
                                          <SelectItem value="Ofertă trimisă">Ofertă trimisă</SelectItem>
                                          <SelectItem value="Convertit">Convertit</SelectItem>
                                          <SelectItem value="Inactiv">Inactiv</SelectItem>
                                      </SelectContent>
                                  </Select>
                              </TableCell>
                          </TableRow>
                          ))
                      ) : (
                          <TableRow>
                          <TableCell colSpan={6} className="text-center text-sm py-4">
                              Nu ai niciun client momentan. Poți adăuga unul manual.
                          </TableCell>
                          </TableRow>
                      )}
                      </TableBody>
                  </Table>
              </div>
          </CardContent>
        </Card>

        {/* Lead Details Dialog */}
        <Dialog open={!!selectedLead} onOpenChange={(isOpen) => !isOpen && setSelectedLead(null)}>
            <DialogContent className="sm:max-w-lg">
                 <DialogHeader>
                    <DialogTitle>Detalii Client</DialogTitle>
                    <DialogDescription>
                        Sumarul informațiilor colectate de la {selectedLead?.contact?.name || 'acest client'}.
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[60vh] pr-4">
                    <dl className="divide-y divide-muted">
                        <LeadDetailItem label="Nume" value={selectedLead?.contact?.name} />
                        <LeadDetailItem label="Email" value={selectedLead?.contact?.email} />
                        <LeadDetailItem label="Telefon" value={selectedLead?.contact?.phone} />
                        <LeadDetailItem label="Data Nașterii" value={selectedLead?.birthDate ? new Date(selectedLead.birthDate) : undefined} />
                        <LeadDetailItem label="Status" value={selectedLead?.status} />
                        <LeadDetailItem label="Sursă" value={selectedLead?.source} />
                        <LeadDetailItem label="Priorități" value={selectedLead?.priorities} />
                        
                        <LeadDetailItem label="Perioadă protecție (ani)" value={selectedLead?.period} />
                        <LeadDetailItem label="Sumă lunară necesară" value={selectedLead?.monthlySum} />
                        <LeadDetailItem label="Costuri eveniment" value={selectedLead?.eventCosts} />
                        <LeadDetailItem label="Proiecte de finanțat" value={selectedLead?.projects} />
                        <LeadDetailItem label="Datorii de acoperit" value={selectedLead?.debts} />
                        <LeadDetailItem label="Asigurări existente" value={selectedLead?.existingInsurance} />
                        <LeadDetailItem label="Economii disponibile" value={selectedLead?.savings} />
                        <LeadDetailItem label="Deficit brut calculat" value={selectedLead?.bruteDeficit} />
                        <LeadDetailItem label="Deficit FINAL" value={selectedLead?.finalDeficit} />
                        
                        <LeadDetailItem label="Cum se simte?" value={selectedLead?.feeling} />
                        <LeadDetailItem label="Opțiuni dramatice" value={selectedLead?.dramaticOptions} />
                        <LeadDetailItem label="Primă lunară propusă" value={selectedLead?.premium} />
                        <LeadDetailItem label="Dată creare lead" value={selectedLead?.timestamp} />
                    </dl>
                </ScrollArea>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setSelectedLead(null)}>Închide</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </>
  );
}

    