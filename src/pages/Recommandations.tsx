import { useEffect, useState } from 'react';
import {
  Table, Button, Modal, TextInput, Stack, Title, Card,
  Group, ActionIcon, Select, Textarea, Grid, Badge,
  Avatar, Text, Divider, Loader, Pagination, Tooltip,
  Box, Container, SimpleGrid, Paper, ThemeIcon,
  ScrollArea, Center, Alert, Menu, Progress
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { 
  IconEdit, 
  IconPlus, 
  IconCheck, 
  IconSearch, 
  IconListCheck, 
  IconUser, 
  IconRefresh, 
  IconDownload, 
  IconPrinter,
  IconFileExcel, 
  IconFile, 
  IconFileWord,
  IconInfoCircle, 
  IconX, 
  IconClock, 
  IconAlertCircle,
  IconTrash
} from '@tabler/icons-react';
import { invoke } from '@tauri-apps/api/core';
import { notifications } from '@mantine/notifications';
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Recommandation {
  RecommandationID: number;
  Services?: string;
  Source?: string;
  RapportID: number;
  ProblemeFaiblesse?: string;
  NumeroRecommandation?: string;
  TexteRecommandation: string;
  ResponsableMiseEnOeuvre?: string;
  ActeursImpliques?: string;
  InstanceValidation?: string;
  Echeance?: string;
  Domaine?: string;
  NiveauMiseEnOeuvre?: string;
  DateDebut?: string;
  DateFin?: string;
  MesuresCorrectives?: string;
  ObservationDelai?: string;
  ObservationMiseEnOeuvre?: string;
  AppreciationControle?: string;
  NumeroRapport?: string;
  LibelleRapport?: string;
}

interface Rapport {
  RapportID: number;
  NumeroRapport: string;
  LibelleRapport: string;
}

export default function Recommandations() {
  const [recommandations, setRecommandations] = useState<Recommandation[]>([]);
  const [rapports, setRapports] = useState<Rapport[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [suiviModalOpen, setSuiviModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedRecommandation, setSelectedRecommandation] = useState<Recommandation | null>(null);
  const [recommandationToDelete, setRecommandationToDelete] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatut, setFilterStatut] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activePage, setActivePage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const itemsPerPage = 10;

  const form = useForm({
    initialValues: {
      Services: '',
      Source: '',
      RapportID: '',
      ProblemeFaiblesse: '',
      NumeroRecommandation: '',
      TexteRecommandation: '',
      ResponsableMiseEnOeuvre: '',
      ActeursImpliques: '',
      InstanceValidation: '',
      Echeance: null as Date | null,
      Domaine: '',
    },
    validate: {
      RapportID: (value) => (value ? null : 'Le rapport est requis'),
      TexteRecommandation: (value) => (value ? null : 'Le texte de la recommandation est requis'),
    },
  });

  const suiviForm = useForm({
    initialValues: {
      NiveauMiseEnOeuvre: 'Non commencé',
      DateDebut: null as Date | null,
      DateFin: null as Date | null,
      MesuresCorrectives: '',
      ObservationDelai: '',
      ObservationMiseEnOeuvre: '',
      AppreciationControle: '',
      ReferenceJustificatif: '',
    },
  });

  useEffect(() => {
    loadRecommandations();
    loadRapports();
  }, []);

  const loadRecommandations = async () => {
    setLoading(true);
    try {
      const result = await invoke('get_recommandations');
      setRecommandations(result as Recommandation[]);
    } catch (error) {
      notifications.show({ title: 'Erreur', message: 'Impossible de charger les recommandations', color: 'red', icon: <IconX size={16} /> });
    } finally {
      setLoading(false);
    }
  };

  const loadRapports = async () => {
    try {
      const result = await invoke('get_rapports');
      setRapports(result as Rapport[]);
    } catch (error) {
      console.error('Erreur chargement rapports:', error);
    }
  };

  const handleSubmit = async (values: typeof form.values) => {
    try {
      const recommandationData = {
        ...values,
        RapportID: parseInt(values.RapportID),
        Echeance: values.Echeance ? dayjs(values.Echeance).format('YYYY-MM-DD') : null,
        RecommandationID: editingId,
      };

      if (editingId) {
        await invoke('update_recommandation', { recommandation: recommandationData });
        notifications.show({ title: 'Succès', message: 'Recommandation modifiée', color: 'green', icon: <IconCheck size={16} /> });
      } else {
        await invoke('create_recommandation', { recommandation: recommandationData });
        notifications.show({ title: 'Succès', message: 'Recommandation créée', color: 'green', icon: <IconCheck size={16} /> });
      }
      
      setModalOpen(false);
      form.reset();
      setEditingId(null);
      loadRecommandations();
    } catch (error) {
      notifications.show({ title: 'Erreur', message: `Erreur: ${error}`, color: 'red', icon: <IconX size={16} /> });
    }
  };

  const handleUpdateSuivi = async () => {
    if (!selectedRecommandation) return;
    
    try {
      const suiviData = {
        ...suiviForm.values,
        RecommandationID: selectedRecommandation.RecommandationID,
        DateDebut: suiviForm.values.DateDebut ? dayjs(suiviForm.values.DateDebut).format('YYYY-MM-DD') : null,
        DateFin: suiviForm.values.DateFin ? dayjs(suiviForm.values.DateFin).format('YYYY-MM-DD') : null,
      };

      await invoke('update_suivi_recommandation', { suivi: suiviData });
      notifications.show({ title: 'Succès', message: 'Suivi mis à jour', color: 'green', icon: <IconCheck size={16} /> });
      setSuiviModalOpen(false);
      loadRecommandations();
    } catch (error) {
      notifications.show({ title: 'Erreur', message: `Erreur: ${error}`, color: 'red', icon: <IconX size={16} /> });
    }
  };

  const handleDelete = async () => {
    if (!recommandationToDelete) return;
    try {
      await invoke('delete_recommandation', { id: recommandationToDelete });
      notifications.show({ title: 'Succès', message: 'Recommandation supprimée', color: 'green', icon: <IconCheck size={16} /> });
      setDeleteModalOpen(false);
      setRecommandationToDelete(null);
      loadRecommandations();
    } catch (error) {
      notifications.show({ title: 'Erreur', message: 'Impossible de supprimer', color: 'red', icon: <IconX size={16} /> });
    }
  };

  const openSuiviModal = (recommandation: Recommandation) => {
    setSelectedRecommandation(recommandation);
    suiviForm.setValues({
      NiveauMiseEnOeuvre: recommandation.NiveauMiseEnOeuvre || 'Non commencé',
      DateDebut: recommandation.DateDebut ? new Date(recommandation.DateDebut) : null,
      DateFin: recommandation.DateFin ? new Date(recommandation.DateFin) : null,
      MesuresCorrectives: recommandation.MesuresCorrectives || '',
      ObservationDelai: recommandation.ObservationDelai || '',
      ObservationMiseEnOeuvre: recommandation.ObservationMiseEnOeuvre || '',
      AppreciationControle: recommandation.AppreciationControle || '',
      ReferenceJustificatif: '',
    });
    setSuiviModalOpen(true);
  };

  const handleView = (recommandation: Recommandation) => {
    setSelectedRecommandation(recommandation);
    setViewModalOpen(true);
  };

  const getNiveauColor = (niveau?: string) => {
    switch(niveau) {
      case 'Réalisée': return 'green';
      case 'En cours': return 'blue';
      case 'Partiellement réalisée': return 'yellow';
      case 'Non commencé': return 'gray';
      case 'Abandonnée': return 'red';
      default: return 'gray';
    }
  };

  const getEcheanceStatus = (echeance?: string) => {
    if (!echeance) return null;
    const today = dayjs();
    const echeanceDate = dayjs(echeance);
    if (echeanceDate.isBefore(today)) return <Badge color="red" size="sm">Dépassée</Badge>;
    if (echeanceDate.diff(today, 'day') <= 7) return <Badge color="orange" size="sm">Proche échéance</Badge>;
    return <Badge color="green" size="sm">Dans les délais</Badge>;
  };

  const getTauxRealisation = () => {
    const total = recommandations.length;
    if (total === 0) return 0;
    const realisees = recommandations.filter(r => r.NiveauMiseEnOeuvre === 'Réalisée').length;
    return (realisees / total) * 100;
  };

  // Export EXCEL
  const exportToExcel = async () => {
    try {
      setExporting(true);
      const filePath = await save({
        title: "Exporter la liste des recommandations",
        filters: [{ name: 'Excel', extensions: ['xlsx'] }],
        defaultPath: `recommandations_${dayjs().format('YYYY-MM-DD_HH-mm')}.xlsx`
      });
      if (!filePath) { setExporting(false); return; }

      const data = filteredRecommandations.map(rec => ({
        'ID': rec.RecommandationID,
        'Numéro': rec.NumeroRecommandation || '',
        'Texte': rec.TexteRecommandation,
        'Rapport': rec.NumeroRapport,
        'Responsable': rec.ResponsableMiseEnOeuvre || '',
        'Échéance': rec.Echeance ? dayjs(rec.Echeance).format('DD/MM/YYYY') : '',
        'Statut': rec.NiveauMiseEnOeuvre || 'Non commencé',
        'Domaine': rec.Domaine || '',
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      ws['!cols'] = [{ wch: 8 }, { wch: 15 }, { wch: 50 }, { wch: 20 }, { wch: 25 }, { wch: 12 }, { wch: 15 }, { wch: 15 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Recommandations');
      await writeFile(filePath, new Uint8Array(XLSX.write(wb, { type: 'array', bookType: 'xlsx' })));
      notifications.show({ title: 'Succès', message: 'Export Excel réussi !', color: 'green', icon: <IconCheck size={16} /> });
    } catch (error) {
      notifications.show({ title: 'Erreur', message: 'Erreur lors de l\'export', color: 'red', icon: <IconX size={16} /> });
    } finally {
      setExporting(false);
    }
  };

  // Export PDF
  const exportToPDF = async () => {
    try {
      setExporting(true);
      const filePath = await save({
        title: "Exporter la liste des recommandations en PDF",
        filters: [{ name: 'PDF', extensions: ['pdf'] }],
        defaultPath: `recommandations_${dayjs().format('YYYY-MM-DD_HH-mm')}.pdf`
      });
      if (!filePath) { setExporting(false); return; }

      const doc = new jsPDF('landscape', 'mm', 'a4');
      doc.setFillColor(27, 54, 93);
      doc.rect(0, 0, 297, 40, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.text('LISTE DES RECOMMANDATIONS', 148.5, 20, { align: 'center' });
      doc.setFontSize(10);
      doc.text(`Généré le : ${dayjs().format('DD/MM/YYYY HH:mm')}`, 148.5, 32, { align: 'center' });
      doc.setTextColor(0, 0, 0);
      doc.text(`Total recommandations : ${filteredRecommandations.length}`, 14, 50);
      doc.text(`Taux de réalisation : ${getTauxRealisation().toFixed(1)}%`, 14, 57);

      const head = ['N°', 'Numéro', 'Recommandation', 'Rapport', 'Responsable', 'Échéance', 'Statut'];
      const body = filteredRecommandations.map((rec, idx) => [
        (idx + 1).toString(),
        rec.NumeroRecommandation || '',
        rec.TexteRecommandation.substring(0, 80),
        rec.NumeroRapport || '',
        rec.ResponsableMiseEnOeuvre || '',
        rec.Echeance ? dayjs(rec.Echeance).format('DD/MM/YYYY') : '',
        rec.NiveauMiseEnOeuvre || 'Non commencé'
      ]);

      autoTable(doc, {
        head: [head],
        body: body as any[],
        startY: 65,
        theme: 'striped',
        headStyles: { fillColor: [27, 54, 93], textColor: 255, fontStyle: 'bold', halign: 'center' },
        styles: { fontSize: 8, cellPadding: 2 }
      });

      await writeFile(filePath, new Uint8Array(doc.output('arraybuffer')));
      notifications.show({ title: 'Succès', message: 'Export PDF réussi !', color: 'green', icon: <IconCheck size={16} /> });
    } catch (error) {
      notifications.show({ title: 'Erreur', message: 'Erreur lors de l\'export', color: 'red', icon: <IconX size={16} /> });
    } finally {
      setExporting(false);
    }
  };

  // Export Word
  const exportToWord = async () => {
    try {
      setExporting(true);
      const filePath = await save({
        title: "Exporter la liste des recommandations en Word",
        filters: [{ name: 'Word Document', extensions: ['doc'] }],
        defaultPath: `recommandations_${dayjs().format('YYYY-MM-DD_HH-mm')}.doc`
      });
      if (!filePath) { setExporting(false); return; }

      const rows = filteredRecommandations.map((rec, idx) => `
        <tr>
          <td style="border:1px solid #ddd;padding:8px;text-align:center">${idx + 1}</td>
          <td style="border:1px solid #ddd;padding:8px"><strong>${rec.NumeroRecommandation || rec.RecommandationID}</strong></td>
          <td style="border:1px solid #ddd;padding:8px">${rec.TexteRecommandation.substring(0, 100)}...</td>
          <td style="border:1px solid #ddd;padding:8px">${rec.NumeroRapport || '-'}</td>
          <td style="border:1px solid #ddd;padding:8px">${rec.ResponsableMiseEnOeuvre || '-'}</td>
          <td style="border:1px solid #ddd;padding:8px">${rec.Echeance ? dayjs(rec.Echeance).format('DD/MM/YYYY') : '-'}</td>
          <td style="border:1px solid #ddd;padding:8px">${rec.NiveauMiseEnOeuvre || 'Non commencé'}</td>
        </tr>
      `).join('');

      const htmlContent = `<!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"><title>Liste des recommandations</title>
      <style>
        body { font-family: 'Calibri', Arial, sans-serif; margin: 40px; }
        h1 { color: #1b365d; border-bottom: 3px solid #1b365d; padding-bottom: 10px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th { background-color: #1b365d; color: white; padding: 10px; border: 1px solid #ddd; }
        td { padding: 8px; border: 1px solid #ddd; }
        tr:nth-child(even) { background-color: #f9f9f9; }
      </style>
      </head>
      <body>
        <h1>📋 LISTE DES RECOMMANDATIONS</h1>
        <p>Généré le ${dayjs().format('DD/MM/YYYY HH:mm')}</p>
        <p>Total recommandations : ${filteredRecommandations.length}</p>
        <table><thead><tr><th>N°</th><th>Numéro</th><th>Recommandation</th><th>Rapport</th><th>Responsable</th><th>Échéance</th><th>Statut</th></tr></thead><tbody>${rows}</tbody></table>
      </body>
      </html>`;

      await writeFile(filePath, new TextEncoder().encode(htmlContent));
      notifications.show({ title: 'Succès', message: 'Export Word réussi !', color: 'green', icon: <IconCheck size={16} /> });
    } catch (error) {
      notifications.show({ title: 'Erreur', message: 'Erreur lors de l\'export', color: 'red', icon: <IconX size={16} /> });
    } finally {
      setExporting(false);
    }
  };

  // Impression
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      notifications.show({ title: 'Erreur', message: 'Veuillez autoriser les popups', color: 'red', icon: <IconX size={16} /> });
      return;
    }

    const rows = filteredRecommandations.map((rec, idx) => `
      <tr>
        <td style="border:1px solid #ddd;padding:8px;text-align:center">${idx + 1}</td>
        <td style="border:1px solid #ddd;padding:8px">${rec.NumeroRecommandation || rec.RecommandationID}</td>
        <td style="border:1px solid #ddd;padding:8px">${rec.TexteRecommandation.substring(0, 80)}...</td>
        <td style="border:1px solid #ddd;padding:8px">${rec.NumeroRapport || '-'}</td>
        <td style="border:1px solid #ddd;padding:8px">${rec.ResponsableMiseEnOeuvre || '-'}</td>
        <td style="border:1px solid #ddd;padding:8px">${rec.Echeance ? dayjs(rec.Echeance).format('DD/MM/YYYY') : '-'}</td>
        <td style="border:1px solid #ddd;padding:8px">${rec.NiveauMiseEnOeuvre || 'Non commencé'}</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"><title>Liste des recommandations</title>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; }
        h1 { color: #1b365d; border-bottom: 3px solid #1b365d; padding-bottom: 10px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th { background: #1b365d; color: white; padding: 10px; border: 1px solid #2a4a7a; }
        td { padding: 8px; border: 1px solid #ddd; }
        tr:nth-child(even) { background: #f9f9f9; }
        @media print { body { padding: 0; margin: 0; } }
      </style>
      </head>
      <body>
        <h1>📋 LISTE DES RECOMMANDATIONS</h1>
        <p>Généré le ${dayjs().format('DD/MM/YYYY HH:mm')}</p>
        <p>Total recommandations : ${filteredRecommandations.length}</p>
        <p>Taux de réalisation : ${getTauxRealisation().toFixed(1)}%</p>
        <table><thead><tr><th>N°</th><th>Numéro</th><th>Recommandation</th><th>Rapport</th><th>Responsable</th><th>Échéance</th><th>Statut</th></tr></thead><tbody>${rows}</tbody></table>
        <script>window.onload = () => { window.print(); window.close(); };</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Filtrage des recommandations
  const filteredRecommandations = recommandations.filter(rec => {
    const matchesSearch = rec.TexteRecommandation.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (rec.NumeroRecommandation && rec.NumeroRecommandation.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatut = !filterStatut || rec.NiveauMiseEnOeuvre === filterStatut;
    return matchesSearch && matchesStatut;
  });

  const totalPages = Math.ceil(filteredRecommandations.length / itemsPerPage);
  const paginatedRecommandations = filteredRecommandations.slice(
    (activePage - 1) * itemsPerPage,
    activePage * itemsPerPage
  );

  const totalRecommandations = recommandations.length;
  const realisees = recommandations.filter(r => r.NiveauMiseEnOeuvre === 'Réalisée').length;
  const enCours = recommandations.filter(r => r.NiveauMiseEnOeuvre === 'En cours').length;
  const nonRealisees = recommandations.filter(r => r.NiveauMiseEnOeuvre === 'Non commencé' || r.NiveauMiseEnOeuvre === 'Abandonnée').length;
  const tauxRealisation = getTauxRealisation();

  const rapportOptions = rapports.map(rapport => ({
    value: rapport.RapportID.toString(),
    label: `${rapport.NumeroRapport} - ${rapport.LibelleRapport}`
  }));

  const statutOptions = [
    { value: 'Réalisée', label: 'Réalisée' },
    { value: 'En cours', label: 'En cours' },
    { value: 'Partiellement réalisée', label: 'Partiellement réalisée' },
    { value: 'Non commencé', label: 'Non commencé' },
    { value: 'Abandonnée', label: 'Abandonnée' }
  ];

  if (loading) {
    return (
      <Center style={{ height: '50vh' }}>
        <Card withBorder radius="lg" p="xl">
          <Stack align="center" gap="md">
            <Loader size="xl" color="#1b365d" />
            <Text>Chargement des recommandations...</Text>
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
          <Card withBorder radius="lg" p="xl" style={{ background: 'linear-gradient(135deg, #1b365d 0%, #2a4a7a 100%)' }}>
            <Group justify="space-between" align="center">
              <Group gap="md">
                <Avatar size={60} radius="md" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
                  <IconListCheck size={30} color="white" />
                </Avatar>
                <Box>
                  <Title order={1} c="white" size="h2">Gestion des Recommandations</Title>
                  <Text c="gray.3" size="sm">Suivez et gérez les recommandations issues des inspections</Text>
                  <Group gap="xs" mt={8}>
                    <Badge size="sm" variant="white" color="blue">BD-SDI v2.0</Badge>
                    <Badge size="sm" variant="white" color="green">Actions correctives</Badge>
                  </Group>
                </Box>
              </Group>
              <Button variant="light" color="white" leftSection={<IconInfoCircle size={18} />} onClick={() => setInfoModalOpen(true)} radius="md">
                Instructions
              </Button>
            </Group>
          </Card>

          {/* Cartes Statistiques */}
          <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
            <Paper p="md" radius="lg" withBorder style={{ backgroundColor: '#e8f4fd' }}>
              <Group justify="space-between" mb="xs">
                <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Total</Text>
                <ThemeIcon size="lg" radius="md" color="blue" variant="light"><IconListCheck size={18} /></ThemeIcon>
              </Group>
              <Text fw={800} size="xl" c="blue">{totalRecommandations}</Text>
              <Progress value={100} size="sm" radius="xl" color="blue" mt={8} />
              <Text size="xs" c="dimmed" mt={4}>Recommandations</Text>
            </Paper>
            <Paper p="md" radius="lg" withBorder style={{ backgroundColor: '#e8f5e9' }}>
              <Group justify="space-between" mb="xs">
                <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Réalisées</Text>
                <ThemeIcon size="lg" radius="md" color="green" variant="light"><IconCheck size={18} /></ThemeIcon>
              </Group>
              <Text fw={800} size="xl" c="green">{realisees}</Text>
              <Progress value={totalRecommandations > 0 ? (realisees / totalRecommandations) * 100 : 0} size="sm" radius="xl" color="green" mt={8} />
              <Text size="xs" c="dimmed" mt={4}>Taux: {tauxRealisation.toFixed(1)}%</Text>
            </Paper>
            <Paper p="md" radius="lg" withBorder style={{ backgroundColor: '#fff3e0' }}>
              <Group justify="space-between" mb="xs">
                <Text size="xs" c="dimmed" tt="uppercase" fw={600}>En cours</Text>
                <ThemeIcon size="lg" radius="md" color="orange" variant="light"><IconClock size={18} /></ThemeIcon>
              </Group>
              <Text fw={800} size="xl" c="orange">{enCours}</Text>
              <Progress value={totalRecommandations > 0 ? (enCours / totalRecommandations) * 100 : 0} size="sm" radius="xl" color="orange" mt={8} />
              <Text size="xs" c="dimmed" mt={4}>En progression</Text>
            </Paper>
            <Paper p="md" radius="lg" withBorder style={{ backgroundColor: '#ffebee' }}>
              <Group justify="space-between" mb="xs">
                <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Non réalisées</Text>
                <ThemeIcon size="lg" radius="md" color="red" variant="light"><IconAlertCircle size={18} /></ThemeIcon>
              </Group>
              <Text fw={800} size="xl" c="red">{nonRealisees}</Text>
              <Progress value={totalRecommandations > 0 ? (nonRealisees / totalRecommandations) * 100 : 0} size="sm" radius="xl" color="red" mt={8} />
              <Text size="xs" c="dimmed" mt={4}>À traiter</Text>
            </Paper>
          </SimpleGrid>

          {/* Barre d'actions - le reste du code reste identique */}
          <Card withBorder radius="lg" shadow="sm" p="md">
            <Group justify="space-between" align="flex-end" mb="md">
              <Box>
                <Text fw={600} size="lg">Liste des recommandations</Text>
                <Text size="xs" c="dimmed">{filteredRecommandations.length} recommandation(s) trouvée(s)</Text>
              </Box>
              <Group>
                <Tooltip label="Actualiser">
                  <ActionIcon onClick={loadRecommandations} size="lg" variant="light" color="blue">
                    <IconRefresh size={18} />
                  </ActionIcon>
                </Tooltip>
                <Menu shadow="md" width={200} position="bottom-end">
                  <Menu.Target>
                    <Button leftSection={<IconDownload size={16} />} variant="outline" loading={exporting}>Exporter</Button>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Label>Format d'export</Menu.Label>
                    <Menu.Item leftSection={<IconFileExcel size={16} color="#00a84f" />} onClick={exportToExcel}>Excel (.xlsx)</Menu.Item>
                    <Menu.Item leftSection={<IconFile size={16} color="#e74c3c" />} onClick={exportToPDF}>PDF (.pdf)</Menu.Item>
                    <Menu.Item leftSection={<IconFileWord size={16} color="#2980b9" />} onClick={exportToWord}>Word (.doc)</Menu.Item>
                  </Menu.Dropdown>
                </Menu>
                <Tooltip label="Imprimer">
                  <ActionIcon onClick={handlePrint} size="lg" variant="light" color="teal">
                    <IconPrinter size={18} />
                  </ActionIcon>
                </Tooltip>
                <Button leftSection={<IconPlus size={16} />} onClick={() => { setEditingId(null); form.reset(); setModalOpen(true); }} variant="gradient" gradient={{ from: '#1b365d', to: '#2a4a7a' }}>
                  Nouvelle Recommandation
                </Button>
              </Group>
            </Group>

            <Divider my="md" />

            {/* Filtres */}
            <Grid>
              <Grid.Col span={{ base: 12, md: 6 }}>
                <TextInput
                  placeholder="Rechercher par numéro ou texte..."
                  leftSection={<IconSearch size={16} />}
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.currentTarget.value); setActivePage(1); }}
                  size="sm"
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, md: 4 }}>
                <Select
                  placeholder="Filtrer par statut"
                  value={filterStatut}
                  onChange={(val) => { setFilterStatut(val); setActivePage(1); }}
                  clearable
                  data={statutOptions}
                  size="sm"
                />
              </Grid.Col>
            </Grid>
          </Card>

          {/* Tableau */}
          <Card withBorder radius="lg" shadow="sm" p="0">
            <ScrollArea style={{ maxHeight: 500 }}>
              <Table striped highlightOnHover>
                <Table.Thead style={{ backgroundColor: '#1b365d' }}>
                  <Table.Tr>
                    <Table.Th style={{ color: 'white', width: 120 }}>N°</Table.Th>
                    <Table.Th style={{ color: 'white' }}>Recommandation</Table.Th>
                    <Table.Th style={{ color: 'white', width: 150 }}>Rapport</Table.Th>
                    <Table.Th style={{ color: 'white', width: 150 }}>Responsable</Table.Th>
                    <Table.Th style={{ color: 'white', width: 100 }}>Échéance</Table.Th>
                    <Table.Th style={{ color: 'white', width: 120 }}>Statut</Table.Th>
                    <Table.Th style={{ color: 'white', width: 120, textAlign: 'center' }}>Actions</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {paginatedRecommandations.length === 0 ? (
                    <Table.Tr>
                      <Table.Td colSpan={7}>
                        <Center py="xl">
                          <Stack align="center">
                            <IconListCheck size={48} color="gray" />
                            <Text c="dimmed">Aucune recommandation trouvée</Text>
                          </Stack>
                        </Center>
                      </Table.Td>
                    </Table.Tr>
                  ) : (
                    paginatedRecommandations.map((rec) => (
                      <Table.Tr key={rec.RecommandationID}>
                        <Table.Td>
                          <Badge variant="light" color="blue" size="lg">
                            {rec.NumeroRecommandation || rec.RecommandationID}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Text fw={500} size="sm" lineClamp={2}>{rec.TexteRecommandation}</Text>
                          {rec.ProblemeFaiblesse && (
                            <Text size="xs" c="dimmed" mt={4}>Pb: {rec.ProblemeFaiblesse.substring(0, 50)}</Text>
                          )}
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" fw={500}>{rec.NumeroRapport}</Text>
                          <Text size="xs" c="dimmed" lineClamp={1}>{rec.LibelleRapport}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Group gap="xs" wrap="nowrap">
                            <IconUser size={14} color="gray" />
                            <Text size="sm">{rec.ResponsableMiseEnOeuvre || '-'}</Text>
                          </Group>
                        </Table.Td>
                        <Table.Td>
                          <Stack gap={4}>
                            {rec.Echeance && (
                              <Text size="sm">{dayjs(rec.Echeance).format('DD/MM/YYYY')}</Text>
                            )}
                            {getEcheanceStatus(rec.Echeance)}
                          </Stack>
                        </Table.Td>
                        <Table.Td>
                          <Badge color={getNiveauColor(rec.NiveauMiseEnOeuvre)} variant="light" size="md">
                            {rec.NiveauMiseEnOeuvre || 'Non commencé'}
                          </Badge>
                        </Table.Td>
                        <Table.Td ta="center">
                          <Group gap="xs" justify="center" wrap="nowrap">
                            <Tooltip label="Voir détails" withArrow>
                              <ActionIcon onClick={() => handleView(rec)} color="green" variant="light" size="sm">
                                <IconListCheck size={16} />
                              </ActionIcon>
                            </Tooltip>
                            <Tooltip label="Suivi" withArrow>
                              <ActionIcon onClick={() => openSuiviModal(rec)} color="blue" variant="light" size="sm">
                                <IconEdit size={16} />
                              </ActionIcon>
                            </Tooltip>
                            <Tooltip label="Supprimer" withArrow>
                              <ActionIcon onClick={() => { setRecommandationToDelete(rec.RecommandationID); setDeleteModalOpen(true); }} color="red" variant="light" size="sm">
                                <IconTrash size={16} />
                              </ActionIcon>
                            </Tooltip>
                          </Group>
                        </Table.Td>
                      </Table.Tr>
                    ))
                  )}
                </Table.Tbody>
              </Table>
            </ScrollArea>
          </Card>

          {totalPages > 1 && (
            <Group justify="center" mt="md">
              <Pagination total={totalPages} value={activePage} onChange={setActivePage} color="blue" size="sm" />
            </Group>
          )}
        </Stack>
      </Container>

      {/* Modals - le reste des modals reste identique */}
      {/* Modal Formulaire */}
      <Modal
        opened={modalOpen}
        onClose={() => { setModalOpen(false); form.reset(); }}
        title={
          <Group gap="sm">
            {editingId ? <IconEdit size={20} color="#1b365d" /> : <IconPlus size={20} color="#1b365d" />}
            <Text fw={700} size="lg">{editingId ? "Modifier la Recommandation" : "Nouvelle Recommandation"}</Text>
          </Group>
        }
        size="xl"
        centered
        overlayProps={{ blur: 3 }}
        transitionProps={{ transition: 'fade', duration: 200 }}
      >
        {/* Contenu du formulaire - inchangé */}
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="md">
            <Select
              label="Rapport d'inspection"
              placeholder="Sélectionner un rapport"
              data={rapportOptions}
              {...form.getInputProps('RapportID')}
              required
              searchable
              size="md"
            />
            <Grid>
              <Grid.Col span={6}>
                <TextInput
                  label="Numéro de recommandation"
                  placeholder="Ex: REC-001"
                  {...form.getInputProps('NumeroRecommandation')}
                  size="md"
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <Select
                  label="Domaine"
                  data={['Administratif', 'Financier', 'Technique', 'RH', 'Sécurité', 'Autre']}
                  {...form.getInputProps('Domaine')}
                  size="md"
                />
              </Grid.Col>
              <Grid.Col span={12}>
                <Textarea
                  label="Texte de la recommandation"
                  placeholder="Décrire la recommandation..."
                  rows={3}
                  {...form.getInputProps('TexteRecommandation')}
                  required
                  size="md"
                />
              </Grid.Col>
              <Grid.Col span={12}>
                <TextInput
                  label="Problème / Faiblesse identifié(e)"
                  placeholder="Description du problème"
                  {...form.getInputProps('ProblemeFaiblesse')}
                  size="md"
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <TextInput
                  label="Responsable mise en œuvre"
                  placeholder="Nom du responsable"
                  {...form.getInputProps('ResponsableMiseEnOeuvre')}
                  size="md"
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <DateInput
                  label="Date d'échéance"
                  placeholder="Sélectionner une date"
                  {...form.getInputProps('Echeance')}
                  size="md"
                />
              </Grid.Col>
              <Grid.Col span={12}>
                <TextInput
                  label="Acteurs impliqués"
                  placeholder="Liste des acteurs"
                  {...form.getInputProps('ActeursImpliques')}
                  size="md"
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <TextInput
                  label="Instance de validation"
                  {...form.getInputProps('InstanceValidation')}
                  size="md"
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <TextInput
                  label="Services concernés"
                  {...form.getInputProps('Services')}
                  size="md"
                />
              </Grid.Col>
            </Grid>
            <Group justify="flex-end" mt="md">
              <Button variant="light" onClick={() => setModalOpen(false)}>Annuler</Button>
              <Button type="submit" color="blue">{editingId ? 'Modifier' : 'Créer'}</Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* Modal Suivi */}
      <Modal
        opened={suiviModalOpen}
        onClose={() => { setSuiviModalOpen(false); setSelectedRecommandation(null); }}
        title={
          <Group gap="sm">
            <IconEdit size={20} color="#1b365d" />
            <Text fw={700} size="lg">Suivi de la recommandation</Text>
          </Group>
        }
        size="xl"
        centered
        overlayProps={{ blur: 3 }}
        transitionProps={{ transition: 'fade', duration: 200 }}
      >
        {selectedRecommandation && (
          <form onSubmit={suiviForm.onSubmit(handleUpdateSuivi)}>
            <Stack gap="md">
              <Card withBorder bg="blue.0" p="md">
                <Text fw={600} size="sm" mb="xs">📌 {selectedRecommandation.NumeroRecommandation || `Recommandation ${selectedRecommandation.RecommandationID}`}</Text>
                <Text size="sm">{selectedRecommandation.TexteRecommandation}</Text>
                <Divider my="sm" />
                <Group gap="md">
                  <Text size="xs" c="dimmed">Rapport: <strong>{selectedRecommandation.NumeroRapport}</strong></Text>
                  <Text size="xs" c="dimmed">Responsable: <strong>{selectedRecommandation.ResponsableMiseEnOeuvre || 'Non défini'}</strong></Text>
                  <Text size="xs" c="dimmed">Échéance: <strong>{selectedRecommandation.Echeance ? dayjs(selectedRecommandation.Echeance).format('DD/MM/YYYY') : 'Non définie'}</strong></Text>
                </Group>
              </Card>

              <Select
                label="Niveau de mise en œuvre"
                data={[
                  'Non commencé',
                  'En cours',
                  'Partiellement réalisée',
                  'Réalisée',
                  'Abandonnée'
                ]}
                {...suiviForm.getInputProps('NiveauMiseEnOeuvre')}
                size="md"
              />

              <Grid>
                <Grid.Col span={6}>
                  <DateInput
                    label="Date de début"
                    placeholder="Début des actions"
                    {...suiviForm.getInputProps('DateDebut')}
                    size="md"
                  />
                </Grid.Col>
                <Grid.Col span={6}>
                  <DateInput
                    label="Date de fin"
                    placeholder="Fin prévue"
                    {...suiviForm.getInputProps('DateFin')}
                    size="md"
                  />
                </Grid.Col>
              </Grid>

              <Textarea
                label="Mesures correctives prises"
                placeholder="Décrire les actions entreprises..."
                rows={3}
                {...suiviForm.getInputProps('MesuresCorrectives')}
                size="md"
              />

              <Textarea
                label="Observation sur les délais"
                placeholder="Respect des délais, retards, etc."
                rows={2}
                {...suiviForm.getInputProps('ObservationDelai')}
                size="md"
              />

              <Textarea
                label="Observation sur la mise en œuvre"
                placeholder="Difficultés rencontrées, succès, etc."
                rows={2}
                {...suiviForm.getInputProps('ObservationMiseEnOeuvre')}
                size="md"
              />

              <Select
                label="Appréciation du contrôle"
                data={['Excellent', 'Bon', 'Satisfaisant', 'Insuffisant', 'Critique']}
                {...suiviForm.getInputProps('AppreciationControle')}
                size="md"
              />

              <Group justify="flex-end" mt="md">
                <Button variant="light" onClick={() => setSuiviModalOpen(false)}>Annuler</Button>
                <Button type="submit" color="blue">Enregistrer le suivi</Button>
              </Group>
            </Stack>
          </form>
        )}
      </Modal>

      {/* Modal Visualisation */}
      <Modal
        opened={viewModalOpen}
        onClose={() => setViewModalOpen(false)}
        title={
          <Group gap="sm">
            <IconListCheck size={20} color="#1b365d" />
            <Text fw={700} size="lg">Détails de la Recommandation</Text>
          </Group>
        }
        size="lg"
        centered
        overlayProps={{ blur: 3 }}
        transitionProps={{ transition: 'fade', duration: 200 }}
      >
        {selectedRecommandation && (
          <Stack gap="md">
            <Card withBorder bg="gray.0" p="md">
              <Group justify="space-between">
                <Badge color="blue" size="lg">{selectedRecommandation.NumeroRecommandation || selectedRecommandation.RecommandationID}</Badge>
                <Badge color={getNiveauColor(selectedRecommandation.NiveauMiseEnOeuvre)} variant="light">
                  {selectedRecommandation.NiveauMiseEnOeuvre || 'Non commencé'}
                </Badge>
              </Group>
            </Card>
            
            <Divider />
            
            <Grid>
              <Grid.Col span={12}>
                <Text size="xs" c="dimmed">Texte de la recommandation</Text>
                <Text fw={500}>{selectedRecommandation.TexteRecommandation}</Text>
              </Grid.Col>
              <Grid.Col span={6}>
                <Text size="xs" c="dimmed">Rapport</Text>
                <Text fw={500}>{selectedRecommandation.NumeroRapport} - {selectedRecommandation.LibelleRapport}</Text>
              </Grid.Col>
              <Grid.Col span={6}>
                <Text size="xs" c="dimmed">Domaine</Text>
                <Text fw={500}>{selectedRecommandation.Domaine || '-'}</Text>
              </Grid.Col>
              <Grid.Col span={6}>
                <Text size="xs" c="dimmed">Responsable</Text>
                <Text fw={500}>{selectedRecommandation.ResponsableMiseEnOeuvre || '-'}</Text>
              </Grid.Col>
              <Grid.Col span={6}>
                <Text size="xs" c="dimmed">Échéance</Text>
                <Text fw={500}>{selectedRecommandation.Echeance ? dayjs(selectedRecommandation.Echeance).format('DD/MM/YYYY') : '-'}</Text>
              </Grid.Col>
              <Grid.Col span={12}>
                <Text size="xs" c="dimmed">Problème identifié</Text>
                <Text fw={500}>{selectedRecommandation.ProblemeFaiblesse || '-'}</Text>
              </Grid.Col>
              <Grid.Col span={12}>
                <Text size="xs" c="dimmed">Acteurs impliqués</Text>
                <Text fw={500}>{selectedRecommandation.ActeursImpliques || '-'}</Text>
              </Grid.Col>
            </Grid>

            <Divider />
            <Group justify="center">
              <Badge variant="light" color="blue">ID: {selectedRecommandation.RecommandationID}</Badge>
              <Badge variant="light" color="gray">Créée le {dayjs().format('DD/MM/YYYY')}</Badge>
            </Group>
          </Stack>
        )}
      </Modal>

      {/* Modal Confirmation Suppression */}
      <Modal
        opened={deleteModalOpen}
        onClose={() => { setDeleteModalOpen(false); setRecommandationToDelete(null); }}
        title={
          <Group gap="sm">
            <IconTrash size={20} color="red" />
            <Text fw={700} size="lg">Confirmation de suppression</Text>
          </Group>
        }
        size="sm"
        centered
        overlayProps={{ blur: 3 }}
        transitionProps={{ transition: 'fade', duration: 200 }}
      >
        <Stack gap="md">
          <Alert color="red" variant="light" icon={<IconInfoCircle size={16} />}>
            Êtes-vous sûr de vouloir supprimer cette recommandation ?
          </Alert>
          <Text size="sm" c="dimmed" ta="center">Cette action est irréversible.</Text>
          <Group justify="space-between" mt="md">
            <Button variant="light" onClick={() => { setDeleteModalOpen(false); setRecommandationToDelete(null); }}>Annuler</Button>
            <Button color="red" onClick={handleDelete} leftSection={<IconTrash size={16} />}>Supprimer</Button>
          </Group>
        </Stack>
      </Modal>

      {/* Modal Instructions */}
      <Modal
        opened={infoModalOpen}
        onClose={() => setInfoModalOpen(false)}
        title={
          <Group gap="sm">
            <IconInfoCircle size={20} color="#1b365d" />
            <Text fw={700} size="lg">Instructions</Text>
          </Group>
        }
        size="md"
        centered
        overlayProps={{ blur: 3 }}
        transitionProps={{ transition: 'fade', duration: 200 }}
      >
        <Stack gap="md">
          <Paper p="md" radius="md" withBorder bg="blue.0">
            <Text fw={600} size="sm" mb="md">📌 Fonctionnalités :</Text>
            <Stack gap="xs">
              <Text size="sm">1️⃣ Renseignez le texte et le numéro de la recommandation</Text>
              <Text size="sm">2️⃣ Liez la recommandation à un rapport d'inspection</Text>
              <Text size="sm">3️⃣ Définissez un responsable et une date d'échéance</Text>
              <Text size="sm">4️⃣ Suivez l'avancement via l'onglet Suivi</Text>
              <Text size="sm">5️⃣ Exportez la liste au format Excel, PDF ou Word</Text>
            </Stack>
          </Paper>
          <Divider />
          <Text size="xs" c="dimmed" ta="center">Version 2.0.0 - BD-SDI</Text>
        </Stack>
      </Modal>
    </Box>
  );
}