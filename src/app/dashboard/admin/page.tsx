
"use client";

import { useState, useEffect } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { collection, query, getDocs, orderBy, Timestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { format } from 'date-fns';

import { auth, db } from "@/lib/firebaseConfig";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ShieldAlert } from "lucide-react";

const ADMIN_EMAILS = ["alinmflavius@gmail.com"];

interface Agent {
  id: string;
  name?: string;
  email?: string;
  createdAt?: Timestamp;
  lastActive?: Timestamp;
}

export default function AdminPage() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [allAgents, setAllAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        if (currentUser) {
            setUser(currentUser);
            const userIsAdmin = ADMIN_EMAILS.includes(currentUser.email || "");
            setIsAdmin(userIsAdmin);
            if (userIsAdmin) {
                fetchAgents();
            } else {
                setLoading(false);
            }
        } else {
            router.push('/login');
        }
    });
    return () => unsubscribe();
  }, [router]);

  const fetchAgents = async () => {
    try {
        const q = query(collection(db, "agents"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        const agentsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Agent[];
        setAllAgents(agentsData);
    } catch (error) {
        console.error("Error fetching agents:", error);
        // This might fail if security rules are not yet propagated.
        // The UI will show a message.
    } finally {
        setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center">Se verifică permisiunile și se încarcă datele...</div>;
  }

  if (!isAdmin) {
    return (
        <Alert variant="destructive">
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>Acces Interzis</AlertTitle>
            <AlertDescription>
                Nu aveți permisiunea de a vizualiza această pagină.
            </AlertDescription>
        </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Panou de Administrare</CardTitle>
          <CardDescription>Vizualizează toți agenții înregistrați pe platformă.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">#</TableHead>
                <TableHead>Nume Agent</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Data Înregistrării</TableHead>
                <TableHead>Ultima Activitate</TableHead>
                <TableHead>User ID</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allAgents.length > 0 ? (
                allAgents.map((agent, index) => (
                  <TableRow key={agent.id}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell className="font-medium">{agent.name || "N/A"}</TableCell>
                    <TableCell>{agent.email}</TableCell>
                    <TableCell>
                      {agent.createdAt ? format(agent.createdAt.toDate(), 'dd/MM/yyyy HH:mm') : 'N/A'}
                    </TableCell>
                    <TableCell>
                      {agent.lastActive ? format(agent.lastActive.toDate(), 'dd/MM/yyyy HH:mm') : 'Niciodată'}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">{agent.id}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    Niciun agent găsit sau datele se încarcă.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
