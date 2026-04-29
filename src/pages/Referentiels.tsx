import { useEffect, useState } from 'react';
import {
  Tabs,
  Table,
  Button,
  Modal,
  TextInput,
  Stack,
  Card,
  Group,
  ActionIcon,
  Text,
  Badge,
  Alert,
  Switch,
  NumberInput,
  Textarea,
  Tooltip,
  Grid,
  Paper,
  Avatar,
  ScrollArea,
  Container,
  SimpleGrid,
  ThemeIcon,
  Loader,
  Center,
  Progress,
  Box,
  Select,
  Pagination,
  Flex,
  Title
} from '@mantine/core';
import { useForm } from '@mantine/form';
import {
  IconPlus,
  IconEdit,
  IconTrash,
  IconGavel,
  IconUserStar,
  IconHdr,
  IconHistory,
  IconDatabase,
  IconSettings,
  IconCheck,
  IconX,
  IconRefresh,
  IconSearch,
  IconFilter,
  IconArrowUp,
  IconArrowDown,
  IconAlertTriangle
} from '@tabler/icons-react';
import { invoke } from '@tauri-apps/api/core';
import { notifications } from '@mantine/notifications';
import dayjs from 'dayjs';

interface Grade {
  GradeID: number;
  LibelleGrade: string;
  Ordre?: number;
}

interface Sanction {
  SanctionID: number;
  LibelleSanction: string;
  Niveau?: number;
  Categorie?: string;
}

interface EnteteConfig {
  ConfigID: number;
  Composant: string;
  Champ: string;
  Valeur: string;
  Ordre: number;
  Actif: number;
}

interface Log {
  LogID: number;
  Utilisateur: string;
  Action: string;
  TableConcernee: string;
  EnregistrementID: number;
  DateLog: string;
  Details: string;
}

