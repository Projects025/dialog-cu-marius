
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { User, signOut, onAuthStateChanged } from "firebase/auth";
import { collection, query, where, getDocs, orderBy, doc, updateDoc, addDoc, serverTimestamp } from "firebase/firestore";

import { auth, db } from "@/lib/firebaseConfig";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";


export default function DashboardPage() {
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


  // Route protection and user fetching
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setLoading(false);
      } else {
        router.push("/login");
      }
    });
    return () => unsubscribe();
  }, [router]);

  const fetchLeads = async (currentUserId: string) => {
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
    }
  };

  const handleStatusChange = async (leadId: string, newStatus: string) => {
    try {
        const leadRef = doc(db, "leads", leadId);
        await updateDoc(leadRef, {
            status: newStatus
        });
        
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
    if (!user || !newName.trim()) {
        alert("Numele este obligatoriu.");
        return;
    }
    
    const newClient = {
        contact: {
            name: newName,
            email: newEmail,
            phone: newPhone
        },
        status: newStatus,
        agentId: user.uid,
        timestamp: serverTimestamp()
    };

    try {
        const docRef = await addDoc(collection(db, "leads"), newClient);
        // Optimistically update the UI
        setLeads(prevLeads => [{ id: docRef.id, ...newClient, timestamp: new Date() }, ...prevLeads]);
        
        // Reset form and close modal
        setIsModalOpen(false);
        setNewName("");
        setNewEmail("");
        setNewPhone("");
        setNewStatus("Nou");

    } catch (error) {
        console.error("Error adding new client:", error);
        alert("A apărut o eroare la salvarea clientului.");
    }
  };


  // Fetch leads when user is available
  useEffect(() => {
    if (user) {
      fetchLeads(user.uid);
    }
  }, [user]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/login");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const userLink = user ? `https://dialog-cu-marius.netlify.app/?agentId=${user.uid}` : "";

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Se încarcă...</div>;
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-2xl md:text-3xl font-bold">
            Panoul tău, {user?.displayName || user?.email}
          </h1>
          <Button onClick={handleLogout} variant="outline">
            Logout
          </Button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle>Link-ul tău de Client</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              {userLink && (
                   <a href={userLink} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline break-all text-center">
                     {userLink}
                   </a>
              )}
            </CardContent>
          </Card>
          <Card className="md:col-span-2">
            <CardHeader>
               <div className="flex justify-between items-center">
                 <CardTitle>Clienții Tăi</CardTitle>
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
                            <Button type="submit" onClick={handleSaveClient}>Salvează Client</Button>
                        </DialogFooter>
                    </DialogContent>
                 </Dialog>
               </div>
            </CardHeader>
            <CardContent>
                <div className="border rounded-lg overflow-hidden">
                    <Table>
                        <TableHeader>
                        <TableRow>
                            <TableHead>Dată</TableHead>
                            <TableHead>Nume</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Telefon</TableHead>
                            <TableHead>Status</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {leads.length > 0 ? (
                            leads.map((lead) => (
                            <TableRow key={lead.id}>
                                <TableCell>
                                    {lead.timestamp ? new Date(lead.timestamp).toLocaleDateString('ro-RO') : 'N/A'}
                                </TableCell>
                                <TableCell>{lead.contact?.name || "N/A"}</TableCell>
                                <TableCell>{lead.contact?.email || "N/A"}</TableCell>
                                <TableCell>{lead.contact?.phone || "N/A"}</TableCell>
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
                            <TableCell colSpan={5} className="text-center">
                                Nu ai niciun client momentan.
                            </TableCell>
                            </TableRow>
                        )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
