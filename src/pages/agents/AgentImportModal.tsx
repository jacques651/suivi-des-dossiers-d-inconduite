// src/components/agents/AgentImportModal.tsx
import { useState } from 'react';
import { Modal, Stack, Card, Group, Button, Text, Paper, Alert, ScrollArea, Table } from '@mantine/core';
import { IconFileExcel, IconDownload, IconUpload, IconAlertCircle, IconCheck } from '@tabler/icons-react';
import * as XLSX from 'xlsx';
import { invoke } from '@tauri-apps/api/core';
import { notifications } from '@mantine/notifications';

interface AgentImportModalProps {
  opened: boolean;
  onClose: () => void;
  onImported: () => void;
}

interface ImportResult {
  success: number;
  errors: string[];
}

export default function AgentImportModal({ opened, onClose, onImported }: AgentImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const [result, setResult] = useState<ImportResult | null>(null);

  const downloadTemplate = () => {
    try {
      const templateData = [
        { 
          Matricule: 'POL-2024-001', 
          Nom: 'Dupont', 
          Prenom: 'Jean', 
          Grade: 'Commissaire', 
          Service: 'DGGPN', 
          Entité: 'Police Nationale', 
          Sexe: 'M', 
          Clé: 'CLE123' 
        }
      ];
      
      const ws = XLSX.utils.json_to_sheet(templateData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Template');
      XLSX.writeFile(wb, 'template_import_agents.xlsx');
      
      notifications.show({ 
        title: '✅ Succès', 
        message: 'Modèle téléchargé avec succès', 
        color: 'green' 
      });
    } catch (err) {
      notifications.show({ 
        title: '❌ Erreur', 
        message: 'Erreur lors du téléchargement du modèle', 
        color: 'red' 
      });
    }
  };

  const handleFileUpload = (file: File | null) => {
    if (!file) return;
    setFile(file);
    setResult(null);
    setError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet);
        
        setPreview(jsonData.slice(0, 5)); // Afficher les 5 premières lignes
        
        if (jsonData.length === 0) {
          setError('Le fichier Excel est vide');
        }
      } catch (err) {
        setError('Erreur lors de la lecture du fichier Excel. Vérifiez le format.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleImport = async () => {
    if (!file) {
      setError('Veuillez sélectionner un fichier');
      return;
    }

    setImporting(true);
    setError(null);

    try {
      const reader = new FileReader();
      
      reader.onload = async (event) => {
        try {
          const data = new Uint8Array(event.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(firstSheet) as any[];

          if (jsonData.length === 0) {
            setError('Le fichier Excel est vide');
            setImporting(false);
            return;
          }

          let successCount = 0;
          const errors: string[] = [];

          for (let i = 0; i < jsonData.length; i++) {
            const row = jsonData[i];
            const lineNum = i + 2; // +2 car ligne 1 = en-têtes

            const matricule = row.Matricule || row.matricule || row.MATRICULE;
            const nom = row.Nom || row.nom || row.NOM;
            const prenom = row.Prenom || row.prenom || row.PRENOM;
            const service = row.Service || row.service || row.SERVICE;
            const entite = row.Entite || row.entite || row.ENTITE || row.Entité;
            const sexe = row.Sexe || row.sexe || row.SEXE;
            const cle = row.Cle || row.cle || row.CLE;

            if (!matricule || !nom || !prenom) {
              errors.push(`Ligne ${lineNum}: Matricule, Nom ou Prénom manquant`);
              continue;
            }

            // Vérifier si le matricule existe déjà
            const existingAgents = await invoke('get_agents') as any[];
            const exists = existingAgents.find((a: any) => a.Matricule === String(matricule));
            
            if (exists) {
              errors.push(`Ligne ${lineNum}: Le matricule "${matricule}" existe déjà`);
              continue;
            }

            // Déterminer le sexe
            let sexeValue = '';
            if (sexe) {
              const sexeStr = String(sexe).toLowerCase();
              if (sexeStr === 'm' || sexeStr === 'masculin' || sexeStr === 'homme') sexeValue = 'M';
              else if (sexeStr === 'f' || sexeStr === 'feminin' || sexeStr === 'féminin' || sexeStr === 'femme') sexeValue = 'F';
            }

            try {
              await invoke('create_agent', {
                agent: {
                  Matricule: String(matricule).trim(),
                  Cle: cle ? String(cle).trim() : '',
                  Nom: String(nom).trim(),
                  Prenom: String(prenom).trim(),
                  GradeID: null,
                  Service: service ? String(service).trim() : '',
                  Entite: entite ? String(entite).trim() : '',
                  Sexe: sexeValue,
                  Photo: ''
                }
              });
              successCount++;
            } catch (err) {
              errors.push(`Ligne ${lineNum}: ${String(err)}`);
            }
          }

          setResult({ success: successCount, errors });

          if (successCount > 0) {
            notifications.show({
              title: '✅ Import terminé',
              message: `${successCount} agent(s) importé(s) avec succès. ${errors.length} erreur(s).`,
              color: 'green',
              autoClose: 5000
            });
            
            // Nettoyer et fermer
            setTimeout(() => {
              onImported();
              onClose();
              resetForm();
            }, 1500);
          } else {
            notifications.show({
              title: '❌ Échec',
              message: 'Aucun agent n\'a pu être importé',
              color: 'red'
            });
          }
        } catch (err: any) {
          setError(`Erreur: ${err.message || String(err)}`);
        } finally {
          setImporting(false);
        }
      };

      reader.readAsArrayBuffer(file);
    } catch (err: any) {
      setError(`Erreur: ${err.message || String(err)}`);
      setImporting(false);
    }
  };

  const resetForm = () => {
    setFile(null);
    setPreview([]);
    setResult(null);
    setError(null);
  };

  return (
    <Modal 
      opened={opened} 
      onClose={() => { onClose(); resetForm(); }} 
      title="📥 Importer des agents depuis Excel" 
      size="lg" 
      centered 
      radius="lg"
    >
      <Stack gap="md">
        {/* Instructions */}
        <Card withBorder p="md" bg="gray.0" radius="md">
          <Group justify="space-between" align="flex-start">
            <div>
              <Text fw={600} size="sm">Format attendu</Text>
              <Text size="xs" c="dimmed" mt={4}>
                Colonnes obligatoires : <strong>Matricule, Nom, Prénom</strong>
              </Text>
              <Text size="xs" c="dimmed">
                Colonnes optionnelles : Grade, Service, Entité, Sexe, Clé
              </Text>
            </div>
            <Button 
              size="xs" 
              variant="light" 
              leftSection={<IconDownload size={14} />}
              onClick={downloadTemplate}
            >
              Télécharger le modèle
            </Button>
          </Group>
        </Card>

        {/* Zone de dépôt de fichier */}
        <Paper 
          withBorder 
          p="xl" 
          style={{ 
            borderStyle: 'dashed', 
            cursor: 'pointer', 
            textAlign: 'center',
            transition: 'all 0.2s ease',
            backgroundColor: file ? '#f0faf0' : '#f8f9fa'
          }} 
          onClick={() => document.getElementById('import-file-input')?.click()}
          radius="md"
        >
          {file ? (
            <Stack align="center" gap="xs">
              <IconCheck size={40} color="green" />
              <Text fw={600} c="green">{file.name}</Text>
              <Text size="xs" c="dimmed">
                {(file.size / 1024).toFixed(1)} Ko • Cliquez pour changer
              </Text>
            </Stack>
          ) : (
            <Stack align="center" gap="xs">
              <IconFileExcel size={40} color="#2ecc71" />
              <Text size="sm">Cliquez pour sélectionner un fichier Excel</Text>
              <Text size="xs" c="dimmed">Formats acceptés : .xlsx, .xls</Text>
            </Stack>
          )}
          <input 
            id="import-file-input" 
            type="file" 
            accept=".xlsx,.xls" 
            onChange={(e) => handleFileUpload(e.target.files?.[0] || null)} 
            style={{ display: 'none' }} 
          />
        </Paper>

        {/* Aperçu des données */}
        {preview.length > 0 && (
          <Paper withBorder p="xs" radius="md">
            <Group justify="space-between" mb="xs">
              <Text fw={600} size="sm">Aperçu des données</Text>
              <Badge size="sm" variant="light" color="blue">
                {preview.length} ligne{preview.length > 1 ? 's' : ''}
              </Badge>
            </Group>
            <ScrollArea style={{ maxHeight: 200 }}>
              <Table striped>
                <Table.Thead>
                  <Table.Tr>
                    {Object.keys(preview[0] || {}).slice(0, 5).map(key => (
                      <Table.Th key={key}>{key}</Table.Th>
                    ))}
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {preview.map((row, idx) => (
                    <Table.Tr key={idx}>
                      {Object.values(row).slice(0, 5).map((val: any, i) => (
                        <Table.Td key={i}>{String(val)}</Table.Td>
                      ))}
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </ScrollArea>
          </Paper>
        )}

        {/* Messages d'erreur */}
        {error && (
          <Alert 
            icon={<IconAlertCircle size={16} />} 
            color="red" 
            variant="light" 
            radius="md"
          >
            {error}
          </Alert>
        )}

        {/* Résultat de l'import */}
        {result && (
          <Alert 
            icon={result.errors.length === 0 ? <IconCheck size={16} /> : <IconAlertCircle size={16} />} 
            color={result.errors.length === 0 ? 'green' : 'orange'} 
            variant="light"
            radius="md"
          >
            <Stack gap={4}>
              <Text fw={600}>
                {result.errors.length === 0 ? '✅ Import réussi' : '⚠️ Import partiel'}
              </Text>
              <Text size="sm">✅ {result.success} agent(s) importé(s) avec succès</Text>
              {result.errors.length > 0 && (
                <>
                  <Text size="sm" mt={4}>❌ {result.errors.length} erreur(s) :</Text>
                  <ScrollArea style={{ maxHeight: 100 }} mt={4}>
                    {result.errors.map((err, idx) => (
                      <Text key={idx} size="xs" c="red">• {err}</Text>
                    ))}
                  </ScrollArea>
                </>
              )}
            </Stack>
          </Alert>
        )}

        {/* Boutons d'action */}
        <Group justify="flex-end" gap="sm">
          <Button 
            variant="light" 
            onClick={() => { onClose(); resetForm(); }}
            radius="md"
          >
            Annuler
          </Button>
          <Button 
            onClick={handleImport} 
            loading={importing} 
            leftSection={<IconUpload size={16} />}
            radius="md"
            disabled={!file || importing}
          >
            {importing ? 'Importation...' : 'Importer les agents'}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

// Import Badge depuis Mantine (ajouter en haut)
import { Badge } from '@mantine/core';