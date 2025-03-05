/**
 * @file components/Layout/Sidebar.tsx
 * @description
 * This component renders a Material UI permanent Drawer (fixed sidebar) for navigation.
 * Since you don't have a standalone /proofreading page (you only have /proofreading/[fileId]),
 * we'll remove the direct link to /proofreading.
 *
 * Key features:
 * - Uses Material UI's permanent Drawer for a fixed sidebar
 * - Displays an application title at the top
 * - Provides a link to /dashboard only
 *
 * @dependencies
 * - React
 * - Material UI: Drawer, Toolbar, List, ListItemButton, ListItemText, Typography
 * - Next.js Link
 *
 * @notes
 * - If you decide to create an index page at /proofreading, you can add the link back
 *   or rename it. For now, it's removed to avoid a 404 route.
 */

import React from 'react';
import Link from 'next/link';
import { Drawer, Toolbar, List, ListItemButton, ListItemText, Typography } from '@mui/material';

const drawerWidth = 240;

const Sidebar: React.FC = () => {
  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
        },
      }}
    >
      <Toolbar>
        <Typography variant="h6" noWrap>
          Proofreading App
        </Typography>
      </Toolbar>
      <List>
        <Link href="/dashboard">
          <ListItemButton>
            <ListItemText primary="Dashboard" />
          </ListItemButton>
        </Link>
        {/* 
          Removed the /proofreading link because no standalone page at /proofreading exists.
          If you later create pages/proofreading/index.tsx, you can add a link here.
        */}
      </List>
    </Drawer>
  );
};

export default Sidebar;
