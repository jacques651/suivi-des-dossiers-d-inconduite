import { useState } from 'react';
import { Table, Button, Modal, TextInput, Stack, Card, Group, ActionIcon, Text, Badge, Divider, ScrollArea, Pagination } from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconPlus, IconEdit, IconTrash, IconSearch } from '@tabler/icons-react';
import { invoke } from '@tauri-apps/api/core';
import { notifications } from '@mantine/notifications';
import { Sanction } from './types';

interface SanctionsTabProps {
  sanctions: Sanction[];
  onRefresh: () => void;
}

export function SanctionsTab({ sanctions, onRefresh }: SanctionsTabProps) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Sanction | null>(null);
  const itemsPerPage = 10;

  const form = useForm({ 
    initialValues: { LibelleSanction: '', Categorie: '' }, 
    validate: { 
      LibelleSanction: (value) => (value ? null : 'Le libellé est requis')
    } 
  });

  const handleSave = async (values: typeof form.values) => {
    try {
      if (editingItem) {
        await invoke('update_sanction', { 
          sanctionId: editingItem.SanctionID, 
          libelle: values.LibelleSanction, 
          niveau: null
        });
        notifications.show({ title: 'Succès', message: 'Sanction modifiée', color: 'green' });
      } else {
        await invoke('create_sanction', { 
          libelle: values.LibelleSanction, 
          niveau: null
        });
        notifications.show({ title: 'Succès', message: 'Sanction ajoutée', color: 'green' });
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
      await invoke('delete_sanction', { sanctionId: id });
      notifications.show({ title: 'Succès', message: 'Sanction supprimée', color: 'green' });
      onRefresh();
    } catch (error) {
      notifications.show({ title: 'Erreur', message: 'Impossible de supprimer', color: 'red' });
    }
  };

  const filteredData = sanctions.filter(s => s.LibelleSanction.toLowerCase().includes(search.toLowerCase()));
  const paginatedData = filteredData.slice((page - 1) * itemsPerPage, page * itemsPerPage);
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  return (
    <Stack gap="sm">
      <Group justify="space-between">
        <TextInput 
          size="sm" 
          placeholder="Rechercher une sanction..." 
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
          Nouvelle sanction
        </Button>
      </Group>
      
      <Divider />
      
      <Card withBorder p="0">
        <ScrollArea style={{ maxHeight: 450 }}>
          <Table striped highlightOnHover>
            <Table.Thead bg="#1b365d">
              <Table.Tr>
                <Table.Th c="white" fw={600} w={80}>ID</Table.Th>
                <Table.Th c="white" fw={600}>Libellé</Table.Th>
                <Table.Th c="white" fw={600}>Catégorie</Table.Th>
                <Table.Th c="white" fw={600} w={120} ta="center">Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {paginatedData.map((sanction) => (
                <Table.Tr key={sanction.SanctionID}>
                  <Table.Td>
                    <Badge variant="light" color="red" size="sm">
                      {sanction.SanctionID}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" fw={500}>{sanction.LibelleSanction}</Text>
                  </Table.Td>
                  <Table.Td>
                    {sanction.Categorie ? (
                      <Badge variant="light" color="cyan" size="sm">{sanction.Categorie}</Badge>
                    ) : (
                      <Text size="sm" c="dimmed">—</Text>
                    )}
                  </Table.Td>
                  <Table.Td ta="center">
                    <Group gap="xs" justify="center">
                      <ActionIcon 
                        size="sm" 
                        onClick={() => { 
                          setEditingItem(sanction); 
                          form.setValues({ 
                            LibelleSanction: sanction.LibelleSanction, 
                            Categorie: sanction.Categorie || '' 
                          }); 
                          setModalOpen(true); 
                        }} 
                        color="orange" 
                        variant="light"
                      >
                        <IconEdit size={16} />
                      </ActionIcon>
                      <ActionIcon 
                        size="sm" 
                        onClick={() => handleDelete(sanction.SanctionID)} 
                        color="red" 
                        variant="light"
                      >
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
      
      <Modal opened={modalOpen} onClose={() => setModalOpen(false)} title={editingItem ? "Modifier la sanction" : "Nouvelle sanction"} size="md" centered>
        <form onSubmit={form.onSubmit(handleSave)}>
          <Stack>
            <TextInput 
              size="sm" 
              label="Libellé de la sanction" 
              placeholder="Ex: Révocation, Suspension, Avertissement, etc." 
              {...form.getInputProps('LibelleSanction')} 
              required 
            />
            <TextInput 
              size="sm" 
              label="Catégorie (optionnel)" 
              placeholder="Disciplinaire, Administrative, Pénale, etc."
              {...form.getInputProps('Categorie')} 
            />
            <Group justify="flex-end">
              <Button size="sm" variant="light" onClick={() => setModalOpen(false)}>Annuler</Button>
              <Button size="sm" type="submit" color="blue">{editingItem ? 'Modifier' : 'Ajouter'}</Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Stack>
  );
}