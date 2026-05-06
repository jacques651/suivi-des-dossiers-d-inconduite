import { Modal, Stack, Alert, Group, Button } from '@mantine/core';
import { invoke } from '@tauri-apps/api/core';
import { notifications } from '@mantine/notifications';

interface Props {
  opened: boolean;
  onClose: () => void;
  agentId: number | null;
  onDeleted: () => void;
}

export default function AgentDeleteModal({ opened, onClose, agentId, onDeleted }: Props) {
  const handleDelete = async () => {
    if (!agentId) return;
    try {
      await invoke('delete_agent', { id: agentId });
      notifications.show({ title: 'Succès', message: 'Agent supprimé', color: 'green' });
      onDeleted();
    } catch (e) {
      notifications.show({ title: 'Erreur', message: String(e), color: 'red' });
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Confirmation" size="sm" centered radius="lg" styles={{ header: { backgroundColor: '#e03131' }, title: { color: 'white' } }}>
      <Stack>
        <Alert color="red" variant="light" radius="md">Êtes-vous sûr de vouloir supprimer cet agent ?</Alert>
        <Group justify="flex-end">
          <Button variant="light" onClick={onClose} radius="md">Annuler</Button>
          <Button color="red" onClick={handleDelete} radius="md">Supprimer</Button>
        </Group>
      </Stack>
    </Modal>
  );
}