/**
 * @file components/Layout/MainLayout.tsx
 * @description
 * This component provides the main layout for all authenticated pages. It uses a
 * Material UI AppBar at the top (optional) and a permanent Drawer (Sidebar) on the left.
 * Content is rendered to the right of the Drawer.
 *
 * Key features:
 * - Material UI Drawer (via the Sidebar component) for fixed navigation
 * - Optional Material UI AppBar at the top
 * - Main content area that sits to the right of the Drawer
 *
 * @dependencies
 * - React: For component creation
 * - Material UI: AppBar, Toolbar, Box, etc. for the layout
 * - Sidebar: The Drawer-based navigation component
 *
 * @notes
 * - The drawerWidth must match the width used in the Sidebar component
 * - Customize the AppBar as needed (title, user info, etc.)
 * - Wrap pages in <MainLayout> to display the sidebar
 */

import React from 'react';
import { AppBar, Box, CssBaseline, Toolbar, Typography } from '@mui/material';
import Sidebar from './Sidebar';

const drawerWidth = 240;

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />

      {/* Optional top AppBar. Remove or customize as needed. */}
      <AppBar
        position="fixed"
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
        }}
      >
        <Toolbar>
          <Typography variant="h6" noWrap component="div">
            Proofreading App
          </Typography>
        </Toolbar>
      </AppBar>

      {/* Permanent Sidebar (Drawer) */}
      <Sidebar />

      {/* Main content area to the right of the drawer */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
        }}
      >
        {/* Add a toolbar spacer so content is below the AppBar */}
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
};

export default MainLayout;
