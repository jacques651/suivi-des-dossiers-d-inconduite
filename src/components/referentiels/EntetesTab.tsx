import { useState } from 'react';
import {
  Table, Button, Modal, TextInput, Stack, Card, Group,
  ActionIcon, Text, Badge, Divider, ScrollArea, Center,
  Switch, Textarea
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconPlus, IconEdit, IconTrash, IconArrowUp, IconArrowDown } from '@tabler/icons-react';
import { invoke } from '@tauri-apps/api/core';
import { notifications } from '@mantine/notifications';
import { EnteteDocument } from './types';

interface EntetesTabProps {
  enteteDocuments: EnteteDocument[];
  onRefresh: () => void;
}

export function EntetesTab({ enteteDocuments, onRefresh }: EntetesTabProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<EnteteDocument | null>(null);
  const [itemToDelete, setItemToDelete] = useState<EnteteDocument | null>(null);

  const form = useForm({
    initialValues: { Champ: '', Valeur: '', Actif: 1 },
    validate: {
      Champ: (value) => (value ? null : 'Le nom du champ est requis'),
      Valeur: (value) => (value ? null : 'La valeur est requise')
    }
  });

  const handleSave = async (values: typeof form.values) => {
    try {
      if (editingItem) {
        await invoke('update_entete_document', { 
          enteteId: editingItem.EnteteID, 
          valeur: values.Valeur, 
          ordre: editingItem.Ordre,
          actif: values.Actif, 
          style: null
        });
        notifications.show({ title: 'Succès', message: 'Champ modifié', color: 'green' });
      } else {
        // Calculer le prochain ordre (max + 1)
        const maxOrdre = enteteDocuments.length > 0 
          ? Math.max(...enteteDocuments.map(e => e.Ordre)) 
          : 0;
        
        await invoke('create_entete_document', { 
          typeDocument: 'GLOBAL', 
          champ: values.Champ, 
          valeur: values.Valeur, 
          ordre: maxOrdre + 1,
          style: null
        });
        notifications.show({ title: 'Succès', message: 'Champ ajouté', color: 'green' });
      }
      setModalOpen(false);
      form.reset();
      setEditingItem(null);
      onRefresh();
    } catch (error) {
      notifications.show({ title: 'Erreur', message: `Erreur: ${error}`, color: 'red' });
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    try {
      await invoke('delete_entete_document', { enteteId: itemToDelete.EnteteID });
      notifications.show({ title: 'Succès', message: 'Champ supprimé', color: 'green' });
      
      // Réorganiser les ordres après suppression
      const remainingItems = enteteDocuments.filter(e => e.EnteteID !== itemToDelete.EnteteID);
      for (let i = 0; i < remainingItems.length; i++) {
        if (remainingItems[i].Ordre !== i + 1) {
          await invoke('update_entete_document', { 
            enteteId: remainingItems[i].EnteteID, 
            valeur: remainingItems[i].Valeur, 
            ordre: i + 1,
            actif: remainingItems[i].Actif,
            style: null
          });
        }
      }
      
      setDeleteModalOpen(false);
      setItemToDelete(null);
      onRefresh();
    } catch (error) {
      notifications.show({ title: 'Erreur', message: 'Impossible de supprimer', color: 'red' });
    }
  };

  const toggleActive = async (item: EnteteDocument) => {
    try {
      await invoke('update_entete_document', { 
        enteteId: item.EnteteID, 
        valeur: item.Valeur, 
        actif: item.Actif === 1 ? 0 : 1, 
        ordre: item.Ordre,
        style: null
      });
      onRefresh();
    } catch (error) {
      notifications.show({ title: 'Erreur', message: 'Erreur lors de la mise à jour', color: 'red' });
    }
  };

  const moveUp = async (index: number) => {
    if (index === 0) return;
    
    const current = enteteDocuments[index];
    const previous = enteteDocuments[index - 1];
    
    try {
      await invoke('update_entete_document', { 
        enteteId: current.EnteteID, 
        valeur: current.Valeur, 
        ordre: previous.Ordre,
        actif: current.Actif,
        style: null
      });
      await invoke('update_entete_document', { 
        enteteId: previous.EnteteID, 
        valeur: previous.Valeur, 
        ordre: current.Ordre,
        actif: previous.Actif,
        style: null
      });
      onRefresh();
    } catch (error) {
      notifications.show({ title: 'Erreur', message: 'Erreur lors du déplacement', color: 'red' });
    }
  };

  const moveDown = async (index: number) => {
    if (index === enteteDocuments.length - 1) return;
    
    const current = enteteDocuments[index];
    const next = enteteDocuments[index + 1];
    
    try {
      await invoke('update_entete_document', { 
        enteteId: current.EnteteID, 
        valeur: current.Valeur, 
        ordre: next.Ordre,
        actif: current.Actif,
        style: null
      });
      await invoke('update_entete_document', { 
        enteteId: next.EnteteID, 
        valeur: next.Valeur, 
        ordre: current.Ordre,
        actif: next.Actif,
        style: null
      });
      onRefresh();
    } catch (error) {
      notifications.show({ title: 'Erreur', message: 'Erreur lors du déplacement', color: 'red' });
    }
  };

  const sortedData = [...enteteDocuments].sort((a, b) => a.Ordre - b.Ordre);

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Text fw={600} size="lg">Personnalisation de l'en-tête</Text>
        <Button leftSection={<IconPlus size={16} />} onClick={() => { setEditingItem(null); form.reset(); setModalOpen(true); }} variant="gradient" gradient={{ from: '#1b365d', to: '#2a4a7a' }}>
          Ajouter un champ
        </Button>
      </Group>

      <Divider />
      <Text size="sm" c="dimmed">L'en-tête est commun à tous les types de documents (Rapports, Agents, Dossiers, etc.)</Text>
      <Divider />

      <Card withBorder p="0">
        <ScrollArea style={{ maxHeight: 450 }}>
          <Table striped highlightOnHover>
            <Table.Thead style={{ backgroundColor: '#1b365d' }}>
              <Table.Tr>
                <Table.Th style={{ color: 'white', width: 50 }}>Ordre</Table.Th>
                <Table.Th style={{ color: 'white', width: 180 }}>Champ</Table.Th>
                <Table.Th style={{ color: 'white' }}>Valeur / Template</Table.Th>
                <Table.Th style={{ color: 'white', width: 100 }}>Statut</Table.Th>
                <Table.Th style={{ color: 'white', width: 130, textAlign: 'center' }}>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {sortedData.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={5}>
                    <Center py="xl">
                      <Stack align="center">
                        <Text c="dimmed">Aucune configuration d'en-tête</Text>
                      </Stack>
                    </Center>
                  </Table.Td>
                </Table.Tr>
              ) : (
                sortedData.map((item, index) => (
                  <Table.Tr key={item.EnteteID}>
                    <Table.Td>
                      <Group gap="xs" justify="center">
                        <ActionIcon 
                          size="sm" 
                          onClick={() => moveUp(index)} 
                          disabled={index === 0}
                          variant="subtle"
                          color="blue"
                        >
                          <IconArrowUp size={14} />
                        </ActionIcon>
                        <Text size="sm" fw={500}>{item.Ordre}</Text>
                        <ActionIcon 
                          size="sm" 
                          onClick={() => moveDown(index)} 
                          disabled={index === sortedData.length - 1}
                          variant="subtle"
                          color="blue"
                        >
                          <IconArrowDown size={14} />
                        </ActionIcon>
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Badge variant="light" color="blue" size="md">{item.Champ}</Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" fw={500}>{item.Valeur}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Switch 
                        checked={item.Actif === 1} 
                        onChange={() => toggleActive(item)} 
                        size="sm" 
                        onLabel="ACTIF" 
                        offLabel="INACTIF" 
                      />
                    </Table.Td>
                    <Table.Td ta="center">
                      <Group gap="xs" justify="center">
                        <ActionIcon onClick={() => { 
                          setEditingItem(item); 
                          form.setValues({ 
                            Champ: item.Champ, 
                            Valeur: item.Valeur, 
                            Actif: item.Actif
                          }); 
                          setModalOpen(true); 
                        }} color="orange" variant="light">
                          <IconEdit size={16} />
                        </ActionIcon>
                        <ActionIcon onClick={() => { setItemToDelete(item); setDeleteModalOpen(true); }} color="red" variant="light">
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))
              )}
            </Table.Tbody>
          </Table>
        </ScrollArea>
      </Card>

      <Modal opened={modalOpen} onClose={() => setModalOpen(false)} title={editingItem ? "Modifier le champ" : "Ajouter un champ"} size="md" centered>
        <form onSubmit={form.onSubmit(handleSave)}>
          <Stack>
            {!editingItem && (
              <TextInput 
                label="Nom du champ" 
                placeholder="MINISTERE, SERVICE, REFERENCE..." 
                {...form.getInputProps('Champ')} 
                required 
              />
            )}
            <Textarea 
              label="Valeur / Template" 
              placeholder="Contenu du champ ou template avec variables [MINISTERE], [DATE], etc."
              description="Variables disponibles: [MINISTERE], [CABINET], [SERVICE], [PAYS], [DEVISE], [LOGO], [DATE]"
              {...form.getInputProps('Valeur')} 
              rows={3} 
              required 
            />
            {editingItem && (
              <Switch 
                label="Actif" 
                {...form.getInputProps('Actif', { type: 'checkbox' })} 
              />
            )}
            <Group justify="flex-end">
              <Button variant="light" onClick={() => setModalOpen(false)}>Annuler</Button>
              <Button type="submit" color="blue">{editingItem ? 'Modifier' : 'Ajouter'}</Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      <Modal opened={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="Confirmation" size="sm" centered>
        <Stack>
          <Text>Supprimer le champ: <strong>{itemToDelete?.Champ}</strong> ?</Text>
          <Group justify="space-between">
            <Button variant="light" onClick={() => setDeleteModalOpen(false)}>Annuler</Button>
            <Button color="red" onClick={handleDelete}>Supprimer</Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}