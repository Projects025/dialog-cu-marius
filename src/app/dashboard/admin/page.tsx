
"use client";

import { useState, useEffect } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { collection, query, getDocs, orderBy, Timestamp, doc, where } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { format } from 'date-fns';

import { auth, db } from "@/lib/firebaseConfig";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ShieldAlert, CheckCircle, XCircle } from "lucide-react";

interface Agent {
  id: string;
  name?: string;
  email?: string;
  createdAt?: Timestamp;
  lastActive?: Timestamp;
  hasSubscription?: boolean;
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
            // Verificarea rolului de admin se face acum prin încercarea de a prelua datele
            checkAdminStatusAndFetchData(currentUser);
        } else {
            router.push('/login');
        }
    });
    return () => unsubscribe();
  }, [router]);

  // Această funcție verifică implicit rolul de admin.
  // Doar un admin are permisiunea (conform firestore.rules) să listeze întreaga colecție 'agents'.
  const checkAdminStatusAndFetchData = async (currentUser: User) => {
      try {
          // 1. Încercăm să preluăm datele pe care doar un admin le poate accesa
          const q = query(collection(db, "agents"), orderBy("createdAt", "desc"));
          const querySnapshot = await getDocs(q);
          
          // 2. Dacă interogarea reușește, utilizatorul ESTE admin.
          setIsAdmin(true);

          const agentsDataPromises = querySnapshot.docs.map(async (agentDoc) => {
              const agentData = { id: agentDoc.id, ...agentDoc.data() } as Agent;
              
              const subsQuery = query(
                  collection(db, 'customers', agentDoc.id, 'subscriptions'), 
                  where('status', 'in', ['trialing', 'active'])
              );
              const subsSnap = await getDocs(subsQuery);
              agentData.hasSubscription = !subsSnap.empty;

              return agentData;
          });
          
          const agentsData = await Promise.all(agentsDataPromises);
          setAllAgents(agentsData);

      } catch (error: any) {
          // 3. Dacă interogarea eșuează cu "permission-denied", utilizatorul NU este admin.
          if (error.code === 'permission-denied') {
              console.log("Acces refuzat. Utilizatorul nu este admin.");
              setIsAdmin(false);
          } else {
              // Alte erori (ex: de rețea)
              console.error("Error fetching agents:", error);
          }
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
                <TableHead>Abonament</TableHead>
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
                        {agent.hasSubscription ? (
                            <Badge variant="secondary" className="bg-green-700/20 text-green-400 border border-green-600/30">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Activ
                            </Badge>
                        ) : (
                             <Badge variant="destructive" className="bg-red-900/40 text-red-400 border border-red-800/50">
                                <XCircle className="h-3 w-3 mr-1" />
                                Inactiv
                            </Badge>
                        )}
                    </TableCell>
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
                  <TableCell colSpan={7} className="h-24 text-center">
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
