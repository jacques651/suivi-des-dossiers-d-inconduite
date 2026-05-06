// src/pages/agents/AgentManager.tsx
import { useEffect, useState, useRef } from 'react';
import { Stack, Card, Title, Text, Group, Button, Avatar, Box, Container, Center, Loader } from '@mantine/core';
import { IconUsers, IconPlus, IconRefresh } from '@tabler/icons-react';
import { invoke } from '@tauri-apps/api/core';
import { notifications } from '@mantine/notifications';
import AgentDeleteModal from './AgentDeleteModal';
import AgentExportMenu from './AgentExportMenu';
import AgentFilters from './AgentFilters';
import AgentFormModal from './AgentFormModal';
import AgentImportModal from './AgentImportModal';
import AgentStatsCards from './AgentStatsCards';
import AgentTable from './AgentTable';
import AgentViewModal from './AgentViewModal';


// Définition et export des interfaces
export interface Agent {
  PersonnelID: number;
  Matricule: string;
  Cle?: string;
  Nom: string;
  Prenom: string;
  GradeID?: number;
  GradeLibelle?: string;
  Service?: string;
  Entite?: string;
  Sexe?: string;
  Photo?: string;
  CreatedAt?: string;
}

export interface Grade {
  GradeID: number;
  LibelleGrade: string;
}

export default function AgentManager() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);
  const [serviceOptions, setServiceOptions] = useState<string[]>([]);
  const printRef = useRef<HTMLDivElement>(null);

  // États modals
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [agentToDelete, setAgentToDelete] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Filtres
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSexe, setSelectedSexe] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [selectedEntite, setSelectedEntite] = useState<string | null>(null);

  useEffect(() => { 
    loadAgents(); 
    loadGrades(); 
  }, []);

  const loadAgents = async () => {
    setLoading(true);
    try {
      const result = await invoke('get_agents');
      const data = result as Agent[];
      setAgents(data);
      const services = [...new Set(data.map(a => a.Service).filter(Boolean))] as string[];
      setServiceOptions(services);
    } catch (error) {
      notifications.show({ 
        title: 'Erreur', 
        message: 'Impossible de charger les agents', 
        color: 'red' 
      });
    } finally { 
      setLoading(false); 
    }
  };

  const loadGrades = async () => {
    try { 
      const result = await invoke('get_grades');
      setGrades(result as Grade[]); 
    } catch (error) {
      console.error('Erreur chargement grades:', error);
    }
  };

  // Handlers pour les actions
  const handleAdd = () => { 
    setEditingId(null); 
    setSelectedAgent(null);
    setFormModalOpen(true); 
  };
  
  const handleEdit = (agent: Agent) => { 
    setEditingId(agent.PersonnelID); 
    setSelectedAgent(agent); 
    setFormModalOpen(true); 
  };
  
  const handleView = (agent: Agent) => { 
    setSelectedAgent(agent); 
    setViewModalOpen(true); 
  };
  
  const handleDelete = (id: number) => { 
    setAgentToDelete(id); 
    setDeleteModalOpen(true); 
  };

  const handleSaved = () => { 
    setFormModalOpen(false); 
    setSelectedAgent(null); 
    setEditingId(null); 
    loadAgents(); 
  };
  
  const handleDeleted = () => { 
    setDeleteModalOpen(false); 
    setAgentToDelete(null); 
    loadAgents(); 
  };

  const handleImported = () => {
    loadAgents();
    loadGrades();
  };

  // Filtrer les agents
  const filteredAgents = agents.filter(agent => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      agent.Nom?.toLowerCase().includes(searchLower) ||
      agent.Prenom?.toLowerCase().includes(searchLower) ||
      agent.Matricule?.toLowerCase().includes(searchLower);
    const matchesSexe = !selectedSexe || agent.Sexe === selectedSexe;
    const matchesService = !selectedService || agent.Service === selectedService;
    const matchesEntite = !selectedEntite || agent.Entite === selectedEntite;
    return matchesSearch && matchesSexe && matchesService && matchesEntite;
  });

  if (loading) {
    return (
      <Center style={{ height: '50vh' }}>
        <Loader size="xl" color="#1b365d" />
      </Center>
    );
  }

  return (
    <Box p="md">
      <Container size="full">
        <Stack gap="lg">
          {/* En-tête */}
          <Card withBorder radius="lg" p="lg" style={{ background: 'linear-gradient(135deg, #1b365d 0%, #2a4a7a 100%)' }}>
            <Group justify="space-between">
              <Group gap="md">
                <Avatar size={50} radius="md" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
                  <IconUsers size={24} color="white" />
                </Avatar>
                <Box>
                  <Title order={2} c="white">Gestion des Agents</Title>
                  <Text c="gray.3" size="sm">Gérez les informations des agents</Text>
                </Box>
              </Group>
              <Group>
                <Button 
                  variant="white" 
                  color="dark" 
                  leftSection={<IconRefresh size={16} />} 
                  onClick={loadAgents}
                >
                  Actualiser
                </Button>
                <AgentExportMenu 
                  agents={filteredAgents} 
                  grades={grades} 
                  onImport={() => setImportModalOpen(true)}
                />
                <Button 
                  variant="white" 
                  color="dark" 
                  leftSection={<IconPlus size={16} />} 
                  onClick={handleAdd}
                >
                  Nouvel Agent
                </Button>
              </Group>
            </Group>
          </Card>

          {/* Statistiques */}
          <AgentStatsCards agents={agents} />

          {/* Filtres */}
          <AgentFilters
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            selectedSexe={selectedSexe}
            onSexeChange={setSelectedSexe}
            selectedService={selectedService}
            onServiceChange={setSelectedService}
            selectedEntite={selectedEntite}
            onEntiteChange={setSelectedEntite}
            serviceOptions={serviceOptions}
          />

          {/* Tableau */}
          <div ref={printRef}>
            <AgentTable
              agents={filteredAgents}
              grades={grades}
              onView={handleView}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          </div>
        </Stack>
      </Container>

      {/* Modals */}
      <AgentFormModal
        opened={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        agent={selectedAgent}
        editingId={editingId}
        grades={grades}
        serviceOptions={serviceOptions}
        onSaved={handleSaved}
      />
      
      <AgentViewModal 
        opened={viewModalOpen} 
        onClose={() => setViewModalOpen(false)} 
        agent={selectedAgent} 
        grades={grades} 
      />
      
      <AgentDeleteModal 
        opened={deleteModalOpen} 
        onClose={() => setDeleteModalOpen(false)} 
        agentId={agentToDelete} 
        onDeleted={handleDeleted} 
      />
      
      <AgentImportModal 
        opened={importModalOpen} 
        onClose={() => setImportModalOpen(false)} 
        onImported={handleImported} 
      />
    </Box>
  );
}