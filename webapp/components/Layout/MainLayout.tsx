import React, { useState } from 'react';
import { Box, CssBaseline, Toolbar, useMediaQuery, IconButton } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import MenuIcon from '@mui/icons-material/Menu';
import Header from './Header';
import Sidebar from './Sidebar';

const drawerWidth = 240;

const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const theme = useTheme();
  // Per breakpoint “small” (sm), se la larghezza è <= sm, isMobile = true
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const handleDrawerToggle = () => {
    setMobileOpen((prev) => !prev);
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />

      {/* Header */}
      <Header onMenuClick={handleDrawerToggle} />

      {/* Sidebar (Drawer) */}
      <Sidebar
        drawerWidth={drawerWidth}
        mobileOpen={mobileOpen}
        onDrawerToggle={handleDrawerToggle}
        isMobile={isMobile}
      />

      {/* Contenuto principale */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 2,
          // Se schermo grande, lasciamo spazio a sinistra
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          // Se schermo grande, spostiamo a destra
          ml: { sm: `${drawerWidth}px` },
        }}
      >
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
};

export default MainLayout;
