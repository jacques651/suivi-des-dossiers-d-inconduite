import React, { useEffect } from 'react';
import { Modal, Stack, Grid, TextInput, Select, Button, Autocomplete, Avatar, Group, Divider, FileButton } from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconUser } from '@tabler/icons-react';
import { invoke } from '@tauri-apps/api/core';
import { notifications } from '@mantine/notifications';
import { Agent, Grade } from './AgentManager';


interface Props {
  opened: boolean;
  onClose: () => void;
  agent: Agent | null;
  editingId: number | null;
  grades: Grade[];
  serviceOptions: string[];
  onSaved: () => void;
}

export default function AgentFormModal({ opened, onClose, agent, editingId, grades, serviceOptions, onSaved }: Props) {
  const [photoPreview, setPhotoPreview] = React.useState<string | null>(null);
  const [photoBase64, setPhotoBase64] = React.useState('');

  const form = useForm({
    initialValues: { Matricule: '', Cle: '', Nom: '', Prenom: '', GradeID: '', Service: '', Entite: '', Sexe: '', Photo: '' },
    validate: {
      Matricule: (v) => (v ? null : 'Requis'),
      Nom: (v) => (v ? null : 'Requis'),
      Prenom: (v) => (v ? null : 'Requis'),
    },
  });

  useEffect(() => {
    if (agent && editingId) {
      form.setValues({
        Matricule: agent.Matricule, Cle: agent.Cle || '', Nom: agent.Nom, Prenom: agent.Prenom,
        GradeID: agent.GradeID?.toString() || '', Service: agent.Service || '', Entite: agent.Entite || '', Sexe: agent.Sexe || '', Photo: agent.Photo || '',
      });
      if (agent.Photo?.startsWith('data:image')) { setPhotoBase64(agent.Photo); setPhotoPreview(agent.Photo); }
    } else {
      form.reset(); setPhotoPreview(null); setPhotoBase64('');
    }
  }, [agent, editingId, opened]);

  const handlePhoto = async (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { const b64 = reader.result as string; setPhotoBase64(b64); setPhotoPreview(b64); form.setFieldValue('Photo', b64); };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (values: typeof form.values) => {
    try {
      const data = { ...values, GradeID: values.GradeID ? parseInt(values.GradeID) : null, Photo: photoBase64, PersonnelID: editingId };
      await invoke(editingId ? 'update_agent' : 'create_agent', { agent: data });
      notifications.show({ title: 'Succès', message: `Agent ${editingId ? 'modifié' : 'créé'}`, color: 'green' });
      onSaved();
    } catch (e) { notifications.show({ title: 'Erreur', message: String(e), color: 'red' }); }
  };

  return (
    <Modal opened={opened} onClose={onClose} title={editingId ? "Modifier l'Agent" : "Nouvel Agent"} size="lg" centered radius="lg">
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          <Grid>
            <Grid.Col span={6}><TextInput label="Matricule" {...form.getInputProps('Matricule')} required radius="md" /></Grid.Col>
            <Grid.Col span={6}><TextInput label="Clé" {...form.getInputProps('Cle')} radius="md" /></Grid.Col>
            <Grid.Col span={6}><TextInput label="Nom" {...form.getInputProps('Nom')} required radius="md" /></Grid.Col>
            <Grid.Col span={6}><TextInput label="Prénom" {...form.getInputProps('Prenom')} required radius="md" /></Grid.Col>
            <Grid.Col span={8}><Select label="Grade" data={grades.map(g => ({ value: g.GradeID.toString(), label: g.LibelleGrade }))} searchable clearable {...form.getInputProps('GradeID')} radius="md" /></Grid.Col>
            <Grid.Col span={4}><Select label="Sexe" data={['M', 'F'].map(v => ({ value: v, label: v }))} {...form.getInputProps('Sexe')} radius="md" /></Grid.Col>
            <Grid.Col span={8}><Autocomplete label="Service" data={serviceOptions} value={form.values.Service} onChange={(v) => form.setFieldValue('Service', v)} radius="md" /></Grid.Col>
            <Grid.Col span={4}><Select label="Entité" data={['Police Nationale', 'Gendarmerie Nationale', 'Autre'].map(e => ({ value: e, label: e }))} searchable clearable {...form.getInputProps('Entite')} radius="md" /></Grid.Col>
          </Grid>
          <Divider label="Photo" />
          <Group>
            <Avatar size={60} radius="md" src={photoPreview || undefined}>{!photoPreview && <IconUser size={24} />}</Avatar>
            <FileButton onChange={handlePhoto} accept="image/*">{(props) => <Button {...props} variant="light" radius="md">{photoPreview ? 'Changer' : 'Ajouter'}</Button>}</FileButton>
            {photoBase64 && <Button variant="subtle" color="red" size="xs" onClick={() => { setPhotoBase64(''); setPhotoPreview(null); }}>Supprimer</Button>}
          </Group>
          <Group justify="flex-end">
            <Button variant="light" onClick={onClose} radius="md">Annuler</Button>
            <Button type="submit" radius="md">{editingId ? 'Modifier' : 'Créer'}</Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}