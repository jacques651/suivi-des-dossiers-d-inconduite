import { useState } from 'react';
import {
  Card, Table, Text, Badge, Group, Avatar, Tooltip,
  ScrollArea, Center, Stack, Divider, SimpleGrid, Paper,
  ActionIcon, Alert, Grid, Pagination, Select
} from '@mantine/core';
import { IconHistory, IconUser, IconInfoCircle, IconChartBar, IconRefresh } from '@tabler/icons-react';
import dayjs from 'dayjs';
import { Log } from './types';

interface LogsTabProps {
  logs: Log[];
  onRefresh?: () => void;
}

export function LogsTab({ logs, onRefresh }: LogsTabProps) {
  const [showStats, setShowStats] = useState(false);
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Pagination
  const startIndex = (page - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedLogs = logs.slice(startIndex, endIndex);
  const totalPages = Math.ceil(logs.length / itemsPerPage);

  const stats = {
    totalActions: logs.length,
    uniqueUsers: new Set(logs.map(l => l.Utilisateur)).size,
    lastAction: logs[0],
    actionsByType: logs.reduce((acc, log) => {
      acc[log.Action] = (acc[log.Action] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'CREATE': return 'green';
      case 'UPDATE': return 'orange';
      case 'DELETE': return 'red';
      default: return 'gray';
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'CREATE': return 'Création';
      case 'UPDATE': return 'Modification';
      case 'DELETE': return 'Suppression';
      default: return action;
    }
  };

  return (
    <Card withBorder shadow="sm" p="sm">
      <Stack gap="sm">
        {/* En-tête */}
        <Group justify="space-between">
          <Group gap="sm">
            <IconHistory size={20} color="#1b365d" />
            <Text fw={600} size="lg">Historique des actions</Text>
            <Badge size="sm" variant="light" color="blue">{logs.length} actions</Badge>
          </Group>
          <Group gap="xs">
            {onRefresh && (
              <Tooltip label="Actualiser">
                <ActionIcon variant="light" color="green" onClick={onRefresh} size="sm">
                  <IconRefresh size={16} />
                </ActionIcon>
              </Tooltip>
            )}
            <Tooltip label="Statistiques">
              <ActionIcon variant="light" color="blue" onClick={() => setShowStats(!showStats)} size="sm">
                <IconChartBar size={16} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Group>

        <Divider />

        {/* Tableau */}
        <ScrollArea style={{ maxHeight: 500 }}>
          <Table striped highlightOnHover>
            <Table.Thead style={{ backgroundColor: '#1b365d' }}>
              <Table.Tr>
                <Table.Th style={{ color: 'white', width: 160 }}>Date</Table.Th>
                <Table.Th style={{ color: 'white', width: 140 }}>Utilisateur</Table.Th>
                <Table.Th style={{ color: 'white', width: 100 }}>Action</Table.Th>
                <Table.Th style={{ color: 'white', width: 120 }}>Table</Table.Th>
                <Table.Th style={{ color: 'white' }}>Détails</Table.Th>
                <Table.Th style={{ color: 'white', width: 120 }}>IP</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {paginatedLogs.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={6}>
                    <Center py="xl">
                      <Stack align="center" gap="xs">
                        <IconHistory size={48} color="gray" />
                        <Text c="dimmed" size="sm">Aucun historique disponible</Text>
                      </Stack>
                    </Center>
                  </Table.Td>
                </Table.Tr>
              ) : (
                paginatedLogs.map((log) => (
                  <Table.Tr key={log.LogID}>
                    <Table.Td>
                      <Tooltip label={dayjs(log.DateLog).format('DD/MM/YYYY HH:mm:ss')}>
                        <Text size="sm">{dayjs(log.DateLog).format('DD/MM/YYYY HH:mm')}</Text>
                      </Tooltip>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs" wrap="nowrap">
                        <Avatar size="sm" radius="xl" color={log.Utilisateur === 'System' ? 'gray' : 'blue'}>
                          <IconUser size={12} />
                        </Avatar>
                        <Text fw={500} size="sm">{log.Utilisateur || 'Système'}</Text>
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Badge 
                        color={getActionColor(log.Action)} 
                        variant="light"
                        size="sm"
                      >
                        {getActionLabel(log.Action)}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Badge variant="outline" size="sm">{log.TableConcernee}</Badge>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <Text size="sm" lineClamp={2}>{log.Details}</Text>
                        {log.AnciennesValeurs && (
                          <Tooltip label={`Anciennes valeurs: ${log.AnciennesValeurs}`}>
                            <IconInfoCircle size={14} style={{ cursor: 'help', color: '#fa5252' }} />
                          </Tooltip>
                        )}
                        {log.NouvellesValeurs && (
                          <Tooltip label={`Nouvelles valeurs: ${log.NouvellesValeurs}`}>
                            <IconInfoCircle size={14} style={{ cursor: 'help', color: '#40c057' }} />
                          </Tooltip>
                        )}
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Text size="xs" c="dimmed">{log.AdresseIP || '-'}</Text>
                    </Table.Td>
                  </Table.Tr>
                ))
              )}
            </Table.Tbody>
          </Table>
        </ScrollArea>

        {/* Pagination */}
        {logs.length > 0 && (
          <Group justify="space-between" align="center" mt="sm">
            <Group gap="sm">
              <Text size="xs" c="dimmed">
                Affichage de {startIndex + 1} à {Math.min(endIndex, logs.length)} sur {logs.length} actions
              </Text>
              <Select
                size="xs"
                value={itemsPerPage.toString()}
                onChange={(val) => {
                  setItemsPerPage(parseInt(val || '20'));
                  setPage(1);
                }}
                data={[
                  { value: '10', label: '10 lignes' },
                  { value: '20', label: '20 lignes' },
                  { value: '50', label: '50 lignes' },
                  { value: '100', label: '100 lignes' }
                ]}
                style={{ width: 100 }}
              />
            </Group>
            {totalPages > 1 && (
              <Pagination 
                total={totalPages} 
                value={page} 
                onChange={setPage} 
                size="sm"
                radius="md"
              />
            )}
          </Group>
        )}

        <Divider />

        {/* Statistiques */}
        <SimpleGrid cols={{ base: 1, md: 3 }} spacing="sm">
          <Paper p="sm" withBorder>
            <Text size="xs" c="dimmed">Total actions</Text>
            <Text fw={700} size="xl">{stats.totalActions}</Text>
          </Paper>
          <Paper p="sm" withBorder>
            <Text size="xs" c="dimmed">Dernière action</Text>
            <Text size="sm" lineClamp={1}>{stats.lastAction?.Details || '-'}</Text>
            <Text size="xs" c="dimmed">par {stats.lastAction?.Utilisateur || '-'}</Text>
          </Paper>
          <Paper p="sm" withBorder>
            <Text size="xs" c="dimmed">Utilisateurs actifs</Text>
            <Text fw={700} size="xl">{stats.uniqueUsers}</Text>
          </Paper>
        </SimpleGrid>

        {showStats && (
          <Alert mt="xs" icon={<IconChartBar size={16} />} title="Statistiques" color="blue" variant="light">
            <Grid>
              <Grid.Col span={6}>
                <Text size="xs" c="dimmed" mb="xs">Types d'actions</Text>
                <Group gap="xs">
                  {Object.entries(stats.actionsByType).map(([action, count]) => (
                    <Badge key={action} size="sm" color={getActionColor(action)} variant="light">
                      {getActionLabel(action)}: {count}
                    </Badge>
                  ))}
                </Group>
              </Grid.Col>
              <Grid.Col span={6}>
                <Text size="xs" c="dimmed" mb="xs">Top utilisateurs</Text>
                <Group gap="xs">
                  {Array.from(new Set(logs.map(l => l.Utilisateur))).slice(0, 5).map(user => (
                    <Badge key={user} size="sm" color="cyan" variant="light">{user}</Badge>
                  ))}
                </Group>
              </Grid.Col>
            </Grid>
          </Alert>
        )}
      </Stack>
    </Card>
  );
}