import { useState } from 'react';
import { Table, Button, Modal, TextInput, Stack, Card, Group, ActionIcon, Text, Badge, Divider, ScrollArea, Pagination } from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconPlus, IconEdit, IconTrash, IconSearch, IconArrowUp, IconArrowDown } from '@tabler/icons-react';
import { invoke } from '@tauri-apps/api/core';
import { notifications } from '@mantine/notifications';
import { Grade } from './types';

interface GradesTabProps {
  grades: Grade[];
  onRefresh: () => void;
}

export function GradesTab({ grades, onRefresh }: GradesTabProps) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Grade | null>(null);
  const itemsPerPage = 10;

  const form = useForm({ 
    initialValues: { LibelleGrade: '' }, 
    validate: { LibelleGrade: (value) => (value ? null : 'Le libellé est requis') } 
  });

  const handleSave = async (values: typeof form.values) => {
    try {
      if (editingItem) {
        await invoke('update_grade', { 
          gradeId: editingItem.GradeID, 
          libelle: values.LibelleGrade, 
          ordre: editingItem.Ordre 
        });
        notifications.show({ title: 'Succès', message: 'Grade modifié', color: 'green' });
      } else {
        // Calculer le prochain ordre
        const maxOrdre = grades.length > 0 
          ? Math.max(...grades.map(g => g.Ordre || 0)) 
          : 0;
        await invoke('create_grade', { 
          libelle: values.LibelleGrade, 
          ordre: maxOrdre + 1 
        });
        notifications.show({ title: 'Succès', message: 'Grade ajouté', color: 'green' });
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
      await invoke('delete_grade', { gradeId: id });
      notifications.show({ title: 'Succès', message: 'Grade supprimé', color: 'green' });
      onRefresh();
    } catch (error) {
      notifications.show({ title: 'Erreur', message: 'Impossible de supprimer', color: 'red' });
    }
  };

  const moveUp = async (index: number) => {
    if (index === 0) return;
    
    const current = sortedGrades[index];
    const previous = sortedGrades[index - 1];
    
    try {
      await invoke('update_grade', { 
        gradeId: current.GradeID, 
        libelle: current.LibelleGrade, 
        ordre: previous.Ordre 
      });
      await invoke('update_grade', { 
        gradeId: previous.GradeID, 
        libelle: previous.LibelleGrade, 
        ordre: current.Ordre 
      });
      onRefresh();
    } catch (error) {
      notifications.show({ title: 'Erreur', message: 'Erreur lors du déplacement', color: 'red' });
    }
  };

  const moveDown = async (index: number) => {
    if (index === sortedGrades.length - 1) return;
    
    const current = sortedGrades[index];
    const next = sortedGrades[index + 1];
    
    try {
      await invoke('update_grade', { 
        gradeId: current.GradeID, 
        libelle: current.LibelleGrade, 
        ordre: next.Ordre 
      });
      await invoke('update_grade', { 
        gradeId: next.GradeID, 
        libelle: next.LibelleGrade, 
        ordre: current.Ordre 
      });
      onRefresh();
    } catch (error) {
      notifications.show({ title: 'Erreur', message: 'Erreur lors du déplacement', color: 'red' });
    }
  };

  const filteredData = grades.filter(g => g.LibelleGrade.toLowerCase().includes(search.toLowerCase()));
  // Trier par ordre
  const sortedGrades = [...filteredData].sort((a, b) => (a.Ordre || 0) - (b.Ordre || 0));
  const paginatedData = sortedGrades.slice((page - 1) * itemsPerPage, page * itemsPerPage);
  const totalPages = Math.ceil(sortedGrades.length / itemsPerPage);

  return (
    <Stack gap="sm">
      <Group justify="space-between">
        <TextInput 
          size="sm" 
          placeholder="Rechercher un grade..." 
          leftSection={<IconSearch size={16} />} 
          value={search} 
          onChange={(e) => { setSearch(e.currentTarget.value); setPage(1); }} 
          style={{ width: 300 }} 
        />
        <Button 
          size="sm" 
          leftSection={<IconPlus size={16} />} 
          onClick={() => { setEditingItem(null); form.reset(); setModalOpen(true); }} 
          variant="gradient" 
          gradient={{ from: '#1b365d', to: '#2a4a7a' }}
        >
          Nouveau grade
        </Button>
      </Group>
      
      <Divider />
      
      <Card withBorder p="0">
        <ScrollArea style={{ maxHeight: 450 }}>
          <Table striped highlightOnHover>
            <Table.Thead bg="#1b365d">
              <Table.Tr>
                <Table.Th c="white" fw={600} w={100}>Ordre</Table.Th>
                <Table.Th c="white" fw={600} w={80}>ID</Table.Th>
                <Table.Th c="white" fw={600}>Libellé</Table.Th>
                <Table.Th c="white" fw={600} w={120} ta="center">Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {paginatedData.map((grade) => {
                const globalIndex = sortedGrades.findIndex(item => item.GradeID === grade.GradeID);
                return (
                  <Table.Tr key={grade.GradeID}>
                    <Table.Td>
                      <Group gap="xs" justify="center">
                        <ActionIcon 
                          size="sm" 
                          onClick={() => moveUp(globalIndex)} 
                          disabled={globalIndex === 0}
                          variant="subtle"
                          color="blue"
                        >
                          <IconArrowUp size={16} />
                        </ActionIcon>
                        <Text size="sm" fw={500}>{grade.Ordre}</Text>
                        <ActionIcon 
                          size="sm" 
                          onClick={() => moveDown(globalIndex)} 
                          disabled={globalIndex === sortedGrades.length - 1}
                          variant="subtle"
                          color="blue"
                        >
                          <IconArrowDown size={16} />
                        </ActionIcon>
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Badge variant="light" color="blue" size="sm">
                        {grade.GradeID}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" fw={500}>{grade.LibelleGrade}</Text>
                    </Table.Td>
                    <Table.Td ta="center">
                      <Group gap="xs" justify="center">
                        <ActionIcon 
                          size="sm" 
                          onClick={() => { 
                            setEditingItem(grade); 
                            form.setValues({ LibelleGrade: grade.LibelleGrade }); 
                            setModalOpen(true); 
                          }} 
                          color="orange" 
                          variant="light"
                        >
                          <IconEdit size={16} />
                        </ActionIcon>
                        <ActionIcon 
                          size="sm" 
                          onClick={() => handleDelete(grade.GradeID)} 
                          color="red" 
                          variant="light"
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
        </ScrollArea>
      </Card>
      
      {totalPages > 1 && <Pagination total={totalPages} value={page} onChange={setPage} size="sm" />}
      
      <Modal opened={modalOpen} onClose={() => setModalOpen(false)} title={editingItem ? "Modifier le grade" : "Nouveau grade"} size="md" centered>
        <form onSubmit={form.onSubmit(handleSave)}>
          <Stack>
            <TextInput 
              size="sm" 
              label="Libellé du grade" 
              placeholder="Ex: Commissaire Divisionnaire de Police" 
              {...form.getInputProps('LibelleGrade')} 
              required 
            />
            {!editingItem && (
              <Text size="xs" c="dimmed">L'ordre sera attribué automatiquement à la fin de la liste</Text>
            )}
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