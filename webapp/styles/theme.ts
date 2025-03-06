/**
 * @description 
 * This file exports a custom Material UI theme to provide Material Design styles across the application.
 * It defines color palettes, typography, and any other theme-level customizations.
 * 
 * Key features:
 * - Custom primary and secondary colors for branding
 * - Default Material Design theming for typography and components
 * 
 * @dependencies
 * - @mui/material/styles: Used to create and manage the MUI theme
 * 
 * @notes
 * - You can customize the color palette, typography, and component overrides here
 * - This file is imported in _app.tsx to wrap the entire app in the Material UI ThemeProvider
 */

import { createTheme } from '@mui/material/styles';

// You can customize these colors and other theme options as desired
const theme = createTheme({
  palette: {
    primary: {
      main: '#926441', // Material UI default primary
    },
    secondary: {
      main: '#e3b7a0', // Material UI default secondary
    },
    background: {
      default: '#ffeddb', // Light grey background
    },
  },
  typography: {
    fontFamily: [
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif'
    ].join(','),
  },
});

export default theme;
