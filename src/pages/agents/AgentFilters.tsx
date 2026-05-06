import { Card, TextInput, Select, Grid, Autocomplete } from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';

interface Props {
  searchTerm: string;
  onSearchChange: (val: string) => void;
  selectedSexe: string | null;
  onSexeChange: (val: string | null) => void;
  selectedService: string | null;
  onServiceChange: (val: string | null) => void;
  selectedEntite: string | null;
  onEntiteChange: (val: string | null) => void;
  serviceOptions: string[];
}

export default function AgentFilters({ searchTerm, onSearchChange, selectedSexe, onSexeChange, selectedService, onServiceChange, selectedEntite, onEntiteChange, serviceOptions }: Props) {
  return (
    <Card withBorder radius="lg" shadow="sm" p="lg">
      <Grid>
        <Grid.Col span={{ base: 12, sm: 4 }}>
          <TextInput placeholder="Rechercher..." leftSection={<IconSearch size={14} />} value={searchTerm} onChange={(e) => onSearchChange(e.currentTarget.value)} size="sm" radius="md" />
        </Grid.Col>
        <Grid.Col span={{ base: 6, sm: 2 }}>
          <Select placeholder="Sexe" value={selectedSexe} onChange={(val) => onSexeChange(val)} clearable data={[{ value: 'M', label: 'M' }, { value: 'F', label: 'F' }]} size="sm" radius="md" />
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 3 }}>
          <Autocomplete placeholder="Service" value={selectedService || ''} onChange={(val) => onServiceChange(val || null)} data={serviceOptions.filter(Boolean)} size="sm" radius="md" />
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 3 }}>
          <Select placeholder="Entité" value={selectedEntite} onChange={(val) => onEntiteChange(val)} clearable data={['Police Nationale', 'Gendarmerie Nationale', 'Autre'].map(e => ({ value: e, label: e }))} size="sm" radius="md" />
        </Grid.Col>
      </Grid>
    </Card>
  );
}