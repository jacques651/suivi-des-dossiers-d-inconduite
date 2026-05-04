import React from 'react';
import { MantineProvider, AppShell, Box, Text, Burger, Group, rem } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { theme } from './theme';
import SuiviRecommandationsManager from './pages/SuiviRecommandationsManager';

import { 
  IconDashboard, 
  IconReport, 
  IconUsers, 
  IconFileText, 
  IconListCheck,
  IconSettings,
  IconLogout,
  IconDatabase,
  IconChecklist,
} from '@tabler/icons-react';
import Dashboard from './pages/Dashboard';
import AgentManager from './pages/AgentManager';
import Rapports from './pages/Rapports';
import Dossiers from './pages/Dossiers';
import Recommandations from './pages/Recommandations';
import Referentiels from './pages/Referentiels';

import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import '@mantine/notifications/styles.css';

function App() {
  const [activeTab, setActiveTab] = React.useState('dashboard');
  const [mobileOpened, setMobileOpened] = React.useState(false);
  const [desktopOpened, setDesktopOpened] = React.useState(true);

  const menuItems = [
    { id: 'dashboard', label: 'Tableau de Bord', icon: IconDashboard },
    { id: 'agents', label: 'Agents', icon: IconUsers },
    { id: 'rapports', label: 'Rapports d\'Inspection', icon: IconReport },
    { id: 'dossiers', label: 'Dossiers Disciplinaires', icon: IconFileText },
    { id: 'recommandations', label: 'Recommandations', icon: IconListCheck },
    { id: 'suiviRecommandations', label: 'Suivi Recommandations', icon: IconChecklist },
    { id: 'referentiels', label: 'Référentiels', icon: IconDatabase },
  ];

  const renderContent = () => {
    switch(activeTab) {
      case 'dashboard': return <Dashboard onNavigate={(page) => setActiveTab(page)} />;
      case 'agents': return <AgentManager />;
      case 'rapports': return <Rapports />;
      case 'dossiers': return <Dossiers />;
      case 'recommandations': return <Recommandations />;
      case 'suiviRecommandations': return <SuiviRecommandationsManager />;
      case 'referentiels': return <Referentiels />;
      default: return <Dashboard onNavigate={(page) => setActiveTab(page)} />;
    }
  };

  return (
    <MantineProvider theme={theme} defaultColorScheme="light">
      <Notifications position="top-right" />
      <AppShell
        header={{ height: 60 }}
        navbar={{
          width: 280,
          breakpoint: 'sm',
          collapsed: { mobile: !mobileOpened, desktop: !desktopOpened },
        }}
        padding="md"
      >
        <AppShell.Header>
          <Group h="100%" px="md">
            <Burger
              opened={mobileOpened}
              onClick={() => setMobileOpened((o) => !o)}
              hiddenFrom="sm"
              size="sm"
            />
            <Burger
              opened={desktopOpened}
              onClick={() => setDesktopOpened((o) => !o)}
              visibleFrom="sm"
              size="sm"
            />
            <Text size="xl" fw={700} c="white">Suivi Dossiers</Text>
            <Text size="sm" c="gray.3" ml="md" visibleFrom="sm">Suivi des Inspections et Dossiers Disciplinaires</Text>
          </Group>
        </AppShell.Header>

        <AppShell.Navbar p="md">
          <Box>
            {menuItems.map((item) => (
              <Box
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileOpened(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: rem(12),
                  padding: rem(12),
                  borderRadius: rem(8),
                  cursor: 'pointer',
                  backgroundColor: activeTab === item.id ? 'rgba(255,255,255,0.15)' : 'transparent',
                  marginBottom: rem(4),
                  transition: 'all 0.2s ease',
                  color: 'white',
                }}
                onMouseEnter={(e) => {
                  if (activeTab !== item.id) {
                    e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeTab !== item.id) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <item.icon size={22} stroke={1.5} color="white" />
                <Text size="md" fw={500} c="white">{item.label}</Text>
              </Box>
            ))}
          </Box>
          
          <Box mt="auto" pt="xl">
            <Box
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: rem(12),
                padding: rem(12),
                borderRadius: rem(8),
                cursor: 'pointer',
                marginBottom: rem(4),
                color: 'white',
              }}
            >
              <IconSettings size={22} stroke={1.5} color="white" />
              <Text size="md" fw={500} c="white">Paramètres</Text>
            </Box>
            <Box
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: rem(12),
                padding: rem(12),
                borderRadius: rem(8),
                cursor: 'pointer',
                color: '#ff6b6b',
              }}
            >
              <IconLogout size={22} stroke={1.5} />
              <Text size="md" fw={500}>Déconnexion</Text>
            </Box>
          </Box>
        </AppShell.Navbar>

        <AppShell.Main>
          {renderContent()}
        </AppShell.Main>
      </AppShell>
    </MantineProvider>
  );
}

export default App;