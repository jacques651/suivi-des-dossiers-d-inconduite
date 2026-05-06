import { useState } from 'react';
import { Table, Card, ScrollArea, Group, Text, Avatar, Badge, ActionIcon, Pagination, Select } from '@mantine/core';
import { IconEye, IconEdit, IconTrash, IconId } from '@tabler/icons-react';
import { Agent, Grade } from './AgentManager';


interface Props {
  agents: Agent[];
  grades: Grade[];
  onView: (agent: Agent) => void;
  onEdit: (agent: Agent) => void;
  onDelete: (id: number) => void;
}

export default function AgentTable({ agents, grades, onView, onEdit, onDelete }: Props) {
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const totalPages = Math.ceil(agents.length / perPage);
  const paginated = agents.slice((page - 1) * perPage, page * perPage);

  const getGrade = (id?: number) => grades.find(g => g.GradeID === id)?.LibelleGrade || 'Non défini';

  return (
    <>
      <Card withBorder radius="lg" shadow="sm" p={0}>
        <ScrollArea h={500}>
          <Table striped highlightOnHover>
            <Table.Thead style={{ backgroundColor: '#1b365d', position: 'sticky', top: 0, zIndex: 1 }}>
              <Table.Tr>
                <Table.Th style={{ color: 'white' }}>Matricule</Table.Th>
                <Table.Th style={{ color: 'white' }}>Agent</Table.Th>
                <Table.Th style={{ color: 'white' }}>Grade</Table.Th>
                <Table.Th style={{ color: 'white' }}>Service</Table.Th>
                <Table.Th style={{ color: 'white' }}>Entité</Table.Th>
                <Table.Th style={{ color: 'white' }}>Sexe</Table.Th>
                <Table.Th style={{ color: 'white', textAlign: 'center' }}>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {paginated.length === 0 ? (
                <Table.Tr><Table.Td colSpan={7} ta="center" py="xl"><Text c="dimmed">Aucun agent trouvé</Text></Table.Td></Table.Tr>
              ) : paginated.map(agent => (
                <Table.Tr key={agent.PersonnelID}>
                  <Table.Td><Group gap="xs"><IconId size={14} /><Text size="sm" fw={500}>{agent.Matricule}</Text></Group></Table.Td>
                  <Table.Td><Group gap="sm"><Avatar radius="xl" size="sm" color={agent.Sexe === 'M' ? 'blue' : 'pink'}>{agent.Nom?.[0]}{agent.Prenom?.[0]}</Avatar><Text size="sm">{agent.Nom} {agent.Prenom}</Text></Group></Table.Td>
                  <Table.Td><Badge variant="light" color="cyan">{getGrade(agent.GradeID)}</Badge></Table.Td>
                  <Table.Td><Text size="sm">{agent.Service || '—'}</Text></Table.Td>
                  <Table.Td><Text size="sm">{agent.Entite || '—'}</Text></Table.Td>
                  <Table.Td><Badge color={agent.Sexe === 'M' ? 'blue' : 'pink'} variant="light">{agent.Sexe || '—'}</Badge></Table.Td>
                  <Table.Td>
                    <Group gap={4} justify="center">
                      <ActionIcon variant="light" color="green" size="sm" onClick={() => onView(agent)}><IconEye size={14} /></ActionIcon>
                      <ActionIcon variant="light" color="blue" size="sm" onClick={() => onEdit(agent)}><IconEdit size={14} /></ActionIcon>
                      <ActionIcon variant="light" color="red" size="sm" onClick={() => onDelete(agent.PersonnelID)}><IconTrash size={14} /></ActionIcon>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </ScrollArea>
      </Card>
      {totalPages > 1 && (
        <Card withBorder radius="lg" shadow="sm" p="md">
          <Group justify="space-between">
            <Text size="sm" c="dimmed">{agents.length} agent(s)</Text>
            <Pagination total={totalPages} value={page} onChange={setPage} color="#1b365d" />
            <Select value={perPage.toString()} onChange={(v) => { setPerPage(parseInt(v || '10')); setPage(1); }} data={['10', '25', '50', '100'].map(v => ({ value: v, label: v }))} size="xs" w={80} />
          </Group>
        </Card>
      )}
    </>
  );
}