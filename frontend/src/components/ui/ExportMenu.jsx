// src/components/ui/ExportMenu.jsx
import React from 'react';
import { FileDown, FileSpreadsheet, Download } from 'lucide-react';
import { Button } from './button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './dropdown-menu';

/**
 * Composant ExportMenu - Menu déroulant pour exporter des données
 * 
 * Props:
 * - onExportPDF: Fonction appelée lors du clic sur "Exporter en PDF"
 * - onExportCSV: Fonction appelée lors du clic sur "Exporter en CSV"
 * - disabled: Désactive le bouton (optionnel)
 * - variant: Variant du bouton (default | outline | secondary)
 * 
 * Usage:
 * <ExportMenu 
 *   onExportPDF={() => exportToPDF(data)}
 *   onExportCSV={() => exportToCSV(data)}
 * />
 */
export default function ExportMenu({ 
  onExportPDF, 
  onExportCSV, 
  disabled = false,
  variant = "outline"
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant={variant} 
          size="sm"
          disabled={disabled}
        >
          <Download className="w-4 h-4" />
          Exporter
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Format d'export</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          onClick={onExportPDF}
          className="cursor-pointer"
        >
          <FileDown className="w-4 h-4 mr-2" />
          <span>Exporter en PDF</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem 
          onClick={onExportCSV}
          className="cursor-pointer"
        >
          <FileSpreadsheet className="w-4 h-4 mr-2" />
          <span>Exporter en CSV</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
