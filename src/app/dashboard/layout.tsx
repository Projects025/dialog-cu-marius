
"use client";

import { useState, useEffect, type ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { User, signOut, onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebaseConfig";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Users, FileText, Menu, X, UserCircle, ShieldCheck } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from "@/components/ui/sheet";

const ADMIN_EMAILS = ["alinmflavius@gmail.com"];

const NavLink = ({ href, children, icon: Icon, onClick }: { href: string; children: ReactNode; icon: React.ElementType, onClick?: () => void }) => {
    const pathname = usePathname();
    const isActive = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));

    return (
        <Link 
            href={href}
            onClick={onClick}
            className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
                isActive && "bg-muted text-primary"
            )}
        >
            <Icon className="h-4 w-4" />
            {children}
        </Link>
    );
};

const SidebarContent = ({ onLinkClick }: { onLinkClick?: () => void }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                setIsAdmin(ADMIN_EMAILS.includes(currentUser.email || ""));
            }
        });
        return () => unsubscribe();
    }, []);

    return (
        <div className="flex h-full max-h-screen flex-col gap-2">
            <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
                <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-primary">
                    <LayoutDashboard className="h-6 w-6" />
                    <span className="">Panou Agent</span>
                </Link>
            </div>
            <div className="flex-1">
                <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
                    <NavLink href="/dashboard" icon={LayoutDashboard} onClick={onLinkClick}>Sumar</NavLink>
                    <NavLink href="/dashboard/leads" icon={Users} onClick={onLinkClick}>Clienții Tăi</NavLink>
                    <NavLink href="/dashboard/forms" icon={FileText} onClick={onLinkClick}>Formulare</NavLink>
                    <NavLink href="/dashboard/profile" icon={UserCircle} onClick={onLinkClick}>Profil & Abonament</NavLink>
                    {isAdmin && (
                         <NavLink href="/dashboard/admin" icon={ShieldCheck} onClick={onLinkClick}>Panou Admin</NavLink>
                    )}
                </nav>
            </div>
        </div>
    );
};

export default function DashboardLayout({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                setLoading(false);
                
                try {
                    const agentRef = doc(db, "agents", currentUser.uid);
                    await setDoc(agentRef, {
                        lastActive: serverTimestamp()
                    }, { merge: true });
                } catch (error) {
                    console.warn("Could not update last active time:", error);
                }

            } else {
                router.push("/login");
            }
        });
        return () => unsubscribe();
    }, [router]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background">
                <div className="text-primary">Se încarcă panoul de control...</div>
            </div>
        );
    }

    return (
        <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
            <div className="hidden border-r bg-muted/40 md:block no-print">
                <SidebarContent />
            </div>
            <div className="flex flex-col">
                <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6 no-print">
                    <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                        <SheetTrigger asChild>
                            <Button variant="outline" size="icon" className="shrink-0 md:hidden">
                                <Menu className="h-5 w-5" />
                                <span className="sr-only">Deschide meniu</span>
                            </Button>
                        </SheetTrigger>
                         <SheetContent side="left" className="flex flex-col p-0 w-[280px] sm:w-[320px]">
                            <SheetHeader className="p-4 border-b">
                               <SheetTitle className="text-left text-lg">Meniu Principal</SheetTitle>
                            </SheetHeader>
                            <div className="flex-1 overflow-y-auto">
                                <SidebarContent onLinkClick={() => setIsMobileMenuOpen(false)}/>
                            </div>
                        </SheetContent>
                    </Sheet>
                    <div className="flex-1 md:hidden">
                        <Link href="/dashboard" className="flex items-center gap-2 text-lg font-semibold text-primary">
                             <LayoutDashboard className="h-5 w-5" />
                             <span>Panou Agent</span>
                        </Link>
                    </div>
                </header>
                <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
                    {children}
                </main>
            </div>
        </div>
    );
}
