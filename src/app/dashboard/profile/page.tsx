
"use client";

import { useState, useEffect } from 'react';
import { onAuthStateChanged, updateProfile, updatePassword, type User } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebaseConfig';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { Loader2 } from 'lucide-react';

export default function ProfilePage() {
    const [user, setUser] = useState<User | null>(null);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(true);
    const [isSavingName, setIsSavingName] = useState(false);
    const [isSavingPassword, setIsSavingPassword] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                setEmail(currentUser.email || '');
                // Fetch name from Firestore as displayName might not be enough
                const agentRef = doc(db, 'agents', currentUser.uid);
                const agentDoc = await getDoc(agentRef);
                if (agentDoc.exists()) {
                    setName(agentDoc.data().name || currentUser.displayName || '');
                } else {
                    setName(currentUser.displayName || '');
                }
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleSaveChanges = async () => {
        if (!user || !name.trim()) {
            toast({ variant: 'destructive', title: 'Numele nu poate fi gol.' });
            return;
        }
        setIsSavingName(true);
        try {
            // Update Firebase Auth display name
            await updateProfile(user, { displayName: name });
            // Update Firestore document
            const agentRef = doc(db, 'agents', user.uid);
            await updateDoc(agentRef, { name: name });

            toast({ title: 'Succes!', description: 'Numele a fost actualizat.' });
        } catch (error: any) {
            console.error('Error updating profile:', error);
            toast({ variant: 'destructive', title: 'Eroare', description: 'Nu s-a putut actualiza profilul.' });
        } finally {
            setIsSavingName(false);
        }
    };

    const handleChangePassword = async () => {
        if (newPassword !== confirmPassword) {
            toast({ variant: 'destructive', title: 'Parolele nu se potrivesc.' });
            return;
        }
        if (newPassword.length < 6) {
            toast({ variant: 'destructive', title: 'Parola este prea scurtă (minim 6 caractere).' });
            return;
        }
        if (!user) return;

        setIsSavingPassword(true);
        try {
            await updatePassword(user, newPassword);
            setNewPassword('');
            setConfirmPassword('');
            toast({ title: 'Succes!', description: 'Parola a fost schimbată.' });
        } catch (error: any) {
            console.error('Error updating password:', error);
             if (error.code === 'auth/requires-recent-login') {
                 toast({ variant: 'destructive', title: 'Sesiune expirată', description: 'Pentru securitate, te rugăm să te re-autentifici înainte de a schimba parola.' });
             } else {
                toast({ variant: 'destructive', title: 'Eroare', description: 'Nu s-a putut schimba parola.' });
             }
        } finally {
            setIsSavingPassword(false);
        }
    };
    
    if (loading) {
        return <p>Se încarcă profilul...</p>;
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-xl font-bold md:text-2xl">Profilul Tău</h1>
                <p className="text-muted-foreground">Gestionează-ți datele personale și setările de securitate.</p>
            </div>
            <Separator />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                 <Card>
                    <CardHeader>
                        <CardTitle>Date Personale</CardTitle>
                        <CardDescription>Aceste informații sunt vizibile doar pentru tine.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Nume Prenume</Label>
                            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Adresă de Email</Label>
                            <Input id="email" type="email" value={email} disabled />
                        </div>
                         <Button onClick={handleSaveChanges} disabled={isSavingName}>
                            {isSavingName && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Salvează Modificările
                        </Button>
                    </CardContent>
                </Card>

                 <Card>
                    <CardHeader>
                        <CardTitle>Securitate</CardTitle>
                        <CardDescription>Actualizează-ți parola în mod regulat pentru a-ți proteja contul.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="new-password">Parola Nouă</Label>
                            <Input id="new-password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Minim 6 caractere" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirm-password">Confirmă Parola</Label>
                            <Input id="confirm-password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                        </div>
                         <Button onClick={handleChangePassword} disabled={isSavingPassword}>
                             {isSavingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Schimbă Parola
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
