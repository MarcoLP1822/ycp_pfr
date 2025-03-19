import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2', // Blu MUI di base
    },
    secondary: {
      main: '#9c27b0', // Magenta
    },
    background: {
      default: '#f5f5f5', // Sfondo chiaro
      paper: '#ffffff',
    },
    text: {
      primary: '#333333',
    },
  },
  typography: {
    fontFamily: ['Inter', 'sans-serif'].join(','),
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          textTransform: 'none',
        },
      },
    },
  },
});

export default theme;
