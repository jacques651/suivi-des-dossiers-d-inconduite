import { useEffect, useState } from 'react';
import { Card, Text, Group, Badge, Stack, Skeleton } from '@mantine/core';
import { invoke } from '@tauri-apps/api/core';

interface EnteteProps {
  composant: 'app' | 'rapport' | 'dossier' | 'recommandation';
  data?: Record<string, any>;
  showBorder?: boolean;
}

export default function Entete({ composant, data, showBorder = true }: EnteteProps) {
  const [config, setConfig] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConfig();
  }, [composant]);

  const loadConfig = async () => {
    try {
      const result = await invoke('get_entete_config', { composant });
      const configMap: Record<string, string> = {};
      (result as any[]).forEach(item => {
        if (item.Actif === 1) {
          configMap[item.Champ] = item.Valeur || '';
        }
      });
      setConfig(configMap);
    } catch (error) {
      console.error('Erreur chargement config:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatEntete = (template: string, data?: Record<string, any>) => {
    if (!template) return '';
    if (!data) return template;
    
    let formatted = template;
    Object.entries(data).forEach(([key, value]) => {
      const regex = new RegExp(`\\[${key}\\]`, 'gi');
      formatted = formatted.replace(regex, value?.toString() || '');
    });
    return formatted;
  };

  if (loading) {
    return <Skeleton height={60} />;
  }

  // Si c'est l'en-tête de l'application
  if (composant === 'app') {
    return (
      <Card withBorder={showBorder} shadow="sm" p="md" radius="md">
        <Group justify="space-between" align="center">
          <div>
            <Text size="xl" fw={700} c="blue">{config.nom_app || 'BD-SDI'}</Text>
            <Text size="xs" c="dimmed">Version {config.version || '1.0.0'}</Text>
          </div>
          {config.logo && (
            <img src={config.logo} alt="Logo" style={{ height: 50 }} />
          )}
        </Group>
      </Card>
    );
  }

  // Pour les autres composants
  const enteteTemplate = config.entete;
  const formattedEntete = formatEntete(enteteTemplate, data);

  return (
    <Card withBorder={showBorder} shadow="sm" p="sm" radius="md">
      <Stack gap="xs">
        {formattedEntete && (
          <Text fw={600} size="md">{formattedEntete}</Text>
        )}
        {data && Object.entries(data).length > 0 && (
          <Group gap="xs">
            {Object.entries(data).map(([key, value]) => (
              <Badge key={key} variant="light">
                {key}: {value}
              </Badge>
            ))}
          </Group>
        )}
      </Stack>
    </Card>
  );
}