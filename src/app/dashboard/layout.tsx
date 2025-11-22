
"use client";

import { useState, useEffect, type ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { User, signOut, onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebaseConfig";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Users, FileText, LogOut, Menu, X, UserCircle } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet";

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
    const router = useRouter();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
            }
        });
        return () => unsubscribe();
    }, []);

    const handleLogout = async () => {
        try {
            await signOut(auth);
            router.push("/login");
        } catch (error) {
            console.error("Error signing out:", error);
        }
    };

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
                    <NavLink href="/dashboard/profile" icon={UserCircle} onClick={onLinkClick}>Profil</NavLink>
                </nav>
            </div>
            <div className="mt-auto p-4 border-t">
               <div className="text-xs text-muted-foreground mb-2 truncate">{user?.email}</div>
               <Button variant="outline" size="sm" className="w-full" onClick={handleLogout}>
                 <LogOut className="mr-2 h-4 w-4"/>
                 Logout
               </Button>
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

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background">
                <div className="text-primary">Se încarcă panoul de control...</div>
            </div>
        );
    }

    return (
        <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
            <div className="hidden border-r bg-muted/40 md:block">
                <SidebarContent />
            </div>
            <div className="flex flex-col">
                <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6 md:hidden">
                    <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                        <SheetTrigger asChild>
                            <Button variant="outline" size="icon" className="shrink-0">
                                <Menu className="h-5 w-5" />
                                <span className="sr-only">Deschide meniu</span>
                            </Button>
                        </SheetTrigger>
                         <SheetContent side="left" className="flex flex-col p-0 w-[280px] sm:w-[320px]">
                             <SidebarContent onLinkClick={() => setIsMobileMenuOpen(false)}/>
                        </SheetContent>
                    </Sheet>
                    <div className="flex-1">
                        <Link href="/dashboard" className="flex items-center gap-2 text-lg font-semibold text-primary">
                             <LayoutDashboard className="h-5 w-5" />
                             <span>Panou Agent</span>
                        </Link>
                    </div>
                </header>
                <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-8">
                    {children}
                </main>
            </div>
        </div>
    );
}
