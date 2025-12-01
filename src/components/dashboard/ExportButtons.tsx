
"use client";

import { Button } from "@/components/ui/button";
import { Download, Printer } from "lucide-react";

interface ExportButtonsProps {
  leads: any[];
}

// Funcție helper pentru a aplatiza obiecte imbricate (ex: lead.contact.name -> contact.name)
const flattenObject = (obj: any, parentKey = '', res: {[key: string]: any} = {}) => {
  for(let key in obj){
    if(obj.hasOwnProperty(key)){
      const propName = parentKey ? parentKey + '.' + key : key;
      if(typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])){
        flattenObject(obj[key], propName, res);
      } else {
        res[propName] = obj[key];
      }
    }
  }
  return res;
}

export default function ExportButtons({ leads }: ExportButtonsProps) {
  
  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (leads.length === 0) {
      alert("Nu există date de exportat.");
      return;
    }

    const allKeys = new Set<string>();
    const flattenedLeads = leads.map(lead => {
        const flatLead = flattenObject(lead);
        // Excludem ID-urile și alte câmpuri tehnice din CSV
        delete flatLead.id;
        delete flatLead.agentId;
        Object.keys(flatLead).forEach(key => allKeys.add(key));
        return flatLead;
    });

    const headers = Array.from(allKeys);
    
    // Construim header-ul CSV
    let csvContent = headers.join(',') + '\n';

    // Adăugăm rândurile
    flattenedLeads.forEach(lead => {
      const row = headers.map(header => {
        let cell = lead[header];
        
        if (cell === null || cell === undefined) {
          return '';
        }
        if (cell instanceof Date) {
            return cell.toLocaleString('ro-RO');
        }
        // Asigurăm că string-urile care conțin virgulă sunt puse în ghilimele
        let stringCell = String(cell);
        if (stringCell.includes(',')) {
          return `"${stringCell}"`;
        }
        return stringCell;
      }).join(',');
      csvContent += row + '\n';
    });

    // Creăm și descărcăm fișierul
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", "raport_clienti.csv");
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={leads.length === 0}>
        <Download className="mr-2 h-4 w-4" />
        Export CSV
      </Button>
      <Button variant="outline" size="sm" onClick={handlePrint} disabled={leads.length === 0}>
        <Printer className="mr-2 h-4 w-4" />
        Printează Raport
      </Button>
    </div>
  );
}
