import { useEffect, useState } from 'react';
import {
  Table, Button, Modal, TextInput, Select, Group,
  ActionIcon, Stack, Card, Badge, Grid,
  Avatar, Text,
  Tooltip, Box, Container, SimpleGrid, Paper,
  ThemeIcon, ScrollArea, Center, Loader,
  Menu, Title, Autocomplete,
  Progress, Divider, Alert, FileButton
} from '@mantine/core';
import { useForm } from '@mantine/form';
import {
  IconEdit, IconTrash, IconPlus, IconSearch,
  IconUser, IconBuilding, IconId,
  IconRefresh, IconDownload,
  IconFileExcel, IconFile, IconFileWord,
  IconPrinter, IconInfoCircle, IconCheck, IconX,
  IconEye, IconUpload, IconAlertCircle
} from '@tabler/icons-react';
import { invoke } from '@tauri-apps/api/core';
import { notifications } from '@mantine/notifications';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import { usePrint } from '../hooks/usePrint';
import { ParametreGeneral } from '../components/referentiels/types';


interface Agent {
  PersonnelID: number;
  Matricule: string;
  Cle?: string;
  Nom: string;
  Prenom: string;
  GradeID?: number;
  GradeLibelle?: string;
  Service?: string;
  Entite?: string;
  Sexe?: string;
  Photo?: string;
  CreatedAt?: string;
}

interface Grade {
  GradeID: number;
  LibelleGrade: string;
}

interface ImportResult {
  success: number;
  errors: string[];
}

