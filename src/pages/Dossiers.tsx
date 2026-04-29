import { useEffect, useState } from 'react';
import {
  Table, Button, Modal, TextInput, Stack, Title, Card,
  Group, ActionIcon, Select, Textarea, Badge, Grid, ComboboxItem,
  Avatar, Text, Divider, Loader, Pagination, Tooltip,
  Box, Container, SimpleGrid, Paper, ThemeIcon,
  ScrollArea, Center, Alert, Menu, Progress
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { 
  IconEdit, IconTrash, IconPlus, IconEye, IconSearch,
  IconGavel, IconBuilding, IconFileText,
  IconRefresh, IconDownload, IconPrinter, 
  IconFileExcel, IconFile, IconFileWord, IconInfoCircle,
  IconCheck, IconX, IconAlertCircle
} from '@tabler/icons-react';
import { invoke } from '@tauri-apps/api/core';
import { notifications } from '@mantine/notifications';
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Dossier {
  DossierID: number;
  PersonnelID: number;
  TypeInconduite?: string;
  PeriodeInconduite?: string;
  Annee?: number;
  ServiceInvestigation?: string;
  Etat?: string;
  SuiteReservee?: string;
  TypeSanction?: string;
  Sanction?: string;
  ActeSanction?: string;
  NumeroActeSanction?: string;
  AutoriteSanction?: string;
  Observations?: string;
  IDRapport?: number;
  AgentNom?: string;
  AgentPrenom?: string;
  AgentMatricule?: string;
}

interface Agent {
  PersonnelID: number;
  Nom: string;
  Prenom: string;
  Matricule: string;
  Service?: string;
  Entite?: string;
}

export default function Dossiers() {
  const [dossiers, setDossiers] = useState<Dossier[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedDossier, setSelectedDossier] = useState<Dossier | null>(null);
  const [dossierToDelete, setDossierToDelete] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEtat, setFilterEtat] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activePage, setActivePage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const itemsPerPage = 10;

  const typeInconduiteOptions = [
    'Faute professionnelle',
    'Abus de pouvoir',
    'Corruption',
    'Négligence',
    'Absence injustifiée',
    'Insoumission',
    'Violation des consignes',
    'Autre'
  ];

  const typeSanctionOptions = [
    'Avertissement',
    'Blâme',
    'Suspension',
    'Rétrogradation',
    'Révocation',
    'Licenciement',
    'Aucune'
  ];

  const etatOptions = ['En cours', 'Suspendu', 'Clôturé'];

  const form = useForm({
    initialValues: {
      PersonnelID: '',
      TypeInconduite: '',
      PeriodeInconduite: '',
      Annee: new Date().getFullYear(),
      ServiceInvestigation: '',
      Etat: 'En cours',
      SuiteReservee: '',
      TypeSanction: '',
      Sanction: '',
      ActeSanction: '',
      NumeroActeSanction: '',
      AutoriteSanction: '',
      Observations: '',
      IDRapport: '',
    },
    validate: {
      PersonnelID: (value) => (value ? null : "L'agent est requis"),
    },
  });

  useEffect(() => {
    loadDossiers();
    loadAgents();
  }, []);

  const loadDossiers = async () => {
    setLoading(true);
    try {
      const result = await invoke('get_dossiers');
      setDossiers(result as Dossier[]);
    } catch (error) {
      notifications.show({ title: 'Erreur', message: 'Impossible de charger les dossiers', color: 'red', icon: <IconX size={16} /> });
    } finally {
      setLoading(false);
    }
  };

  const loadAgents = async () => {
    try {
      const result = await invoke('get_agents');
      setAgents(result as Agent[]);
    } catch (error) {
      console.error('Erreur chargement agents:', error);
    }
  };

  const handleSubmit = async (values: typeof form.values) => {
    try {
      const dossierData = {
        ...values,
        PersonnelID: parseInt(values.PersonnelID),
        Annee: parseInt(values.Annee.toString()),
        DossierID: editingId,
      };

      if (editingId) {
        await invoke('update_dossier', { dossier: dossierData });
        notifications.show({ title: 'Succès', message: 'Dossier modifié', color: 'green', icon: <IconCheck size={16} /> });
      } else {
        await invoke('create_dossier', { dossier: dossierData });
        notifications.show({ title: 'Succès', message: 'Dossier créé', color: 'green', icon: <IconCheck size={16} /> });
      }
      
      setModalOpen(false);
      form.reset();
      setEditingId(null);
      loadDossiers();
    } catch (error) {
      notifications.show({ title: 'Erreur', message: `Erreur: ${error}`, color: 'red', icon: <IconX size={16} /> });
    }
  };

  const handleDelete = async () => {
    if (!dossierToDelete) return;
    try {
      await invoke('delete_dossier', { id: dossierToDelete });
      notifications.show({ title: 'Succès', message: 'Dossier supprimé', color: 'green', icon: <IconCheck size={16} /> });
      setDeleteModalOpen(false);
      setDossierToDelete(null);
      loadDossiers();
    } catch (error) {
      notifications.show({ title: 'Erreur', message: 'Impossible de supprimer', color: 'red', icon: <IconX size={16} /> });
    }
  };

  const getEtatColor = (etat?: string) => {
    switch(etat) {
      case 'Clôturé': return 'green';
      case 'En cours': return 'blue';
      case 'Suspendu': return 'orange';
      default: return 'gray';
    }
  };

  const getTypeInconduiteColor = (type?: string) => {
    switch(type) {
      case 'Faute professionnelle': return 'red';
      case 'Abus de pouvoir': return 'orange';
      case 'Corruption': return 'darkred';
      case 'Négligence': return 'yellow';
      case 'Absence injustifiée': return 'gray';
      default: return 'blue';
    }
  };

  // Export EXCEL
  const exportToExcel = async () => {
    try {
      setExporting(true);
      const filePath = await save({
        title: "Exporter la liste des dossiers",
        filters: [{ name: 'Excel', extensions: ['xlsx'] }],
        defaultPath: `dossiers_${dayjs().format('YYYY-MM-DD_HH-mm')}.xlsx`
      });
      if (!filePath) { setExporting(false); return; }

      const data = filteredDossiers.map(d => ({
        'N° Dossier': d.DossierID,
        'Agent': `${d.AgentNom} ${d.AgentPrenom}`,
        'Matricule': d.AgentMatricule,
        "Type d'inconduite": d.TypeInconduite || '',
        'Période': d.PeriodeInconduite || '',
        'Année': d.Annee || '',
        "Service d'investigation": d.ServiceInvestigation || '',
        'État': d.Etat || 'En cours',
        'Type de sanction': d.TypeSanction || '',
        'Sanction': d.Sanction || '',
        'Observations': d.Observations || '',
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      ws['!cols'] = [{ wch: 12 }, { wch: 25 }, { wch: 15 }, { wch: 25 }, { wch: 20 }, { wch: 10 }, { wch: 30 }, { wch: 12 }, { wch: 20 }, { wch: 25 }, { wch: 40 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Dossiers');
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
        title: "Exporter la liste des dossiers en PDF",
        filters: [{ name: 'PDF', extensions: ['pdf'] }],
        defaultPath: `dossiers_${dayjs().format('YYYY-MM-DD_HH-mm')}.pdf`
      });
      if (!filePath) { setExporting(false); return; }

      const doc = new jsPDF('landscape', 'mm', 'a4');
      doc.setFillColor(27, 54, 93);
      doc.rect(0, 0, 297, 40, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.text('LISTE DES DOSSIERS DISCIPLINAIRES', 148.5, 20, { align: 'center' });
      doc.setFontSize(10);
      doc.text(`Généré le : ${dayjs().format('DD/MM/YYYY HH:mm')}`, 148.5, 32, { align: 'center' });
      doc.setTextColor(0, 0, 0);
      doc.text(`Total dossiers : ${filteredDossiers.length}`, 14, 50);

      const head = ['N°', 'Agent', 'Matricule', "Type d'inconduite", 'Période', 'Service investigation', 'État', 'Sanction'];
      const body = filteredDossiers.map((d, idx) => [
        (idx + 1).toString(),
        `${d.AgentNom} ${d.AgentPrenom}`,
        d.AgentMatricule || '',
        d.TypeInconduite || '',
        d.PeriodeInconduite || '',
        d.ServiceInvestigation || '',
        d.Etat || 'En cours',
        d.Sanction || ''
      ]);

      autoTable(doc, {
        head: [head],
        body: body as any[],
        startY: 60,
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
        title: "Exporter la liste des dossiers en Word",
        filters: [{ name: 'Word Document', extensions: ['doc'] }],
        defaultPath: `dossiers_${dayjs().format('YYYY-MM-DD_HH-mm')}.doc`
      });
      if (!filePath) { setExporting(false); return; }

      const rows = filteredDossiers.map((d, idx) => `
        <tr>
          <td style="border:1px solid #ddd;padding:8px;text-align:center">${idx + 1}</td>
          <td style="border:1px solid #ddd;padding:8px"><strong>${d.AgentNom} ${d.AgentPrenom}</strong><br/><small>${d.AgentMatricule || ''}</small></td>
          <td style="border:1px solid #ddd;padding:8px">${d.TypeInconduite || '-'}</td>
          <td style="border:1px solid #ddd;padding:8px">${d.PeriodeInconduite || '-'}</td>
          <td style="border:1px solid #ddd;padding:8px">${d.ServiceInvestigation || '-'}</td>
          <td style="border:1px solid #ddd;padding:8px">${d.Etat || 'En cours'}</td>
          <td style="border:1px solid #ddd;padding:8px">${d.Sanction || '-'}</td>
        </tr>
      `).join('');

      const htmlContent = `<!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"><title>Liste des dossiers disciplinaires</title>
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
        <h1>📋 LISTE DES DOSSIERS DISCIPLINAIRES</h1>
        <p>Généré le ${dayjs().format('DD/MM/YYYY HH:mm')}</p>
        <p>Total dossiers : ${filteredDossiers.length}</p>
        <table><thead><tr><th>N°</th><th>Agent</th><th>Type d'inconduite</th><th>Période</th><th>Service investigation</th><th>État</th><th>Sanction</th></tr></thead><tbody>${rows}</tbody></table>
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

    const rows = filteredDossiers.map((d, idx) => `
      <tr>
        <td style="border:1px solid #ddd;padding:8px;text-align:center">${idx + 1}</td>
        <td style="border:1px solid #ddd;padding:8px"><strong>${d.AgentNom} ${d.AgentPrenom}</strong><br/><small>${d.AgentMatricule || ''}</small></td>
        <td style="border:1px solid #ddd;padding:8px">${d.TypeInconduite || '-'}</td>
        <td style="border:1px solid #ddd;padding:8px">${d.PeriodeInconduite || '-'}</td>
        <td style="border:1px solid #ddd;padding:8px">${d.ServiceInvestigation || '-'}</td>
        <td style="border:1px solid #ddd;padding:8px">${d.Etat || 'En cours'}</td>
        <td style="border:1px solid #ddd;padding:8px">${d.Sanction || '-'}</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"><title>Liste des dossiers disciplinaires</title>
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
        <h1>📋 LISTE DES DOSSIERS DISCIPLINAIRES</h1>
        <p>Généré le ${dayjs().format('DD/MM/YYYY HH:mm')}</p>
        <p>Total dossiers : ${filteredDossiers.length}</p>
        <table><thead><tr><th>N°</th><th>Agent</th><th>Type d'inconduite</th><th>Période</th><th>Service investigation</th><th>État</th><th>Sanction</th></tr></thead><tbody>${rows}</tbody></table>
        <script>window.onload = () => { window.print(); window.close(); };</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Filtrage des dossiers
  const filteredDossiers = dossiers.filter(dossier => {
    const matchesSearch = `${dossier.AgentNom} ${dossier.AgentPrenom} ${dossier.AgentMatricule}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (dossier.TypeInconduite && dossier.TypeInconduite.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesEtat = !filterEtat || dossier.Etat === filterEtat;
    return matchesSearch && matchesEtat;
  });

  const totalPages = Math.ceil(filteredDossiers.length / itemsPerPage);
  const paginatedDossiers = filteredDossiers.slice(
    (activePage - 1) * itemsPerPage,
    activePage * itemsPerPage
  );

  const totalDossiers = dossiers.length;
  const enCours = dossiers.filter(d => d.Etat === 'En cours').length;
  const clotures = dossiers.filter(d => d.Etat === 'Clôturé').length;
  const suspendus = dossiers.filter(d => d.Etat === 'Suspendu').length;

  const agentOptions: ComboboxItem[] = agents.map(agent => ({
    value: agent.PersonnelID.toString(),
    label: `${agent.Matricule} - ${agent.Nom} ${agent.Prenom}`
  }));

  if (loading) {
    return (
      <Center style={{ height: '50vh' }}>
        <Card withBorder radius="lg" p="xl">
          <Stack align="center" gap="md">
            <Loader size="xl" color="#1b365d" />
            <Text>Chargement des dossiers...</Text>
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
                  <IconGavel size={30} color="white" />
                </Avatar>
                <Box>
                  <Title order={1} c="white" size="h2">Dossiers Disciplinaires</Title>
                  <Text c="gray.3" size="sm">Gérez les dossiers disciplinaires des agents</Text>
                  <Group gap="xs" mt={8}>
                    <Badge size="sm" variant="white" color="blue">BD-SDI v2.0</Badge>
                    <Badge size="sm" variant="white" color="green">Justice administrative</Badge>
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
                <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Total Dossiers</Text>
                <ThemeIcon size="lg" radius="md" color="blue" variant="light"><IconGavel size={18} /></ThemeIcon>
              </Group>
              <Text fw={800} size="xl" c="blue">{totalDossiers}</Text>
              <Progress value={100} size="sm" radius="xl" color="blue" mt={8} />
              <Text size="xs" c="dimmed" mt={4}>Dossiers enregistrés</Text>
            </Paper>
            <Paper p="md" radius="lg" withBorder style={{ backgroundColor: '#e8f5e9' }}>
              <Group justify="space-between" mb="xs">
                <Text size="xs" c="dimmed" tt="uppercase" fw={600}>En cours</Text>
                <ThemeIcon size="lg" radius="md" color="green" variant="light"><IconFileText size={18} /></ThemeIcon>
              </Group>
              <Text fw={800} size="xl" c="green">{enCours}</Text>
              <Progress value={totalDossiers > 0 ? (enCours / totalDossiers) * 100 : 0} size="sm" radius="xl" color="green" mt={8} />
              <Text size="xs" c="dimmed" mt={4}>En traitement</Text>
            </Paper>
            <Paper p="md" radius="lg" withBorder style={{ backgroundColor: '#fff3e0' }}>
              <Group justify="space-between" mb="xs">
                <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Suspendus</Text>
                <ThemeIcon size="lg" radius="md" color="orange" variant="light"><IconAlertCircle size={18} /></ThemeIcon>
              </Group>
              <Text fw={800} size="xl" c="orange">{suspendus}</Text>
              <Progress value={totalDossiers > 0 ? (suspendus / totalDossiers) * 100 : 0} size="sm" radius="xl" color="orange" mt={8} />
              <Text size="xs" c="dimmed" mt={4}>En attente</Text>
            </Paper>
            <Paper p="md" radius="lg" withBorder style={{ backgroundColor: '#f3e5f5' }}>
              <Group justify="space-between" mb="xs">
                <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Clôturés</Text>
                <ThemeIcon size="lg" radius="md" color="violet" variant="light"><IconCheck size={18} /></ThemeIcon>
              </Group>
              <Text fw={800} size="xl" c="violet">{clotures}</Text>
              <Progress value={totalDossiers > 0 ? (clotures / totalDossiers) * 100 : 0} size="sm" radius="xl" color="violet" mt={8} />
              <Text size="xs" c="dimmed" mt={4}>Terminés</Text>
            </Paper>
          </SimpleGrid>

          {/* Barre d'actions */}
          <Card withBorder radius="lg" shadow="sm" p="md">
            <Group justify="space-between" align="flex-end" mb="md">
              <Box>
                <Text fw={600} size="lg">Liste des dossiers</Text>
                <Text size="xs" c="dimmed">{filteredDossiers.length} dossier(s) trouvé(s)</Text>
              </Box>
              <Group>
                <Tooltip label="Actualiser">
                  <ActionIcon onClick={loadDossiers} size="lg" variant="light" color="blue">
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
                  Nouveau Dossier
                </Button>
              </Group>
            </Group>

            <Divider my="md" />

            {/* Filtres */}
            <Grid>
              <Grid.Col span={{ base: 12, md: 6 }}>
                <TextInput
                  placeholder="Rechercher par agent, matricule ou type d'inconduite..."
                  leftSection={<IconSearch size={16} />}
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.currentTarget.value); setActivePage(1); }}
                  size="sm"
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, md: 3 }}>
                <Select
                  placeholder="Filtrer par état"
                  value={filterEtat}
                  onChange={(val) => { setFilterEtat(val); setActivePage(1); }}
                  clearable
                  data={etatOptions}
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
                    <Table.Th style={{ color: 'white', width: 100 }}>N° Dossier</Table.Th>
                    <Table.Th style={{ color: 'white' }}>Agent</Table.Th>
                    <Table.Th style={{ color: 'white', width: 200 }}>Type d'inconduite</Table.Th>
                    <Table.Th style={{ color: 'white', width: 200 }}>Service Investigation</Table.Th>
                    <Table.Th style={{ color: 'white', width: 100 }}>État</Table.Th>
                    <Table.Th style={{ color: 'white', width: 150 }}>Sanction</Table.Th>
                    <Table.Th style={{ color: 'white', width: 120, textAlign: 'center' }}>Actions</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {paginatedDossiers.length === 0 ? (
                    <Table.Tr>
                      <Table.Td colSpan={7}>
                        <Center py="xl">
                          <Stack align="center">
                            <IconGavel size={48} color="gray" />
                            <Text c="dimmed">Aucun dossier trouvé</Text>
                          </Stack>
                        </Center>
                      </Table.Td>
                    </Table.Tr>
                  ) : (
                    paginatedDossiers.map((dossier) => (
                      <Table.Tr key={dossier.DossierID}>
                        <Table.Td>
                          <Badge variant="light" color="blue" size="lg">
                            #{dossier.DossierID}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Group gap="sm" wrap="nowrap">
                            <Avatar size="md" radius="xl" color="blue">
                              {dossier.AgentNom?.charAt(0)}{dossier.AgentPrenom?.charAt(0)}
                            </Avatar>
                            <Box>
                              <Text fw={500} size="sm">{dossier.AgentNom} {dossier.AgentPrenom}</Text>
                              <Text size="xs" c="dimmed">{dossier.AgentMatricule}</Text>
                            </Box>
                          </Group>
                        </Table.Td>
                        <Table.Td>
                          <Badge color={getTypeInconduiteColor(dossier.TypeInconduite)} variant="light" size="md">
                            {dossier.TypeInconduite || '-'}
                          </Badge>
                          {dossier.PeriodeInconduite && (
                            <Text size="xs" c="dimmed" mt={4}>{dossier.PeriodeInconduite}</Text>
                          )}
                        </Table.Td>
                        <Table.Td>
                          <Group gap="xs" wrap="nowrap">
                            <IconBuilding size={14} color="gray" />
                            <Text size="sm">{dossier.ServiceInvestigation || '-'}</Text>
                          </Group>
                        </Table.Td>
                        <Table.Td>
                          <Badge color={getEtatColor(dossier.Etat)} variant="filled" size="md">
                            {dossier.Etat || 'En cours'}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          {dossier.Sanction ? (
                            <Badge color="red" variant="light" size="md">
                              {dossier.Sanction}
                            </Badge>
                          ) : (
                            <Text c="dimmed" size="sm">-</Text>
                          )}
                        </Table.Td>
                        <Table.Td ta="center">
                          <Group gap="xs" justify="center" wrap="nowrap">
                            <Tooltip label="Voir détails" withArrow>
                              <ActionIcon onClick={() => {
                                setSelectedDossier(dossier);
                                setViewModalOpen(true);
                              }} color="green" variant="light" size="sm">
                                <IconEye size={16} />
                              </ActionIcon>
                            </Tooltip>
                            <Tooltip label="Modifier" withArrow>
                              <ActionIcon onClick={() => {
                                setEditingId(dossier.DossierID);
                                form.setValues({
                                  PersonnelID: dossier.PersonnelID.toString(),
                                  TypeInconduite: dossier.TypeInconduite || '',
                                  PeriodeInconduite: dossier.PeriodeInconduite || '',
                                  Annee: dossier.Annee || new Date().getFullYear(),
                                  ServiceInvestigation: dossier.ServiceInvestigation || '',
                                  Etat: dossier.Etat || 'En cours',
                                  SuiteReservee: dossier.SuiteReservee || '',
                                  TypeSanction: dossier.TypeSanction || '',
                                  Sanction: dossier.Sanction || '',
                                  ActeSanction: dossier.ActeSanction || '',
                                  NumeroActeSanction: dossier.NumeroActeSanction || '',
                                  AutoriteSanction: dossier.AutoriteSanction || '',
                                  Observations: dossier.Observations || '',
                                  IDRapport: dossier.IDRapport?.toString() || '',
                                });
                                setModalOpen(true);
                              }} color="blue" variant="light" size="sm">
                                <IconEdit size={16} />
                              </ActionIcon>
                            </Tooltip>
                            <Tooltip label="Supprimer" withArrow>
                              <ActionIcon onClick={() => { setDossierToDelete(dossier.DossierID); setDeleteModalOpen(true); }} color="red" variant="light" size="sm">
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

      {/* Modal Formulaire */}
      <Modal
        opened={modalOpen}
        onClose={() => { setModalOpen(false); form.reset(); }}
        title={
          <Group gap="sm">
            {editingId ? <IconEdit size={20} color="#1b365d" /> : <IconPlus size={20} color="#1b365d" />}
            <Text fw={700} size="lg">{editingId ? "Modifier le Dossier" : "Nouveau Dossier"}</Text>
          </Group>
        }
        size="xl"
        centered
        overlayProps={{ blur: 3 }}
        transitionProps={{ transition: 'fade', duration: 200 }}
      >
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="md">
            <Select
              label="Agent concerné"
              placeholder="Sélectionner un agent"
              data={agentOptions}
              {...form.getInputProps('PersonnelID')}
              required
              searchable
              size="md"
            />
            <Grid>
              <Grid.Col span={6}>
                <Select
                  label="Type d'inconduite"
                  placeholder="Sélectionner"
                  data={typeInconduiteOptions}
                  {...form.getInputProps('TypeInconduite')}
                  size="md"
                  searchable
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <TextInput
                  label="Année"
                  type="number"
                  {...form.getInputProps('Annee')}
                  size="md"
                />
              </Grid.Col>
              <Grid.Col span={12}>
                <TextInput
                  label="Période de l'inconduite"
                  placeholder="Ex: Janvier - Mars 2024"
                  {...form.getInputProps('PeriodeInconduite')}
                  size="md"
                />
              </Grid.Col>
              <Grid.Col span={12}>
                <TextInput
                  label="Service d'investigation"
                  placeholder="Service ayant mené l'enquête"
                  {...form.getInputProps('ServiceInvestigation')}
                  size="md"
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <Select
                  label="État du dossier"
                  data={etatOptions}
                  {...form.getInputProps('Etat')}
                  size="md"
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <TextInput
                  label="Suite réservée"
                  placeholder="Décision ou suite donnée"
                  {...form.getInputProps('SuiteReservee')}
                  size="md"
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <Select
                  label="Type de sanction"
                  data={typeSanctionOptions}
                  {...form.getInputProps('TypeSanction')}
                  size="md"
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <TextInput
                  label="Sanction"
                  placeholder="Sanction prononcée"
                  {...form.getInputProps('Sanction')}
                  size="md"
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <TextInput
                  label="Acte de sanction"
                  placeholder="Référence de l'acte"
                  {...form.getInputProps('ActeSanction')}
                  size="md"
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <TextInput
                  label="Numéro de l'acte"
                  placeholder="Numéro officiel"
                  {...form.getInputProps('NumeroActeSanction')}
                  size="md"
                />
              </Grid.Col>
              <Grid.Col span={12}>
                <TextInput
                  label="Autorité ayant prononcé la sanction"
                  placeholder="Nom de l'autorité"
                  {...form.getInputProps('AutoriteSanction')}
                  size="md"
                />
              </Grid.Col>
              <Grid.Col span={12}>
                <Textarea
                  label="Observations"
                  placeholder="Informations complémentaires"
                  rows={3}
                  {...form.getInputProps('Observations')}
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

      {/* Modal Visualisation */}
      <Modal
        opened={viewModalOpen}
        onClose={() => { setViewModalOpen(false); setSelectedDossier(null); }}
        title={
          <Group gap="sm">
            <IconEye size={20} color="#1b365d" />
            <Text fw={700} size="lg">Détail du Dossier Disciplinaire</Text>
          </Group>
        }
        size="lg"
        centered
        overlayProps={{ blur: 3 }}
        transitionProps={{ transition: 'fade', duration: 200 }}
      >
        {selectedDossier && (
          <Stack gap="md">
            <Card withBorder bg="blue.0" p="md">
              <Group justify="space-between">
                <Badge color="blue" size="lg">Dossier N° {selectedDossier.DossierID}</Badge>
                <Badge color={getEtatColor(selectedDossier.Etat)} variant="filled">
                  {selectedDossier.Etat || 'En cours'}
                </Badge>
              </Group>
            </Card>
            
            <Divider />
            
            <Grid>
              <Grid.Col span={12}>
                <Text size="xs" c="dimmed">Agent concerné</Text>
                <Text fw={600} size="md">{selectedDossier.AgentNom} {selectedDossier.AgentPrenom}</Text>
                <Text size="sm" c="dimmed">Matricule: {selectedDossier.AgentMatricule}</Text>
              </Grid.Col>
              <Grid.Col span={6}>
                <Text size="xs" c="dimmed">Type d'inconduite</Text>
                <Badge color={getTypeInconduiteColor(selectedDossier.TypeInconduite)} variant="light" size="lg">
                  {selectedDossier.TypeInconduite || '-'}
                </Badge>
              </Grid.Col>
              <Grid.Col span={6}>
                <Text size="xs" c="dimmed">Année / Période</Text>
                <Text fw={500}>{selectedDossier.Annee || '-'} / {selectedDossier.PeriodeInconduite || '-'}</Text>
              </Grid.Col>
              <Grid.Col span={12}>
                <Text size="xs" c="dimmed">Service d'investigation</Text>
                <Text fw={500}>{selectedDossier.ServiceInvestigation || '-'}</Text>
              </Grid.Col>
              <Grid.Col span={6}>
                <Text size="xs" c="dimmed">Type de sanction</Text>
                <Text fw={500}>{selectedDossier.TypeSanction || '-'}</Text>
              </Grid.Col>
              <Grid.Col span={6}>
                <Text size="xs" c="dimmed">Sanction prononcée</Text>
                <Text fw={500} c="red">{selectedDossier.Sanction || '-'}</Text>
              </Grid.Col>
              <Grid.Col span={6}>
                <Text size="xs" c="dimmed">Acte de sanction</Text>
                <Text fw={500}>{selectedDossier.ActeSanction || '-'}</Text>
              </Grid.Col>
              <Grid.Col span={6}>
                <Text size="xs" c="dimmed">Numéro de l'acte</Text>
                <Text fw={500}>{selectedDossier.NumeroActeSanction || '-'}</Text>
              </Grid.Col>
              <Grid.Col span={12}>
                <Text size="xs" c="dimmed">Autorité ayant prononcé la sanction</Text>
                <Text fw={500}>{selectedDossier.AutoriteSanction || '-'}</Text>
              </Grid.Col>
              <Grid.Col span={12}>
                <Text size="xs" c="dimmed">Observations</Text>
                <Text fw={500}>{selectedDossier.Observations || '-'}</Text>
              </Grid.Col>
            </Grid>
          </Stack>
        )}
      </Modal>

      {/* Modal Confirmation Suppression */}
      <Modal
        opened={deleteModalOpen}
        onClose={() => { setDeleteModalOpen(false); setDossierToDelete(null); }}
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
            Êtes-vous sûr de vouloir supprimer ce dossier ?
          </Alert>
          <Text size="sm" c="dimmed" ta="center">Cette action est irréversible.</Text>
          <Group justify="space-between" mt="md">
            <Button variant="light" onClick={() => { setDeleteModalOpen(false); setDossierToDelete(null); }}>Annuler</Button>
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
              <Text size="sm">1️⃣ Sélectionnez l'agent concerné par le dossier disciplinaire</Text>
              <Text size="sm">2️⃣ Renseignez le type d'inconduite et la période</Text>
              <Text size="sm">3️⃣ Précisez le service d'investigation</Text>
              <Text size="sm">4️⃣ Indiquez la sanction prononcée et l'autorité</Text>
              <Text size="sm">5️⃣ Suivez l'état du dossier (En cours, Suspendu, Clôturé)</Text>
              <Text size="sm">6️⃣ Exportez la liste au format Excel, PDF ou Word</Text>
            </Stack>
          </Paper>
          <Divider />
          <Text size="xs" c="dimmed" ta="center">Version 2.0.0 - BD-SDI</Text>
        </Stack>
      </Modal>
    </Box>
  );
}