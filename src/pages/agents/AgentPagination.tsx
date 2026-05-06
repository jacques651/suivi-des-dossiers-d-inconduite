// src/components/agents/AgentPagination.tsx
import React from 'react';
import { Card, Group, Text, Pagination, Select } from '@mantine/core';

interface AgentPaginationProps {
  totalItems: number;
  itemsPerPage: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (value: number) => void;
}

const AgentPagination: React.FC<AgentPaginationProps> = ({
  totalItems,
  itemsPerPage,
  currentPage,
  onPageChange,
  onItemsPerPageChange,
}) => {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  if (totalItems === 0) return null;

  return (
    <Card withBorder radius="lg" shadow="sm" p="md">
      <Group justify="space-between" align="center" wrap="wrap">
        {/* Informations */}
        <Text size="sm" c="dimmed">
          {totalItems} agent{totalItems > 1 ? 's' : ''} 
          {totalPages > 1 && ` • Affichage de ${startItem} à ${endItem}`}
        </Text>

        {/* Pagination */}
        {totalPages > 1 && (
          <Pagination
            total={totalPages}
            value={currentPage}
            onChange={onPageChange}
            color="#1b365d"
            size="sm"
            radius="md"
            withEdges
            siblings={1}
            boundaries={1}
          />
        )}

        {/* Sélecteur lignes par page */}
        <Group gap="xs">
          <Text size="xs" c="dimmed">Lignes :</Text>
          <Select
            value={itemsPerPage.toString()}
            onChange={(val) => {
              onItemsPerPageChange(parseInt(val || '10'));
              onPageChange(1); // Retour à la première page
            }}
            data={[
              { value: '10', label: '10' },
              { value: '25', label: '25' },
              { value: '50', label: '50' },
              { value: '100', label: '100' },
            ]}
            size="xs"
            w={80}
            radius="md"
            styles={{
              input: { textAlign: 'center' }
            }}
          />
        </Group>
      </Group>

      {/* Barre de progression */}
      {totalPages > 1 && (
        <Group mt="xs" gap="xs">
          <Text size="xs" c="dimmed">
            Page {currentPage} sur {totalPages}
          </Text>
          <div style={{ flex: 1, height: 4, backgroundColor: '#e9ecef', borderRadius: 2, overflow: 'hidden' }}>
            <div
              style={{
                width: `${(currentPage / totalPages) * 100}%`,
                height: '100%',
                backgroundColor: '#1b365d',
                transition: 'width 0.3s ease',
                borderRadius: 2,
              }}
            />
          </div>
          <Text size="xs" c="dimmed">
            {Math.round((currentPage / totalPages) * 100)}%
          </Text>
        </Group>
      )}
    </Card>
  );
};

export default AgentPagination;