export default function AgentManager() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [agentToDelete, setAgentToDelete] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [activePage, setActivePage] = useState(1);
  const [selectedSexe, setSelectedSexe] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [selectedEntite, setSelectedEntite] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string>('');
  const [serviceOptions, setServiceOptions] = useState<string[]>([]);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);

  const { printDocument } = usePrint();
  const entiteOptions = ['Police Nationale', 'Gendarmerie Nationale', 'Autre'];

  const form = useForm({
    initialValues: {
      Matricule: '', Cle: '', Nom: '', Prenom: '',
      GradeID: '', Service: '', Entite: '', Sexe: '', Photo: ''
    },
    validate: {
      Matricule: (value) => (value ? null : 'Le matricule est requis'),
      Nom: (value) => (value ? null : 'Le nom est requis'),
      Prenom: (value) => (value ? null : 'Le prénom est requis'),
    },
  });

  useEffect(() => {
    loadAgents();
    loadGrades();
    loadExistingServices();
  }, []);

  const loadAgents = async () => {
    setLoading(true);
    try {
      const result = await invoke('get_agents');
      setAgents(result as Agent[]);
    } catch (error) {
      notifications.show({ title: 'Erreur', message: 'Impossible de charger les agents', color: 'red', icon: <IconX size={16} /> });
    } finally {
      setLoading(false);
    }
  };

  const loadGrades = async () => {
    try {
      const result = await invoke('get_grades');
      setGrades(result as Grade[]);
    } catch (error) {
      console.error('Erreur chargement grades:', error);
    }
  };

  const loadExistingServices = async () => {
    try {
      const result = await invoke('get_agents');
      const agentsData = result as Agent[];
      const uniqueServices = [...new Set(agentsData.map(a => a.Service).filter(Boolean))] as string[];
      setServiceOptions(uniqueServices);
    } catch (error) {
      console.error('Erreur chargement services:', error);
    }
  };

  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const handlePhotoUpload = async (file: File | null) => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      notifications.show({ title: 'Erreur', message: 'La photo ne doit pas dépasser 2 Mo', color: 'red', icon: <IconX size={16} /> });
      return;
    }
    try {
      const base64 = await convertToBase64(file);
      setPhotoBase64(base64);
      setPhotoPreview(URL.createObjectURL(file));
      form.setFieldValue('Photo', base64);
    } catch (error) {
      notifications.show({ title: 'Erreur', message: 'Impossible de charger la photo', color: 'red', icon: <IconX size={16} /> });
    }
  };

  const handleSubmit = async (values: typeof form.values) => {
    try {
      const agentData = {
        Matricule: values.Matricule,
        Cle: values.Cle || '',
        Nom: values.Nom,
        Prenom: values.Prenom,
        GradeID: values.GradeID ? parseInt(values.GradeID) : null,
        Service: values.Service || '',
        Entite: values.Entite || '',
        Sexe: values.Sexe || '',
        Photo: photoBase64 || '',
        PersonnelID: editingId,
      };

      if (editingId) {
        await invoke('update_agent', { agent: agentData });
        notifications.show({ title: 'Succès', message: 'Agent modifié avec succès', color: 'green', icon: <IconCheck size={16} /> });
      } else {
        await invoke('create_agent', { agent: agentData });
        notifications.show({ title: 'Succès', message: 'Agent créé avec succès', color: 'green', icon: <IconCheck size={16} /> });
      }

      setModalOpen(false);
      form.reset();
      setPhotoPreview(null);
      setPhotoBase64('');
      setEditingId(null);
      loadAgents();
      loadExistingServices();
    } catch (error) {
      notifications.show({ title: 'Erreur', message: `Erreur: ${error}`, color: 'red', icon: <IconX size={16} /> });
    }
  };

  const handleDelete = async () => {
    if (!agentToDelete) return;
    try {
      await invoke('delete_agent', { id: agentToDelete });
      notifications.show({ title: 'Succès', message: 'Agent supprimé avec succès', color: 'green', icon: <IconCheck size={16} /> });
      setDeleteModalOpen(false);
      setAgentToDelete(null);
      loadAgents();
    } catch (error) {
      notifications.show({ title: 'Erreur', message: 'Impossible de supprimer l\'agent', color: 'red', icon: <IconX size={16} /> });
    }
  };

  const handleEdit = (agent: Agent) => {
    setEditingId(agent.PersonnelID);
    form.setValues({
      Matricule: agent.Matricule,
      Cle: agent.Cle || '',
      Nom: agent.Nom,
      Prenom: agent.Prenom,
      GradeID: agent.GradeID?.toString() || '',
      Service: agent.Service || '',
      Entite: agent.Entite || '',
      Sexe: agent.Sexe || '',
      Photo: agent.Photo || '',
    });
    if (agent.Photo && agent.Photo.startsWith('data:image')) {
      setPhotoBase64(agent.Photo);
      setPhotoPreview(agent.Photo);
    } else {
      setPhotoBase64('');
      setPhotoPreview(null);
    }
    setModalOpen(true);
  };

  const handleView = (agent: Agent) => {
    setSelectedAgent(agent);
    setViewModalOpen(true);
  };

  const getGradeLibelle = (gradeId?: number) => {
    if (!gradeId) return 'Non défini';
    const grade = grades.find(g => g.GradeID === gradeId);
    return grade?.LibelleGrade || 'Non défini';
  };

  const filteredAgents = agents.filter(agent => {
    const matchesSearch = `${agent.Nom} ${agent.Prenom} ${agent.Matricule}`.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSexe = !selectedSexe || agent.Sexe === selectedSexe;
    const matchesService = !selectedService || agent.Service === selectedService;
    const matchesEntite = !selectedEntite || agent.Entite === selectedEntite;
    return matchesSearch && matchesSexe && matchesService && matchesEntite;
  });

  const exportToExcel = () => {
    try {
      setExporting(true);
      const data = filteredAgents.map(agent => ({
        'Matricule': agent.Matricule,
        'Nom': agent.Nom,
        'Prénom': agent.Prenom,
        'Grade': getGradeLibelle(agent.GradeID),
        'Service': agent.Service || '',
        'Entité': agent.Entite || '',
        'Sexe': agent.Sexe === 'M' ? 'Masculin' : agent.Sexe === 'F' ? 'Féminin' : '',
        'Clé': agent.Cle || ''
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      ws['!cols'] = [{ wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 25 }, { wch: 20 }, { wch: 15 }, { wch: 10 }, { wch: 15 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Agents');
      XLSX.writeFile(wb, `agents_${dayjs().format('YYYY-MM-DD_HH-mm')}.xlsx`);
      notifications.show({ title: '✅ Succès', message: 'Export Excel réussi !', color: 'green', icon: <IconCheck size={16} /> });
    } catch (error) {
      notifications.show({ title: '❌ Erreur', message: `Erreur lors de l'export Excel`, color: 'red', icon: <IconX size={16} /> });
    } finally {
      setExporting(false);
    }
  };

  // ============ EXPORT PDF AVEC EN-TÊTE (Version jsPDF uniquement) ============
  const exportToPDF = async () => {
    try {
      setExporting(true);

      // Récupérer les paramètres pour l'en-tête
      const result = await invoke('get_parametres_generaux');
      const paramsList = result as ParametreGeneral[];
      const params: Record<string, string> = {};
      paramsList.forEach(p => { params[p.Code] = p.Valeur; });

      const logo = params.LOGO_PATH || '';
      const ministere = params.MINISTERE || 'MINISTERE DE LA SECURITE';
      const cabinet = params.CABINET || 'CABINET';
      const service = params.SERVICE || 'INSPECTION TECHNIQUE DES SERVICES';
      const reference = params.REFERENCE || 'N°2025 ______/MISECU/CAB/ITS/CONF';
      const pays = params.PAYS || 'BURKINA FASO';
      const devise = params.DEVISE || 'La Patrie ou la Mort, nous vaincrons';
      const expediteur = params.EXPEDITEUR || "L'Inspecteur Général des Services";
      const destinataire = params.DESTINATAIRE || 'Ministre de la Sécurité';

      // Générer le tableau en HTML
      const tableRows = filteredAgents.map((agent, idx) => `
      <tr>
        <td style="padding:8px; border:1px solid #ddd; text-align:center">${idx + 1}</td>
        <td style="padding:8px; border:1px solid #ddd">${agent.Matricule}</td>
        <td style="padding:8px; border:1px solid #ddd">${agent.Nom}</td>
        <td style="padding:8px; border:1px solid #ddd">${agent.Prenom}</td>
        <td style="padding:8px; border:1px solid #ddd">${getGradeLibelle(agent.GradeID)}</td>
        <td style="padding:8px; border:1px solid #ddd">${agent.Service || '-'}</td>
        <td style="padding:8px; border:1px solid #ddd">${agent.Entite || '-'}</td>
        <td style="padding:8px; border:1px solid #ddd; text-align:center">${agent.Sexe === 'M' ? 'M' : agent.Sexe === 'F' ? 'F' : '-'}</td>
      </tr>
    `).join('');

      const totalAgentsCount = filteredAgents.length;
      const maleCountExport = filteredAgents.filter(a => a.Sexe === 'M').length;
      const femaleCountExport = filteredAgents.filter(a => a.Sexe === 'F').length;

      // Créer un iframe caché pour générer le PDF
      const iframe = document.createElement('iframe');
      iframe.style.position = 'absolute';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = 'none';
      document.body.appendChild(iframe);

      const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>LISTE DES AGENTS</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Times New Roman', Arial, sans-serif; padding: 40px; font-size: 12pt; line-height: 1.4; }
          .header-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px; }
          .zone-gauche { text-align: left; flex: 1; }
          .zone-centre { text-align: center; flex-shrink: 0; padding: 0 30px; }
          .zone-droite { text-align: right; flex: 1; }
          .zone-gauche div, .zone-droite div { margin: 2px 0; }
          .separateur { margin: 5px 0; }
          .logo-img { max-height: 80px; max-width: 120px; }
          .expediteur-destinataire { text-align: right; margin: 50px 0 30px 0; line-height: 2; }
          .objet { margin: 20px 0 30px 0; font-weight: bold; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 10pt; }
          th { background-color: #1b365d; color: white; padding: 10px; border: 1px solid #2a4a7a; }
          td { padding: 8px; border: 1px solid #ddd; }
          tr:nth-child(even) { background-color: #f9f9f9; }
          .footer { margin-top: 40px; text-align: center; font-size: 8pt; color: gray; border-top: 1px solid #eee; padding-top: 10px; }
          .info-generales { margin: 20px 0; padding: 10px; background-color: #f5f5f5; border-radius: 5px; text-align: center; }
          @media print {
            body { margin: 0; padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="header-row">
          <div class="zone-gauche">
            <div><strong>${ministere}</strong></div>
            <div class="separateur">---</div>
            <div>${cabinet}</div>
            <div class="separateur">---</div>
            <div>${service}</div>
            <div class="separateur">---</div>
            <div>${reference}</div>
          </div>
          <div class="zone-centre">
            ${logo ? `<img src="${logo}" class="logo-img" alt="Logo" />` : ''}
          </div>
          <div class="zone-droite">
            <div><strong>${pays}</strong></div>
            <div><em>${devise}</em></div>
          </div>
        </div>
        
        <div class="expediteur-destinataire">
          <div>${expediteur}</div>
          <div>A</div>
          <div><strong>${destinataire}</strong></div>
        </div>
        
        <div class="objet">LISTE DES AGENTS</div>
        
        <div class="info-generales">
          <strong>Effectif total:</strong> ${totalAgentsCount} agents &nbsp;|&nbsp;
          <strong>Hommes:</strong> ${maleCountExport} &nbsp;|&nbsp;
          <strong>Femmes:</strong> ${femaleCountExport}
        </div>
        
        <table>
          <thead>
            <tr style="background-color:#1b365d; color:white;">
              <th style="padding:10px;">N°</th>
              <th style="padding:10px;">Matricule</th>
              <th style="padding:10px;">Nom</th>
              <th style="padding:10px;">Prénom</th>
              <th style="padding:10px;">Grade</th>
              <th style="padding:10px;">Service</th>
              <th style="padding:10px;">Entité</th>
              <th style="padding:10px;">Sexe</th>
            </tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
        
        <div class="footer">
          Document généré le ${dayjs().format('DD/MM/YYYY à HH:mm')} - Suivi Dossiers v2.0
        </div>
      </body>
      </html>
    `;

      const iframeDoc = iframe.contentWindow?.document;
      if (iframeDoc) {
        iframeDoc.open();
        iframeDoc.write(htmlContent);
        iframeDoc.close();

        // Attendre que le contenu soit chargé
        setTimeout(() => {
          iframe.contentWindow?.print();

          // Rediriger l'impression vers un PDF
          const originalPrint = iframe.contentWindow?.print;
          if (originalPrint) {
            // Pour sauvegarder en PDF, l'utilisateur choisira "Enregistrer en PDF" dans la boîte de dialogue
            originalPrint.call(iframe.contentWindow);
          }

          setTimeout(() => {
            document.body.removeChild(iframe);
          }, 1000);
        }, 500);
      }

      notifications.show({ title: '✅ Succès', message: 'Export PDF préparé !', color: 'green', icon: <IconCheck size={16} /> });
    } catch (error) {
      console.error('Erreur export PDF:', error);
      notifications.show({ title: '❌ Erreur', message: `Erreur lors de l'export PDF`, color: 'red', icon: <IconX size={16} /> });
    } finally {
      setExporting(false);
    }
  };

  // ============ EXPORT WORD AVEC EN-TÊTE ============
  const exportToWord = async () => {
    try {
      setExporting(true);

      // Récupérer les paramètres pour l'en-tête
      const result = await invoke('get_parametres_generaux');
      const paramsList = result as ParametreGeneral[];
      const params: Record<string, string> = {};
      paramsList.forEach(p => { params[p.Code] = p.Valeur; });

      const logo = params.LOGO_PATH || '';
      const ministere = params.MINISTERE || 'MINISTERE DE LA SECURITE';
      const cabinet = params.CABINET || 'CABINET';
      const service = params.SERVICE || 'INSPECTION TECHNIQUE DES SERVICES';
      const reference = params.REFERENCE || 'N°2025 ______/MISECU/CAB/ITS/CONF';
      const pays = params.PAYS || 'BURKINA FASO';
      const devise = params.DEVISE || 'La Patrie ou la Mort, nous vaincrons';
      const expediteur = params.EXPEDITEUR || "L'Inspecteur Général des Services";
      const destinataire = params.DESTINATAIRE || 'Ministre de la Sécurité';

      const tableRows = filteredAgents.map((agent, idx) => `
      <tr>
        <td style="border:1px solid #ddd;padding:8px;text-align:center">${idx + 1}<\/td>
        <td style="border:1px solid #ddd;padding:8px">${agent.Matricule}<\/td>
        <td style="border:1px solid #ddd;padding:8px">${agent.Nom}<\/td>
        <td style="border:1px solid #ddd;padding:8px">${agent.Prenom}<\/td>
        <td style="border:1px solid #ddd;padding:8px">${getGradeLibelle(agent.GradeID)}<\/td>
        <td style="border:1px solid #ddd;padding:8px">${agent.Service || '-'}<\/td>
        <td style="border:1px solid #ddd;padding:8px">${agent.Entite || '-'}<\/td>
        <td style="border:1px solid #ddd;padding:8px;text-align:center">${agent.Sexe === 'M' ? 'M' : agent.Sexe === 'F' ? 'F' : '-'}<\/td>
      </tr>
    `).join('');

      const totalAgentsCount = filteredAgents.length;
      const maleCountExport = filteredAgents.filter(a => a.Sexe === 'M').length;
      const femaleCountExport = filteredAgents.filter(a => a.Sexe === 'F').length;

      const htmlContent = `<!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Liste des agents</title>
      <style>
        body { font-family: 'Times New Roman', Arial, sans-serif; margin: 40px; font-size: 12pt; }
        .header-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px; }
        .zone-gauche { text-align: left; flex: 1; }
        .zone-centre { text-align: center; flex-shrink: 0; padding: 0 30px; }
        .zone-droite { text-align: right; flex: 1; }
        .zone-gauche div, .zone-droite div { margin: 2px 0; }
        .separateur { margin: 5px 0; }
        .logo-img { max-height: 80px; max-width: 120px; }
        .expediteur-destinataire { text-align: right; margin: 50px 0 30px 0; line-height: 2; }
        .objet { margin: 20px 0 30px 0; font-weight: bold; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th { background-color: #1b365d; color: white; padding: 10px; border: 1px solid #2a4a7a; }
        td { padding: 8px; border: 1px solid #ddd; }
        .footer { margin-top: 40px; text-align: center; font-size: 8pt; color: gray; border-top: 1px solid #eee; padding-top: 10px; }
        .info-generales { margin: 20px 0; padding: 10px; background-color: #f5f5f5; text-align: center; }
      </style>
    </head>
    <body>
      <div class="header-row">
        <div class="zone-gauche">
          <div><strong>${ministere}</strong></div>
          <div class="separateur">---</div>
          <div>${cabinet}</div>
          <div class="separateur">---</div>
          <div>${service}</div>
          <div class="separateur">---</div>
          <div>${reference}</div>
        </div>
        <div class="zone-centre">${logo ? `<img src="${logo}" class="logo-img" />` : ''}</div>
        <div class="zone-droite">
          <div><strong>${pays}</strong></div>
          <div><em>${devise}</em></div>
        </div>
      </div>
      <div class="expediteur-destinataire">
        <div>${expediteur}</div>
        <div>A</div>
        <div><strong>${destinataire}</strong></div>
      </div>
      <div class="objet">LISTE DES AGENTS</div>
      <div class="info-generales">
        <strong>Effectif total:</strong> ${totalAgentsCount} agents &nbsp;|&nbsp;
        <strong>Hommes:</strong> ${maleCountExport} &nbsp;|&nbsp;
        <strong>Femmes:</strong> ${femaleCountExport}
      </div>
      <table>
        <thead>
          <tr>
            <th>N°</th><th>Matricule</th><th>Nom</th><th>Prénom</th>
            <th>Grade</th><th>Service</th><th>Entité</th><th>Sexe</th>
          </tr>
        </thead>
        <tbody>${tableRows}</tbody>
      </table>
      <div class="footer">Document généré le ${dayjs().format('DD/MM/YYYY à HH:mm')} - Suivi Dossiers v2.0</div>
    </body>
    </html>`;

      const blob = new Blob([htmlContent], { type: 'application/msword' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `agents_${dayjs().format('YYYY-MM-DD_HH-mm')}.doc`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      notifications.show({ title: '✅ Succès', message: 'Export Word réussi !', color: 'green', icon: <IconCheck size={16} /> });
    } catch (error) {
      console.error('Erreur export Word:', error);
      notifications.show({ title: '❌ Erreur', message: `Erreur lors de l'export Word`, color: 'red', icon: <IconX size={16} /> });
    } finally {
      setExporting(false);
    }
  };

  const exportToCSV = () => {
    try {
      setExporting(true);
      const headers = ['Matricule', 'Nom', 'Prénom', 'Grade', 'Service', 'Entité', 'Sexe', 'Clé'];
      const rows = filteredAgents.map(agent => [agent.Matricule, agent.Nom, agent.Prenom, getGradeLibelle(agent.GradeID), agent.Service || '', agent.Entite || '', agent.Sexe === 'M' ? 'Masculin' : agent.Sexe === 'F' ? 'Féminin' : '', agent.Cle || '']);
      const csvContent = [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');
      const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `agents_${dayjs().format('YYYY-MM-DD_HH-mm')}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      notifications.show({ title: '✅ Succès', message: 'Export CSV réussi !', color: 'green', icon: <IconCheck size={16} /> });
    } catch (error) {
      notifications.show({ title: '❌ Erreur', message: `Erreur lors de l'export CSV`, color: 'red', icon: <IconX size={16} /> });
    } finally {
      setExporting(false);
    }
  };

  const downloadTemplate = () => {
    const templateData = [
      { Matricule: 'POL-2024-001', Nom: 'Dupont', Prenom: 'Jean', Grade: 'Commissaire de Police', Service: 'DGGPN', Entite: 'Police Nationale', Sexe: 'M', Cle: 'CLE123' }
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    ws['!cols'] = [{ wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 30 }, { wch: 20 }, { wch: 20 }, { wch: 10 }, { wch: 15 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, 'template_import_agents.xlsx');
    notifications.show({ title: '✅ Modèle téléchargé', message: 'Le modèle Excel est prêt à être rempli', color: 'green', icon: <IconCheck size={16} /> });
  };

  const handleFileUpload = (file: File | null) => {
    if (!file) return;
    setImportFile(file);
    setImportResult(null);
    setImportError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet);
        setImportPreview(jsonData.slice(0, 10));
        if (jsonData.length === 0) {
          setImportError('Le fichier Excel est vide');
        }
      } catch (err) {
        setImportError('Erreur lors de la lecture du fichier Excel');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleImport = async () => {
    if (!importFile) {
      setImportError('Veuillez sélectionner un fichier');
      return;
    }

    setImporting(true);
    setImportError(null);

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const data = new Uint8Array(event.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(firstSheet) as any[];

          if (jsonData.length === 0) {
            setImportError('Le fichier Excel est vide');
            setImporting(false);
            return;
          }

          let successCount = 0;
          const errors: string[] = [];

          for (let i = 0; i < jsonData.length; i++) {
            const row = jsonData[i];
            const lineNum = i + 2;

            const matricule = row.Matricule || row.matricule || row.MATRICULE;
            const nom = row.Nom || row.nom || row.NOM;
            const prenom = row.Prenom || row.prenom || row.PRENOM;
            const grade = row.Grade || row.grade || row.GRADE;
            const service = row.Service || row.service || row.SERVICE;
            const entite = row.Entite || row.entite || row.ENTITE || row.Entité;
            const sexe = row.Sexe || row.sexe || row.SEXE;
            const cle = row.Cle || row.cle || row.CLE;

            if (!matricule || !nom || !prenom) {
              errors.push(`Ligne ${lineNum}: Matricule, Nom ou Prénom manquant`);
              continue;
            }

            const existingAgent = agents.find(a => a.Matricule === String(matricule));
            if (existingAgent) {
              errors.push(`Ligne ${lineNum}: Le matricule "${matricule}" existe déjà`);
              continue;
            }

            let gradeID = null;
            if (grade) {
              const foundGrade = grades.find(g => g.LibelleGrade.toLowerCase() === String(grade).toLowerCase() || g.LibelleGrade.toLowerCase().includes(String(grade).toLowerCase()));
              if (foundGrade) {
                gradeID = foundGrade.GradeID;
              } else {
                errors.push(`Ligne ${lineNum}: Grade "${grade}" non trouvé`);
              }
            }

            let sexeValue = '';
            if (sexe) {
              const sexeStr = String(sexe).toLowerCase();
              if (sexeStr === 'm' || sexeStr === 'masculin') sexeValue = 'M';
              else if (sexeStr === 'f' || sexeStr === 'feminin' || sexeStr === 'féminin') sexeValue = 'F';
            }

            try {
              await invoke('create_agent', {
                agent: {
                  Matricule: String(matricule).trim(),
                  Cle: cle ? String(cle).trim() : '',
                  Nom: String(nom).trim(),
                  Prenom: String(prenom).trim(),
                  GradeID: gradeID,
                  Service: service ? String(service).trim() : '',
                  Entite: entite ? String(entite).trim() : '',
                  Sexe: sexeValue,
                  Photo: ''
                }
              });
              successCount++;
            } catch (error) {
              errors.push(`Ligne ${lineNum}: ${error}`);
            }
          }

          setImportResult({ success: successCount, errors });

          if (successCount > 0) {
            notifications.show({
              title: '✅ Import réussi',
              message: `${successCount} agent(s) importé(s) avec succès. ${errors.length} erreur(s).`,
              color: 'green',
              icon: <IconCheck size={16} />,
              autoClose: 5000
            });
            loadAgents();
            loadExistingServices();
            setImportModalOpen(false);
            setImportFile(null);
            setImportPreview([]);
          } else {
            notifications.show({
              title: '❌ Échec de l\'import',
              message: 'Aucun agent n\'a pu être importé',
              color: 'red',
              icon: <IconX size={16} />
            });
          }
        } catch (err: any) {
          setImportError(`Erreur: ${err.message || err}`);
        } finally {
          setImporting(false);
        }
      };
      reader.readAsArrayBuffer(importFile);
    } catch (err: any) {
      setImportError(`Erreur: ${err.message || err}`);
      setImporting(false);
    }
  };

  const handlePrint = (orientation: 'portrait' | 'landscape') => {
    const tableRows = filteredAgents.map((agent, idx) => `
    <tr>
      <td style="padding:8px; border:1px solid #ddd; text-align:center">${idx + 1}</td>
      <td style="padding:8px; border:1px solid #ddd">${agent.Matricule}</td>
      <td style="padding:8px; border:1px solid #ddd">${agent.Nom}</td>
      <td style="padding:8px; border:1px solid #ddd">${agent.Prenom}</td>
      <td style="padding:8px; border:1px solid #ddd">${getGradeLibelle(agent.GradeID)}</td>
      <td style="padding:8px; border:1px solid #ddd">${agent.Service || '-'}</td>
      <td style="padding:8px; border:1px solid #ddd">${agent.Entite || '-'}</td>
      <td style="padding:8px; border:1px solid #ddd; text-align:center">${agent.Sexe === 'M' ? 'M' : agent.Sexe === 'F' ? 'F' : '-'}</td>
    </tr>
  `).join('');

    const content = `
    <table style="width:100%; border-collapse: collapse; margin-top:20px;">
      <thead>
        <tr style="background-color:#1b365d; color:white;">
          <th>N°</th>
          <th>Matricule</th>
          <th>Nom</th>
          <th>Prénom</th>
          <th>Grade</th>
          <th>Service</th>
          <th>Entité</th>
          <th>Sexe</th>
        </tr>
      </thead>
      <tbody>${tableRows}</tbody>
    </table>
  `;

    printDocument(content, 'LISTE DES AGENTS', orientation);
  };


  const totalPages = Math.ceil(filteredAgents.length / itemsPerPage);
  const paginatedAgents = filteredAgents.slice((activePage - 1) * itemsPerPage, activePage * itemsPerPage);
  const totalAgents = agents.length;
  const maleCount = agents.filter(a => a.Sexe === 'M').length;
  const femaleCount = agents.filter(a => a.Sexe === 'F').length;
  const servicesList = [...new Set(agents.map(a => a.Service).filter(Boolean))];
  const gradeOptions = grades.map(grade => ({ value: grade.GradeID.toString(), label: grade.LibelleGrade }));

  if (loading) {
    return (
      <Center style={{ height: '50vh' }}>
        <Card withBorder radius="lg" p="xl">
          <Stack align="center" gap="md">
            <Loader size="xl" color="#1b365d" />
            <Text>Chargement des agents...</Text>
          </Stack>
        </Card>
      </Center>
    );
  }

  return (
    <Box p="md">
      <Container size="full">
        <Stack gap="lg">
          {/* Header */}
          <Card withBorder radius="md" p="sm" style={{ background: 'linear-gradient(135deg, #1b365d 0%, #2a4a7a 100%)' }}>
            <Group justify="space-between" align="center" gap="md">
              <Group gap="sm">
                <Avatar size={40} radius="md" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
                  <IconUser size={20} color="black" />
                </Avatar>
                <Box>
                  <Title order={3} c="white" size="h4">Gestion des Agents</Title>
                  <Text c="gray.3" size="xs">Gérez les informations des agents</Text>
                </Box>
              </Group>
              <Group gap="xs">
                <Badge size="sm" variant="white" color="blue">v2.0</Badge>
                <Button size="xs" variant="light" color="white" leftSection={<IconInfoCircle size={14} />} onClick={() => setInfoModalOpen(true)} radius="md">
                  Infos
                </Button>
              </Group>
            </Group>
          </Card>

          {/* Statistiques */}
          <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
            <Paper p="md" radius="lg" withBorder bg="#e8f4fd">
              <Group justify="space-between" mb="xs">
                <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Total Agents</Text>
                <ThemeIcon size="sm" radius="md" color="blue" variant="light"><IconUser size={18} /></ThemeIcon>
              </Group>
              <Text fw={800} size="xl" c="blue">{totalAgents}</Text>
              <Progress value={100} size="sm" radius="xl" color="blue" mt={8} />
            </Paper>
            <Paper p="md" radius="lg" withBorder bg="#e8f5e9">
              <Group justify="space-between" mb="xs">
                <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Hommes</Text>
                <ThemeIcon size="sm" radius="md" color="green" variant="light"><IconUser size={18} /></ThemeIcon>
              </Group>
              <Text fw={800} size="xl" c="green">{maleCount}</Text>
              <Progress value={totalAgents > 0 ? (maleCount / totalAgents) * 100 : 0} size="sm" radius="xl" color="green" mt={8} />
            </Paper>
            <Paper p="md" radius="lg" withBorder bg="#fce4ec">
              <Group justify="space-between" mb="xs">
                <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Femmes</Text>
                <ThemeIcon size="sm" radius="md" color="pink" variant="light"><IconUser size={18} /></ThemeIcon>
              </Group>
              <Text fw={800} size="xl" c="pink">{femaleCount}</Text>
              <Progress value={totalAgents > 0 ? (femaleCount / totalAgents) * 100 : 0} size="sm" radius="xl" color="pink" mt={8} />
            </Paper>
            <Paper p="md" radius="lg" withBorder bg="#f3e5f5">
              <Group justify="space-between" mb="xs">
                <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Services</Text>
                <ThemeIcon size="sm" radius="md" color="violet" variant="light"><IconBuilding size={18} /></ThemeIcon>
              </Group>
              <Text fw={800} size="xl" c="violet">{servicesList.length}</Text>
              <Progress value={100} size="sm" radius="xl" color="violet" mt={8} />
            </Paper>
          </SimpleGrid>

          {/* Barre d'actions */}
          <Card withBorder radius="md" shadow="none" p="xs">
            <Group justify="space-between" mb="xs">
              <Group gap="xs">
                <Text fw={600} size="sm">Liste des agents</Text>
                <Badge size="xs" variant="light">{filteredAgents.length}</Badge>
              </Group>
              <Group gap="xs">
                <Tooltip label="Actualiser"><ActionIcon onClick={loadAgents} variant="light" color="blue" size="sm"><IconRefresh size={14} /></ActionIcon></Tooltip>
                <Menu shadow="md" width={220}>
                  <Menu.Target>
                    <Button size="xs" leftSection={<IconDownload size={14} />} variant="outline" loading={exporting}>
                      Exporter/Importer
                    </Button>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Label>📤 Exporter</Menu.Label>
                    <Menu.Item leftSection={<IconFileExcel size={14} color="#00a84f" />} onClick={exportToExcel}>Excel (.xlsx)</Menu.Item>
                    <Menu.Item leftSection={<IconFile size={14} color="#e74c3c" />} onClick={exportToPDF}>PDF (.pdf)</Menu.Item>
                    <Menu.Item leftSection={<IconFileWord size={14} color="#2980b9" />} onClick={exportToWord}>Word (.doc)</Menu.Item>
                    <Menu.Item leftSection={<IconFile size={14} color="#2c3e50" />} onClick={exportToCSV}>CSV (.csv)</Menu.Item>
                    <Menu.Divider />
                    <Menu.Label>📥 Importer</Menu.Label>
                    <Menu.Item leftSection={<IconFileExcel size={14} color="#00a84f" />} onClick={downloadTemplate}>
                      Télécharger le modèle
                    </Menu.Item>
                    <Menu.Item leftSection={<IconUpload size={14} color="#27ae60" />} onClick={() => setImportModalOpen(true)}>
                      Importer depuis Excel
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>
                <Menu shadow="md" width={150}>
                  <Menu.Target>
                    <Tooltip label="Imprimer">
                      <ActionIcon variant="light" color="teal" size="sm">
                        <IconPrinter size={14} />
                      </ActionIcon>
                    </Tooltip>
                  </Menu.Target>

                  <Menu.Dropdown>
                    <Menu.Item onClick={() => handlePrint('portrait')}>
                      🧾 Portrait
                    </Menu.Item>

                    <Menu.Item onClick={() => handlePrint('landscape')}>
                      📄 Paysage
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>
                <Button size="xs" leftSection={<IconPlus size={14} />} onClick={() => { setEditingId(null); form.reset(); setPhotoPreview(null); setPhotoBase64(''); setModalOpen(true); }} variant="gradient" gradient={{ from: '#1b365d', to: '#2a4a7a' }}>
                  Nouvel Agent
                </Button>
              </Group>
            </Group>

            {/* Filtres */}
            <Grid>
              <Grid.Col span={{ base: 12, sm: 4, md: 3 }}>
                <TextInput size="xs" placeholder="Rechercher..." leftSection={<IconSearch size={12} />} value={searchTerm} onChange={(e) => { setSearchTerm(e.currentTarget.value); setActivePage(1); }} />
              </Grid.Col>
              <Grid.Col span={{ base: 6, sm: 2, md: 2 }}>
                <Select size="xs" placeholder="Sexe" value={selectedSexe} onChange={(val) => setSelectedSexe(val as string | null)} clearable data={[{ value: 'M', label: 'M' }, { value: 'F', label: 'F' }]} />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 4, md: 4 }}>
                <Autocomplete size="xs" placeholder="Service" value={selectedService || ''} onChange={(val) => setSelectedService(val || null)} data={servicesList.filter(s => s !== undefined && s !== null)} clearable />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 4, md: 3 }}>
                <Select size="xs" placeholder="Entité" value={selectedEntite} onChange={(val) => setSelectedEntite(val as string | null)} clearable data={entiteOptions.map(e => ({ value: e, label: e }))} searchable />
              </Grid.Col>
            </Grid>
          </Card>

          {/* Tableau */}
          <Card withBorder radius="lg" shadow="sm" p={0}>
            <ScrollArea style={{ maxHeight: 500 }}>
              <Table striped highlightOnHover>
                <Table.Thead bg="#1b365d">
                  <Table.Tr>
                    <Table.Th c="white" fw={600}>Matricule</Table.Th>
                    <Table.Th c="white" fw={600}>Agent</Table.Th>
                    <Table.Th c="white" fw={600}>Grade</Table.Th>
                    <Table.Th c="white" fw={600}>Service</Table.Th>
                    <Table.Th c="white" fw={600}>Entité</Table.Th>
                    <Table.Th c="white" fw={600}>Sexe</Table.Th>
                    <Table.Th c="white" fw={600} ta="center">Actions</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {paginatedAgents.map((agent) => (
                    <Table.Tr key={agent.PersonnelID}>
                      <Table.Td><Group gap="xs"><IconId size={14} color="gray" /><Text fw={500}>{agent.Matricule}</Text></Group></Table.Td>
                      <Table.Td><Group gap="sm"><Avatar radius="xl" size="sm" color={agent.Sexe === 'M' ? 'blue' : 'pink'}>{agent.Nom?.charAt(0)}{agent.Prenom?.charAt(0)}</Avatar><Text fw={500}>{agent.Nom} {agent.Prenom}</Text></Group></Table.Td>
                      <Table.Td><Badge variant="light" color="cyan" size="sm">{getGradeLibelle(agent.GradeID)}</Badge></Table.Td>
                      <Table.Td><Text size="sm">{agent.Service || '—'}</Text></Table.Td>
                      <Table.Td><Text size="sm">{agent.Entite || '—'}</Text></Table.Td>
                      <Table.Td><Badge color={agent.Sexe === 'M' ? 'blue' : 'pink'} variant="light" size="sm">{agent.Sexe === 'M' ? 'Masculin' : agent.Sexe === 'F' ? 'Féminin' : '—'}</Badge></Table.Td>
                      <Table.Td>
                        <Group gap="xs" justify="center">
                          <Tooltip label="Voir détails"><ActionIcon onClick={() => handleView(agent)} color="green" variant="subtle"><IconEye size={16} /></ActionIcon></Tooltip>
                          <Tooltip label="Modifier"><ActionIcon onClick={() => handleEdit(agent)} color="blue" variant="subtle"><IconEdit size={16} /></ActionIcon></Tooltip>
                          <Tooltip label="Supprimer"><ActionIcon onClick={() => { setAgentToDelete(agent.PersonnelID); setDeleteModalOpen(true); }} color="red" variant="subtle"><IconTrash size={16} /></ActionIcon></Tooltip>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </ScrollArea>
            {paginatedAgents.length === 0 && (
              <Center py="xl">
                <Stack align="center">
                  <IconUser size={48} color="gray" />
                  <Text c="dimmed" size="md">Aucun agent trouvé</Text>
                  <Button variant="light" onClick={() => { setSearchTerm(''); setSelectedSexe(null); setSelectedService(null); setSelectedEntite(null); }}>Réinitialiser les filtres</Button>
                </Stack>
              </Center>
            )}
          </Card>

          {/* Pagination */}
          {totalPages > 1 && (
            <Card withBorder radius="lg" shadow="sm" p="md" mt="md" style={{ backgroundColor: '#f8f9fa' }}>
              <Group justify="space-between" align="center" wrap="wrap" gap="md">
                <Text size="sm" c="dimmed">Affichage de {(activePage - 1) * itemsPerPage + 1} à {Math.min(activePage * itemsPerPage, filteredAgents.length)} sur {filteredAgents.length} agent(s)</Text>
                <Group gap="xs">
                  <Tooltip label="Première page"><ActionIcon variant="default" onClick={() => setActivePage(1)} disabled={activePage === 1} size="md">«</ActionIcon></Tooltip>
                  <Tooltip label="Page précédente"><ActionIcon variant="default" onClick={() => setActivePage(prev => Math.max(1, prev - 1))} disabled={activePage === 1} size="md">‹</ActionIcon></Tooltip>
                  <Select value={activePage.toString()} onChange={(val) => setActivePage(parseInt(val || '1'))} data={Array.from({ length: Math.min(totalPages, 50) }, (_, i) => ({ value: (i + 1).toString(), label: `Page ${i + 1}` }))} style={{ width: 100 }} size="sm" />
                  <Tooltip label="Page suivante"><ActionIcon variant="default" onClick={() => setActivePage(prev => Math.min(totalPages, prev + 1))} disabled={activePage === totalPages} size="md">›</ActionIcon></Tooltip>
                  <Tooltip label="Dernière page"><ActionIcon variant="default" onClick={() => setActivePage(totalPages)} disabled={activePage === totalPages} size="md">»</ActionIcon></Tooltip>
                </Group>
                <Select label="Lignes par page" value={itemsPerPage.toString()} onChange={(val) => { setItemsPerPage(parseInt(val || '10')); setActivePage(1); }} data={[{ value: '10', label: '10 lignes' }, { value: '25', label: '25 lignes' }, { value: '50', label: '50 lignes' }, { value: '100', label: '100 lignes' }]} size="sm" style={{ width: 130 }} />
              </Group>
            </Card>
          )}
        </Stack>
      </Container>

      {/* Modal Import */}
      <Modal opened={importModalOpen} onClose={() => { setImportModalOpen(false); setImportFile(null); setImportPreview([]); setImportResult(null); setImportError(null); }} title="Importer des agents" size="lg" centered>
        <Stack gap="md">
          <Card withBorder p="md" bg="gray.0">
            <Group justify="space-between">
              <div>
                <Text fw={600} size="sm">Format attendu</Text>
                <Text size="xs" c="dimmed">Colonnes: Matricule, Nom, Prénom, Grade, Service, Entité, Sexe, Clé</Text>
              </div>
              <Button size="xs" variant="light" leftSection={<IconDownload size={14} />} onClick={downloadTemplate}>
                Télécharger le modèle
              </Button>
            </Group>
          </Card>
          <Divider label="Fichier Excel" labelPosition="center" />
          <div style={{ border: '2px dashed #ced4da', borderRadius: '8px', padding: '30px', textAlign: 'center', cursor: 'pointer', backgroundColor: '#f8f9fa' }} onClick={() => document.getElementById('import-file-input')?.click()}>
            <IconFileExcel size={40} color="#2ecc71" />
            <Text size="sm" mt="sm">{importFile ? importFile.name : 'Cliquez pour sélectionner un fichier Excel'}</Text>
            <Text size="xs" c="dimmed">Formats acceptés: .xlsx, .xls</Text>
            <input id="import-file-input" type="file" accept=".xlsx,.xls" onChange={(e) => handleFileUpload(e.target.files?.[0] || null)} style={{ display: 'none' }} />
          </div>
          {importPreview.length > 0 && (
            <Paper withBorder p="xs" radius="md">
              <Group justify="space-between" mb="xs">
                <Text fw={600} size="sm">Aperçu ({importPreview.length} lignes)</Text>
                <Badge size="sm" variant="light" color="blue">Total: {importPreview.length} lignes</Badge>
              </Group>
              <ScrollArea style={{ maxHeight: 200 }}>
                <Table striped>
                  <Table.Thead><Table.Tr>{Object.keys(importPreview[0] || {}).map(key => <Table.Th key={key}>{key}</Table.Th>)}</Table.Tr></Table.Thead>
                  <Table.Tbody>{importPreview.map((row, idx) => (<Table.Tr key={idx}>{Object.values(row).map((val: any, i) => (<Table.Td key={i}>{String(val)}</Table.Td>))}</Table.Tr>))}</Table.Tbody>
                </Table>
              </ScrollArea>
            </Paper>
          )}
          {importError && <Alert icon={<IconAlertCircle size={16} />} color="red" title="Erreur">{importError}</Alert>}
          {importResult && (
            <Alert icon={importResult.errors.length === 0 ? <IconCheck size={16} /> : <IconAlertCircle size={16} />} color={importResult.errors.length === 0 ? 'green' : 'orange'} title={importResult.errors.length === 0 ? 'Import réussi' : 'Import partiel'}>
              <Text>✅ {importResult.success} agents importés</Text>
              {importResult.errors.length > 0 && (
                <>
                  <Divider my="xs" />
                  <Text fw={600}>⚠️ {importResult.errors.length} erreurs :</Text>
                  <ScrollArea style={{ maxHeight: 150 }} mt="xs">
                    {importResult.errors.map((err, idx) => <Text key={idx} size="xs" c="red">• {err}</Text>)}
                  </ScrollArea>
                </>
              )}
            </Alert>
          )}
          <Group justify="flex-end">
            <Button variant="light" onClick={() => { setImportModalOpen(false); setImportFile(null); setImportPreview([]); setImportResult(null); setImportError(null); }}>Annuler</Button>
            <Button onClick={handleImport} loading={importing} leftSection={<IconUpload size={16} />} variant="gradient" gradient={{ from: 'blue', to: 'cyan' }} disabled={!importFile}>
              Importer
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Modal Nouvel agent / Modification */}
      <Modal opened={modalOpen} onClose={() => { setModalOpen(false); form.reset(); setPhotoPreview(null); setPhotoBase64(''); }} title={editingId ? "Modifier l'Agent" : "Nouvel Agent"} size="lg" centered>
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="md">
            <Grid>
              <Grid.Col span={6}><TextInput label="Matricule" placeholder="Ex: POL-2024-001" {...form.getInputProps('Matricule')} required /></Grid.Col>
              <Grid.Col span={6}><TextInput label="Clé" placeholder="Clé d'identification" {...form.getInputProps('Cle')} /></Grid.Col>
            </Grid>
            <Grid>
              <Grid.Col span={6}><TextInput label="Nom" {...form.getInputProps('Nom')} required /></Grid.Col>
              <Grid.Col span={6}><TextInput label="Prénom" {...form.getInputProps('Prenom')} required /></Grid.Col>
            </Grid>
            <Grid>
              <Grid.Col span={10}><Select label="Grade" data={gradeOptions} searchable clearable {...form.getInputProps('GradeID')} /></Grid.Col>
              <Grid.Col span={2}><Select label="Sexe" data={[{ value: 'M', label: 'M' }, { value: 'F', label: 'F' }]} {...form.getInputProps('Sexe')} /></Grid.Col>
            </Grid>
            <Grid>
              <Grid.Col span={8}>
                <Autocomplete label="Service" data={serviceOptions} value={form.values.Service} onChange={(value) => form.setFieldValue('Service', value)} limit={10} />
                <Text size="xs" c="dimmed" mt={4}>💡 Saisissez librement ou choisissez parmi les services existants</Text>
              </Grid.Col>
              <Grid.Col span={4}><Select label="Entité" data={entiteOptions.map(e => ({ value: e, label: e }))} searchable clearable {...form.getInputProps('Entite')} /></Grid.Col>
            </Grid>
            <Divider label="Photo de l'agent" labelPosition="center" />
            <Group align="flex-start">
              <Avatar size={100} radius="md" src={photoPreview || undefined} color="blue">{!photoPreview && <IconUser size={40} />}</Avatar>
              <Stack style={{ flex: 1 }}>
                <FileButton onChange={handlePhotoUpload} accept="image/png,image/jpeg,image/jpg,image/gif,image/webp">
                  {(props) => <Button {...props} variant="light" fullWidth>{photoPreview ? 'Changer la photo' : 'Choisir une photo'}</Button>}
                </FileButton>
                <Text size="xs" c="dimmed" ta="center">Formats: PNG, JPEG, JPG, GIF, WEBP<br />Taille max: 2 Mo</Text>
                {photoBase64 && <Button variant="subtle" color="red" size="xs" fullWidth onClick={() => { setPhotoBase64(''); setPhotoPreview(null); form.setFieldValue('Photo', ''); }}>Supprimer la photo</Button>}
              </Stack>
            </Group>
            <Group justify="flex-end" mt="md">
              <Button variant="light" onClick={() => setModalOpen(false)}>Annuler</Button>
              <Button type="submit" color="blue">{editingId ? 'Modifier' : 'Créer'}</Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* Modal Visualisation */}
      <Modal opened={viewModalOpen} onClose={() => setViewModalOpen(false)} title="Détails de l'Agent" size="md" centered>
        {selectedAgent && (
          <Stack>
            <Group justify="center"><Avatar size={100} radius={100} src={selectedAgent.Photo || undefined} color={selectedAgent.Sexe === 'M' ? 'blue' : 'pink'}>{!selectedAgent.Photo && <IconUser size={50} />}</Avatar></Group>
            <Divider />
            <Grid>
              <Grid.Col span={6}><Text size="xs" c="dimmed">Matricule</Text><Text fw={600}>{selectedAgent.Matricule}</Text></Grid.Col>
              <Grid.Col span={6}><Text size="xs" c="dimmed">Clé</Text><Text fw={600}>{selectedAgent.Cle || '-'}</Text></Grid.Col>
              <Grid.Col span={12}><Text size="xs" c="dimmed">Nom complet</Text><Text fw={600}>{selectedAgent.Nom} {selectedAgent.Prenom}</Text></Grid.Col>
              <Grid.Col span={6}><Text size="xs" c="dimmed">Grade</Text><Badge color="cyan">{getGradeLibelle(selectedAgent.GradeID)}</Badge></Grid.Col>
              <Grid.Col span={6}><Text size="xs" c="dimmed">Sexe</Text><Badge color={selectedAgent.Sexe === 'M' ? 'blue' : 'pink'}>{selectedAgent.Sexe === 'M' ? 'Masculin' : selectedAgent.Sexe === 'F' ? 'Féminin' : '-'}</Badge></Grid.Col>
              <Grid.Col span={6}><Text size="xs" c="dimmed">Service</Text><Text>{selectedAgent.Service || '-'}</Text></Grid.Col>
              <Grid.Col span={6}><Text size="xs" c="dimmed">Entité</Text><Text>{selectedAgent.Entite || '-'}</Text></Grid.Col>
            </Grid>
          </Stack>
        )}
      </Modal>

      {/* Modal Suppression */}
      <Modal opened={deleteModalOpen} onClose={() => { setDeleteModalOpen(false); setAgentToDelete(null); }} title="Confirmation" size="sm" centered>
        <Stack>
          <Alert color="red" variant="light" icon={<IconInfoCircle size={16} />}>Êtes-vous sûr de vouloir supprimer cet agent ?</Alert>
          <Text size="sm" c="dimmed" ta="center">Cette action est irréversible.</Text>
          <Group justify="space-between">
            <Button variant="light" onClick={() => { setDeleteModalOpen(false); setAgentToDelete(null); }}>Annuler</Button>
            <Button color="red" onClick={handleDelete}>Supprimer</Button>
          </Group>
        </Stack>
      </Modal>

      {/* Modal Instructions */}
      <Modal opened={infoModalOpen} onClose={() => setInfoModalOpen(false)} title="Instructions" size="md" centered>
        <Stack>
          <Text size="sm">1️⃣ Renseignez les informations personnelles de l'agent</Text>
          <Text size="sm">2️⃣ Sélectionnez le grade et le sexe</Text>
          <Text size="sm">3️⃣ Choisissez ou saisissez le service</Text>
          <Text size="sm">4️⃣ Sélectionnez l'entité d'affectation</Text>
          <Text size="sm">5️⃣ Ajoutez une photo si besoin (optionnel)</Text>
          <Text size="sm">6️⃣ Exportez la liste au format Excel, PDF, Word ou CSV</Text>
          <Text size="sm">7️⃣ Importez des agents depuis un fichier Excel (modèle disponible)</Text>
          <Divider />
          <Text size="xs" c="dimmed" ta="center">Version 2.0.0 - Suivi Dossiers</Text>
        </Stack>
      </Modal>
    </Box>
  );
}