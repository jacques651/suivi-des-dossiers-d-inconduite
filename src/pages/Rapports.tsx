import { useEffect, useState } from 'react';
import {
  Table, Button, Modal, TextInput, Stack, Title, Card,
  Group, ActionIcon, Select, Textarea, Grid, Badge,
  Avatar, Text, Divider, Loader, Pagination, Tooltip,
  Box, Container, SimpleGrid, Paper, ThemeIcon, 
  ScrollArea, Center, Alert, Menu,
  Progress
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { 
  IconEdit, IconTrash, IconPlus, IconSearch, 
  IconFileText, IconCalendar, IconCategory, 
  IconRefresh, IconDownload, IconPrinter,
  IconFileExcel, IconFile, IconFileWord,
  IconInfoCircle, IconCheck, IconX
} from '@tabler/icons-react';
import { invoke } from '@tauri-apps/api/core';
import { notifications } from '@mantine/notifications';
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Rapport {
  RapportID: number;
  LibelleRapport: string;
  NumeroRapport: string;
  DateRapport: string;
  TypeInspection?: string;
  PeriodeSousRevue?: string;
  Fichier?: string;
}

export default function Rapports() {
  const [rapports, setRapports] = useState<Rapport[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedRapport, setSelectedRapport] = useState<Rapport | null>(null);
  const [rapportToDelete, setRapportToDelete] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [activePage, setActivePage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const itemsPerPage = 10;

  const form = useForm({
    initialValues: {
      LibelleRapport: '',
      NumeroRapport: '',
      DateRapport: new Date(),
      TypeInspection: '',
      PeriodeSousRevue: '',
      Fichier: '',
    },
    validate: {
      LibelleRapport: (value) => (value ? null : 'Le libellé est requis'),
      NumeroRapport: (value) => (value ? null : 'Le numéro est requis'),
      DateRapport: (value) => (value ? null : 'La date est requise'),
    },
  });

  useEffect(() => {
    loadRapports();
  }, []);

  const loadRapports = async () => {
    setLoading(true);
    try {
      const result = await invoke('get_rapports');
      setRapports(result as Rapport[]);
    } catch (error) {
      notifications.show({
        title: 'Erreur',
        message: 'Impossible de charger les rapports',
        color: 'red',
        icon: <IconX size={16} />,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (values: typeof form.values) => {
    try {
      const rapportData = {
        ...values,
        RapportID: editingId,
        DateRapport: dayjs(values.DateRapport).format('YYYY-MM-DD'),
      };

      if (editingId) {
        await invoke('update_rapport', { rapport: rapportData });
        notifications.show({ title: 'Succès', message: 'Rapport modifié', color: 'green', icon: <IconCheck size={16} /> });
      } else {
        await invoke('create_rapport', { rapport: rapportData });
        notifications.show({ title: 'Succès', message: 'Rapport créé', color: 'green', icon: <IconCheck size={16} /> });
      }
      
      setModalOpen(false);
      form.reset();
      setEditingId(null);
      loadRapports();
    } catch (error) {
      notifications.show({ title: 'Erreur', message: `Erreur: ${error}`, color: 'red', icon: <IconX size={16} /> });
    }
  };

  const handleDelete = async () => {
    if (!rapportToDelete) return;
    try {
      await invoke('delete_rapport', { id: rapportToDelete });
      notifications.show({ title: 'Succès', message: 'Rapport supprimé', color: 'green', icon: <IconCheck size={16} /> });
      setDeleteModalOpen(false);
      setRapportToDelete(null);
      loadRapports();
    } catch (error) {
      notifications.show({ title: 'Erreur', message: 'Impossible de supprimer', color: 'red', icon: <IconX size={16} /> });
    }
  };

  const handleView = (rapport: Rapport) => {
    setSelectedRapport(rapport);
    setViewModalOpen(true);
  };

  const getTypeColor = (type?: string) => {
    switch(type) {
      case 'Audit': return 'blue';
      case 'Contrôle': return 'green';
      case 'Investigation': return 'orange';
      case 'Inspection': return 'violet';
      default: return 'gray';
    }
  };

  // Export EXCEL
  const exportToExcel = async () => {
    try {
      setExporting(true);
      const filePath = await save({
        title: "Exporter la liste des rapports",
        filters: [{ name: 'Excel', extensions: ['xlsx'] }],
        defaultPath: `rapports_${dayjs().format('YYYY-MM-DD_HH-mm')}.xlsx`
      });
      if (!filePath) { setExporting(false); return; }

      const data = filteredRapports.map(rapport => ({
        'ID': rapport.RapportID,
        'Numéro': rapport.NumeroRapport,
        'Libellé': rapport.LibelleRapport,
        'Date': dayjs(rapport.DateRapport).format('DD/MM/YYYY'),
        "Type d'inspection": rapport.TypeInspection || '',
        'Période sous revue': rapport.PeriodeSousRevue || '',
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      ws['!cols'] = [{ wch: 8 }, { wch: 20 }, { wch: 40 }, { wch: 12 }, { wch: 20 }, { wch: 30 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Rapports');
      const excelBuffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
      await writeFile(filePath, new Uint8Array(excelBuffer));
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
        title: "Exporter la liste des rapports en PDF",
        filters: [{ name: 'PDF', extensions: ['pdf'] }],
        defaultPath: `rapports_${dayjs().format('YYYY-MM-DD_HH-mm')}.pdf`
      });
      if (!filePath) { setExporting(false); return; }

      const doc = new jsPDF('landscape', 'mm', 'a4');
      doc.setFillColor(27, 54, 93);
      doc.rect(0, 0, 297, 40, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.text('LISTE DES RAPPORTS D\'INSPECTION', 148.5, 20, { align: 'center' });
      doc.setFontSize(10);
      doc.text(`Généré le : ${dayjs().format('DD/MM/YYYY HH:mm')}`, 148.5, 32, { align: 'center' });
      doc.setTextColor(0, 0, 0);
      doc.text(`Total rapports : ${filteredRapports.length}`, 14, 50);

      const head = ['ID', 'N° Rapport', 'Libellé', 'Date', "Type d'inspection", 'Période sous revue'];
      const body = filteredRapports.map((rapport, idx) => [
        idx + 1, rapport.NumeroRapport, rapport.LibelleRapport,
        dayjs(rapport.DateRapport).format('DD/MM/YYYY'), rapport.TypeInspection || '', rapport.PeriodeSousRevue || ''
      ]);

      autoTable(doc, {
        head: [head], body: body, startY: 60, theme: 'striped',
        headStyles: { fillColor: [27, 54, 93], textColor: 255, fontStyle: 'bold', halign: 'center' },
        styles: { fontSize: 9, cellPadding: 3 }
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
        title: "Exporter la liste des rapports en Word",
        filters: [{ name: 'Word Document', extensions: ['doc'] }],
        defaultPath: `rapports_${dayjs().format('YYYY-MM-DD_HH-mm')}.doc`
      });
      if (!filePath) { setExporting(false); return; }

      const rows = filteredRapports.map((rapport, idx) => `
        <tr>
          <td style="border:1px solid #ddd;padding:8px;text-align:center">${idx + 1}</td>
          <td style="border:1px solid #ddd;padding:8px">${rapport.NumeroRapport}</td>
          <td style="border:1px solid #ddd;padding:8px"><strong>${rapport.LibelleRapport}</strong></td>
          <td style="border:1px solid #ddd;padding:8px">${dayjs(rapport.DateRapport).format('DD/MM/YYYY')}</td>
          <td style="border:1px solid #ddd;padding:8px"><Badge color={getTypeColor(rapport.TypeInspection)}>${rapport.TypeInspection || '-'}</Badge></td>
          <td style="border:1px solid #ddd;padding:8px">${rapport.PeriodeSousRevue || '-'}</td>
        </tr>
      `).join('');

      const htmlContent = `<!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"><title>Liste des rapports</title>
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
        <h1>📋 LISTE DES RAPPORTS D'INSPECTION</h1>
        <p>Généré le ${dayjs().format('DD/MM/YYYY HH:mm')}</p>
        <p>Total rapports : ${filteredRapports.length}</p>
        <table><thead><tr><th>N°</th><th>Numéro</th><th>Libellé</th><th>Date</th><th>Type</th><th>Période</th></tr></thead><tbody>${rows}</tbody></table>
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

    const rows = filteredRapports.map((rapport, idx) => `
      <tr>
        <td style="border:1px solid #ddd;padding:8px;text-align:center">${idx + 1}</td>
        <td style="border:1px solid #ddd;padding:8px">${rapport.NumeroRapport}</td>
        <td style="border:1px solid #ddd;padding:8px"><strong>${rapport.LibelleRapport}</strong></td>
        <td style="border:1px solid #ddd;padding:8px">${dayjs(rapport.DateRapport).format('DD/MM/YYYY')}</td>
        <td style="border:1px solid #ddd;padding:8px">${rapport.TypeInspection || '-'}</td>
        <td style="border:1px solid #ddd;padding:8px">${rapport.PeriodeSousRevue || '-'}</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"><title>Liste des rapports</title>
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
        <h1>📋 LISTE DES RAPPORTS D'INSPECTION</h1>
        <p>Généré le ${dayjs().format('DD/MM/YYYY HH:mm')}</p>
        <p>Total rapports : ${filteredRapports.length}</p>
        <table><thead><tr><th>N°</th><th>Numéro</th><th>Libellé</th><th>Date</th><th>Type</th><th>Période</th></tr></thead><tbody>${rows}</tbody><td>
        <script>window.onload = () => { window.print(); window.close(); };</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Filtrage des rapports
  const filteredRapports = rapports.filter(rapport =>
    rapport.NumeroRapport.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rapport.LibelleRapport.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredRapports.length / itemsPerPage);
  const paginatedRapports = filteredRapports.slice(
    (activePage - 1) * itemsPerPage,
    activePage * itemsPerPage
  );

  const totalRapports = rapports.length;
  const typeCount = [...new Set(rapports.map(r => r.TypeInspection).filter(Boolean))].length;

  const typeOptions = ['Audit', 'Contrôle', 'Investigation', 'Inspection'];

  if (loading) {
    return (
      <Center style={{ height: '50vh' }}>
        <Card withBorder radius="lg" p="xl">
          <Stack align="center" gap="md">
            <Loader size="xl" color="#1b365d" />
            <Text>Chargement des rapports...</Text>
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
                  <IconFileText size={30} color="white" />
                </Avatar>
                <Box>
                  <Title order={1} c="white" size="h2">Gestion des Rapports d'Inspection</Title>
                  <Text c="gray.3" size="sm">Gérez les rapports d'inspection, d'audit et d'investigation</Text>
                  <Group gap="xs" mt={8}>
                    <Badge size="sm" variant="white" color="blue">BD-SDI v2.0</Badge>
                    <Badge size="sm" variant="white" color="green">Documents officiels</Badge>
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
                <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Total Rapports</Text>
                <ThemeIcon size="lg" radius="md" color="blue" variant="light"><IconFileText size={18} /></ThemeIcon>
              </Group>
              <Text fw={800} size="xl" c="blue">{totalRapports}</Text>
              <Progress value={100} size="sm" radius="xl" color="blue" mt={8} />
              <Text size="xs" c="dimmed" mt={4}>Documents enregistrés</Text>
            </Paper>
            <Paper p="md" radius="lg" withBorder style={{ backgroundColor: '#e8f5e9' }}>
              <Group justify="space-between" mb="xs">
                <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Cette année</Text>
                <ThemeIcon size="lg" radius="md" color="green" variant="light"><IconCalendar size={18} /></ThemeIcon>
              </Group>
              <Text fw={800} size="xl" c="green">
                {rapports.filter(r => dayjs(r.DateRapport).year() === dayjs().year()).length}
              </Text>
              <Progress value={100} size="sm" radius="xl" color="green" mt={8} />
              <Text size="xs" c="dimmed" mt={4}>Rapports {dayjs().year()}</Text>
            </Paper>
            <Paper p="md" radius="lg" withBorder style={{ backgroundColor: '#fff3e0' }}>
              <Group justify="space-between" mb="xs">
                <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Types</Text>
                <ThemeIcon size="lg" radius="md" color="orange" variant="light"><IconCategory size={18} /></ThemeIcon>
              </Group>
              <Text fw={800} size="xl" c="orange">{typeCount}</Text>
              <Progress value={100} size="sm" radius="xl" color="orange" mt={8} />
              <Text size="xs" c="dimmed" mt={4}>Types différents</Text>
            </Paper>
            <Paper p="md" radius="lg" withBorder style={{ backgroundColor: '#f3e5f5' }}>
              <Group justify="space-between" mb="xs">
                <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Moyenne / an</Text>
                <ThemeIcon size="lg" radius="md" color="violet" variant="light"><IconFileText size={18} /></ThemeIcon>
              </Group>
              <Text fw={800} size="xl" c="violet">
                {Math.round(totalRapports / Math.max(1, dayjs().year() - 2020))}
              </Text>
              <Progress value={100} size="sm" radius="xl" color="violet" mt={8} />
              <Text size="xs" c="dimmed" mt={4}>Rapports par an</Text>
            </Paper>
          </SimpleGrid>

          {/* Barre d'actions */}
          <Card withBorder radius="lg" shadow="sm" p="md">
            <Group justify="space-between" align="flex-end" mb="md">
              <Box>
                <Text fw={600} size="lg">Liste des rapports</Text>
                <Text size="xs" c="dimmed">{filteredRapports.length} rapport(s) trouvé(s)</Text>
              </Box>
              <Group>
                <Tooltip label="Actualiser">
                  <ActionIcon onClick={loadRapports} size="lg" variant="light" color="blue">
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
                  Nouveau Rapport
                </Button>
              </Group>
            </Group>

            <Divider my="md" />

            {/* Recherche */}
            <TextInput
              placeholder="Rechercher par numéro ou libellé..."
              leftSection={<IconSearch size={16} />}
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.currentTarget.value); setActivePage(1); }}
              size="sm"
            />
          </Card>

          {/* Tableau */}
          <Card withBorder radius="lg" shadow="sm" p="0">
            <ScrollArea style={{ maxHeight: 500 }}>
              <Table striped highlightOnHover>
                <Table.Thead style={{ backgroundColor: '#1b365d' }}>
                  <Table.Tr>
                    <Table.Th style={{ color: 'white', width: 150 }}>N° Rapport</Table.Th>
                    <Table.Th style={{ color: 'white' }}>Libellé</Table.Th>
                    <Table.Th style={{ color: 'white', width: 120 }}>Date</Table.Th>
                    <Table.Th style={{ color: 'white', width: 130 }}>Type d'inspection</Table.Th>
                    <Table.Th style={{ color: 'white', width: 120, textAlign: 'center' }}>Actions</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {paginatedRapports.length === 0 ? (
                    <Table.Tr>
                      <Table.Td colSpan={5}>
                        <Center py="xl">
                          <Stack align="center">
                            <IconFileText size={48} color="gray" />
                            <Text c="dimmed">Aucun rapport trouvé</Text>
                          </Stack>
                        </Center>
                      </Table.Td>
                    </Table.Tr>
                  ) : (
                    paginatedRapports.map((rapport) => (
                      <Table.Tr key={rapport.RapportID}>
                        <Table.Td>
                          <Badge variant="light" color="blue" size="lg">
                            {rapport.NumeroRapport}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Text fw={500} size="md">{rapport.LibelleRapport}</Text>
                          {rapport.PeriodeSousRevue && (
                            <Text size="xs" c="dimmed">Période: {rapport.PeriodeSousRevue}</Text>
                          )}
                        </Table.Td>
                        <Table.Td>
                          <Group gap="xs" wrap="nowrap">
                            <IconCalendar size={14} color="gray" />
                            <Text size="sm">{dayjs(rapport.DateRapport).format('DD/MM/YYYY')}</Text>
                          </Group>
                        </Table.Td>
                        <Table.Td>
                          {rapport.TypeInspection ? (
                            <Badge color={getTypeColor(rapport.TypeInspection)} variant="light" size="md">
                              {rapport.TypeInspection}
                            </Badge>
                          ) : (
                            <Text c="dimmed" size="sm">-</Text>
                          )}
                        </Table.Td>
                        <Table.Td ta="center">
                          <Group gap="xs" justify="center" wrap="nowrap">
                            <Tooltip label="Voir détails" withArrow>
                              <ActionIcon onClick={() => handleView(rapport)} color="green" variant="light" size="sm">
                                <IconFileText size={16} />
                              </ActionIcon>
                            </Tooltip>
                            <Tooltip label="Modifier" withArrow>
                              <ActionIcon onClick={() => {
                                setEditingId(rapport.RapportID);
                                form.setValues({
                                  LibelleRapport: rapport.LibelleRapport,
                                  NumeroRapport: rapport.NumeroRapport,
                                  DateRapport: new Date(rapport.DateRapport),
                                  TypeInspection: rapport.TypeInspection || '',
                                  PeriodeSousRevue: rapport.PeriodeSousRevue || '',
                                  Fichier: rapport.Fichier || '',
                                });
                                setModalOpen(true);
                              }} color="blue" variant="light" size="sm">
                                <IconEdit size={16} />
                              </ActionIcon>
                            </Tooltip>
                            <Tooltip label="Supprimer" withArrow>
                              <ActionIcon onClick={() => { setRapportToDelete(rapport.RapportID); setDeleteModalOpen(true); }} color="red" variant="light" size="sm">
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
            <Text fw={700} size="lg">{editingId ? "Modifier le Rapport" : "Nouveau Rapport"}</Text>
          </Group>
        }
        size="lg"
        centered
        overlayProps={{ blur: 3, backgroundOpacity: 0.55 }}
        transitionProps={{ transition: 'fade', duration: 200 }}
      >
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="md">
            <TextInput 
              label="Libellé du rapport" 
              placeholder="Ex: Rapport d'inspection annuelle" 
              {...form.getInputProps('LibelleRapport')} 
              required 
              size="md"
            />
            <TextInput 
              label="Numéro du rapport" 
              placeholder="Ex: 2025-001/ITS" 
              {...form.getInputProps('NumeroRapport')} 
              required 
              size="md"
            />
            <DateInput
              label="Date du rapport"
              placeholder="Sélectionner une date"
              {...form.getInputProps('DateRapport')}
              required
              size="md"
            />
            <Select
              label="Type d'inspection"
              placeholder="Sélectionner"
              data={typeOptions}
              {...form.getInputProps('TypeInspection')}
              size="md"
            />
            <Textarea
              label="Période sous revue"
              placeholder="Description de la période auditée (ex: 1er trimestre 2025)"
              {...form.getInputProps('PeriodeSousRevue')}
              rows={2}
              size="md"
            />
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
            <IconFileText size={20} color="#1b365d" />
            <Text fw={700} size="lg">Détails du Rapport</Text>
          </Group>
        }
        size="md"
        centered
        overlayProps={{ blur: 3, backgroundOpacity: 0.55 }}
        transitionProps={{ transition: 'fade', duration: 200 }}
      >
        {selectedRapport && (
          <Stack gap="md">
            <Card withBorder bg="gray.0" p="md">
              <Group justify="apart">
                <Badge color="blue" size="lg">{selectedRapport.NumeroRapport}</Badge>
                <Badge color={getTypeColor(selectedRapport.TypeInspection)} variant="light">
                  {selectedRapport.TypeInspection || 'Non spécifié'}
                </Badge>
              </Group>
            </Card>
            
            <Divider />
            
            <Grid>
              <Grid.Col span={12}>
                <Text size="xs" c="dimmed">Libellé</Text>
                <Text fw={600} size="md">{selectedRapport.LibelleRapport}</Text>
              </Grid.Col>
              <Grid.Col span={6}>
                <Text size="xs" c="dimmed">Date du rapport</Text>
                <Text fw={600}>{dayjs(selectedRapport.DateRapport).format('DD/MM/YYYY')}</Text>
              </Grid.Col>
              <Grid.Col span={6}>
                <Text size="xs" c="dimmed">Type d'inspection</Text>
                <Text fw={600}>{selectedRapport.TypeInspection || '-'}</Text>
              </Grid.Col>
              <Grid.Col span={12}>
                <Text size="xs" c="dimmed">Période sous revue</Text>
                <Text fw={600}>{selectedRapport.PeriodeSousRevue || '-'}</Text>
              </Grid.Col>
            </Grid>
          </Stack>
        )}
      </Modal>

      {/* Modal Confirmation Suppression */}
      <Modal
        opened={deleteModalOpen}
        onClose={() => { setDeleteModalOpen(false); setRapportToDelete(null); }}
        title={
          <Group gap="sm">
            <IconTrash size={20} color="red" />
            <Text fw={700} size="lg">Confirmation de suppression</Text>
          </Group>
        }
        size="sm"
        centered
        overlayProps={{ blur: 3, backgroundOpacity: 0.55 }}
        transitionProps={{ transition: 'fade', duration: 200 }}
      >
        <Stack gap="md">
          <Alert color="red" variant="light" icon={<IconInfoCircle size={16} />}>
            Êtes-vous sûr de vouloir supprimer ce rapport ?
          </Alert>
          <Text size="sm" c="dimmed" ta="center">Cette action est irréversible.</Text>
          <Group justify="space-between" mt="md">
            <Button variant="light" onClick={() => { setDeleteModalOpen(false); setRapportToDelete(null); }}>Annuler</Button>
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
        overlayProps={{ blur: 3, backgroundOpacity: 0.55 }}
        transitionProps={{ transition: 'fade', duration: 200 }}
      >
        <Stack gap="md">
          <Paper p="md" radius="md" withBorder bg="blue.0">
            <Text fw={600} size="sm" mb="md">📌 Fonctionnalités :</Text>
            <Stack gap="xs">
              <Text size="sm">1️⃣ Renseignez le libellé et le numéro du rapport</Text>
              <Text size="sm">2️⃣ Sélectionnez la date et le type d'inspection</Text>
              <Text size="sm">3️⃣ Décrivez la période sous revue</Text>
              <Text size="sm">4️⃣ Exportez la liste au format Excel, PDF ou Word</Text>
              <Text size="sm">5️⃣ Utilisez la recherche pour filtrer les rapports</Text>
            </Stack>
          </Paper>
          <Divider />
          <Text size="xs" c="dimmed" ta="center">Version 2.0.0 - BD-SDI</Text>
        </Stack>
      </Modal>
    </Box>
  );
}