import { useState, useEffect } from 'react';
import { Table, Button, Modal, TextInput, Stack, Card, Group, ActionIcon, Text, Badge, Divider, ScrollArea, Pagination, Grid, Select, Avatar } from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconPlus, IconEdit, IconTrash, IconSearch, IconUser } from '@tabler/icons-react';
import { invoke } from '@tauri-apps/api/core';
import { notifications } from '@mantine/notifications';
import { Signataire } from './types';

interface Grade {
  GradeID: number;
  LibelleGrade: string;
}

interface SignatairesTabProps {
  signataires: Signataire[];
  onRefresh: () => void;
}

export function SignatairesTab({ signataires, onRefresh }: SignatairesTabProps) {
  const [search, setSearch] = useState('');
  const [filterStatut, setFilterStatut] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Signataire | null>(null);
  const [grades, setGrades] = useState<Grade[]>([]);
  const itemsPerPage = 10;

  // Charger les grades
  useEffect(() => {
    loadGrades();
  }, []);

  const loadGrades = async () => {
    try {
      const result = await invoke('get_grades');
      setGrades(result as Grade[]);
    } catch (error) {
      console.error('Erreur chargement grades:', error);
    }
  };

  const form = useForm({ 
    initialValues: { Nom: '', Prenom: '', Grade: '', Fonction: '', TitreHonorifique: '', Statut: 1 }, 
    validate: { 
      Nom: (value) => (value ? null : 'Le nom est requis'), 
      Prenom: (value) => (value ? null : 'Le prénom est requis'), 
      Fonction: (value) => (value ? null : 'La fonction est requise') 
    } 
  });

  const handleSave = async (values: typeof form.values) => {
    try {
      if (editingItem) {
        await invoke('update_signataire', { signataire: { ...values, SignataireID: editingItem.SignataireID } });
        notifications.show({ title: 'Succès', message: 'Signataire modifié', color: 'green' });
      } else {
        await invoke('create_signataire', { signataire: values });
        notifications.show({ title: 'Succès', message: 'Signataire ajouté', color: 'green' });
      }
      setModalOpen(false);
      form.reset();
      setEditingItem(null);
      onRefresh();
    } catch (error) {
      notifications.show({ title: 'Erreur', message: `Erreur: ${error}`, color: 'red' });
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await invoke('delete_signataire', { signataireId: id });
      notifications.show({ title: 'Succès', message: 'Signataire supprimé', color: 'green' });
      onRefresh();
    } catch (error) {
      notifications.show({ title: 'Erreur', message: 'Impossible de supprimer', color: 'red' });
    }
  };

  const filteredData = signataires.filter(s => {
    const matchesSearch = search === '' || 
      s.Nom.toLowerCase().includes(search.toLowerCase()) || 
      s.Prenom.toLowerCase().includes(search.toLowerCase()) || 
      s.Fonction.toLowerCase().includes(search.toLowerCase());
    const matchesStatut = !filterStatut || 
      (filterStatut === 'actif' && s.Statut === 1) || 
      (filterStatut === 'inactif' && s.Statut === 0);
    return matchesSearch && matchesStatut;
  });
  
  const paginatedData = filteredData.slice((page - 1) * itemsPerPage, page * itemsPerPage);
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  // Options pour le select Grade
  const gradeOptions = grades.map(grade => ({
    value: grade.LibelleGrade,
    label: grade.LibelleGrade
  }));

  return (
    <Stack gap="xs">
      <Group justify="space-between">
        <Group gap="xs">
          <TextInput 
            size="sm" 
            placeholder="Rechercher..." 
            leftSection={<IconSearch size={16} />} 
            value={search} 
            onChange={(e) => { setSearch(e.currentTarget.value); setPage(1); }} 
            style={{ width: 250 }} 
          />
          <Select 
            size="sm" 
            placeholder="Statut" 
            value={filterStatut} 
            onChange={(val) => { setFilterStatut(val); setPage(1); }} 
            clearable 
            data={[{ value: 'actif', label: 'Actif' }, { value: 'inactif', label: 'Inactif' }]} 
            style={{ width: 120 }} 
          />
        </Group>
        <Button size="sm" leftSection={<IconPlus size={16} />} onClick={() => { setEditingItem(null); form.reset(); setModalOpen(true); }} variant="gradient" gradient={{ from: '#1b365d', to: '#2a4a7a' }}>
          Nouveau signataire
        </Button>
      </Group>
      
      <Divider />
      
      <Card withBorder p="0">
        <ScrollArea style={{ maxHeight: 450 }}>
          <Table striped highlightOnHover>
            <Table.Thead bg="#1b365d">
              <Table.Tr>
                <Table.Th c="white" fw={600} w={80}>ID</Table.Th>
                <Table.Th c="white" fw={600}>Nom complet</Table.Th>
                <Table.Th c="white" fw={600}>Grade</Table.Th>
                <Table.Th c="white" fw={600}>Fonction</Table.Th>
                <Table.Th c="white" fw={600}>Titre honorifique</Table.Th>
                <Table.Th c="white" fw={600} w={100}>Statut</Table.Th>
                <Table.Th c="white" fw={600} w={120} ta="center">Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {paginatedData.map((s) => (
                <Table.Tr key={s.SignataireID}>
                  <Table.Td>
                    <Badge variant="light" color="cyan" size="sm">{s.SignataireID}</Badge>
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs">
                      <Avatar size="md" radius="xl" color={s.Statut === 1 ? 'cyan' : 'gray'}>
                        <IconUser size={16} />
                      </Avatar>
                      <Text size="sm" fw={500}>{s.Prenom} {s.Nom}</Text>
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Badge variant="light" color="blue" size="sm">{s.Grade || '-'}</Badge>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{s.Fonction}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{s.TitreHonorifique || '-'}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge size="sm" color={s.Statut === 1 ? 'green' : 'gray'}>
                      {s.Statut === 1 ? 'Actif' : 'Inactif'}
                    </Badge>
                  </Table.Td>
                  <Table.Td ta="center">
                    <Group gap="xs" justify="center">
                      <ActionIcon size="sm" onClick={() => { 
                        setEditingItem(s); 
                        form.setValues({ 
                          Nom: s.Nom, 
                          Prenom: s.Prenom, 
                          Grade: s.Grade || '', 
                          Fonction: s.Fonction, 
                          TitreHonorifique: s.TitreHonorifique || '', 
                          Statut: s.Statut 
                        }); 
                        setModalOpen(true); 
                      }} color="orange" variant="light">
                        <IconEdit size={16} />
                      </ActionIcon>
                      <ActionIcon size="sm" onClick={() => handleDelete(s.SignataireID)} color="red" variant="light">
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </ScrollArea>
      </Card>
      
      {totalPages > 1 && <Pagination total={totalPages} value={page} onChange={setPage} size="sm" />}
      
      <Modal opened={modalOpen} onClose={() => setModalOpen(false)} title={editingItem ? "Modifier le signataire" : "Nouveau signataire"} size="md" centered>
        <form onSubmit={form.onSubmit(handleSave)}>
          <Stack>
            <Grid>
              <Grid.Col span={6}>
                <TextInput size="sm" label="Nom" {...form.getInputProps('Nom')} required />
              </Grid.Col>
              <Grid.Col span={6}>
                <TextInput size="sm" label="Prénom" {...form.getInputProps('Prenom')} required />
              </Grid.Col>
              <Grid.Col span={12}>
                <Select 
                  size="sm" 
                  label="Grade" 
                  placeholder="Sélectionner un grade"
                  data={gradeOptions}
                  searchable
                  clearable
                  {...form.getInputProps('Grade')} 
                />
              </Grid.Col>
              <Grid.Col span={12}>
                <TextInput size="sm" label="Fonction" {...form.getInputProps('Fonction')} required />
              </Grid.Col>
              <Grid.Col span={12}>
                <TextInput size="sm" label="Titre honorifique" {...form.getInputProps('TitreHonorifique')} />
              </Grid.Col>
              <Grid.Col span={12}>
                <Select 
                  size="sm" 
                  label="Statut" 
                  data={[{ value: '1', label: 'Actif' }, { value: '0', label: 'Inactif' }]} 
                  {...form.getInputProps('Statut')} 
                />
              </Grid.Col>
            </Grid>
            <Group justify="flex-end">
              <Button size="sm" variant="light" onClick={() => setModalOpen(false)}>Annuler</Button>
              <Button size="sm" type="submit" color="blue">{editingItem ? 'Modifier' : 'Créer'}</Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Stack>
  );
}