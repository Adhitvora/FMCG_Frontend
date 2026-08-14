import { createTheme } from '@mui/material/styles';

const muiTheme = createTheme({
  palette: {
    primary: {
      main: '#0D1B2A',
      light: '#1F4E79',
      dark: '#070F16',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#C8A95B',
      light: '#DBC984',
      dark: '#8D7230',
      contrastText: '#0D1B2A',
    },
    background: {
      default: '#F7F8FA',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#0D1B2A',
      secondary: '#5A6A7A',
    },
    success: {
      main: '#10B981',
      light: '#D1FAE5',
    },
    error: {
      main: '#EF4444',
      light: '#FEE2E2',
    },
    warning: {
      main: '#F59E0B',
      light: '#FEF3C7',
    },
    info: {
      main: '#1F4E79',
      light: '#DBEAFE',
    },
    divider: '#E5E7EB',
  },
  typography: {
    fontFamily: "'Inter', 'Roboto', 'Helvetica', 'Arial', sans-serif",
    h1: {
      fontWeight: 800,
      fontSize: '2.5rem',
      letterSpacing: '-0.02em',
    },
    h2: {
      fontWeight: 700,
      fontSize: '2rem',
      letterSpacing: '-0.01em',
    },
    h3: {
      fontWeight: 700,
      fontSize: '1.5rem',
    },
    h4: {
      fontWeight: 600,
      fontSize: '1.25rem',
    },
    h5: {
      fontWeight: 600,
      fontSize: '1.1rem',
    },
    h6: {
      fontWeight: 600,
      fontSize: '1rem',
    },
    subtitle1: {
      fontWeight: 500,
      color: '#5A6A7A',
    },
    body1: {
      fontSize: '0.9375rem',
    },
    body2: {
      fontSize: '0.875rem',
    },
    button: {
      textTransform: 'none',
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 10,
  },
  shadows: [
    'none',
    '0 1px 3px rgba(0,0,0,0.08)',
    '0 2px 6px rgba(0,0,0,0.08)',
    '0 4px 12px rgba(0,0,0,0.08)',
    '0 6px 16px rgba(0,0,0,0.1)',
    '0 8px 24px rgba(0,0,0,0.1)',
    '0 12px 32px rgba(0,0,0,0.12)',
    '0 16px 40px rgba(0,0,0,0.12)',
    ...Array(17).fill('0 16px 40px rgba(0,0,0,0.12)'),
  ],
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '8px 20px',
          fontSize: '0.875rem',
          fontWeight: 600,
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          },
        },
        containedPrimary: {
          background: 'linear-gradient(135deg, #0D1B2A 0%, #1F4E79 100%)',
          '&:hover': {
            background: 'linear-gradient(135deg, #122538 0%, #1B3A5C 100%)',
          },
        },
        containedSecondary: {
          background: 'linear-gradient(135deg, #C8A95B 0%, #DBC984 100%)',
          color: '#0D1B2A',
          '&:hover': {
            background: 'linear-gradient(135deg, #B5933D 0%, #C8A95B 100%)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 14,
          border: '1px solid #E5E7EB',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          '&:hover': {
            boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
          },
          transition: 'box-shadow 0.2s ease',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: '#1F4E79',
              borderWidth: 2,
            },
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 500,
          borderRadius: 6,
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-head': {
            backgroundColor: '#0D1B2A',
            color: '#FFFFFF',
            fontWeight: 600,
            fontSize: '0.8125rem',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          },
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:hover': {
            backgroundColor: '#F7F8FA !important',
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 16,
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          border: 'none',
        },
      },
    },
  },
});

export default muiTheme;