export default function Referentiels() {
  const [activeTab, setActiveTab] = useState<string | null>('grades');
  const [grades, setGrades] = useState<Grade[]>([]);
  const [sanctions, setSanctions] = useState<Sanction[]>([]);
  const [enteteConfigs, setEnteteConfigs] = useState<Record<string, EnteteConfig[]>>({
    app: [],
    rapport: [],
    dossier: [],
    recommandation: []
  });
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Pagination et filtres pour grades
  const [gradeSearch, setGradeSearch] = useState('');
  const [gradePage, setGradePage] = useState(1);
  const gradeItemsPerPage = 10;
  
  // Pagination et filtres pour sanctions
  const [sanctionSearch, setSanctionSearch] = useState('');
  const [filterNiveau, setFilterNiveau] = useState<string | null>(null);
  const [sanctionPage, setSanctionPage] = useState(1);
  const sanctionItemsPerPage = 10;
  
  // Modals states
  const [gradeModalOpen, setGradeModalOpen] = useState(false);
  const [sanctionModalOpen, setSanctionModalOpen] = useState(false);
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteConfigModalOpen, setDeleteConfigModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: number; type: 'grade' | 'sanction' } | null>(null);
  const [configToDelete, setConfigToDelete] = useState<EnteteConfig | null>(null);
  const [editingGrade, setEditingGrade] = useState<Grade | null>(null);
  const [editingSanction, setEditingSanction] = useState<Sanction | null>(null);
  const [editingConfig, setEditingConfig] = useState<EnteteConfig | null>(null);
  const [selectedComposant, setSelectedComposant] = useState<string>('app');

  const gradeForm = useForm({
    initialValues: { LibelleGrade: '' },
    validate: {
      LibelleGrade: (value) => (value ? null : 'Le libellé est requis')
    }
  });

  const sanctionForm = useForm({
    initialValues: { LibelleSanction: '', Niveau: 0, Categorie: '' },
    validate: {
      LibelleSanction: (value) => (value ? null : 'Le libellé est requis'),
      Niveau: (value) => (value && (value < 1 || value > 12) ? 'Le niveau doit être entre 1 et 12' : null)
    }
  });

  const configForm = useForm({
    initialValues: { Champ: '', Valeur: '', Ordre: 0, Actif: 1 },
    validate: {
      Champ: (value) => (value ? null : 'Le nom du champ est requis'),
      Valeur: (value) => (value ? null : 'La valeur est requise')
    }
  });

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    await Promise.all([
      loadGrades(),
      loadSanctions(),
      loadAllEnteteConfigs(),
      loadLogs()
    ]);
    setLoading(false);
  };

  const loadGrades = async () => {
    try {
      const result = await invoke('get_grades');
      const sorted = (result as Grade[]).sort((a, b) => (a.Ordre || a.GradeID) - (b.Ordre || b.GradeID));
      setGrades(sorted);
    } catch (error) {
      notifications.show({ title: 'Erreur', message: 'Impossible de charger les grades', color: 'red' });
    }
  };

  const loadSanctions = async () => {
    try {
      const result = await invoke('get_sanctions');
      setSanctions(result as Sanction[]);
    } catch (error) {
      notifications.show({ title: 'Erreur', message: 'Impossible de charger les sanctions', color: 'red' });
    }
  };

  const loadEnteteConfigs = async (composant: string) => {
    try {
      const result = await invoke('get_entete_config', { composant });
      setEnteteConfigs(prev => ({ ...prev, [composant]: result as EnteteConfig[] }));
    } catch (error) {
      console.error(`Erreur chargement config ${composant}:`, error);
    }
  };

  const loadAllEnteteConfigs = async () => {
    await Promise.all([
      loadEnteteConfigs('app'),
      loadEnteteConfigs('rapport'),
      loadEnteteConfigs('dossier'),
      loadEnteteConfigs('recommandation')
    ]);
  };

  const loadLogs = async () => {
    try {
      const result = await invoke('get_logs', { limit: 100 });
      setLogs(result as Log[]);
    } catch (error) {
      console.error('Erreur chargement logs:', error);
    }
  };

  // Déplacement des grades
  const moveGradeUp = async (index: number) => {
    if (index === 0) return;
    const newGrades = [...grades];
    const temp = newGrades[index];
    newGrades[index] = newGrades[index - 1];
    newGrades[index - 1] = temp;
    
    for (let i = 0; i < newGrades.length; i++) {
      const newOrder = i + 1;
      if (newGrades[i].Ordre !== newOrder) {
        await invoke('update_grade', {
          gradeId: newGrades[i].GradeID,
          libelle: newGrades[i].LibelleGrade,
          ordre: newOrder
        }).catch(console.error);
      }
    }
    await loadGrades();
    notifications.show({ title: 'Succès', message: 'Ordre modifié', color: 'green', icon: <IconCheck size={16} /> });
  };

  const moveGradeDown = async (index: number) => {
    if (index === grades.length - 1) return;
    const newGrades = [...grades];
    const temp = newGrades[index];
    newGrades[index] = newGrades[index + 1];
    newGrades[index + 1] = temp;
    
    for (let i = 0; i < newGrades.length; i++) {
      const newOrder = i + 1;
      if (newGrades[i].Ordre !== newOrder) {
        await invoke('update_grade', {
          gradeId: newGrades[i].GradeID,
          libelle: newGrades[i].LibelleGrade,
          ordre: newOrder
        }).catch(console.error);
      }
    }
    await loadGrades();
    notifications.show({ title: 'Succès', message: 'Ordre modifié', color: 'green', icon: <IconCheck size={16} /> });
  };

  const handleSaveGrade = async (values: typeof gradeForm.values) => {
    try {
      if (editingGrade) {
        // CORRECTION: Ajouter ordre même en modification
        await invoke('update_grade', { 
          gradeId: editingGrade.GradeID, 
          libelle: values.LibelleGrade, 
          ordre: editingGrade.Ordre || editingGrade.GradeID 
        });
        notifications.show({ title: 'Succès', message: 'Grade modifié', color: 'green', icon: <IconCheck size={16} /> });
      } else {
        const newOrdre = grades.length + 1;
        await invoke('create_grade', { libelle: values.LibelleGrade, ordre: newOrdre });
        notifications.show({ title: 'Succès', message: 'Grade ajouté', color: 'green', icon: <IconCheck size={16} /> });
      }
      setGradeModalOpen(false);
      gradeForm.reset();
      setEditingGrade(null);
      loadGrades();
    } catch (error) {
      notifications.show({ title: 'Erreur', message: `Erreur: ${error}`, color: 'red', icon: <IconX size={16} /> });
    }
  };

  const handleSaveSanction = async (values: typeof sanctionForm.values) => {
    try {
      if (editingSanction) {
        await invoke('update_sanction', { 
          sanctionId: editingSanction.SanctionID, 
          libelle: values.LibelleSanction, 
          niveau: values.Niveau 
        });
        notifications.show({ title: 'Succès', message: 'Sanction modifiée', color: 'green', icon: <IconCheck size={16} /> });
      } else {
        await invoke('create_sanction', { libelle: values.LibelleSanction, niveau: values.Niveau });
        notifications.show({ title: 'Succès', message: 'Sanction ajoutée', color: 'green', icon: <IconCheck size={16} /> });
      }
      setSanctionModalOpen(false);
      sanctionForm.reset();
      setEditingSanction(null);
      loadSanctions();
    } catch (error) {
      notifications.show({ title: 'Erreur', message: `Erreur: ${error}`, color: 'red', icon: <IconX size={16} /> });
    }
  };

  const handleSaveConfig = async (values: typeof configForm.values) => {
    try {
      if (editingConfig) {
        await invoke('update_entete_config', {
          configId: editingConfig.ConfigID,
          valeur: values.Valeur,
          actif: values.Actif
        });
        notifications.show({ title: 'Succès', message: 'Configuration modifiée', color: 'green', icon: <IconCheck size={16} /> });
      } else {
        await invoke('add_entete_config', {
          composant: selectedComposant,
          champ: values.Champ,
          valeur: values.Valeur,
          ordre: values.Ordre
        });
        notifications.show({ title: 'Succès', message: 'Configuration ajoutée', color: 'green', icon: <IconCheck size={16} /> });
      }
      setConfigModalOpen(false);
      setEditingConfig(null);
      configForm.reset();
      loadEnteteConfigs(selectedComposant);
    } catch (error) {
      notifications.show({ title: 'Erreur', message: `Erreur: ${error}`, color: 'red', icon: <IconX size={16} /> });
    }
  };

  const handleDeleteConfig = async () => {
    if (!configToDelete) return;
    try {
      await invoke('delete_entete_config', { configId: configToDelete.ConfigID });
      notifications.show({ title: 'Succès', message: 'Configuration supprimée', color: 'green', icon: <IconCheck size={16} /> });
      setDeleteConfigModalOpen(false);
      setConfigToDelete(null);
      await loadEnteteConfigs(selectedComposant);
      await loadLogs();
    } catch (error) {
      notifications.show({ title: 'Erreur', message: 'Impossible de supprimer', color: 'red', icon: <IconX size={16} /> });
    }
  };

  const confirmDelete = (id: number, type: 'grade' | 'sanction') => {
    setItemToDelete({ id, type });
    setDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    try {
      if (itemToDelete.type === 'grade') {
        await invoke('delete_grade', { gradeId: itemToDelete.id });
        notifications.show({ title: 'Succès', message: 'Grade supprimé', color: 'green', icon: <IconCheck size={16} /> });
        loadGrades();
      } else {
        await invoke('delete_sanction', { sanctionId: itemToDelete.id });
        notifications.show({ title: 'Succès', message: 'Sanction supprimée', color: 'green', icon: <IconCheck size={16} /> });
        loadSanctions();
      }
      setDeleteModalOpen(false);
      setItemToDelete(null);
      loadLogs();
    } catch (error) {
      notifications.show({ title: 'Erreur', message: 'Impossible de supprimer', color: 'red', icon: <IconX size={16} /> });
    }
  };

  const toggleConfigActive = async (config: EnteteConfig) => {
    try {
      await invoke('update_entete_config', {
        configId: config.ConfigID,
        valeur: config.Valeur,
        actif: config.Actif === 1 ? 0 : 1
      });
      loadEnteteConfigs(config.Composant);
      notifications.show({ title: 'Succès', message: 'Configuration mise à jour', color: 'green', icon: <IconCheck size={16} /> });
    } catch (error) {
      notifications.show({ title: 'Erreur', message: 'Erreur lors de la mise à jour', color: 'red', icon: <IconX size={16} /> });
    }
  };

  const getNiveauBadgeColor = (niveau?: number) => {
    if (!niveau) return 'gray';
    if (niveau <= 3) return 'green';
    if (niveau <= 6) return 'yellow';
    if (niveau <= 9) return 'orange';
    return 'red';
  };

  const getNiveauLabel = (niveau?: number) => {
    if (!niveau) return 'Non défini';
    if (niveau <= 3) return 'Léger';
    if (niveau <= 6) return 'Modéré';
    if (niveau <= 9) return 'Grave';
    return 'Très grave';
  };

  // Filtrage des grades avec recherche
  const filteredGrades = grades.filter(grade =>
    grade.LibelleGrade.toLowerCase().includes(gradeSearch.toLowerCase())
  );
  
  // Pagination des grades
  const gradeTotalPages = Math.ceil(filteredGrades.length / gradeItemsPerPage);
  const paginatedGrades = filteredGrades.slice(
    (gradePage - 1) * gradeItemsPerPage,
    gradePage * gradeItemsPerPage
  );

  // Filtrage des sanctions
  const filteredSanctions = sanctions.filter(sanction => {
    const matchesSearch = sanction.LibelleSanction.toLowerCase().includes(sanctionSearch.toLowerCase());
    const matchesNiveau = !filterNiveau || 
      (filterNiveau === 'leger' && sanction.Niveau && sanction.Niveau <= 3) ||
      (filterNiveau === 'modere' && sanction.Niveau && sanction.Niveau >= 4 && sanction.Niveau <= 6) ||
      (filterNiveau === 'grave' && sanction.Niveau && sanction.Niveau >= 7 && sanction.Niveau <= 9) ||
      (filterNiveau === 'tres-grave' && sanction.Niveau && sanction.Niveau >= 10);
    return matchesSearch && matchesNiveau;
  });

  // Pagination des sanctions
  const sanctionTotalPages = Math.ceil(filteredSanctions.length / sanctionItemsPerPage);
  const paginatedSanctions = filteredSanctions.slice(
    (sanctionPage - 1) * sanctionItemsPerPage,
    sanctionPage * sanctionItemsPerPage
  );

  const statsCards = [
    { label: 'Grades', value: grades.length, icon: IconUserStar, color: 'blue', bg: '#e8f4fd' },
    { label: 'Sanctions', value: sanctions.length, icon: IconGavel, color: 'red', bg: '#ffebee' },
    { label: 'Configurations', value: Object.values(enteteConfigs).flat().length, icon: IconSettings, color: 'green', bg: '#e8f5e9' },
    { label: 'Historique', value: logs.length, icon: IconHistory, color: 'orange', bg: '#fff3e0' }
  ];

  if (loading) {
    return (
      <Center style={{ height: '50vh' }}>
        <Card withBorder radius="lg" p="xl">
          <Stack align="center" gap="md">
            <Loader size="xl" color="#1b365d" />
            <Text>Chargement des référentiels...</Text>
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
            <Flex justify="space-between" align="center" wrap="wrap" gap="md">
              <Group gap="md">
                <Avatar size={60} radius="md" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
                  <IconDatabase size={30} color="white" />
                </Avatar>
                <Box>
                  <Title order={1} c="white" size="h2">Configuration des Référentiels</Title>
                  <Text c="gray.3" size="sm">Gérez les grades, sanctions et personnalisation des en-têtes</Text>
                  <Group gap="xs" mt={8}>
                    <Badge size="sm" variant="white" color="blue">BD-SDI v2.0</Badge>
                    <Badge size="sm" variant="white" color="green">Paramètres système</Badge>
                  </Group>
                </Box>
              </Group>
              <Button variant="light" color="white" leftSection={<IconRefresh size={18} />} onClick={loadAllData} radius="md">
                Actualiser
              </Button>
            </Flex>
          </Card>

          {/* Stats Cards */}
          <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
            {statsCards.map((stat) => (
              <Paper key={stat.label} p="md" radius="lg" withBorder style={{ backgroundColor: stat.bg }}>
                <Group justify="space-between" mb="xs">
                  <Text size="xs" c="dimmed" tt="uppercase" fw={600}>{stat.label}</Text>
                  <ThemeIcon size="lg" radius="md" color={stat.color} variant="light">
                    <stat.icon size={18} />
                  </ThemeIcon>
                </Group>
                <Text fw={800} size="xl" c={stat.color}>{stat.value}</Text>
                <Progress value={stat.value > 0 ? 100 : 0} size="sm" radius="xl" color={stat.color} mt={8} />
              </Paper>
            ))}
          </SimpleGrid>

          {/* Tabs - CORRECTION: remplacer &[data-active] par &[dataActive] */}
          <Card withBorder radius="lg" shadow="sm" p={0}>
            <Tabs value={activeTab} onChange={setActiveTab} variant="pills" radius="md">
              <Tabs.List grow p="md" style={{ backgroundColor: '#f8f9fa', borderBottom: '1px solid #e9ecef' }}>
                <Tabs.Tab value="grades" leftSection={<IconUserStar size={18} />}>Grades</Tabs.Tab>
                <Tabs.Tab value="sanctions" leftSection={<IconGavel size={18} />}>Sanctions</Tabs.Tab>
                <Tabs.Tab value="entete" leftSection={<IconHdr size={18} />}>En-têtes</Tabs.Tab>
                <Tabs.Tab value="logs" leftSection={<IconHistory size={18} />}>Historique</Tabs.Tab>
              </Tabs.List>

              {/* Onglet Grades */}
              <Tabs.Panel value="grades" p="md">
                <Stack gap="md">
                  <Flex justify="space-between" align="center" wrap="wrap" gap="md">
                    <TextInput
                      placeholder="Rechercher un grade..."
                      leftSection={<IconSearch size={16} />}
                      value={gradeSearch}
                      onChange={(e) => { setGradeSearch(e.currentTarget.value); setGradePage(1); }}
                      style={{ width: 300 }}
                    />
                    <Button leftSection={<IconPlus size={16} />} onClick={() => { setEditingGrade(null); gradeForm.reset(); setGradeModalOpen(true); }} variant="gradient" gradient={{ from: '#1b365d', to: '#2a4a7a' }}>
                      Nouveau grade
                    </Button>
                  </Flex>

                  <ScrollArea style={{ maxHeight: 500 }}>
                    <Table striped highlightOnHover>
                      <Table.Thead style={{ backgroundColor: '#1b365d' }}>
                        <Table.Tr>
                          <Table.Th style={{ color: 'white', width: 80, textAlign: 'center' }}>Ordre</Table.Th>
                          <Table.Th style={{ color: 'white' }}>Libellé du grade</Table.Th>
                          <Table.Th style={{ color: 'white', width: 180, textAlign: 'center' }}>Actions</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {paginatedGrades.length === 0 ? (
                          <Table.Tr>
                            <Table.Td colSpan={3}>
                              <Center py="xl">
                                <Stack align="center">
                                  <IconUserStar size={48} color="gray" />
                                  <Text c="dimmed">Aucun grade trouvé</Text>
                                </Stack>
                              </Center>
                            </Table.Td>
                          </Table.Tr>
                        ) : (
                          paginatedGrades.map((grade, _idx) => {
                            const globalIndex = grades.findIndex(g => g.GradeID === grade.GradeID);
                            return (
                              <Table.Tr key={grade.GradeID}>
                                <Table.Td ta="center">
                                  <Badge color="cyan" variant="filled" size="lg">#{globalIndex + 1}</Badge>
                                </Table.Td>
                                <Table.Td>
                                  <Text fw={500} size="md">{grade.LibelleGrade}</Text>
                                </Table.Td>
                                <Table.Td ta="center">
                                  <Group gap="xs" justify="center" wrap="nowrap">
                                    <Tooltip label="Monter">
                                      <ActionIcon onClick={() => moveGradeUp(globalIndex)} disabled={globalIndex === 0} color="blue" variant="light">
                                        <IconArrowUp size={16} />
                                      </ActionIcon>
                                    </Tooltip>
                                    <Tooltip label="Descendre">
                                      <ActionIcon onClick={() => moveGradeDown(globalIndex)} disabled={globalIndex === grades.length - 1} color="blue" variant="light">
                                        <IconArrowDown size={16} />
                                      </ActionIcon>
                                    </Tooltip>
                                    <Tooltip label="Modifier">
                                      <ActionIcon onClick={() => { setEditingGrade(grade); gradeForm.setValues({ LibelleGrade: grade.LibelleGrade }); setGradeModalOpen(true); }} color="orange" variant="light">
                                        <IconEdit size={16} />
                                      </ActionIcon>
                                    </Tooltip>
                                    <Tooltip label="Supprimer">
                                      <ActionIcon onClick={() => confirmDelete(grade.GradeID, 'grade')} color="red" variant="light">
                                        <IconTrash size={16} />
                                      </ActionIcon>
                                    </Tooltip>
                                  </Group>
                                </Table.Td>
                              </Table.Tr>
                            );
                          })
                        )}
                      </Table.Tbody>
                    </Table>
                  </ScrollArea>

                  {gradeTotalPages > 1 && (
                    <Group justify="center" mt="md">
                      <Pagination total={gradeTotalPages} value={gradePage} onChange={setGradePage} color="blue" />
                    </Group>
                  )}
                </Stack>
              </Tabs.Panel>

              {/* Onglet Sanctions */}
              <Tabs.Panel value="sanctions" p="md">
                <Stack gap="md">
                  <Flex justify="space-between" align="center" wrap="wrap" gap="md">
                    <Group gap="md">
                      <TextInput
                        placeholder="Rechercher une sanction..."
                        leftSection={<IconSearch size={16} />}
                        value={sanctionSearch}
                        onChange={(e) => { setSanctionSearch(e.currentTarget.value); setSanctionPage(1); }}
                        style={{ width: 250 }}
                      />
                      <Select
                        placeholder="Niveau de gravité"
                        leftSection={<IconFilter size={16} />}
                        value={filterNiveau}
                        onChange={(val) => { setFilterNiveau(val); setSanctionPage(1); }}
                        clearable
                        data={[
                          { value: 'leger', label: 'Léger (1-3)' },
                          { value: 'modere', label: 'Modéré (4-6)' },
                          { value: 'grave', label: 'Grave (7-9)' },
                          { value: 'tres-grave', label: 'Très grave (10-12)' }
                        ]}
                        style={{ width: 200 }}
                      />
                    </Group>
                    <Button leftSection={<IconPlus size={16} />} onClick={() => { setEditingSanction(null); sanctionForm.reset(); setSanctionModalOpen(true); }} variant="gradient" gradient={{ from: '#1b365d', to: '#2a4a7a' }}>
                      Nouvelle sanction
                    </Button>
                  </Flex>

                  <ScrollArea style={{ maxHeight: 500 }}>
                    <Table striped highlightOnHover>
                      <Table.Thead style={{ backgroundColor: '#1b365d' }}>
                        <Table.Tr>
                          <Table.Th style={{ color: 'white', width: 80 }}>ID</Table.Th>
                          <Table.Th style={{ color: 'white' }}>Libellé de la sanction</Table.Th>
                          <Table.Th style={{ color: 'white', width: 150 }}>Niveau</Table.Th>
                          <Table.Th style={{ color: 'white', width: 120, textAlign: 'center' }}>Actions</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {paginatedSanctions.length === 0 ? (
                          <Table.Tr>
                            <Table.Td colSpan={4}>
                              <Center py="xl">
                                <Stack align="center">
                                  <IconGavel size={48} color="gray" />
                                  <Text c="dimmed">Aucune sanction trouvée</Text>
                                </Stack>
                              </Center>
                            </Table.Td>
                          </Table.Tr>
                        ) : (
                          paginatedSanctions.map((sanction) => (
                            <Table.Tr key={sanction.SanctionID}>
                              <Table.Td>
                                <Badge variant="light" color={getNiveauBadgeColor(sanction.Niveau)}>{sanction.SanctionID}</Badge>
                              </Table.Td>
                              <Table.Td>
                                <Group gap="sm" wrap="nowrap">
                                  <Text fw={500}>{sanction.LibelleSanction}</Text>
                                  {sanction.Categorie && <Badge variant="outline" size="sm">{sanction.Categorie}</Badge>}
                                </Group>
                              </Table.Td>
                              <Table.Td>
                                <Group gap="xs" wrap="nowrap">
                                  <Badge color={getNiveauBadgeColor(sanction.Niveau)} size="lg">Niveau {sanction.Niveau || 0}</Badge>
                                  <Text size="xs" c="dimmed">({getNiveauLabel(sanction.Niveau)})</Text>
                                </Group>
                              </Table.Td>
                              <Table.Td ta="center">
                                <Group gap="xs" justify="center" wrap="nowrap">
                                  <Tooltip label="Modifier">
                                    <ActionIcon onClick={() => { setEditingSanction(sanction); sanctionForm.setValues({ LibelleSanction: sanction.LibelleSanction, Niveau: sanction.Niveau || 0, Categorie: sanction.Categorie || '' }); setSanctionModalOpen(true); }} color="orange" variant="light">
                                      <IconEdit size={16} />
                                    </ActionIcon>
                                  </Tooltip>
                                  <Tooltip label="Supprimer">
                                    <ActionIcon onClick={() => confirmDelete(sanction.SanctionID, 'sanction')} color="red" variant="light">
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

                  {sanctionTotalPages > 1 && (
                    <Group justify="center" mt="md">
                      <Pagination total={sanctionTotalPages} value={sanctionPage} onChange={setSanctionPage} color="blue" />
                    </Group>
                  )}
                </Stack>
              </Tabs.Panel>

              {/* Onglet Configuration En-tête */}
              <Tabs.Panel value="entete" p="md">
                <Stack gap="md">
                  <Flex justify="space-between" align="center">
                    <Text fw={600} size="lg">Personnalisation des en-têtes</Text>
                    <Button leftSection={<IconPlus size={16} />} onClick={() => { setEditingConfig(null); configForm.reset(); setConfigModalOpen(true); }} variant="gradient" gradient={{ from: '#1b365d', to: '#2a4a7a' }}>
                      Ajouter un champ
                    </Button>
                  </Flex>

                  <Tabs value={selectedComposant} onChange={(value) => setSelectedComposant(value || 'app')} variant="pills">
                    <Tabs.List>
                      <Tabs.Tab value="app">Application</Tabs.Tab>
                      <Tabs.Tab value="rapport">Rapports</Tabs.Tab>
                      <Tabs.Tab value="dossier">Dossiers</Tabs.Tab>
                      <Tabs.Tab value="recommandation">Recommandations</Tabs.Tab>
                    </Tabs.List>
                  </Tabs>

                  <ScrollArea style={{ maxHeight: 400 }}>
                    <Table striped highlightOnHover>
                      <Table.Thead style={{ backgroundColor: '#1b365d' }}>
                        <Table.Tr>
                          <Table.Th style={{ color: 'white' }}>Champ</Table.Th>
                          <Table.Th style={{ color: 'white' }}>Valeur / Template</Table.Th>
                          <Table.Th style={{ color: 'white', width: 100 }}>Statut</Table.Th>
                          <Table.Th style={{ color: 'white', width: 100, textAlign: 'center' }}>Actions</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {enteteConfigs[selectedComposant]?.length === 0 ? (
                          <Table.Tr>
                            <Table.Td colSpan={4}>
                              <Center py="xl">
                                <Stack align="center">
                                  <IconSettings size={48} color="gray" />
                                  <Text c="dimmed">Aucune configuration pour ce composant</Text>
                                </Stack>
                              </Center>
                            </Table.Td>
                          </Table.Tr>
                        ) : (
                          enteteConfigs[selectedComposant]?.map((config) => (
                            <Table.Tr key={config.ConfigID}>
                              <Table.Td><strong>{config.Champ}</strong></Table.Td>
                              <Table.Td><code style={{ fontSize: 12 }}>{config.Valeur}</code></Table.Td>
                              <Table.Td>
                                <Switch checked={config.Actif === 1} onChange={() => toggleConfigActive(config)} size="sm" onLabel="ACTIF" offLabel="INACTIF" />
                              </Table.Td>
                              <Table.Td ta="center">
                                <Group gap="xs" justify="center" wrap="nowrap">
                                  <Tooltip label="Modifier">
                                    <ActionIcon onClick={() => { setEditingConfig(config); configForm.setValues({ Champ: config.Champ, Valeur: config.Valeur, Ordre: config.Ordre, Actif: config.Actif }); setConfigModalOpen(true); }} color="orange" variant="light">
                                      <IconEdit size={16} />
                                    </ActionIcon>
                                  </Tooltip>
                                  <Tooltip label="Supprimer">
                                    <ActionIcon onClick={() => { setConfigToDelete(config); setDeleteConfigModalOpen(true); }} color="red" variant="light">
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

                  <Alert title="ℹ️ Variables disponibles" color="blue" variant="light">
                    <Grid>
                      <Grid.Col span={4}><code>[NUMERO]</code> - Numéro du document</Grid.Col>
                      <Grid.Col span={4}><code>[LIBELLE]</code> - Libellé / Titre</Grid.Col>
                      <Grid.Col span={4}><code>[DATE]</code> - Date du document</Grid.Col>
                      <Grid.Col span={4}><code>[ID]</code> - Identifiant unique</Grid.Col>
                      <Grid.Col span={4}><code>[AGENT]</code> - Nom de l'agent</Grid.Col>
                      <Grid.Col span={4}><code>[ETAT]</code> - État du dossier</Grid.Col>
                    </Grid>
                  </Alert>
                </Stack>
              </Tabs.Panel>

              {/* Onglet Logs */}
              <Tabs.Panel value="logs" p="md">
                <Card withBorder shadow="sm" p="md">
                  <Group justify="space-between" mb="md">
                    <Text fw={600} size="lg">Historique des actions</Text>
                    <Badge color="blue" variant="light">{logs.length} actions</Badge>
                  </Group>
                  <ScrollArea style={{ maxHeight: 500 }}>
                    <Table striped highlightOnHover>
                      <Table.Thead style={{ backgroundColor: '#1b365d' }}>
                        <Table.Tr>
                          <Table.Th style={{ color: 'white', width: 160 }}>Date</Table.Th>
                          <Table.Th style={{ color: 'white', width: 100 }}>Utilisateur</Table.Th>
                          <Table.Th style={{ color: 'white', width: 100 }}>Action</Table.Th>
                          <Table.Th style={{ color: 'white', width: 100 }}>Table</Table.Th>
                          <Table.Th style={{ color: 'white' }}>Détails</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {logs.length === 0 ? (
                          <Table.Tr>
                            <Table.Td colSpan={5}>
                              <Center py="xl">
                                <Stack align="center">
                                  <IconHistory size={48} color="gray" />
                                  <Text c="dimmed">Aucun historique disponible</Text>
                                </Stack>
                              </Center>
                            </Table.Td>
                          </Table.Tr>
                        ) : (
                          logs.slice(0, 100).map((log) => (
                            <Table.Tr key={log.LogID}>
                              <Table.Td>{dayjs(log.DateLog).format('DD/MM/YYYY HH:mm')}</Table.Td>
                              <Table.Td><Badge color="cyan" variant="light">{log.Utilisateur || 'Système'}</Badge></Table.Td>
                              <Table.Td>
                                <Badge color={log.Action === 'CREATE' ? 'green' : log.Action === 'UPDATE' ? 'orange' : 'red'} variant="light">
                                  {log.Action === 'CREATE' ? 'Création' : log.Action === 'UPDATE' ? 'Modification' : 'Suppression'}
                                </Badge>
                              </Table.Td>
                              <Table.Td><Badge variant="outline">{log.TableConcernee}</Badge></Table.Td>
                              <Table.Td><Text size="sm" lineClamp={2}>{log.Details}</Text></Table.Td>
                            </Table.Tr>
                          ))
                        )}
                      </Table.Tbody>
                    </Table>
                  </ScrollArea>
                </Card>
              </Tabs.Panel>
            </Tabs>
          </Card>
        </Stack>
      </Container>

      {/* Modals */}
      <Modal opened={gradeModalOpen} onClose={() => setGradeModalOpen(false)} title={editingGrade ? "Modifier le grade" : "Nouveau grade"} size="md" centered overlayProps={{ blur: 3 }}>
        <form onSubmit={gradeForm.onSubmit(handleSaveGrade)}>
          <Stack>
            <TextInput label="Libellé du grade" placeholder="Ex: Commissaire Divisionnaire de Police" {...gradeForm.getInputProps('LibelleGrade')} required size="md" />
            <Text size="xs" c="dimmed" ta="center">ℹ️ L'ordre sera déterminé par la position (utilisez les flèches pour réorganiser)</Text>
            <Group justify="flex-end" mt="md">
              <Button variant="light" onClick={() => setGradeModalOpen(false)}>Annuler</Button>
              <Button type="submit" color="blue">{editingGrade ? 'Modifier' : 'Créer'}</Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      <Modal opened={sanctionModalOpen} onClose={() => setSanctionModalOpen(false)} title={editingSanction ? "Modifier la sanction" : "Nouvelle sanction"} size="lg" centered overlayProps={{ blur: 3 }}>
        <form onSubmit={sanctionForm.onSubmit(handleSaveSanction)}>
          <Stack>
            <TextInput label="Libellé de la sanction" placeholder="Ex: Révocation" {...sanctionForm.getInputProps('LibelleSanction')} required size="md" />
            <NumberInput label="Niveau de gravité (1-12)" description="1 = moins grave, 12 = très grave" {...sanctionForm.getInputProps('Niveau')} min={1} max={12} size="md" />
            <TextInput label="Catégorie (optionnel)" placeholder="Disciplinaire, Administrative, etc." {...sanctionForm.getInputProps('Categorie')} size="md" />
            <Group justify="flex-end" mt="md">
              <Button variant="light" onClick={() => setSanctionModalOpen(false)}>Annuler</Button>
              <Button type="submit" color="blue">{editingSanction ? 'Modifier' : 'Ajouter'}</Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      <Modal opened={configModalOpen} onClose={() => { setConfigModalOpen(false); setEditingConfig(null); configForm.reset(); }} title={editingConfig ? "Modifier la configuration" : "Ajouter un champ"} size="lg" centered overlayProps={{ blur: 3 }}>
        <form onSubmit={configForm.onSubmit(handleSaveConfig)}>
          <Stack>
            {!editingConfig && <TextInput label="Nom du champ" placeholder="ex: entete, nom_app" {...configForm.getInputProps('Champ')} required size="md" />}
            <Textarea label="Valeur / Template" placeholder="Contenu du champ ou template avec variables" {...configForm.getInputProps('Valeur')} rows={3} size="md" />
            {!editingConfig && <NumberInput label="Ordre d'affichage" {...configForm.getInputProps('Ordre')} min={0} size="md" />}
            <Alert title="Exemples" color="gray" variant="light">
              <code>[NUMERO] - [LIBELLE] - [DATE]</code><br />
              <code>DOSSIER N° [ID] - [AGENT] - [ETAT]</code>
            </Alert>
            <Group justify="flex-end">
              <Button variant="light" onClick={() => { setConfigModalOpen(false); setEditingConfig(null); configForm.reset(); }}>Annuler</Button>
              <Button type="submit" color="blue">{editingConfig ? 'Modifier' : 'Ajouter'}</Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      <Modal opened={deleteModalOpen} onClose={() => { setDeleteModalOpen(false); setItemToDelete(null); }} title="Confirmation" size="sm" centered overlayProps={{ blur: 3 }}>
        <Stack>
          <Alert color="red" variant="light" icon={<IconAlertTriangle size={16} />}>Êtes-vous sûr de vouloir supprimer cet élément ?</Alert>
          <Text size="sm" c="dimmed" ta="center">Cette action est irréversible.</Text>
          <Group justify="space-between">
            <Button variant="light" onClick={() => { setDeleteModalOpen(false); setItemToDelete(null); }}>Annuler</Button>
            <Button color="red" onClick={handleDelete}>Supprimer</Button>
          </Group>
        </Stack>
      </Modal>

      <Modal opened={deleteConfigModalOpen} onClose={() => { setDeleteConfigModalOpen(false); setConfigToDelete(null); }} title="Confirmation" size="sm" centered overlayProps={{ blur: 3 }}>
        <Stack>
          <Alert color="red" variant="light" icon={<IconAlertTriangle size={16} />}>Supprimer cette configuration ?</Alert>
          <Text size="sm" c="dimmed" ta="center">Champ: <strong>{configToDelete?.Champ}</strong></Text>
          <Group justify="space-between">
            <Button variant="light" onClick={() => { setDeleteConfigModalOpen(false); setConfigToDelete(null); }}>Annuler</Button>
            <Button color="red" onClick={handleDeleteConfig}>Supprimer</Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
}