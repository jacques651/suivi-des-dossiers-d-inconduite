import { useEffect, useState } from 'react';
import { Progress } from '@mantine/core';
import { 
  Table, Button, Modal, TextInput, Select, Group, 
  ActionIcon, Stack, Title, Card, Badge, Grid, 
  Avatar, Text, Divider, Pagination,
  Tooltip, Box, Menu, Alert, Container, SimpleGrid, 
  Paper, ThemeIcon, ScrollArea, Center, LoadingOverlay
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { 
  IconEdit, IconTrash, IconPlus, IconSearch, 
  IconUser, IconBuilding, IconId, 
  IconRefresh, IconDownload, IconPhoto,
  IconFileExcel, IconFile, IconFileWord,
  IconPrinter, IconInfoCircle, IconCheck, IconX
} from '@tabler/icons-react';
import { invoke } from '@tauri-apps/api/core';
import { notifications } from '@mantine/notifications';
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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

export default function Agents() {
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
  const itemsPerPage = 10;

  const entiteOptions = [
    { value: 'Police Nationale', label: 'Police Nationale' },
    { value: 'Gendarmerie Nationale', label: 'Gendarmerie Nationale' },
    { value: 'Autre', label: 'Autre' }
  ];

  const serviceOptions = [
    { value: 'Administration Centrale', label: 'Administration Centrale' },
    { value: 'Direction Régionale', label: 'Direction Régionale' },
    { value: 'Commissariat', label: 'Commissariat' },
    { value: 'Brigade', label: 'Brigade' },
    { value: 'Unité Spéciale', label: 'Unité Spéciale' },
    { value: 'Service Technique', label: 'Service Technique' },
    { value: 'Autre', label: 'Autre' }
  ];

  const form = useForm({
    initialValues: {
      Matricule: '',
      Cle: '',
      Nom: '',
      Prenom: '',
      GradeID: '',
      Service: '',
      Entite: '',
      Sexe: '',
      Photo: '',
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
  }, []);

  const loadAgents = async () => {
    setLoading(true);
    try {
      const result = await invoke('get_agents');
      setAgents(result as Agent[]);
    } catch (error) {
      notifications.show({
        title: 'Erreur',
        message: 'Impossible de charger les agents',
        color: 'red',
        icon: <IconX size={16} />,
      });
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

  const handleSubmit = async (values: typeof form.values) => {
    try {
      const agentData = {
        ...values,
        PersonnelID: editingId,
        GradeID: values.GradeID ? parseInt(values.GradeID) : null,
      };

      if (editingId) {
        await invoke('update_agent', { agent: agentData });
        notifications.show({
          title: 'Succès',
          message: 'Agent modifié avec succès',
          color: 'green',
          icon: <IconCheck size={16} />,
        });
      } else {
        await invoke('create_agent', { agent: agentData });
        notifications.show({
          title: 'Succès',
          message: 'Agent créé avec succès',
          color: 'green',
          icon: <IconCheck size={16} />,
        });
      }
      
      setModalOpen(false);
      form.reset();
      setEditingId(null);
      loadAgents();
    } catch (error) {
      notifications.show({
        title: 'Erreur',
        message: `Erreur: ${error}`,
        color: 'red',
        icon: <IconX size={16} />,
      });
    }
  };

  const handleDelete = async () => {
    if (!agentToDelete) return;
    try {
      await invoke('delete_agent', { id: agentToDelete });
      notifications.show({
        title: 'Succès',
        message: 'Agent supprimé avec succès',
        color: 'green',
        icon: <IconCheck size={16} />,
      });
      setDeleteModalOpen(false);
      setAgentToDelete(null);
      loadAgents();
    } catch (error) {
      notifications.show({
        title: 'Erreur',
        message: 'Impossible de supprimer l\'agent',
        color: 'red',
        icon: <IconX size={16} />,
      });
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

  // Export EXCEL
  const exportToExcel = async () => {
    try {
      setExporting(true);
      const filePath = await save({
        title: "Exporter la liste des agents",
        filters: [{ name: 'Excel', extensions: ['xlsx'] }],
        defaultPath: `agents_${dayjs().format('YYYY-MM-DD_HH-mm')}.xlsx`
      });
      if (!filePath) { setExporting(false); return; }

      const data = filteredAgents.map(agent => ({
        'Matricule': agent.Matricule,
        'Clé': agent.Cle || '',
        'Nom': agent.Nom,
        'Prénom': agent.Prenom,
        'Grade': getGradeLibelle(agent.GradeID),
        'Service': agent.Service || '',
        'Entité': agent.Entite || '',
        'Sexe': agent.Sexe === 'M' ? 'Masculin' : agent.Sexe === 'F' ? 'Féminin' : '',
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      ws['!cols'] = [{ wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 30 }, { wch: 25 }, { wch: 25 }, { wch: 10 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Agents');
      const excelBuffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
      await writeFile(filePath, new Uint8Array(excelBuffer));
      notifications.show({ title: 'Succès', message: 'Export Excel réussi !', color: 'green', icon: <IconCheck size={16} /> });
    } catch (error) {
      notifications.show({ title: 'Erreur', message: 'Erreur lors de l\'export Excel', color: 'red', icon: <IconX size={16} /> });
    } finally {
      setExporting(false);
    }
  };

  // Export PDF
  const exportToPDF = async () => {
    try {
      setExporting(true);
      const filePath = await save({
        title: "Exporter la liste des agents en PDF",
        filters: [{ name: 'PDF', extensions: ['pdf'] }],
        defaultPath: `agents_${dayjs().format('YYYY-MM-DD_HH-mm')}.pdf`
      });
      if (!filePath) { setExporting(false); return; }

      const doc = new jsPDF('landscape', 'mm', 'a4');
      doc.setFillColor(27, 54, 93);
      doc.rect(0, 0, 297, 40, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.text('LISTE DES AGENTS', 148.5, 20, { align: 'center' });
      doc.setFontSize(10);
      doc.text(`Généré le : ${dayjs().format('DD/MM/YYYY HH:mm')}`, 148.5, 32, { align: 'center' });
      doc.setTextColor(0, 0, 0);
      doc.text(`Total agents : ${filteredAgents.length}`, 14, 50);

      const head = ['N°', 'Matricule', 'Nom', 'Prénom', 'Grade', 'Service', 'Entité', 'Sexe'];
      const body = filteredAgents.map((agent, idx) => [
        idx + 1, agent.Matricule, agent.Nom, agent.Prenom,
        getGradeLibelle(agent.GradeID), agent.Service || '', agent.Entite || '',
        agent.Sexe === 'M' ? 'Masculin' : agent.Sexe === 'F' ? 'Féminin' : ''
      ]);

      autoTable(doc, {
        head: [head],
        body: body,
        startY: 60,
        theme: 'striped',
        headStyles: { fillColor: [27, 54, 93], textColor: 255, fontStyle: 'bold', halign: 'center' },
        styles: { fontSize: 9, cellPadding: 3 }
      });

      await writeFile(filePath, new Uint8Array(doc.output('arraybuffer')));
      notifications.show({ title: 'Succès', message: 'Export PDF réussi !', color: 'green', icon: <IconCheck size={16} /> });
    } catch (error) {
      notifications.show({ title: 'Erreur', message: 'Erreur lors de l\'export PDF', color: 'red', icon: <IconX size={16} /> });
    } finally {
      setExporting(false);
    }
  };

  // Export Word
  const exportToWord = async () => {
    try {
      setExporting(true);
      const filePath = await save({
        title: "Exporter la liste des agents en Word",
        filters: [{ name: 'Word Document', extensions: ['doc'] }],
        defaultPath: `agents_${dayjs().format('YYYY-MM-DD_HH-mm')}.doc`
      });
      if (!filePath) { setExporting(false); return; }

      const rows = filteredAgents.map((agent, idx) => `
        <tr>
          <td style="border:1px solid #ddd;padding:8px;text-align:center">${idx + 1}</td>
          <td style="border:1px solid #ddd;padding:8px">${agent.Matricule}</td>
          <td style="border:1px solid #ddd;padding:8px"><strong>${agent.Nom}</strong></td>
          <td style="border:1px solid #ddd;padding:8px">${agent.Prenom}</td>
          <td style="border:1px solid #ddd;padding:8px">${getGradeLibelle(agent.GradeID)}</td>
          <td style="border:1px solid #ddd;padding:8px">${agent.Service || '-'}</td>
          <td style="border:1px solid #ddd;padding:8px">${agent.Entite || '-'}</td>
          <td style="border:1px solid #ddd;padding:8px;text-align:center">${agent.Sexe === 'M' ? 'Masculin' : agent.Sexe === 'F' ? 'Féminin' : '-'}</td>
        </tr>
      `).join('');

      const htmlContent = `<!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"><title>Liste des agents</title>
      <style>
        body { font-family: 'Calibri', Arial, sans-serif; margin: 40px; }
        h1 { color: #1b365d; border-bottom: 3px solid #1b365d; padding-bottom: 10px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th { background-color: #1b365d; color: white; padding: 10px; border: 1px solid #ddd; }
        td { padding: 8px; border: 1px solid #ddd; }
        tr:nth-child(even) { background-color: #f9f9f9; }
        .footer { margin-top: 40px; text-align: center; font-size: 10px; color: #999; border-top: 1px solid #ddd; padding-top: 20px; }
      </style>
      </head>
      <body>
        <h1>📋 LISTE DES AGENTS</h1>
        <p>Généré le ${dayjs().format('DD/MM/YYYY HH:mm')}</p>
        <p><strong>Total agents :</strong> ${filteredAgents.length}</p>
        <table><thead><tr><th>N°</th><th>Matricule</th><th>Nom</th><th>Prénom</th><th>Grade</th><th>Service</th><th>Entité</th><th>Sexe</th></tr></thead><tbody>${rows}</tbody></table>
        <div class="footer"><p>Document généré automatiquement par BD-SDI</p></div>
      </body>
      </html>`;

      await writeFile(filePath, new TextEncoder().encode(htmlContent));
      notifications.show({ title: 'Succès', message: 'Export Word réussi !', color: 'green', icon: <IconCheck size={16} /> });
    } catch (error) {
      notifications.show({ title: 'Erreur', message: 'Erreur lors de l\'export Word', color: 'red', icon: <IconX size={16} /> });
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

    const rows = filteredAgents.map((agent, idx) => `
      <tr>
        <td style="border:1px solid #ddd;padding:8px;text-align:center">${idx + 1}</td>
        <td style="border:1px solid #ddd;padding:8px">${agent.Matricule}</td>
        <td style="border:1px solid #ddd;padding:8px"><strong>${agent.Nom}</strong></td>
        <td style="border:1px solid #ddd;padding:8px">${agent.Prenom}</td>
        <td style="border:1px solid #ddd;padding:8px">${getGradeLibelle(agent.GradeID)}</td>
        <td style="border:1px solid #ddd;padding:8px">${agent.Service || '-'}</td>
        <td style="border:1px solid #ddd;padding:8px">${agent.Entite || '-'}</td>
        <td style="border:1px solid #ddd;padding:8px;text-align:center">${agent.Sexe === 'M' ? 'Masculin' : agent.Sexe === 'F' ? 'Féminin' : '-'}</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"><title>Liste des agents</title>
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
        <h1>📋 LISTE DES AGENTS</h1>
        <p>Généré le ${dayjs().format('DD/MM/YYYY HH:mm')}</p>
        <p>Total agents : ${filteredAgents.length}</p>
        <table><thead><tr><th>N°</th><th>Matricule</th><th>Nom</th><th>Prénom</th><th>Grade</th><th>Service</th><th>Entité</th><th>Sexe</th></tr></thead><tbody>${rows}</tbody></table>
        <script>window.onload = () => { window.print(); window.close(); };</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Filtrage des agents
  const filteredAgents = agents.filter(agent => {
    const matchesSearch = `${agent.Nom} ${agent.Prenom} ${agent.Matricule}`.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSexe = !selectedSexe || agent.Sexe === selectedSexe;
    const matchesService = !selectedService || agent.Service === selectedService;
    const matchesEntite = !selectedEntite || agent.Entite === selectedEntite;
    return matchesSearch && matchesSexe && matchesService && matchesEntite;
  });

  const totalPages = Math.ceil(filteredAgents.length / itemsPerPage);
  const paginatedAgents = filteredAgents.slice((activePage - 1) * itemsPerPage, activePage * itemsPerPage);

  const totalAgents = agents.length;
  const maleCount = agents.filter(a => a.Sexe === 'M').length;
  const femaleCount = agents.filter(a => a.Sexe === 'F').length;
  const servicesList = [...new Set(agents.map(a => a.Service).filter(Boolean))];
  const entitesList = [...new Set(agents.map(a => a.Entite).filter(Boolean))];

  const gradeOptions = grades.map(grade => ({ value: grade.GradeID.toString(), label: grade.LibelleGrade }));

  return (
    <Box p="md">
      <Container size="full">
        <Stack gap="lg">
          {/* Header */}
          <Card withBorder radius="lg" p="xl" style={{ background: 'linear-gradient(135deg, #1b365d 0%, #2a4a7a 100%)' }}>
            <Group justify="space-between" align="center">
              <Group gap="md">
                <Avatar size={60} radius="md" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
                  <IconUser size={30} color="white" />
                </Avatar>
                <Box>
                  <Title order={1} c="white" size="h2">Gestion des Agents</Title>
                  <Text c="gray.3" size="sm">Gérez les informations des agents et leurs affectations</Text>
                  <Group gap="xs" mt={8}>
                    <Badge size="sm" variant="white" color="blue">BD-SDI v2.0</Badge>
                    <Badge size="sm" variant="white" color="green">Sécurité renforcée</Badge>
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
                <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Total Agents</Text>
                <ThemeIcon size="lg" radius="md" color="blue" variant="light"><IconUser size={18} /></ThemeIcon>
              </Group>
              <Text fw={800} size="xl" c="blue">{totalAgents}</Text>
              <Progress value={100} size="sm" radius="xl" color="blue" mt={8} />
              <Text size="xs" c="dimmed" mt={4}>Effectif total</Text>
            </Paper>
            <Paper p="md" radius="lg" withBorder style={{ backgroundColor: '#e8f5e9' }}>
              <Group justify="space-between" mb="xs">
                <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Hommes</Text>
                <ThemeIcon size="lg" radius="md" color="green" variant="light"><IconUser size={18} /></ThemeIcon>
              </Group>
              <Text fw={800} size="xl" c="green">{maleCount}</Text>
              <Progress value={totalAgents > 0 ? (maleCount / totalAgents) * 100 : 0} size="sm" radius="xl" color="green" mt={8} />
              <Text size="xs" c="dimmed" mt={4}>{totalAgents > 0 ? ((maleCount / totalAgents) * 100).toFixed(1) : 0}% de l'effectif</Text>
            </Paper>
            <Paper p="md" radius="lg" withBorder style={{ backgroundColor: '#fce4ec' }}>
              <Group justify="space-between" mb="xs">
                <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Femmes</Text>
                <ThemeIcon size="lg" radius="md" color="pink" variant="light"><IconUser size={18} /></ThemeIcon>
              </Group>
              <Text fw={800} size="xl" c="pink">{femaleCount}</Text>
              <Progress value={totalAgents > 0 ? (femaleCount / totalAgents) * 100 : 0} size="sm" radius="xl" color="pink" mt={8} />
              <Text size="xs" c="dimmed" mt={4}>{totalAgents > 0 ? ((femaleCount / totalAgents) * 100).toFixed(1) : 0}% de l'effectif</Text>
            </Paper>
            <Paper p="md" radius="lg" withBorder style={{ backgroundColor: '#f3e5f5' }}>
              <Group justify="space-between" mb="xs">
                <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Services</Text>
                <ThemeIcon size="lg" radius="md" color="violet" variant="light"><IconBuilding size={18} /></ThemeIcon>
              </Group>
              <Text fw={800} size="xl" c="violet">{servicesList.length}</Text>
              <Progress value={100} size="sm" radius="xl" color="violet" mt={8} />
              <Text size="xs" c="dimmed" mt={4}>Services distincts</Text>
            </Paper>
          </SimpleGrid>

          {/* Barre d'actions */}
          <Card withBorder radius="lg" shadow="sm" p="md">
            <Group justify="space-between" align="flex-end" mb="md">
              <Box>
                <Text fw={600} size="lg">Liste des agents</Text>
                <Text size="xs" c="dimmed">{filteredAgents.length} agent(s) trouvé(s)</Text>
              </Box>
              <Group>
                <Tooltip label="Actualiser">
                  <ActionIcon onClick={loadAgents} size="lg" variant="light" color="blue">
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
                  Nouvel Agent
                </Button>
              </Group>
            </Group>

            <Divider my="md" />

            {/* Filtres */}
            <Grid>
              <Grid.Col span={{ base: 12, md: 5 }}>
                <TextInput
                  placeholder="Rechercher par nom, prénom ou matricule..."
                  leftSection={<IconSearch size={16} />}
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setActivePage(1); }}
                  size="sm"
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6, md: 2 }}>
                <Select
                  placeholder="Sexe"
                  value={selectedSexe}
                  onChange={setSelectedSexe}
                  clearable
                  data={[{ value: 'M', label: 'Masculin' }, { value: 'F', label: 'Féminin' }]}
                  size="sm"
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6, md: 2.5 }}>
                <Select
                  placeholder="Service"
                  value={selectedService}
                  onChange={setSelectedService}
                  clearable
                  data={servicesList.map(s => ({ value: s || '', label: s || '' }))}
                  searchable
                  size="sm"
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6, md: 2.5 }}>
                <Select
                  placeholder="Entité"
                  value={selectedEntite}
                  onChange={setSelectedEntite}
                  clearable
                  data={[...entiteOptions, ...entitesList.map(s => ({ value: s || '', label: s || '' }))]}
                  searchable
                  size="sm"
                />
              </Grid.Col>
            </Grid>
          </Card>

          {/* Tableau */}
          <Card withBorder radius="lg" shadow="sm" p="0">
            {loading ? (
              <div style={{ position: 'relative', minHeight: 300 }}>
                <LoadingOverlay visible={true} />
                <Center py="xl">
                  <Text c="dimmed">Chargement des agents...</Text>
                </Center>
              </div>
            ) : (
              <>
                <ScrollArea style={{ maxHeight: 500 }}>
                  <Table striped highlightOnHover>
                    <Table.Thead style={{ backgroundColor: '#1b365d' }}>
                      <Table.Tr>
                        <Table.Th style={{ color: 'white' }}>Matricule</Table.Th>
                        <Table.Th style={{ color: 'white' }}>Agent</Table.Th>
                        <Table.Th style={{ color: 'white' }}>Grade</Table.Th>
                        <Table.Th style={{ color: 'white' }}>Service / Entité</Table.Th>
                        <Table.Th style={{ color: 'white' }}>Sexe</Table.Th>
                        <Table.Th style={{ color: 'white', textAlign: 'center' }}>Actions</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {paginatedAgents.map((agent) => (
                        <Table.Tr key={agent.PersonnelID}>
                          <Table.Td>
                            <Group gap="xs" wrap="nowrap">
                              <IconId size={14} color="gray" />
                              <Text fw={500} size="sm">{agent.Matricule}</Text>
                            </Group>
                          </Table.Td>
                          <Table.Td>
                            <Group gap="sm" wrap="nowrap">
                              <Avatar radius="xl" size={32} color={agent.Sexe === 'M' ? 'blue' : 'pink'}>
                                {agent.Nom?.charAt(0)}{agent.Prenom?.charAt(0)}
                              </Avatar>
                              <Box>
                                <Text fw={500} size="sm">{agent.Nom} {agent.Prenom}</Text>
                                <Text size="xs" c="dimmed">ID: {agent.PersonnelID}</Text>
                              </Box>
                            </Group>
                          </Table.Td>
                          <Table.Td>
                            <Badge variant="light" color="cyan" size="sm">
                              {getGradeLibelle(agent.GradeID)}
                            </Badge>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm">{agent.Service || '-'}</Text>
                            <Text size="xs" c="dimmed">{agent.Entite || '-'}</Text>
                          </Table.Td>
                          <Table.Td>
                            <Badge color={agent.Sexe === 'M' ? 'blue' : 'pink'} variant="filled" size="sm">
                              {agent.Sexe === 'M' ? 'Masculin' : agent.Sexe === 'F' ? 'Féminin' : '-'}
                            </Badge>
                          </Table.Td>
                          <Table.Td>
                            <Group gap="xs" justify="center">
                              <Tooltip label="Voir détails" withArrow>
                                <ActionIcon onClick={() => handleView(agent)} color="green" variant="light" size="sm">
                                  <IconUser size={16} />
                                </ActionIcon>
                              </Tooltip>
                              <Tooltip label="Modifier" withArrow>
                                <ActionIcon onClick={() => handleEdit(agent)} color="blue" variant="light" size="sm">
                                  <IconEdit size={16} />
                                </ActionIcon>
                              </Tooltip>
                              <Tooltip label="Supprimer" withArrow>
                                <ActionIcon onClick={() => { setAgentToDelete(agent.PersonnelID); setDeleteModalOpen(true); }} color="red" variant="light" size="sm">
                                  <IconTrash size={16} />
                                </ActionIcon>
                              </Tooltip>
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
                      <Text c="dimmed" size="lg">Aucun agent trouvé</Text>
                      <Button variant="light" onClick={() => { setSearchTerm(''); setSelectedSexe(null); setSelectedService(null); setSelectedEntite(null); }} size="sm">
                        Réinitialiser les filtres
                      </Button>
                    </Stack>
                  </Center>
                )}
              </>
            )}
          </Card>

          {totalPages > 1 && (
            <Group justify="center" mt="md">
              <Pagination total={totalPages} value={activePage} onChange={setActivePage} color="blue" size="sm" />
            </Group>
          )}
        </Stack>
      </Container>

    {/* Modal Formulaire (Création/Modification) */}
<Modal
  opened={modalOpen}
  onClose={() => { setModalOpen(false); setEditingId(null); form.reset(); }}
  title={
    <Group gap="sm">
      {editingId ? <IconEdit size={20} color="#1b365d" /> : <IconPlus size={20} color="#1b365d" />}
      <Text fw={700} size="lg">{editingId ? "Modifier l'Agent" : "Nouvel Agent"}</Text>
    </Group>
  }
  size="xl"
  radius="md"
  centered
  overlayProps={{ blur: 3, backgroundOpacity: 0.55 }}
  transitionProps={{ transition: 'fade', duration: 200 }}
>
  <form onSubmit={form.onSubmit(handleSubmit)}>
    <Stack gap="md">
      <Divider label="Informations personnelles" labelPosition="center" />
      <Grid>
        <Grid.Col span={6}>
          <TextInput 
            label="Matricule" 
            placeholder="Ex: POL-2024-001"
            leftSection={<IconId size={16} />}
            {...form.getInputProps('Matricule')} 
            required 
          />
        </Grid.Col>
        <Grid.Col span={6}>
          <TextInput 
            label="Clé" 
            placeholder="Clé d'identification"
            {...form.getInputProps('Cle')} 
          />
        </Grid.Col>
        <Grid.Col span={6}>
          <TextInput 
            label="Nom" 
            placeholder="Nom de l'agent"
            {...form.getInputProps('Nom')} 
            required 
          />
        </Grid.Col>
        <Grid.Col span={6}>
          <TextInput 
            label="Prénom" 
            placeholder="Prénom de l'agent"
            {...form.getInputProps('Prenom')} 
            required 
          />
        </Grid.Col>
        <Grid.Col span={6}>
          <Select
            label="Grade"
            placeholder="Sélectionner un grade"
            data={gradeOptions}
            searchable
            clearable
            {...form.getInputProps('GradeID')}
          />
        </Grid.Col>
        <Grid.Col span={6}>
          <Select
            label="Sexe"
            placeholder="Sélectionner"
            data={[
              { value: 'M', label: 'Masculin' },
              { value: 'F', label: 'Féminin' },
            ]}
            {...form.getInputProps('Sexe')}
          />
        </Grid.Col>
      </Grid>

      <Divider label="Informations professionnelles" labelPosition="center" />
      <Grid>
        <Grid.Col span={6}>
          <Select
            label="Service"
            placeholder="Sélectionner un service"
            data={serviceOptions}
            searchable
            clearable
            {...form.getInputProps('Service')}
          />
        </Grid.Col>
        <Grid.Col span={6}>
          <Select
            label="Entité"
            placeholder="Sélectionner une entité"
            data={entiteOptions}
            searchable
            clearable
            {...form.getInputProps('Entite')}
          />
        </Grid.Col>
      </Grid>

      <Divider label="Photo" labelPosition="center" />
      <Grid>
        <Grid.Col span={12}>
          <TextInput 
            label="URL Photo" 
            placeholder="Lien vers la photo (optionnel)"
            leftSection={<IconPhoto size={16} />}
            {...form.getInputProps('Photo')} 
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
  onClose={() => setViewModalOpen(false)}
  title={
    <Group gap="sm">
      <IconUser size={20} color="#1b365d" />
      <Text fw={700} size="lg">Détails de l'Agent</Text>
    </Group>
  }
  size="md"
  radius="md"
  centered
  overlayProps={{ blur: 3, backgroundOpacity: 0.55 }}
  transitionProps={{ transition: 'fade', duration: 200 }}
>
  {selectedAgent && (
    <Stack gap="md">
      <Group justify="center">
        <Avatar size={120} radius={120} color={selectedAgent.Sexe === 'M' ? 'blue' : 'pink'}>
          <IconUser size={60} />
        </Avatar>
      </Group>
      
      <Divider />
      
      <Grid>
        <Grid.Col span={6}>
          <Text size="xs" c="dimmed">Matricule</Text>
          <Text fw={600} size="md">{selectedAgent.Matricule}</Text>
        </Grid.Col>
        <Grid.Col span={6}>
          <Text size="xs" c="dimmed">Clé</Text>
          <Text fw={600} size="md">{selectedAgent.Cle || '-'}</Text>
        </Grid.Col>
        <Grid.Col span={12}>
          <Text size="xs" c="dimmed">Nom complet</Text>
          <Text fw={600} size="md">{selectedAgent.Nom} {selectedAgent.Prenom}</Text>
        </Grid.Col>
        <Grid.Col span={6}>
          <Text size="xs" c="dimmed">Grade</Text>
          <Badge color="cyan" size="lg">{getGradeLibelle(selectedAgent.GradeID)}</Badge>
        </Grid.Col>
        <Grid.Col span={6}>
          <Text size="xs" c="dimmed">Sexe</Text>
          <Badge color={selectedAgent.Sexe === 'M' ? 'blue' : 'pink'} size="lg">
            {selectedAgent.Sexe === 'M' ? 'Masculin' : selectedAgent.Sexe === 'F' ? 'Féminin' : '-'}
          </Badge>
        </Grid.Col>
        <Grid.Col span={6}>
          <Text size="xs" c="dimmed">Service</Text>
          <Text fw={500}>{selectedAgent.Service || '-'}</Text>
        </Grid.Col>
        <Grid.Col span={6}>
          <Text size="xs" c="dimmed">Entité</Text>
          <Text fw={500}>{selectedAgent.Entite || '-'}</Text>
        </Grid.Col>
      </Grid>

      <Divider />
      <Group justify="center">
        <Badge variant="light" color="blue">ID: {selectedAgent.PersonnelID}</Badge>
        <Badge variant="light" color="gray">Enregistré le {dayjs().format('DD/MM/YYYY')}</Badge>
      </Group>
    </Stack>
  )}
</Modal>

{/* Modal Confirmation Suppression */}
<Modal
  opened={deleteModalOpen}
  onClose={() => { setDeleteModalOpen(false); setAgentToDelete(null); }}
  title={
    <Group gap="sm">
      <IconTrash size={20} color="red" />
      <Text fw={700} size="lg">Confirmation de suppression</Text>
    </Group>
  }
  size="sm"
  radius="md"
  centered
  overlayProps={{ blur: 3, backgroundOpacity: 0.55 }}
  transitionProps={{ transition: 'fade', duration: 200 }}
>
  <Stack gap="md">
    <Alert color="red" variant="light" icon={<IconInfoCircle size={16} />}>
      Êtes-vous sûr de vouloir supprimer cet agent ?
    </Alert>
    <Text size="sm" c="dimmed" ta="center">Cette action est irréversible et toutes les données associées seront perdues.</Text>
    <Group justify="space-between" mt="md">
      <Button variant="light" onClick={() => { setDeleteModalOpen(false); setAgentToDelete(null); }}>Annuler</Button>
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
  radius="md"
  overlayProps={{ blur: 3, backgroundOpacity: 0.55 }}
  transitionProps={{ transition: 'fade', duration: 200 }}
>
  <Stack gap="md">
    <Paper p="md" radius="md" withBorder bg="blue.0">
      <Text fw={600} size="sm" mb="md">📌 Fonctionnalités :</Text>
      <Stack gap="xs">
        <Text size="sm">1️⃣ Renseignez les informations personnelles de l'agent (matricule, nom, prénom)</Text>
        <Text size="sm">2️⃣ Sélectionnez le grade et le sexe de l'agent</Text>
        <Text size="sm">3️⃣ Choisissez le service et l'entité d'affectation</Text>
        <Text size="sm">4️⃣ Exportez la liste au format Excel, PDF ou Word selon vos besoins</Text>
        <Text size="sm">5️⃣ Utilisez la recherche et les filtres pour trouver rapidement un agent</Text>
        <Text size="sm">6️⃣ Cliquez sur l'icône 👁️ pour voir les détails complets</Text>
      </Stack>
    </Paper>
    <Divider />
    <Text size="xs" c="dimmed" ta="center">Version 2.0.0 - BD-SDI (Base de Données de Suivi des Inspections)</Text>
  </Stack>
</Modal>
    </Box>
  );
}