// src/theme.ts
import { createTheme } from '@mantine/core';

export const theme = createTheme({
  primaryColor: 'adminBlue',

  colors: {
    adminBlue: [
      '#eef3f9',
      '#d0deef',
      '#b0c7e4',
      '#90b0d9',
      '#7099ce',
      '#4f82c3',
      '#3669a9',
      '#295080',
      '#1b365d',
      '#12233c',
    ],
  },

  primaryShade: 7,

  fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  fontFamilyMonospace: 'Monaco, Courier, monospace',
  headings: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontWeight: '600',
  },

  defaultRadius: 'md',
  defaultGradient: { from: '#1b365d', to: '#2a4a7a', deg: 135 },

  shadows: {
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  },

  components: {
    AppShell: {
      styles: (_theme: any) => ({
        main: {
          backgroundColor: '#f5f7fa',
          minHeight: '100vh',
        },
        navbar: {
          backgroundColor: '#1b365d',
          borderRight: 'none',
        },
      }),
    },

    Card: {
      styles: () => ({
        root: {
          border: '1px solid #e5e7eb',
          backgroundColor: 'white',
          transition: 'transform 0.2s, box-shadow 0.2s',
          '&:hover': {
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
          },
        },
      }),
    },

    Paper: {
      styles: () => ({
        root: {
          border: '1px solid #e5e7eb',
          backgroundColor: 'white',
        },
      }),
    },

    Button: {
      styles: () => ({
        root: {
          borderRadius: '8px',
          fontWeight: 500,
          transition: 'all 0.2s',
          '&:hover': {
            transform: 'translateY(-1px)',
          },
        },
      }),
    },

    Badge: {
      styles: () => ({
        root: {
          textTransform: 'none',
          fontWeight: 500,
          letterSpacing: 'normal',
        },
      }),
    },

    Table: {
      styles: () => ({
        thead: {
          backgroundColor: '#1b365d',
        },
        th: {
          color: 'white',
          fontWeight: 600,
          padding: '12px 16px',
          fontSize: '13px',
        },
        td: {
          borderBottom: '1px solid #f1f3f5',
          padding: '12px 16px',
        },
      }),
    },

    Title: {
      styles: () => ({
        root: {
          fontWeight: 600,
        },
      }),
    },

    Alert: {
      styles: () => ({
        root: {
          borderRadius: '8px',
        },
      }),
    },

    Modal: {
      styles: (theme: any) => ({
        header: {
          backgroundColor: theme.colors.adminBlue[7],
          color: 'white',
          borderTopLeftRadius: '12px',
          borderTopRightRadius: '12px',
          padding: '16px 20px',
        },
        title: {
          color: 'white',
          fontWeight: 600,
          fontSize: '18px',
        },
        content: {
          borderRadius: '12px',
          overflow: 'hidden',
        },
        body: {
          padding: '24px',
        },
        close: {
          color: 'white',
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
          },
        },
      }),
    },

    Select: {
      styles: () => ({
        input: {
          borderRadius: '8px',
          '&:focus': {
            borderColor: '#1b365d',
          },
        },
        dropdown: {
          borderRadius: '8px',
        },
      }),
    },

    NumberInput: {
      styles: () => ({
        input: {
          borderRadius: '8px',
          '&:focus': {
            borderColor: '#1b365d',
          },
        },
      }),
    },

    TextInput: {
      styles: () => ({
        input: {
          borderRadius: '8px',
          '&:focus': {
            borderColor: '#1b365d',
          },
        },
      }),
    },

    Textarea: {
      styles: () => ({
        input: {
          borderRadius: '8px',
          '&:focus': {
            borderColor: '#1b365d',
          },
        },
      }),
    },

    PasswordInput: {
      styles: () => ({
        input: {
          borderRadius: '8px',
          '&:focus': {
            borderColor: '#1b365d',
          },
        },
      }),
    },

    Pagination: {
      styles: (theme: any) => ({
        control: {
          borderRadius: '8px',
          '&[dataActive]': {  // CORRECTION: &[dataActive] au lieu de &[data-active]
            backgroundColor: theme.colors.adminBlue[7],
            borderColor: theme.colors.adminBlue[7],
          },
        },
      }),
    },

    Menu: {
      styles: () => ({
        dropdown: {
          borderRadius: '8px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
        },
        item: {
          borderRadius: '6px',
          '&:hover': {
            backgroundColor: '#f3f4f6',
          },
        },
      }),
    },

    Tabs: {
      styles: (theme: any) => ({
        tab: {
          borderRadius: '8px',
          '&[dataActive]': {  // CORRECTION: &[dataActive] au lieu de &[data-active]
            color: theme.colors.adminBlue[7],
            borderBottomColor: theme.colors.adminBlue[7],
          },
        },
      }),
    },

    Tooltip: {
      styles: () => ({
        tooltip: {
          borderRadius: '8px',
          fontSize: '12px',
          padding: '6px 12px',
        },
      }),
    },

    Avatar: {
      styles: () => ({
        root: {
          borderRadius: '50%',
        },
      }),
    },

    Divider: {
      styles: () => ({
        root: {
          margin: '16px 0',
        },
      }),
    },

    Loader: {
      styles: () => ({
        root: {
          '&[dataLoading]': {  // CORRECTION: &[dataLoading] au lieu de &[data-loading]
            color: '#1b365d',
          },
        },
      }),
    },

    Notification: {
      styles: () => ({
        root: {
          borderRadius: '12px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
        },
      }),
    },
  },
});