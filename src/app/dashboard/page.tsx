"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { User, signOut, onAuthStateChanged } from "firebase/auth";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import QRCode from "qrcode.react";

import { auth, db } from "@/lib/firebaseConfig";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

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

  // Fetch leads when user is available
  useEffect(() => {
    if (user) {
      const fetchLeads = async () => {
        try {
          const q = query(
            collection(db, "leads"),
            where("agentId", "==", user.uid),
            orderBy("timestamp", "desc")
          );
          const querySnapshot = await getDocs(q);
          const leadsData = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            timestamp: doc.data().timestamp?.toDate() // Convert Firestore Timestamp to JS Date
          }));
          setLeads(leadsData);
        } catch (error) {
          console.error("Error fetching leads:", error);
        }
      };
      fetchLeads();
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
                <>
                   <div className="p-4 bg-muted rounded-lg w-full flex justify-center">
                     <QRCode value={userLink} size={180} />
                   </div>
                   <a href={userLink} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline break-all text-center">
                     {userLink}
                   </a>
                </>
              )}
            </CardContent>
          </Card>
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Clienții Tăi</CardTitle>
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
                            </TableRow>
                            ))
                        ) : (
                            <TableRow>
                            <TableCell colSpan={4} className="text-center">
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
