import { Modal, Stack, Center, Avatar, Divider, SimpleGrid, Box, Text, Badge } from '@mantine/core';
import { IconUser } from '@tabler/icons-react';
import { Agent, Grade } from './AgentManager';


interface Props {
  opened: boolean;
  onClose: () => void;
  agent: Agent | null;
  grades: Grade[];
}

export default function AgentViewModal({ opened, onClose, agent, grades }: Props) {
  if (!agent) return null;
  const getGrade = (id?: number) => grades.find(g => g.GradeID === id)?.LibelleGrade || 'Non défini';

  return (
    <Modal opened={opened} onClose={onClose} title="Détails de l'agent" size="md" centered radius="lg">
      <Stack>
        <Center><Avatar size={80} radius={80} src={agent.Photo || undefined} color={agent.Sexe === 'M' ? 'blue' : 'pink'}>{!agent.Photo && <IconUser size={40} />}</Avatar></Center>
        <Divider />
        <SimpleGrid cols={2}>
          <Box><Text size="xs" c="dimmed">Matricule</Text><Text fw={600}>{agent.Matricule}</Text></Box>
          <Box><Text size="xs" c="dimmed">Clé</Text><Text fw={600}>{agent.Cle || '-'}</Text></Box>
          <Box><Text size="xs" c="dimmed">Nom complet</Text><Text fw={600}>{agent.Nom} {agent.Prenom}</Text></Box>
          <Box><Text size="xs" c="dimmed">Grade</Text><Badge color="cyan">{getGrade(agent.GradeID)}</Badge></Box>
          <Box><Text size="xs" c="dimmed">Sexe</Text><Badge color={agent.Sexe === 'M' ? 'blue' : 'pink'}>{agent.Sexe === 'M' ? 'Masculin' : 'Féminin'}</Badge></Box>
          <Box><Text size="xs" c="dimmed">Service</Text><Text>{agent.Service || '-'}</Text></Box>
          <Box><Text size="xs" c="dimmed">Entité</Text><Text>{agent.Entite || '-'}</Text></Box>
        </SimpleGrid>
      </Stack>
    </Modal>
  );
}