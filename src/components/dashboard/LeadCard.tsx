
"use client";

import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Phone, Mail } from "lucide-react";

const LeadCard = ({ lead, onStatusChange }: { lead: any; onStatusChange: (leadId: string, newStatus: string) => void }) => {
    return (
        <Card>
            <CardContent className="p-4">
                <div className="flex justify-between items-start">
                    <p className="font-bold text-base">{lead.contact?.name || "N/A"}</p>
                    {lead.source === 'Manual' 
                        ? <Badge variant="secondary" className="text-xs">Manual</Badge> 
                        : <Badge variant="default" className="text-xs">Link</Badge>}
                </div>
                 <p className="text-xs text-muted-foreground mb-3">
                    {lead.timestamp ? new Date(lead.timestamp).toLocaleDateString('ro-RO') : 'N/A'}
                 </p>
                <div className="space-y-2 text-sm">
                    {lead.contact?.phone && (
                        <div className="flex items-center gap-2">
                            <Phone className="h-3 w-3 text-muted-foreground"/>
                            <span>{lead.contact.phone}</span>
                        </div>
                    )}
                    {lead.contact?.email && (
                         <div className="flex items-center gap-2">
                            <Mail className="h-3 w-3 text-muted-foreground"/>
                            <span>{lead.contact.email}</span>
                        </div>
                    )}
                </div>
            </CardContent>
            <CardFooter className="p-3 bg-muted/50 border-t">
                 <Select 
                    value={lead.status || "Nou"}
                    onValueChange={(newStatus) => onStatusChange(lead.id, newStatus)}
                >
                    <SelectTrigger className="w-full h-8 text-xs">
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
            </CardFooter>
        </Card>
    )
}

export default LeadCard;
