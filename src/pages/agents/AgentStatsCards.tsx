import { SimpleGrid, Card, Text, Group, ThemeIcon, Box, Progress, RingProgress } from '@mantine/core';
import { IconUsers, IconMan, IconWoman, IconBuilding } from '@tabler/icons-react';
import { Agent } from './AgentManager';


interface Props { agents: Agent[]; }

export default function AgentStatsCards({ agents }: Props) {
  const total = agents.length;
  const males = agents.filter(a => a.Sexe === 'M').length;
  const females = agents.filter(a => a.Sexe === 'F').length;
  const services = [...new Set(agents.map(a => a.Service).filter(Boolean))].length;
  const tauxM = total > 0 ? Math.round((males / total) * 100) : 0;
  const tauxF = total > 0 ? Math.round((females / total) * 100) : 0;

  return (
    <SimpleGrid cols={{ base: 2, sm: 3, md: 5 }} spacing="md">
      <Card withBorder radius="lg" shadow="sm" p="md" style={{ borderLeft: '4px solid var(--mantine-color-blue-6)' }}>
        <Group gap="sm" wrap="nowrap">
          <ThemeIcon size="lg" radius="md" color="blue" variant="light"><IconUsers size={20} /></ThemeIcon>
          <Box style={{ flex: 1 }}>
            <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Total Agents</Text>
            <Text fw={700} size="xl">{total}</Text>
            <Text size="xs" c="dimmed">{services} services</Text>
          </Box>
        </Group>
      </Card>
      <Card withBorder radius="lg" shadow="sm" p="md" style={{ borderLeft: '4px solid var(--mantine-color-green-6)' }}>
        <Group gap="sm" wrap="nowrap">
          <ThemeIcon size="lg" radius="md" color="green" variant="light"><IconMan size={20} /></ThemeIcon>
          <Box style={{ flex: 1 }}>
            <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Hommes</Text>
            <Text fw={700} size="xl">{males}</Text>
            <Progress value={tauxM} size="xs" radius="xl" color="green" mt={4} />
          </Box>
        </Group>
      </Card>
      <Card withBorder radius="lg" shadow="sm" p="md" style={{ borderLeft: '4px solid var(--mantine-color-pink-6)' }}>
        <Group gap="sm" wrap="nowrap">
          <ThemeIcon size="lg" radius="md" color="pink" variant="light"><IconWoman size={20} /></ThemeIcon>
          <Box style={{ flex: 1 }}>
            <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Femmes</Text>
            <Text fw={700} size="xl">{females}</Text>
            <Progress value={tauxF} size="xs" radius="xl" color="pink" mt={4} />
          </Box>
        </Group>
      </Card>
      <Card withBorder radius="lg" shadow="sm" p="md" style={{ borderLeft: '4px solid var(--mantine-color-violet-6)' }}>
        <Group gap="sm" wrap="nowrap">
          <ThemeIcon size="lg" radius="md" color="violet" variant="light"><IconBuilding size={20} /></ThemeIcon>
          <Box style={{ flex: 1 }}>
            <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Services</Text>
            <Text fw={700} size="xl">{services}</Text>
          </Box>
        </Group>
      </Card>
      <Card withBorder radius="lg" shadow="sm" p="md" style={{ borderLeft: '4px solid var(--mantine-color-cyan-6)' }}>
        <Group gap="sm" wrap="nowrap">
          <RingProgress size={50} thickness={5} roundCaps sections={[{ value: tauxM, color: 'green' }, { value: tauxF, color: 'pink' }]} />
          <Box style={{ flex: 1 }}>
            <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Répartition</Text>
            <Text size="xs">{tauxM}% H / {tauxF}% F</Text>
          </Box>
        </Group>
      </Card>
    </SimpleGrid>
  );
}