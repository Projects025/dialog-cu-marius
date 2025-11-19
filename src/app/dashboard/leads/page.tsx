
"use client";

import { useState, useEffect } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { collection, query, where, getDocs, orderBy, doc, updateDoc, addDoc, serverTimestamp, setDoc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";

import { auth, db } from "@/lib/firebaseConfig";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError, type SecurityRuleContext } from "@/firebase/errors";
import { Badge } from "@/components/ui/badge";


export default function LeadsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // State for the "Add Client" modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newStatus, setNewStatus] = useState("Nou");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      }
    });
    return () => unsubscribe();
  }, []);

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
    if (!newName.trim() || !newPhone.trim()) {
        alert("Numele și telefonul sunt obligatorii.");
        return;
    }
    
    setIsSaving(true);
    
    if (!user) {
        alert("Agentul nu este autentificat.");
        setIsSaving(false);
        return;
    }
    
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
          <h1 className="text-lg font-semibold md:text-2xl">Clienții Tăi</h1>
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
              <DialogTrigger asChild>
                  <Button>Adaugă Client Nou</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                      <DialogTitle>Adaugă un Client Nou</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="name" className="text-right">Nume</Label>
                          <Input id="name" value={newName} onChange={(e) => setNewName(e.target.value)} className="col-span-3" />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="email" className="text-right">Email</Label>
                          <Input id="email" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="col-span-3" />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="phone" className="text-right">Telefon</Label>
                          <Input id="phone" type="tel" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} className="col-span-3" />
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

      <Card>
          <CardContent className="p-0">
              <div className="overflow-x-auto">
                  <Table>
                      <TableHeader>
                      <TableRow>
                          <TableHead>Dată</TableHead>
                          <TableHead>Nume</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Telefon</TableHead>
                          <TableHead>Sursă</TableHead>
                          <TableHead>Status</TableHead>
                      </TableRow>
                      </TableHeader>
                      <TableBody>
                      {loading ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center">Se încarcă clienții...</TableCell>
                          </TableRow>
                      ) : leads.length > 0 ? (
                          leads.map((lead) => (
                          <TableRow key={lead.id}>
                              <TableCell>
                                  {lead.timestamp ? new Date(lead.timestamp).toLocaleDateString('ro-RO') : 'N/A'}
                              </TableCell>
                              <TableCell>{lead.contact?.name || "N/A"}</TableCell>
                              <TableCell>{lead.contact?.email || "N/A"}</TableCell>
                              <TableCell>{lead.contact?.phone || "N/A"}</TableCell>
                               <TableCell>
                                {lead.source === 'Manual' 
                                    ? <Badge variant="secondary">Manual</Badge> 
                                    : <Badge variant="default">Link Client</Badge>}
                              </TableCell>
                              <TableCell>
                                  <Select 
                                      value={lead.status || "Nou"}
                                      onValueChange={(newStatus) => handleStatusChange(lead.id, newStatus)}
                                  >
                                      <SelectTrigger className="w-full">
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
                          <TableCell colSpan={6} className="text-center">
                              Nu ai niciun client momentan.
                          </TableCell>
                          </TableRow>
                      )}
                      </TableBody>
                  </Table>
              </div>
          </CardContent>
        </Card>
    </>
  );
}
