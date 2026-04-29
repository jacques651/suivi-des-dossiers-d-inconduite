import { useEffect, useState } from 'react';
import {
  Grid,
  Paper,
  Text,
  Title,
  RingProgress,
  Group,
  SimpleGrid,
  Card,
  ThemeIcon,
  Stack,
  Divider,
  Progress,
  Badge,
  Center,
  Avatar,
  Box,
  Container,
  LoadingOverlay,
  Button
} from '@mantine/core';
import {
  IconFileText,
  IconUsers,
  IconChecklist,
  IconAlertCircle,
  IconReport,
  IconGavel,
  IconChartBar,
  IconTrendingUp,
  IconCheck,
  IconClock,
  IconX,
  IconBuilding,
  IconDashboard,
  IconListCheck,
  IconPlus,
  IconEye,
  IconSettings,
  IconCategory
} from '@tabler/icons-react';
import { invoke } from '@tauri-apps/api/core';

interface Stats {
  totalAgents: number;
  totalRapports: number;
  totalRecommandations: number;
  totalDossiers: number;
  recommandationsRealisees: number;
  recommandationsEnCours: number;
  recommandationsNonRealisees: number;
}

interface DashboardProps {
  onNavigate?: (page: string) => void;
}

const formatNumber = (v?: number) => (v || 0).toLocaleString('fr-FR');

