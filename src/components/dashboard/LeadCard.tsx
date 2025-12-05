
"use client";

import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Phone, Mail, User } from "lucide-react";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { format, isValid } from "date-fns";

const LeadCard = ({ lead, count, onStatusChange, onCardClick }: { lead: any; count: number, onStatusChange: (leadId: string, newStatus: string) => void; onCardClick: () => void; }) => {
    
    const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
        switch (status) {
            case 'Nou': return 'default';
            case 'Convertit': return 'secondary';
            case 'Inactiv': return 'destructive';
            default: return 'outline';
        }
    };
    
    const handleSelectClick = (e: React.MouseEvent) => {
        e.stopPropagation();
    };

    return (
        <Card onClick={onCardClick} className="cursor-pointer flex flex-col transition-all bg-muted/40 hover:border-primary/50">
             <CardContent className="p-4 flex-grow">
                <div className="flex items-start gap-3">
                    <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-muted text-foreground/80 font-bold">
                           {lead.contact?.name?.charAt(0).toUpperCase() || <User size={20} />}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex-grow">
                         <p className="font-bold text-base leading-tight flex items-center gap-2">
                           {lead.contact?.name || "N/A"}
                           {count > 1 && <Badge variant="secondary" className="text-xs">{count} Răsp.</Badge>}
                         </p>
                         <p className="text-xs text-muted-foreground">
                            {lead.timestamp && isValid(lead.timestamp.toDate ? lead.timestamp.toDate() : new Date(lead.timestamp)) ? format(lead.timestamp.toDate ? lead.timestamp.toDate() : new Date(lead.timestamp), 'dd/MM/yyyy') : 'N/A'}
                         </p>
                    </div>
                    <Badge variant={lead.source === 'Manual' ? 'secondary' : 'outline'} className="text-xs self-start flex-shrink-0">{lead.source || 'N/A'}</Badge>
                </div>
                <div className="mt-4 space-y-2.5 text-sm pl-2">
                    {lead.contact?.phone && (
                        <div className="flex items-center gap-3">
                            <Phone className="h-3.5 w-3.5 text-muted-foreground"/>
                            <a href={`tel:${lead.contact.phone}`} onClick={(e) => e.stopPropagation()} className="hover:underline">{lead.contact.phone}</a>
                        </div>
                    )}
                    {lead.contact?.email && (
                         <div className="flex items-center gap-3">
                            <Mail className="h-3.5 w-3.5 text-muted-foreground"/>
                            <a href={`mailto:${lead.contact.email}`} onClick={(e) => e.stopPropagation()} className="hover:underline truncate">{lead.contact.email}</a>
                        </div>
                    )}
                </div>
            </CardContent>
            <CardFooter className="p-3 bg-muted/50 border-t">
                <div className="w-full" onClick={handleSelectClick}>
                    <Select 
                        value={lead.status || "Nou"}
                        onValueChange={(newStatus) => onStatusChange(lead.id, newStatus)}
                    >
                        <SelectTrigger className="w-full h-9 text-xs">
                            <div className="flex items-center gap-2">
                                 <div className={`w-2 h-2 rounded-full ${lead.status === 'Convertit' ? 'bg-green-500' : 'bg-primary'}`}></div>
                                 <SelectValue />
                            </div>
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
            </CardFooter>
        </Card>
    )
}

export default LeadCard;

    