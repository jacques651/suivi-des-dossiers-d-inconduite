// src/components/agents/AgentExportMenu.tsx
// Version sans statistiques, sans colonne sexe, avec contenu dynamique

import { useState, useEffect } from 'react';
import { Menu, Button } from '@mantine/core';
import { IconDownload, IconFileExcel, IconFileWord, IconFile, IconUpload, IconPrinter } from '@tabler/icons-react';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { notifications } from '@mantine/notifications';
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';
import { invoke } from '@tauri-apps/api/core';
import type { Agent, Grade } from '../../pages/agents/AgentManager';
import { usePrint } from '../../hooks/usePrint';

interface Signataire {
  SignataireID: number;
  Nom: string;
  Prenom: string;
  Grade: string;
  Fonction: string;
  TitreHonorifique: string;
  Statut: number;
}

interface AgentExportMenuProps {
  agents: Agent[];
  grades: Grade[];
  onImport?: () => void;
}

export default function AgentExportMenu({ agents, grades, onImport }: AgentExportMenuProps) {
  const [exporting, setExporting] = useState(false);
  const [signataireActif, setSignataireActif] = useState<Signataire | null>(null);
  const [params, setParams] = useState<Record<string, string>>({});
  const { printDocument, isLoading: printLoading } = usePrint();

  const getGrade = (id?: number) =>
    grades.find(g => g.GradeID === id)?.LibelleGrade || '';

  // Charger les paramètres généraux
  useEffect(() => {
    loadParams();
    loadSignataireActif();
  }, []);

  const loadParams = async () => {
    try {
      const result = await invoke('get_parametres_generaux');
      const data = result as { Code: string; Valeur: string }[];
      const map: Record<string, string> = {};
      data.forEach(p => { map[p.Code] = p.Valeur; });
      setParams(map);
    } catch (error) {
      console.error('Erreur chargement paramètres:', error);
    }
  };

  const loadSignataireActif = async () => {
    try {
      const result = await invoke('get_signataires');
      const signataires = result as Signataire[];
      const actif = signataires.find(s => s.Statut === 1);
      setSignataireActif(actif || null);
    } catch (error) {
      console.error('Erreur chargement signataire:', error);
    }
  };

  // ==========================================
  // En-tête HTML sans bordures - contenu dynamique
  // ==========================================
  const getHeaderHTML = () => {
    const ministere = params.MINISTERE || 'MINISTERE DE LA SECURITE';
    const cabinet = params.CABINET || 'CABINET';
    const service = params.SERVICE || 'INSPECTION TECHNIQUE DES SERVICES';
    const reference = params.REFERENCE || 'N°2025 ______/MISECU/CAB/ITS/CONF';
    const pays = params.PAYS || 'BURKINA FASO';
    const devise = params.DEVISE || 'La Patrie ou la Mort, nous vaincrons';
    const logo = params.LOGO_PATH || '';

    return `
      <div style="display: grid; grid-template-columns: 1fr auto 1fr; gap: 2rem; margin-bottom: 2rem; align-items: start;">
        <!-- Colonne gauche -->
        <div style="text-align: center;">
          <div style="font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">${ministere}</div>
          <hr style="width: 50px; margin: 5px auto; border: none; border-top: 1px solid #000;"/>
          <div style="font-size: 10px; font-weight: 600; text-transform: uppercase;">${cabinet}</div>
          <hr style="width: 50px; margin: 5px auto; border: none; border-top: 1px solid #000;"/>
          <div style="font-size: 10px; font-weight: bold; text-transform: uppercase;">${service}</div>
          <hr style="width: 50px; margin: 5px auto; border: none; border-top: 1px solid #000;"/>
          <div style="font-size: 9px; margin-top: 6px;">${reference}</div>
        </div>

        <!-- Colonne centre : Logo -->
        <div style="text-align: center; min-width: 120px;">
          ${logo ? `<img src="${logo}" style="max-height: 60px; max-width: 100px; object-fit: contain;" onerror="this.style.display='none'" />` : '<div style="font-size: 12px; font-weight: bold; color: #999;">LOGO</div>'}
        </div>

        <!-- Colonne droite -->
        <div style="text-align: center;">
          <div style="font-size: 10px; font-weight: bold; text-transform: uppercase;">${pays}</div>
          <hr style="width: 50px; margin: 8px auto; border: none; border-top: 1px solid #000;"/>
          <div style="font-size: 9px; font-style: italic;">${devise}</div>
        </div>
      </div>
    `;
  };

  // ==========================================
  // Destinataire HTML
  // ==========================================
  const getDestinataireHTML = () => {
    const expediteur = params.EXPEDITEUR || "L'Inspecteur Général des Services";
    const destinataire = params.DESTINATAIRE || 'Monsieur le Ministre de la Sécurité';
    
    return `
      <div style="text-align: right; margin: 10px 0 30px 0;">
        <div style="display: inline-block; text-align: center; min-width: 220px;">
          <div style="font-size: 11px; font-weight: 600; margin-bottom: 8px;">${expediteur}</div>
          <div style="font-size: 11px; margin-bottom: 8px;">A</div>
          <div style="font-size: 11px; font-weight: 700;">${destinataire}</div>
        </div>
      </div>
    `;
  };

  // ==========================================
  // Signature HTML
  // ==========================================
  const getSignatureHTML = () => {
    const fonctionsAMasquer = ["L'Inspecteur Général des Services", "Inspecteur Général des Services"];
    const afficherFonction = signataireActif && !fonctionsAMasquer.includes(signataireActif.Fonction);

    if (!signataireActif) {
      return `
        <div style="margin-top: 50px; text-align: right;">
          <div style="display: inline-block; text-align: center; min-width: 180px;">
            <div style="font-size: 11px; font-weight: 600; margin-bottom: 25px;">Le Responsable</div>
            <div style="margin-top: 20px; width: 160px; margin-left: auto; border-top: 1px solid #000;"></div>
            <div style="font-size: 9px; margin-top: 6px;">Fait à Ouagadougou, le ${dayjs().format('DD/MM/YYYY')}</div>
          </div>
        </div>
      `;
    }

    return `
      <div style="margin-top: 50px; text-align: right;">
        <div style="display: inline-block; text-align: center; min-width: 200px;">
          ${afficherFonction && signataireActif.Fonction
            ? `<div style="font-size: 11px; font-weight: 600; margin-bottom: 25px;">${signataireActif.Fonction}</div>`
            : '<div style="margin-bottom: 25px;"></div>'}
          <div style="font-size: 11px; font-weight: 700; text-decoration: underline;">${signataireActif.Prenom} ${signataireActif.Nom}</div>
          ${signataireActif.Grade ? `<div style="font-size: 10px; margin-top: 4px;">${signataireActif.Grade}</div>` : ''}
          ${signataireActif.TitreHonorifique ? `<div style="font-size: 9px; margin-top: 4px; font-style: italic;">${signataireActif.TitreHonorifique}</div>` : ''}
          <div style="margin-top: 20px; width: 160px; margin-left: auto; border-top: 1px solid #000;"></div>
          <div style="font-size: 9px; margin-top: 6px;">Fait à Ouagadougou, le ${dayjs().format('DD/MM/YYYY')}</div>
        </div>
      </div>
    `;
  };

  // Export Excel
  const exportExcel = async () => {
    try {
      setExporting(true);
      const data = agents.map(a => ({
        Matricule: a.Matricule,
        Nom: a.Nom,
        Prénom: a.Prenom,
        Grade: getGrade(a.GradeID),
        Service: a.Service || '',
        Entité: a.Entite || '',
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      ws['!cols'] = [
        { wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 25 },
        { wch: 25 }, { wch: 20 }
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Agents');
      const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const path = await save({
        filters: [{ name: 'Excel', extensions: ['xlsx'] }],
        defaultPath: `agents_${dayjs().format('YYYY-MM-DD_HH-mm')}.xlsx`
      });
      if (path) {
        await writeFile(path, new Uint8Array(buf));
        notifications.show({ title: '✅ Succès', message: 'Export Excel réussi !', color: 'green' });
      }
    } catch (error) {
      notifications.show({ title: '❌ Erreur', message: "Erreur lors de l'export Excel", color: 'red' });
    } finally {
      setExporting(false);
    }
  };

  // Export PDF sans statistiques et sans sexe
  const exportPDF = async () => {
    try {
      setExporting(true);
      const doc = new jsPDF('portrait', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 15;
      let y = 20;

      // En-tête
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text(params.MINISTERE || 'MINISTERE DE LA SECURITE', pageWidth / 2, y, { align: 'center' });
      y += 4;
      doc.line(pageWidth / 2 - 30, y, pageWidth / 2 + 30, y);
      y += 6;
      
      doc.setFont('helvetica', 'normal');
      doc.text(params.CABINET || 'CABINET', pageWidth / 2, y, { align: 'center' });
      y += 4;
      doc.line(pageWidth / 2 - 30, y, pageWidth / 2 + 30, y);
      y += 6;
      
      doc.setFont('helvetica', 'bold');
      doc.text(params.SERVICE || 'INSPECTION TECHNIQUE DES SERVICES', pageWidth / 2, y, { align: 'center' });
      y += 4;
      doc.line(pageWidth / 2 - 30, y, pageWidth / 2 + 30, y);
      y += 6;
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.text(params.REFERENCE || 'N°2025 ______/MISECU/CAB/ITS/CONF', pageWidth / 2, y, { align: 'center' });
      
      // Logo
      if (params.LOGO_PATH) {
        try {
          doc.addImage(params.LOGO_PATH, 'PNG', pageWidth / 2 - 20, y + 5, 40, 40);
        } catch(e) {}
      } else {
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(180, 180, 180);
        doc.text('LOGO', pageWidth / 2, y + 15, { align: 'center' });
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6);
        doc.setTextColor(200, 200, 200);
        doc.text('[Emblème Officiel]', pageWidth / 2, y + 22, { align: 'center' });
      }
      doc.setTextColor(0, 0, 0);
      
      // Burkina Faso
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text(params.PAYS || 'BURKINA FASO', pageWidth / 2, y + 40, { align: 'center' });
      doc.line(pageWidth / 2 - 30, y + 43, pageWidth / 2 + 30, y + 43);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7);
      doc.text(params.DEVISE || 'La Patrie ou la Mort, nous vaincrons', pageWidth / 2, y + 48, { align: 'center' });
      
      y = y + 60;

      // Destinataire
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(params.EXPEDITEUR || "L'Inspecteur Général des Services", pageWidth - margin, y, { align: 'right' });
      doc.text('A', pageWidth - margin, y + 6, { align: 'right' });
      doc.setFont('helvetica', 'bold');
      doc.text(params.DESTINATAIRE || 'Monsieur le Ministre de la Sécurité', pageWidth - margin, y + 12, { align: 'right' });
      
      y = y + 25;

      // Objet
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('OBJET : LISTE DES AGENTS', margin, y);
      
      y = y + 15;

      // Tableau sans colonne Sexe
      const head = [['N°', 'Matricule', 'Nom', 'Prénom', 'Grade', 'Service', 'Entité']];
      const body = agents.map((agent, index) => [
        (index + 1).toString(),
        agent.Matricule || '-',
        agent.Nom || '-',
        agent.Prenom || '-',
        getGrade(agent.GradeID) || '-',
        agent.Service || '-',
        agent.Entite || '-'
      ]);

      autoTable(doc, {
        head,
        body,
        startY: y,
        theme: 'striped',
        headStyles: { fillColor: [27, 54, 93], textColor: 255, fontStyle: 'bold', fontSize: 9 },
        styles: { fontSize: 8, cellPadding: 2 },
      });

      // Signature
      const finalY = (doc as any).lastAutoTable.finalY + 20;
      const fonctionsAMasquer = ["L'Inspecteur Général des Services", "Inspecteur Général des Services"];
      const afficherFonction = signataireActif && !fonctionsAMasquer.includes(signataireActif.Fonction);

      if (signataireActif) {
        let currentY = finalY;
        
        if (afficherFonction && signataireActif.Fonction) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
          doc.text(signataireActif.Fonction, pageWidth - margin, currentY, { align: 'right' });
          currentY += 12;
        }
        
        currentY += 8;
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text(`${signataireActif.Prenom} ${signataireActif.Nom}`, pageWidth - margin, currentY, { align: 'right' });
        currentY += 7;
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        if (signataireActif.Grade) {
          doc.text(signataireActif.Grade, pageWidth - margin, currentY, { align: 'right' });
          currentY += 6;
        }
        if (signataireActif.TitreHonorifique) {
          doc.setFont('helvetica', 'italic');
          doc.text(signataireActif.TitreHonorifique, pageWidth - margin, currentY, { align: 'right' });
        }
        
        doc.line(pageWidth - margin - 50, currentY + 8, pageWidth - margin, currentY + 8);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.text(`Fait à Ouagadougou, le ${dayjs().format('DD/MM/YYYY')}`, pageWidth - margin, currentY + 20, { align: 'right' });
      } else {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text('Le Responsable', pageWidth - margin, finalY + 10, { align: 'right' });
        doc.line(pageWidth - margin - 40, finalY + 18, pageWidth - margin, finalY + 18);
        doc.setFontSize(7);
        doc.text(`Fait à Ouagadougou, le ${dayjs().format('DD/MM/YYYY')}`, pageWidth - margin, finalY + 30, { align: 'right' });
      }

      // Pied de page
      const pageCount = doc.internal.pages.length - 1;
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(150, 150, 150);
        doc.text(`Page ${i} sur ${pageCount}`, doc.internal.pageSize.getWidth() / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
      }

      const pdfBuf = doc.output('arraybuffer');
      const path = await save({
        filters: [{ name: 'PDF', extensions: ['pdf'] }],
        defaultPath: `agents_${dayjs().format('YYYY-MM-DD_HH-mm')}.pdf`
      });
      if (path) {
        await writeFile(path, new Uint8Array(pdfBuf));
        notifications.show({ title: '✅ Succès', message: 'Export PDF réussi !', color: 'green' });
      }
    } catch (error) {
      console.error(error);
      notifications.show({ title: '❌ Erreur', message: "Erreur lors de l'export PDF", color: 'red' });
    } finally {
      setExporting(false);
    }
  };

  // Export Word sans statistiques et sans sexe
  const exportWord = () => {
    try {
      setExporting(true);
      const rows = agents.map((a, i) => `
        <tr>
          <td style="padding:8px;border:1px solid #ddd;text-align:center">${i + 1}</td>
          <td style="padding:8px;border:1px solid #ddd">${a.Matricule}</td>
          <td style="padding:8px;border:1px solid #ddd">${a.Nom}</td>
          <td style="padding:8px;border:1px solid #ddd">${a.Prenom}</td>
          <td style="padding:8px;border:1px solid #ddd">${getGrade(a.GradeID)}</td>
          <td style="padding:8px;border:1px solid #ddd">${a.Service || '-'}</td>
          <td style="padding:8px;border:1px solid #ddd">${a.Entite || '-'}</td>
        </tr>
      `).join('');

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Liste des agents</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background: #1b365d; color: white; padding: 10px; border: 1px solid #2a4a7a; }
            td { padding: 8px; border: 1px solid #ddd; }
            tr:nth-child(even) { background: #f9f9f9; }
            .footer { text-align: center; margin-top: 30px; font-size: 10px; color: #999; border-top: 1px solid #ddd; padding-top: 10px; }
          </style>
        </head>
        <body>
          ${getHeaderHTML()}
          ${getDestinataireHTML()}
          <div style="margin: 20px 0; font-weight: bold; font-size: 14px;">OBJET : LISTE DES AGENTS</div>
          <table>
            <thead>
              <tr><th>N°</th><th>Matricule</th><th>Nom</th><th>Prénom</th><th>Grade</th><th>Service</th><th>Entité</th></tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          ${getSignatureHTML()}
          <div class="footer">
            <p>Document généré automatiquement - Gestion des Agents © ${new Date().getFullYear()}</p>
          </div>
        </body>
        </html>
      `;
      const blob = new Blob([htmlContent], { type: 'application/msword' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `agents_${dayjs().format('YYYY-MM-DD_HH-mm')}.doc`;
      a.click();
      URL.revokeObjectURL(url);
      notifications.show({ title: '✅ Succès', message: 'Export Word réussi !', color: 'green' });
    } catch (error) {
      notifications.show({ title: '❌ Erreur', message: "Erreur lors de l'export Word", color: 'red' });
    } finally {
      setExporting(false);
    }
  };

  // Export CSV sans sexe
  const exportCSV = () => {
    try {
      setExporting(true);
      const headers = ['Matricule', 'Nom', 'Prénom', 'Grade', 'Service', 'Entité'];
      const rows = agents.map(a => [
        a.Matricule, a.Nom, a.Prenom, getGrade(a.GradeID),
        a.Service || '', a.Entite || ''
      ]);
      const csvContent = [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');
      const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `agents_${dayjs().format('YYYY-MM-DD_HH-mm')}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      notifications.show({ title: '✅ Succès', message: 'Export CSV réussi !', color: 'green' });
    } catch (error) {
      notifications.show({ title: '❌ Erreur', message: "Erreur lors de l'export CSV", color: 'red' });
    } finally {
      setExporting(false);
    }
  };

  // Impression sans statistiques et sans sexe
const handlePrint = (orientation: 'portrait' | 'landscape') => {
  const rows = agents.map((a, i) => `
    <tr>
      <td style="padding:6px; border:1px solid #ddd; text-align:center;">${i + 1}</td>
      <td style="padding:6px; border:1px solid #ddd;">${a.Matricule || '-'}</td>
      <td style="padding:6px; border:1px solid #ddd;">${a.Nom || '-'}</td>
      <td style="padding:6px; border:1px solid #ddd;">${a.Prenom || '-'}</td>
      <td style="padding:6px; border:1px solid #ddd;">${getGrade(a.GradeID) || '-'}</td>
      <td style="padding:6px; border:1px solid #ddd;">${a.Service || '-'}</td>
      <td style="padding:6px; border:1px solid #ddd;">${a.Entite || '-'}</td>
    </tr>
  `).join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Liste des Agents</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; padding: 40px; background: white; }
        @page { size: ${orientation === 'portrait' ? 'A4' : 'A4 landscape'}; margin: 1.5cm; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 11px; }
        th { background: #1b365d; color: white; padding: 10px; border: 1px solid #2a4a7a; }
        td { padding: 8px; border: 1px solid #ddd; }
        tr:nth-child(even) { background: #f9f9f9; }
        .footer { text-align: center; margin-top: 30px; font-size: 10px; color: #999; border-top: 1px solid #ddd; padding-top: 10px; }
        @media print {
          th { background: #1b365d !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      </style>
    </head>
    <body>
      ${getHeaderHTML()}
      ${getDestinataireHTML()}
      <div style="margin: 20px 0; font-weight: bold; font-size: 14px;">OBJET : LISTE DES AGENTS</div>
      <table>
        <thead>
          <tr>
            <th style="width: 5%">N°</th>
            <th style="width: 12%">Matricule</th>
            <th style="width: 18%">Nom</th>
            <th style="width: 18%">Prénom</th>
            <th style="width: 17%">Grade</th>
            <th style="width: 15%">Service</th>
            <th style="width: 15%">Entité</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      ${getSignatureHTML()}
      <div class="footer">
        <p>Document généré automatiquement - Gestion des Agents © ${new Date().getFullYear()}</p>
      </div>
    </body>
    </html>
  `;
  
  printDocument(htmlContent, 'LISTE DES AGENTS', orientation, false);
};

  // Télécharger le modèle
  const downloadTemplate = () => {
    try {
      const templateData = [{
        Matricule: 'POL-2024-001',
        Nom: 'Dupont',
        Prenom: 'Jean',
        Grade: 'Commissaire',
        Service: 'DGGPN',
        Entité: 'Police Nationale',
      }];
      const ws = XLSX.utils.json_to_sheet(templateData);
      ws['!cols'] = [{ wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 20 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Template_Agents');
      XLSX.writeFile(wb, 'template_import_agents.xlsx');
      notifications.show({ title: '✅ Succès', message: 'Modèle téléchargé avec succès', color: 'green' });
    } catch (error) {
      notifications.show({ title: '❌ Erreur', message: "Erreur lors du téléchargement du modèle", color: 'red' });
    }
  };

  return (
    <Menu shadow="md" width={240}>
      <Menu.Target>
        <Button
          size="sm"
          leftSection={<IconDownload size={14} />}
          variant="white"
          color="dark"
          loading={exporting || printLoading}
        >
          Export/Imprimer
        </Button>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Label>📤 Export</Menu.Label>
        <Menu.Item leftSection={<IconFileExcel size={14} color="#00a84f" />} onClick={exportExcel}>Excel (.xlsx)</Menu.Item>
        <Menu.Item leftSection={<IconFile size={14} color="#e74c3c" />} onClick={exportPDF}>PDF (.pdf)</Menu.Item>
        <Menu.Item leftSection={<IconFileWord size={14} color="#2980b9" />} onClick={exportWord}>Word (.doc)</Menu.Item>
        <Menu.Item leftSection={<IconFile size={14} color="#2c3e50" />} onClick={exportCSV}>CSV (.csv)</Menu.Item>
        <Menu.Divider />
        <Menu.Label>🖨️ Impression</Menu.Label>
        <Menu.Item leftSection={<IconPrinter size={14} color="#27ae60" />} onClick={() => handlePrint('portrait')}>
          🧾 Portrait (Adapté)
        </Menu.Item>
        <Menu.Item leftSection={<IconPrinter size={14} color="#2980b9" />} onClick={() => handlePrint('landscape')}>
          📄 Paysage (Recommandé)
        </Menu.Item>
        {onImport && (
          <>
            <Menu.Divider />
            <Menu.Label>📥 Importation</Menu.Label>
            <Menu.Item leftSection={<IconFileExcel size={14} color="#00a84f" />} onClick={downloadTemplate}>
              📋 Télécharger le modèle
            </Menu.Item>
            <Menu.Item leftSection={<IconUpload size={14} color="#27ae60" />} onClick={onImport}>
              📂 Importer depuis Excel
            </Menu.Item>
          </>
        )}
      </Menu.Dropdown>
    </Menu>
  );
}