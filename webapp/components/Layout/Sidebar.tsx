import React from 'react';
import { Drawer, Toolbar, List, ListItemButton, ListItemIcon, ListItemText, Box } from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import Link from 'next/link';

interface SidebarProps {
  drawerWidth: number;
  mobileOpen: boolean;
  onDrawerToggle: () => void;
  isMobile: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({
  drawerWidth,
  mobileOpen,
  onDrawerToggle,
  isMobile,
}) => {
  const drawerContent = (
    <Box>
      <Toolbar />
      <List>
        <ListItemButton
          component={Link}
          href="/dashboard"
        >
          <ListItemIcon>
            <DashboardIcon />
          </ListItemIcon>
          <ListItemText primary="Dashboard" />
        </ListItemButton>
      </List>
    </Box>
  );

  return (
    <>
      {/* Drawer per schermi grandi (permanent) */}
      <Drawer
        variant={isMobile ? 'temporary' : 'permanent'}
        open={isMobile ? mobileOpen : true} 
        onClose={onDrawerToggle}
        sx={{
          display: { xs: 'block', sm: 'block' },
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
          },
        }}
      >
        {drawerContent}
      </Drawer>
    </>
  );
};

export default Sidebar;