export default function Dashboard({ onNavigate }: DashboardProps) {
  const [stats, setStats] = useState<Stats>({
    totalAgents: 0,
    totalRapports: 0,
    totalRecommandations: 0,
    totalDossiers: 0,
    recommandationsRealisees: 0,
    recommandationsEnCours: 0,
    recommandationsNonRealisees: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      const statistiques = await invoke('get_statistiques');
      setStats(statistiques as Stats);
    } catch (error) {
      console.error('Erreur chargement statistiques:', error);
    } finally {
      setLoading(false);
    }
  };

  const tauxRealisation = stats.totalRecommandations > 0
    ? (stats.recommandationsRealisees / stats.totalRecommandations) * 100
    : 0;

  const tauxRecouvrement = stats.totalRecommandations > 0
    ? ((stats.recommandationsRealisees + stats.recommandationsEnCours) / stats.totalRecommandations) * 100
    : 0;

  // Liens rapides avec leurs actions
  const quickLinks = [
    {
      label: 'Agents',
      description: 'Gérer les agents',
      icon: <IconUsers size={24} />,
      color: 'blue',
      bg: '#e8f4fd',
      page: 'agents',
      action: () => onNavigate && onNavigate('agents')
    },
    {
      label: 'Rapports',
      description: 'Gérer les rapports',
      icon: <IconFileText size={24} />,
      color: 'green',
      bg: '#e8f5e9',
      page: 'rapports',
      action: () => onNavigate && onNavigate('rapports')
    },
    {
      label: 'Dossiers',
      description: 'Gérer les dossiers',
      icon: <IconGavel size={24} />,
      color: 'violet',
      bg: '#f3e5f5',
      page: 'dossiers',
      action: () => onNavigate && onNavigate('dossiers')
    },
    {
      label: 'Recommandations',
      description: 'Suivre les recommandations',
      icon: <IconChecklist size={24} />,
      color: 'orange',
      bg: '#fff3e0',
      page: 'recommandations',
      action: () => onNavigate && onNavigate('recommandations')
    },
    {
      label: 'Référentiels',
      description: 'Configurer les référentiels',
      icon: <IconSettings size={24} />,
      color: 'teal',
      bg: '#e0f7fa',
      page: 'referentiels',
      action: () => onNavigate && onNavigate('referentiels')
    },
    {
      label: 'Statistiques',
      description: 'Voir les statistiques',
      icon: <IconChartBar size={24} />,
      color: 'pink',
      bg: '#fce4ec',
      page: 'statistiques',
      action: () => onNavigate && onNavigate('dashboard')
    }
  ];

  const kpiCards = [
    {
      label: 'Agents',
      value: stats.totalAgents,
      icon: <IconUsers size={22} />,
      color: 'blue',
      bg: '#e8f4fd',
      description: 'Agents enregistrés',
      action: () => onNavigate && onNavigate('agents')
    },
    {
      label: 'Rapports',
      value: stats.totalRapports,
      icon: <IconFileText size={22} />,
      color: 'green',
      bg: '#e8f5e9',
      description: 'Rapports d\'inspection',
      action: () => onNavigate && onNavigate('rapports')
    },
    {
      label: 'Recommandations',
      value: stats.totalRecommandations,
      icon: <IconChecklist size={22} />,
      color: 'orange',
      bg: '#fff3e0',
      description: 'Au total',
      action: () => onNavigate && onNavigate('recommandations')
    },
    {
      label: 'Dossiers',
      value: stats.totalDossiers,
      icon: <IconGavel size={22} />,
      color: 'violet',
      bg: '#f3e5f5',
      description: 'Dossiers disciplinaires',
      action: () => onNavigate && onNavigate('dossiers')
    },
  ];

  const statusCards = [
    {
      label: 'Réalisées',
      value: stats.recommandationsRealisees,
      icon: <IconCheck size={18} />,
      color: 'green',
      percent: tauxRealisation,
    },
    {
      label: 'En cours',
      value: stats.recommandationsEnCours,
      icon: <IconClock size={18} />,
      color: 'orange',
      percent: (stats.recommandationsEnCours / stats.totalRecommandations) * 100 || 0,
    },
    {
      label: 'Non réalisées',
      value: stats.recommandationsNonRealisees,
      icon: <IconX size={18} />,
      color: 'red',
      percent: (stats.recommandationsNonRealisees / stats.totalRecommandations) * 100 || 0,
    },
  ];

  if (loading) {
    return (
      <Center style={{ height: '50vh' }}>
        <Card withBorder radius="lg" p="xl">
          <LoadingOverlay visible={true} />
          <Stack align="center" gap="md">
            <IconDashboard size={40} stroke={1.5} />
            <Text>Chargement du tableau de bord...</Text>
          </Stack>
        </Card>
      </Center>
    );
  }

  return (
    <Box p="md">
      <Container size="full">
        <Stack gap="lg">
          {/* Header amélioré */}
          <Card withBorder radius="lg" p="xl" style={{ background: 'linear-gradient(135deg, #1b365d 0%, #2a4a7a 100%)' }}>
            <Group justify="space-between" align="center">
              <Group gap="md">
                <Avatar size={60} radius="md" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
                  <IconChartBar size={30} color="white" />
                </Avatar>
                <Box>
                  <Title order={1} c="white" size="h2">Tableau de bord</Title>
                  <Text c="gray.3" size="sm" mt={4}>
                    Vue d'ensemble de l'activité d'inspection et des dossiers disciplinaires
                  </Text>
                  <Group gap="xs" mt={8}>
                    <Badge size="sm" variant="white" color="blue">
                      {new Date().toLocaleDateString('fr-FR')}
                    </Badge>
                    <Badge size="sm" variant="white" color="green">
                      Synthèse en temps réel
                    </Badge>
                  </Group>
                </Box>
              </Group>
              <Button
                variant="light"
                color="white"
                leftSection={<IconCategory size={18} />}
                onClick={() => onNavigate && onNavigate('referentiels')}
                radius="md"
              >
                Configuration
              </Button>
            </Group>
          </Card>

          {/* KPI Cards modernisées avec clic */}
          <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
            {kpiCards.map((card) => (
              <Paper 
                key={card.label} 
                p="md" 
                radius="lg" 
                withBorder 
                style={{ 
                  backgroundColor: card.bg,
                  cursor: 'pointer',
                  transition: 'transform 0.2s, box-shadow 0.2s'
                }}
                onClick={card.action}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-3px)';
                  e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <Group justify="space-between" mb="xs">
                  <Text size="xs" c="dimmed" tt="uppercase" fw={600}>{card.label}</Text>
                  <ThemeIcon size="lg" radius="md" color={card.color} variant="light">
                    {card.icon}
                  </ThemeIcon>
                </Group>
                <Text fw={800} size="xl" c={card.color}>{formatNumber(card.value)}</Text>
                <Progress value={100} size="sm" radius="xl" color={card.color} mt={8} />
                <Text size="xs" c="dimmed" mt={4}>{card.description}</Text>
              </Paper>
            ))}
          </SimpleGrid>

          {/* Liens rapides */}
          <Card withBorder radius="lg" shadow="sm" p="xl">
            <Group mb="md">
              <ThemeIcon size="md" radius="md" color="blue" variant="light">
                <IconDashboard size={16} />
              </ThemeIcon>
              <Title order={3} size="h4">🔗 Accès rapides</Title>
            </Group>
            <Divider mb="md" />
            <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
              {quickLinks.map((link, index) => (
                <Paper
                  key={index}
                  withBorder
                  radius="lg"
                  p="md"
                  style={{ 
                    cursor: 'pointer', 
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    backgroundColor: link.bg,
                  }}
                  onClick={link.action}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-3px)';
                    e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <Group gap="md" wrap="nowrap">
                    <ThemeIcon color={link.color} variant="light" size={50} radius="md">
                      {link.icon}
                    </ThemeIcon>
                    <Stack gap={2} style={{ flex: 1 }}>
                      <Text fw={600} size="md">{link.label}</Text>
                      <Text size="xs" c="dimmed" lineClamp={1}>{link.description}</Text>
                    </Stack>
                  </Group>
                </Paper>
              ))}
            </SimpleGrid>
          </Card>

          {/* Section principale */}
          <Grid>
            {/* Taux de réalisation */}
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Card withBorder radius="lg" shadow="sm" p="xl" h="100%">
                <Group mb="md">
                  <ThemeIcon size="md" radius="md" color="teal" variant="light">
                    <IconTrendingUp size={16} />
                  </ThemeIcon>
                  <Title order={3} size="h4">📊 Taux de réalisation</Title>
                  <Badge color={tauxRealisation >= 75 ? "green" : tauxRealisation >= 50 ? "orange" : "red"} variant="filled" ml="auto">
                    {tauxRealisation >= 75 ? "✅ Bon" : tauxRealisation >= 50 ? "⚠️ Moyen" : "🔴 Mauvais"}
                  </Badge>
                </Group>
                <Divider mb="md" />
                <Group justify="center">
                  <RingProgress
                    size={220}
                    thickness={20}
                    sections={[{ value: tauxRealisation, color: 'teal' }]}
                    label={
                      <Stack align="center" gap={0}>
                        <Text ta="center" fw={800} size="xl">
                          {tauxRealisation.toFixed(1)}%
                        </Text>
                        <Text size="xs" c="dimmed">Complétées</Text>
                      </Stack>
                    }
                  />
                </Group>
                <Stack gap="md" mt="xl">
                  {statusCards.map((status) => (
                    <Group key={status.label} justify="space-between">
                      <Group gap="xs">
                        <ThemeIcon size="sm" radius="xl" color={status.color} variant="light">
                          {status.icon}
                        </ThemeIcon>
                        <Text size="sm" fw={500}>{status.label}</Text>
                      </Group>
                      <Group gap="md">
                        <Text fw={700} size="lg" c={status.color}>{formatNumber(status.value)}</Text>
                        <Text size="sm" c="dimmed">{status.percent.toFixed(1)}%</Text>
                      </Group>
                    </Group>
                  ))}
                  <Divider />
                  <Group justify="space-between">
                    <Text size="sm" fw={600}>Taux de progression</Text>
                    <Text fw={700} size="lg" c="blue">{tauxRecouvrement.toFixed(1)}%</Text>
                  </Group>
                  <Progress 
                    value={tauxRecouvrement} 
                    size="lg" 
                    radius="xl" 
                    color="blue"
                    striped
                    animated
                  />
                </Stack>

                {/* Bouton pour voir toutes les recommandations */}
                <Button 
                  fullWidth 
                  mt="xl" 
                  variant="light" 
                  color="blue"
                  leftSection={<IconEye size={16} />}
                  onClick={() => onNavigate && onNavigate('recommandations')}
                >
                  Voir toutes les recommandations
                </Button>
              </Card>
            </Grid.Col>

            {/* Statut des dossiers et recommandations récentes */}
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Card withBorder radius="lg" shadow="sm" p="xl" h="100%">
                <Group mb="md">
                  <ThemeIcon size="md" radius="md" color="violet" variant="light">
                    <IconReport size={16} />
                  </ThemeIcon>
                  <Title order={3} size="h4">📋 Synthèse rapide</Title>
                </Group>
                <Divider mb="md" />
                <Stack gap="lg">
                  <Paper 
                    p="md" 
                    radius="md" 
                    withBorder 
                    bg="blue.0"
                    style={{ cursor: 'pointer' }}
                    onClick={() => onNavigate && onNavigate('recommandations')}
                  >
                    <Group wrap="nowrap">
                      <ThemeIcon size="xl" radius="md" color="blue" variant="light">
                        <IconBuilding size={24} />
                      </ThemeIcon>
                      <Box style={{ flex: 1 }}>
                        <Text size="xs" c="dimmed">Taux de recommandations</Text>
                        <Text fw={700} size="28px" c="blue">{tauxRealisation.toFixed(1)}%</Text>
                        <Text size="xs" c="dimmed">
                          {stats.recommandationsRealisees} sur {stats.totalRecommandations} réalisées
                        </Text>
                      </Box>
                    </Group>
                  </Paper>

                  <Paper 
                    p="md" 
                    radius="md" 
                    withBorder 
                    bg="orange.0"
                    style={{ cursor: 'pointer' }}
                    onClick={() => onNavigate && onNavigate('recommandations')}
                  >
                    <Group wrap="nowrap">
                      <ThemeIcon size="xl" radius="md" color="orange" variant="light">
                        <IconListCheck size={24} />
                      </ThemeIcon>
                      <Box style={{ flex: 1 }}>
                        <Text size="xs" c="dimmed">Recommandations en attente</Text>
                        <Text fw={700} size="28px" c="orange">{stats.recommandationsEnCours + stats.recommandationsNonRealisees}</Text>
                        <Text size="xs" c="dimmed">
                          {stats.recommandationsEnCours} en cours, {stats.recommandationsNonRealisees} non réalisées
                        </Text>
                      </Box>
                    </Group>
                  </Paper>

                  <Paper 
                    p="md" 
                    radius="md" 
                    withBorder 
                    bg="green.0"
                    style={{ cursor: 'pointer' }}
                    onClick={() => onNavigate && onNavigate('agents')}
                  >
                    <Group wrap="nowrap">
                      <ThemeIcon size="xl" radius="md" color="green" variant="light">
                        <IconUsers size={24} />
                      </ThemeIcon>
                      <Box style={{ flex: 1 }}>
                        <Text size="xs" c="dimmed">Agents avec dossiers</Text>
                        <Text fw={700} size="28px" c="green">
                          {stats.totalDossiers > 0 ? Math.round(stats.totalDossiers / stats.totalAgents * 100) : 0}%
                        </Text>
                        <Text size="xs" c="dimmed">
                          {stats.totalDossiers} dossiers pour {stats.totalAgents} agents
                        </Text>
                      </Box>
                    </Group>
                  </Paper>

                  <Divider />
                  
                  <Group justify="space-between" grow>
                    <Paper 
                      p="sm" 
                      radius="md" 
                      withBorder 
                      ta="center"
                      style={{ cursor: 'pointer' }}
                      onClick={() => onNavigate && onNavigate('recommandations')}
                    >
                      <Text size="lg" fw={800} c="teal">{formatNumber(stats.recommandationsRealisees)}</Text>
                      <Text size="xs" c="dimmed">✓ Réalisées</Text>
                    </Paper>
                    <Paper 
                      p="sm" 
                      radius="md" 
                      withBorder 
                      ta="center"
                      style={{ cursor: 'pointer' }}
                      onClick={() => onNavigate && onNavigate('recommandations')}
                    >
                      <Text size="lg" fw={800} c="orange">{formatNumber(stats.recommandationsEnCours)}</Text>
                      <Text size="xs" c="dimmed">⟳ En cours</Text>
                    </Paper>
                    <Paper 
                      p="sm" 
                      radius="md" 
                      withBorder 
                      ta="center"
                      style={{ cursor: 'pointer' }}
                      onClick={() => onNavigate && onNavigate('recommandations')}
                    >
                      <Text size="lg" fw={800} c="red">{formatNumber(stats.recommandationsNonRealisees)}</Text>
                      <Text size="xs" c="dimmed">✗ Non réalisées</Text>
                    </Paper>
                  </Group>
                </Stack>

                {/* Bouton pour créer un nouveau dossier */}
                <Button 
                  fullWidth 
                  mt="xl" 
                  variant="light" 
                  color="violet"
                  leftSection={<IconPlus size={16} />}
                  onClick={() => onNavigate && onNavigate('dossiers')}
                >
                  Nouveau dossier disciplinaire
                </Button>
              </Card>
            </Grid.Col>
          </Grid>

          {/* Section indicateurs supplémentaires */}
          <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
            <Paper 
              p="md" 
              radius="lg" 
              withBorder
              style={{ cursor: 'pointer' }}
              onClick={() => onNavigate && onNavigate('recommandations')}
            >
              <Group gap="xs" mb="xs">
                <IconCheck size={18} color="green" />
                <Text size="sm" fw={500}>Efficacité</Text>
              </Group>
              <Text fw={800} size="24px">
                {stats.totalRecommandations > 0 
                  ? ((stats.recommandationsRealisees / stats.totalRecommandations) * 100).toFixed(1)
                  : 0}%
              </Text>
              <Text size="xs" c="dimmed">Taux de succès des recommandations</Text>
              <Progress 
                value={stats.totalRecommandations > 0 ? (stats.recommandationsRealisees / stats.totalRecommandations) * 100 : 0} 
                size="sm" 
                radius="xl" 
                color="green" 
                mt={8}
              />
            </Paper>

            <Paper 
              p="md" 
              radius="lg" 
              withBorder
              style={{ cursor: 'pointer' }}
              onClick={() => onNavigate && onNavigate('recommandations')}
            >
              <Group gap="xs" mb="xs">
                <IconAlertCircle size={18} color="red" />
                <Text size="sm" fw={500}>Attention</Text>
              </Group>
              <Text fw={800} size="24px">{stats.recommandationsNonRealisees}</Text>
              <Text size="xs" c="dimmed">Recommandations non réalisées</Text>
              <Progress 
                value={stats.totalRecommandations > 0 ? (stats.recommandationsNonRealisees / stats.totalRecommandations) * 100 : 0} 
                size="sm" 
                radius="xl" 
                color="red" 
                mt={8}
              />
            </Paper>

            <Paper 
              p="md" 
              radius="lg" 
              withBorder
              style={{ cursor: 'pointer' }}
              onClick={() => onNavigate && onNavigate('agents')}
            >
              <Group gap="xs" mb="xs">
                <IconUsers size={18} color="blue" />
                <Text size="sm" fw={500}>Agents</Text>
              </Group>
              <Text fw={800} size="24px">{stats.totalAgents}</Text>
              <Text size="xs" c="dimmed">Agents enregistrés</Text>
              <Progress 
                value={100} 
                size="sm" 
                radius="xl" 
                color="blue" 
                mt={8}
              />
            </Paper>
          </SimpleGrid>

          {/* Pied de page */}
          <Card withBorder radius="lg" p="md" bg="gray.0">
            <Group justify="center" gap="xl">
              <Group gap="xs" style={{ cursor: 'pointer' }} onClick={() => onNavigate && onNavigate('agents')}>
                <IconUsers size={14} />
                <Text size="xs" c="dimmed">{stats.totalAgents} agents</Text>
              </Group>
              <Group gap="xs" style={{ cursor: 'pointer' }} onClick={() => onNavigate && onNavigate('rapports')}>
                <IconFileText size={14} />
                <Text size="xs" c="dimmed">{stats.totalRapports} rapports</Text>
              </Group>
              <Group gap="xs" style={{ cursor: 'pointer' }} onClick={() => onNavigate && onNavigate('recommandations')}>
                <IconChecklist size={14} />
                <Text size="xs" c="dimmed">{stats.totalRecommandations} recommandations</Text>
              </Group>
              <Group gap="xs" style={{ cursor: 'pointer' }} onClick={() => onNavigate && onNavigate('dossiers')}>
                <IconGavel size={14} />
                <Text size="xs" c="dimmed">{stats.totalDossiers} dossiers</Text>
              </Group>
            </Group>
          </Card>
        </Stack>
      </Container>
    </Box>
  );
}