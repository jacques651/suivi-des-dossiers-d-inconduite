// src/components/referentiels/SignatairesTab.tsx
import { useState, useEffect } from 'react';
import { Table, Button, Modal, TextInput, Stack, Card, Group, ActionIcon, Text, Badge, Divider, ScrollArea, Pagination, Grid, Select, Avatar, Tooltip, Box } from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconPlus, IconEdit, IconTrash, IconSearch, IconUser, IconUserCheck, IconUserX, IconRefresh } from '@tabler/icons-react';
import { invoke } from '@tauri-apps/api/core';
import { notifications } from '@mantine/notifications';
import { Signataire } from './types';

interface Grade {
  GradeID: number;
  LibelleGrade: string;
}

interface SignatairesTabProps {
  signataires: Signataire[];
  onRefresh: () => void;
  onSelectSignataire?: (signataire: Signataire) => void;
}

export function SignatairesTab({ signataires, onRefresh, onSelectSignataire }: SignatairesTabProps) {
  const [search, setSearch] = useState('');
  const [filterStatut, setFilterStatut] = useState<string | null>(null);
  const [filterGrade, setFilterGrade] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Signataire | null>(null);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(false);
  const itemsPerPage = 10;

  // Charger les grades
  useEffect(() => {
    loadGrades();
  }, []);

  const loadGrades = async () => {
    try {
      const result = await invoke('get_grades');
      setGrades(result as Grade[]);
    } catch (error) {
      console.error('Erreur chargement grades:', error);
    }
  };

  const form = useForm({ 
    initialValues: { 
      Nom: '', 
      Prenom: '', 
      Grade: '', 
      Fonction: '', 
      TitreHonorifique: '', 
      Statut: 1 
    }, 
    validate: { 
      Nom: (value) => (value ? null : 'Le nom est requis'), 
      Prenom: (value) => (value ? null : 'Le prénom est requis'), 
      Fonction: (value) => (value ? null : 'La fonction est requise') 
    } 
  });

  const handleSave = async (values: typeof form.values) => {
    setLoading(true);
    try {
      if (editingItem) {
        await invoke('update_signataire', { 
          signataire: { 
            ...values, 
            SignataireID: editingItem.SignataireID,
            Statut: typeof values.Statut === 'string' ? parseInt(values.Statut) : values.Statut
          } 
        });
        notifications.show({ 
          title: '✅ Succès', 
          message: 'Signataire modifié avec succès', 
          color: 'green' 
        });
      } else {
        await invoke('create_signataire', { 
          signataire: { 
            ...values,
            Statut: typeof values.Statut === 'string' ? parseInt(values.Statut) : values.Statut
          } 
        });
        notifications.show({ 
          title: '✅ Succès', 
          message: 'Signataire ajouté avec succès', 
          color: 'green' 
        });
      }
      setModalOpen(false);
      form.reset();
      setEditingItem(null);
      onRefresh();
    } catch (error: any) {
      notifications.show({ 
        title: '❌ Erreur', 
        message: `Erreur: ${error.message || error}`, 
        color: 'red' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce signataire ?')) return;
    
    try {
      await invoke('delete_signataire', { signataireId: id });
      notifications.show({ 
        title: '✅ Succès', 
        message: 'Signataire supprimé avec succès', 
        color: 'green' 
      });
      onRefresh();
    } catch (error) {
      notifications.show({ 
        title: '❌ Erreur', 
        message: 'Impossible de supprimer ce signataire', 
        color: 'red' 
      });
    }
  };

  const handleToggleStatut = async (signataire: Signataire) => {
    const newStatut = signataire.Statut === 1 ? 0 : 1;
    try {
      await invoke('update_signataire', { 
        signataire: { 
          ...signataire, 
          Statut: newStatut
        } 
      });
      notifications.show({ 
        title: '✅ Succès', 
        message: `Signataire ${newStatut === 1 ? 'activé' : 'désactivé'} avec succès`, 
        color: 'green' 
      });
      onRefresh();
    } catch (error) {
      notifications.show({ 
        title: '❌ Erreur', 
        message: 'Impossible de modifier le statut', 
        color: 'red' 
      });
    }
  };

  const handleSelectSignataire = (signataire: Signataire) => {
    if (onSelectSignataire) {
      onSelectSignataire(signataire);
      notifications.show({ 
        title: '✅ Signataire sélectionné', 
        message: `${signataire.Prenom} ${signataire.Nom} sera utilisé pour les documents`, 
        color: 'blue' 
      });
    }
  };

  // Filtrer les données
  const filteredData = signataires.filter(s => {
    const matchesSearch = search === '' || 
      s.Nom.toLowerCase().includes(search.toLowerCase()) || 
      s.Prenom.toLowerCase().includes(search.toLowerCase()) || 
      s.Fonction.toLowerCase().includes(search.toLowerCase());
    const matchesStatut = !filterStatut || 
      (filterStatut === 'actif' && s.Statut === 1) || 
      (filterStatut === 'inactif' && s.Statut === 0);
    const matchesGrade = !filterGrade || s.Grade === filterGrade;
    return matchesSearch && matchesStatut && matchesGrade;
  });
  
  const paginatedData = filteredData.slice((page - 1) * itemsPerPage, page * itemsPerPage);
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  // Options pour les selects
  const gradeOptions = grades.map(grade => ({
    value: grade.LibelleGrade,
    label: grade.LibelleGrade
  }));

  const uniqueGrades = [...new Set(signataires.map(s => s.Grade).filter(Boolean))];

  // Signataire actif par défaut
  const signataireActif = signataires.find(s => s.Statut === 1);

  return (
    <Stack gap="md">
      {/* En-tête avec informations */}
      <Card withBorder radius="md" p="sm" bg="blue.0">
        <Group justify="space-between">
          <Group gap="md">
            <Avatar size="md" radius="xl" color="blue">
              <IconUser size={20} />
            </Avatar>
            <Box>
              <Text size="sm" fw={600}>Signataire par défaut</Text>
              {signataireActif ? (
                <Text size="xs" c="dimmed">
                  {signataireActif.Prenom} {signataireActif.Nom} - {signataireActif.Fonction}
                </Text>
              ) : (
                <Text size="xs" c="orange">Aucun signataire actif. Veuillez en activer un.</Text>
              )}
            </Box>
          </Group>
          <Button 
            size="xs" 
            variant="light" 
            leftSection={<IconRefresh size={14} />} 
            onClick={() => { loadGrades(); onRefresh(); }}
          >
            Actualiser
          </Button>
        </Group>
      </Card>

      {/* Barre de recherche et filtres */}
      <Group justify="space-between">
        <Group gap="xs">
          <TextInput 
            size="sm" 
            placeholder="Rechercher par nom, prénom ou fonction..." 
            leftSection={<IconSearch size={16} />} 
            value={search} 
            onChange={(e) => { setSearch(e.currentTarget.value); setPage(1); }} 
            style={{ width: 280 }} 
          />
          <Select 
            size="sm" 
            placeholder="Statut" 
            value={filterStatut} 
            onChange={(val) => { setFilterStatut(val); setPage(1); }} 
            clearable 
            data={[
              { value: 'actif', label: '✅ Actif' }, 
              { value: 'inactif', label: '❌ Inactif' }
            ]} 
            style={{ width: 120 }} 
          />
          <Select 
            size="sm" 
            placeholder="Grade" 
            value={filterGrade} 
            onChange={(val) => { setFilterGrade(val); setPage(1); }} 
            clearable 
            data={uniqueGrades.map(g => ({ value: g || '', label: g || '' }))} 
            style={{ width: 150 }} 
          />
        </Group>
        <Button 
          size="sm" 
          leftSection={<IconPlus size={16} />} 
          onClick={() => { setEditingItem(null); form.reset(); setModalOpen(true); }} 
          variant="gradient" 
          gradient={{ from: '#1b365d', to: '#2a4a7a' }}
        >
          Nouveau signataire
        </Button>
      </Group>
      
      <Divider />
      
      {/* Tableau des signataires */}
      <Card withBorder radius="md" p="0">
        <ScrollArea style={{ maxHeight: 500 }}>
          <Table striped highlightOnHover>
            <Table.Thead style={{ backgroundColor: '#1b365d' }}>
              <Table.Tr>
                <Table.Th style={{ color: 'white', fontWeight: 600, width: 60 }}>ID</Table.Th>
                <Table.Th style={{ color: 'white', fontWeight: 600 }}>Nom complet</Table.Th>
                <Table.Th style={{ color: 'white', fontWeight: 600 }}>Grade</Table.Th>
                <Table.Th style={{ color: 'white', fontWeight: 600 }}>Fonction</Table.Th>
                <Table.Th style={{ color: 'white', fontWeight: 600 }}>Titre honorifique</Table.Th>
                <Table.Th style={{ color: 'white', fontWeight: 600, width: 100 }}>Statut</Table.Th>
                <Table.Th style={{ color: 'white', fontWeight: 600, width: 140, textAlign: 'center' }}>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {paginatedData.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={7} style={{ textAlign: 'center', padding: '40px' }}>
                    <Text c="dimmed">Aucun signataire trouvé</Text>
                  </Table.Td>
                </Table.Tr>
              ) : (
                paginatedData.map((s) => (
                  <Table.Tr key={s.SignataireID} style={{ backgroundColor: s.Statut === 1 ? 'rgba(0, 200, 0, 0.05)' : undefined }}>
                    <Table.Td>
                      <Badge variant="light" color="cyan" size="sm">{s.SignataireID}</Badge>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <Avatar size="md" radius="xl" color={s.Statut === 1 ? 'green' : 'gray'}>
                          <IconUser size={16} />
                        </Avatar>
                        <Box>
                          <Text size="sm" fw={500}>{s.Prenom} {s.Nom}</Text>
                          {s.TitreHonorifique && (
                            <Text size="xs" c="dimmed">{s.TitreHonorifique}</Text>
                          )}
                        </Box>
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      {s.Grade && (
                        <Badge variant="light" color="blue" size="sm">{s.Grade}</Badge>
                      )}
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{s.Fonction}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c="dimmed">{s.TitreHonorifique || '-'}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge size="sm" color={s.Statut === 1 ? 'green' : 'gray'} variant="light">
                        {s.Statut === 1 ? '✅ Actif' : '❌ Inactif'}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs" justify="center">
                        {onSelectSignataire && s.Statut === 1 && (
                          <Tooltip label="Utiliser comme signataire par défaut">
                            <ActionIcon 
                              size="sm" 
                              onClick={() => handleSelectSignataire(s)} 
                              color="green" 
                              variant="light"
                            >
                              <IconUserCheck size={16} />
                            </ActionIcon>
                          </Tooltip>
                        )}
                        <Tooltip label="Modifier">
                          <ActionIcon 
                            size="sm" 
                            onClick={() => { 
                              setEditingItem(s); 
                              form.setValues({ 
                                Nom: s.Nom, 
                                Prenom: s.Prenom, 
                                Grade: s.Grade || '', 
                                Fonction: s.Fonction, 
                                TitreHonorifique: s.TitreHonorifique || '', 
                                Statut: s.Statut 
                              }); 
                              setModalOpen(true); 
                            }} 
                            color="orange" 
                            variant="light"
                          >
                            <IconEdit size={16} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label={s.Statut === 1 ? 'Désactiver' : 'Activer'}>
                          <ActionIcon 
                            size="sm" 
                            onClick={() => handleToggleStatut(s)} 
                            color={s.Statut === 1 ? 'red' : 'green'} 
                            variant="light"
                          >
                            {s.Statut === 1 ? <IconUserX size={16} /> : <IconUserCheck size={16} />}
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Supprimer">
                          <ActionIcon 
                            size="sm" 
                            onClick={() => handleDelete(s.SignataireID)} 
                            color="red" 
                            variant="light"
                          >
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))
              )}
            </Table.Tbody>
          </Table>
        </ScrollArea>
      </Card>
      
      {totalPages > 1 && (
        <Group justify="center" mt="md">
          <Pagination total={totalPages} value={page} onChange={setPage} size="sm" color="#1b365d" />
        </Group>
      )}
      
      {/* Modal formulaire */}
      <Modal 
        opened={modalOpen} 
        onClose={() => setModalOpen(false)} 
        title={
          <Group gap="xs">
            <IconUser size={20} />
            <Text fw={600}>{editingItem ? "Modifier le signataire" : "Nouveau signataire"}</Text>
          </Group>
        } 
        size="lg" 
        centered
        radius="md"
      >
        <form onSubmit={form.onSubmit(handleSave)}>
          <Stack gap="md">
            <Grid>
              <Grid.Col span={6}>
                <TextInput 
                  size="sm" 
                  label="Nom" 
                  placeholder="Entrez le nom"
                  {...form.getInputProps('Nom')} 
                  required 
                  withAsterisk
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <TextInput 
                  size="sm" 
                  label="Prénom" 
                  placeholder="Entrez le prénom"
                  {...form.getInputProps('Prenom')} 
                  required 
                  withAsterisk
                />
              </Grid.Col>
              <Grid.Col span={12}>
                <Select 
                  size="sm" 
                  label="Grade" 
                  placeholder="Sélectionner un grade"
                  data={gradeOptions}
                  searchable
                  clearable
                  {...form.getInputProps('Grade')} 
                />
              </Grid.Col>
              <Grid.Col span={12}>
                <TextInput 
                  size="sm" 
                  label="Fonction" 
                  placeholder="Entrez la fonction"
                  {...form.getInputProps('Fonction')} 
                  required 
                  withAsterisk
                />
              </Grid.Col>
              <Grid.Col span={12}>
                <TextInput 
                  size="sm" 
                  label="Titre honorifique" 
                  placeholder="Ex: Excellence, Docteur, etc."
                  {...form.getInputProps('TitreHonorifique')} 
                />
              </Grid.Col>
              <Grid.Col span={12}>
                <Select 
                  size="sm" 
                  label="Statut" 
                  data={[
                    { value: '1', label: '✅ Actif' }, 
                    { value: '0', label: '❌ Inactif' }
                  ]} 
                  {...form.getInputProps('Statut')} 
                />
              </Grid.Col>
            </Grid>
            <Group justify="flex-end" mt="md">
              <Button size="sm" variant="light" onClick={() => setModalOpen(false)}>Annuler</Button>
              <Button size="sm" type="submit" color="blue" loading={loading}>
                {editingItem ? 'Modifier' : 'Créer'}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Stack>
  );
}

// Composant pour afficher le bloc signature dans les documents
export function SignatureBlock({ signataire, showDate = true }: { signataire?: Signataire; showDate?: boolean }) {
  if (!signataire) return null;
  
  return (
    <div style={{ textAlign: 'right', marginTop: 40, lineHeight: 1.8 }}>
      {signataire.TitreHonorifique && (
        <div style={{ fontSize: 12, fontStyle: 'italic' }}>{signataire.TitreHonorifique}</div>
      )}
      <div><strong>{signataire.Prenom} {signataire.Nom}</strong></div>
      {signataire.Grade && <div style={{ fontSize: 12 }}>{signataire.Grade}</div>}
      <div style={{ fontSize: 12 }}>{signataire.Fonction}</div>
      <div style={{ marginTop: 8, width: 200, marginLeft: 'auto', borderTop: '1px solid #000' }}></div>
      {showDate && (
        <div style={{ fontSize: 11, marginTop: 4 }}>
          Fait à Ouagadougou, le {new Date().toLocaleDateString('fr-FR')}
        </div>
      )}
    </div>
  );
}