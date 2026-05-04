import { useState } from 'react';
import {
  Table, Button, Modal, TextInput, Stack, Card, Group,
  ActionIcon, Text, Badge, Divider, ScrollArea, 
  Pagination, NumberInput, Select
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconPlus, IconEdit, IconTrash, IconSearch, IconArrowUp, IconArrowDown } from '@tabler/icons-react';
import { invoke } from '@tauri-apps/api/core';
import { notifications } from '@mantine/notifications';
import { ServiceInvestigation } from './types';

interface ServicesTabProps {
  services: ServiceInvestigation[];
  onRefresh: () => void;
}

export function ServicesTab({ services, onRefresh }: ServicesTabProps) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ServiceInvestigation | null>(null);
  const [itemToDelete, setItemToDelete] = useState<ServiceInvestigation | null>(null);
  const itemsPerPage = 10;

  const form = useForm({
    initialValues: { LibelleService: '', Acronyme: '', Ordre: 0, Actif: 1 },
    validate: { LibelleService: (value) => (value ? null : 'Le libellé est requis') }
  });

  const handleSave = async (values: typeof form.values) => {
    try {
      if (editingItem) {
        await invoke('update_service_investigation', { 
          serviceId: editingItem.ServiceID, 
          libelle: values.LibelleService, 
          acronyme: values.Acronyme, 
          ordre: values.Ordre, 
          actif: values.Actif 
        });
        notifications.show({ title: 'Succès', message: 'Service modifié', color: 'green' });
      } else {
        // Calculer le prochain ordre
        const maxOrdre = services.length > 0 
          ? Math.max(...services.map(s => s.Ordre || 0)) 
          : 0;
        
        await invoke('create_service_investigation', { 
          libelle: values.LibelleService, 
          acronyme: values.Acronyme, 
          ordre: maxOrdre + 1 
        });
        notifications.show({ title: 'Succès', message: 'Service ajouté', color: 'green' });
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
      await invoke('delete_service_investigation', { serviceId: id });
      notifications.show({ title: 'Succès', message: 'Service désactivé', color: 'green' });
      setDeleteModalOpen(false);
      setItemToDelete(null);
      onRefresh();
    } catch (error) {
      notifications.show({ title: 'Erreur', message: 'Impossible de désactiver', color: 'red' });
    }
  };

  const moveUp = async (index: number) => {
    if (index === 0) return;
    
    const current = sortedServices[index];
    const previous = sortedServices[index - 1];
    
    try {
      await invoke('update_service_investigation', { 
        serviceId: current.ServiceID, 
        libelle: current.LibelleService, 
        acronyme: current.Acronyme || '', 
        ordre: previous.Ordre || 0,
        actif: current.Actif || 1
      });
      await invoke('update_service_investigation', { 
        serviceId: previous.ServiceID, 
        libelle: previous.LibelleService, 
        acronyme: previous.Acronyme || '', 
        ordre: current.Ordre || 0,
        actif: previous.Actif || 1
      });
      onRefresh();
    } catch (error) {
      notifications.show({ title: 'Erreur', message: 'Erreur lors du déplacement', color: 'red' });
    }
  };

  const moveDown = async (index: number) => {
    if (index === sortedServices.length - 1) return;
    
    const current = sortedServices[index];
    const next = sortedServices[index + 1];
    
    try {
      await invoke('update_service_investigation', { 
        serviceId: current.ServiceID, 
        libelle: current.LibelleService, 
        acronyme: current.Acronyme || '', 
        ordre: next.Ordre || 0,
        actif: current.Actif || 1
      });
      await invoke('update_service_investigation', { 
        serviceId: next.ServiceID, 
        libelle: next.LibelleService, 
        acronyme: next.Acronyme || '', 
        ordre: current.Ordre || 0,
        actif: next.Actif || 1
      });
      onRefresh();
    } catch (error) {
      notifications.show({ title: 'Erreur', message: 'Erreur lors du déplacement', color: 'red' });
    }
  };

  const filteredData = services.filter(s => 
    s.LibelleService.toLowerCase().includes(search.toLowerCase())
  );
  
  // Trier par ordre
  const sortedServices = [...filteredData].sort((a, b) => (a.Ordre || 0) - (b.Ordre || 0));
  const paginatedData = sortedServices.slice((page - 1) * itemsPerPage, page * itemsPerPage);
  const totalPages = Math.ceil(sortedServices.length / itemsPerPage);

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <TextInput
          placeholder="Rechercher un service..."
          leftSection={<IconSearch size={16} />}
          value={search}
          onChange={(e) => { setSearch(e.currentTarget.value); setPage(1); }}
          style={{ width: 300 }}
        />
        <Button leftSection={<IconPlus size={16} />} onClick={() => { setEditingItem(null); form.reset(); setModalOpen(true); }} variant="gradient" gradient={{ from: '#1b365d', to: '#2a4a7a' }}>
          Nouveau service
        </Button>
      </Group>

      <Divider />

      <Card withBorder p="0">
        <ScrollArea style={{ maxHeight: 500 }}>
          <Table striped highlightOnHover>
            <Table.Thead style={{ backgroundColor: '#1b365d' }}>
              <Table.Tr>
                <Table.Th style={{ color: 'white', width: 100 }}>Ordre</Table.Th>
                <Table.Th style={{ color: 'white', width: 80 }}>ID</Table.Th>
                <Table.Th style={{ color: 'white' }}>Libellé</Table.Th>
                <Table.Th style={{ color: 'white', width: 120 }}>Acronyme</Table.Th>
                <Table.Th style={{ color: 'white', width: 100 }}>Statut</Table.Th>
                <Table.Th style={{ color: 'white', width: 150, textAlign: 'center' }}>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {paginatedData.map((s) => {
                const globalIndex = sortedServices.findIndex(item => item.ServiceID === s.ServiceID);
                return (
                  <Table.Tr key={s.ServiceID}>
                    <Table.Td>
                      <Group gap="xs" justify="center">
                        <ActionIcon 
                          size="sm" 
                          onClick={() => moveUp(globalIndex)} 
                          disabled={globalIndex === 0}
                          variant="subtle"
                          color="blue"
                        >
                          <IconArrowUp size={14} />
                        </ActionIcon>
                        <Text size="sm" fw={500}>{s.Ordre}</Text>
                        <ActionIcon 
                          size="sm" 
                          onClick={() => moveDown(globalIndex)} 
                          disabled={globalIndex === sortedServices.length - 1}
                          variant="subtle"
                          color="blue"
                        >
                          <IconArrowDown size={14} />
                        </ActionIcon>
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Badge variant="light" color="teal">{s.ServiceID}</Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text fw={500}>{s.LibelleService}</Text>
                    </Table.Td>
                    <Table.Td>
                      {s.Acronyme && <Badge variant="light" color="cyan">{s.Acronyme}</Badge>}
                    </Table.Td>
                    <Table.Td>
                      <Badge color={s.Actif === 1 ? 'green' : 'gray'} variant="light">
                        {s.Actif === 1 ? 'Actif' : 'Inactif'}
                      </Badge>
                    </Table.Td>
                    <Table.Td ta="center">
                      <Group gap="xs" justify="center">
                        <ActionIcon onClick={() => { 
                          setEditingItem(s); 
                          form.setValues({ 
                            LibelleService: s.LibelleService, 
                            Acronyme: s.Acronyme || '', 
                            Ordre: s.Ordre || 0, 
                            Actif: s.Actif || 1 
                          }); 
                          setModalOpen(true); 
                        }} color="orange" variant="light">
                          <IconEdit size={16} />
                        </ActionIcon>
                        <ActionIcon onClick={() => { setItemToDelete(s); setDeleteModalOpen(true); }} color="red" variant="light">
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

      {totalPages > 1 && (
        <Group justify="center">
          <Pagination total={totalPages} value={page} onChange={setPage} color="blue" />
        </Group>
      )}

      <Modal opened={modalOpen} onClose={() => setModalOpen(false)} title={editingItem ? "Modifier le service" : "Nouveau service"} size="md" centered>
        <form onSubmit={form.onSubmit(handleSave)}>
          <Stack>
            <TextInput label="Libellé" {...form.getInputProps('LibelleService')} required />
            <TextInput label="Acronyme" {...form.getInputProps('Acronyme')} />
            {!editingItem && (
              <Text size="xs" c="dimmed">L'ordre sera attribué automatiquement</Text>
            )}
            {editingItem && (
              <>
                <NumberInput label="Ordre" {...form.getInputProps('Ordre')} min={0} />
                <Select 
                  label="Statut" 
                  data={[
                    { value: '1', label: 'Actif' }, 
                    { value: '0', label: 'Inactif' }
                  ]} 
                  {...form.getInputProps('Actif')} 
                />
              </>
            )}
            <Group justify="flex-end">
              <Button variant="light" onClick={() => setModalOpen(false)}>Annuler</Button>
              <Button type="submit" color="blue">{editingItem ? 'Modifier' : 'Créer'}</Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      <Modal opened={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="Confirmation" size="sm" centered>
        <Stack>
          <Text>Désactiver le service: <strong>{itemToDelete?.LibelleService}</strong> ?</Text>
          <Group justify="space-between">
            <Button variant="light" onClick={() => setDeleteModalOpen(false)}>Annuler</Button>
            <Button color="red" onClick={() => itemToDelete && handleDelete(itemToDelete.ServiceID)}>Désactiver</Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}