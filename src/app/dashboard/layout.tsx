
"use client";

import { useState, useEffect, type ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { User, signOut, onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebaseConfig";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Users, FileText, LogOut, FilePlus2 } from "lucide-react";

const NavLink = ({ href, children, icon: Icon }: { href: string; children: ReactNode; icon: React.ElementType }) => {
    const pathname = usePathname();
    const isActive = pathname.startsWith(href) && (href !== '/dashboard' || pathname === '/dashboard');


    return (
        <Link href={href}>
            <span
                className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
                    isActive && "bg-muted text-primary"
                )}
            >
                <Icon className="h-4 w-4" />
                {children}
            </span>
        </Link>
    );
};


export default function DashboardLayout({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

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

    const handleLogout = async () => {
        try {
            await signOut(auth);
            router.push("/login");
        } catch (error) {
            console.error("Error signing out:", error);
        }
    };

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
                <div className="flex h-full max-h-screen flex-col gap-2">
                    <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
                        <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-primary">
                            <LayoutDashboard className="h-6 w-6" />
                            <span className="">Panou Agent</span>
                        </Link>
                    </div>
                    <div className="flex-1">
                        <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
                            <NavLink href="/dashboard" icon={LayoutDashboard}>Sumar</NavLink>
                            <NavLink href="/dashboard/leads" icon={Users}>Clienții Tăi</NavLink>
                            <NavLink href="/dashboard/forms" icon={FileText}>Formulare</NavLink>
                            <NavLink href="/dashboard/form-editor" icon={FilePlus2}>Editor Formular</NavLink>

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
            </div>
            <div className="flex flex-col">
                <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
                    {children}
                </main>
            </div>
        </div>
    );
}
