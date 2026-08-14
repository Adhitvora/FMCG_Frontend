import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Avatar,
  Menu,
  MenuItem,
  Chip,
  useMediaQuery,
  useTheme,
  Collapse,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Business as CompanyIcon,
  People as PartyIcon,
  LocalShipping as TransportIcon,
  SwapHoriz as ReplacementIcon,
  Inventory as CartonIcon,
  Receipt as InvoiceIcon,
  Search as SearchIcon,
  Assessment as ReportsIcon,
  AdminPanelSettings as UserIcon,
  Logout as LogoutIcon,
  Person as PersonIcon,
  ExpandLess,
  ExpandMore,
  ListAlt as AuditIcon,
  CheckCircle as ApprovalIcon,
  AssignmentTurnedIn as SettlementIcon,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';

const DRAWER_WIDTH = 270;

const DashboardLayout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [mastersOpen, setMastersOpen] = useState(true);
  const [replacementOpen, setReplacementOpen] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, isSuperAdmin } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);
  const handleMenuOpen = (event) => setAnchorEl(event.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  const handleLogout = async () => {
    handleMenuClose();
    await logout();
    navigate('/login');
  };

  const navItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/' },
    {
      text: 'Masters',
      icon: <CompanyIcon />,
      open: mastersOpen,
      toggle: () => setMastersOpen(!mastersOpen),
      children: [
        { text: 'Company Master', icon: <CompanyIcon />, path: '/masters/companies' },
        { text: 'Party Master', icon: <PartyIcon />, path: '/masters/parties' },
        { text: 'Transport Master', icon: <TransportIcon />, path: '/masters/transports' },
        ...(isSuperAdmin() ? [{ text: 'User Master', icon: <UserIcon />, path: '/masters/users' }] : []),
      ],
    },
    {
      text: 'Replacement',
      icon: <ReplacementIcon />,
      open: replacementOpen,
      toggle: () => setReplacementOpen(!replacementOpen),
      children: [
        { text: 'All Replacements', icon: <ReplacementIcon />, path: '/replacements' },
        { text: 'Carton Merge', icon: <CartonIcon />, path: '/carton-merge' },
        { text: 'Approval Queue', icon: <ApprovalIcon />, path: '/approvals' },
        { text: 'Settlement Pending', icon: <SettlementIcon />, path: '/settlements/pending' },
      ],
    },
    { text: 'Invoices', icon: <InvoiceIcon />, path: '/invoices' },
    { text: 'Search', icon: <SearchIcon />, path: '/search' },
    { text: 'Reports', icon: <ReportsIcon />, path: '/reports' },
    ...(isSuperAdmin() ? [{ text: 'Audit Log', icon: <AuditIcon />, path: '/audit-log' }] : []),
  ];

  const getRoleBadge = (role) => {
    const colors = {
      super_admin: 'error',
      admin: 'warning',
      operator: 'info',
      view_only: 'default',
    };
    const labels = {
      super_admin: 'Super Admin',
      admin: 'Admin',
      operator: 'Operator',
      view_only: 'View Only',
    };
    return <Chip label={labels[role] || role} color={colors[role] || 'default'} size="small" />;
  };

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Logo / Brand */}
      <Box
        sx={{
          p: 2.5,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          background: 'linear-gradient(135deg, #0D1B2A 0%, #1F4E79 100%)',
        }}
      >
        <Box
          component="img"
          src="/uploads/logos/logo-1785663560330-694249617.png"
          alt="Het Arya Logo"
          sx={{
            width: 42,
            height: 42,
            objectFit: 'contain',
            borderRadius: 1,
          }}
        />
        <Box>
          <Typography
            variant="subtitle2"
            sx={{ color: '#C8A95B', fontWeight: 700, fontSize: '0.85rem', lineHeight: 1.2 }}
          >
            HET ARYA
          </Typography>
          <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.7rem', fontWeight: 500 }}>
            FMCG ERP System
          </Typography>
        </Box>
      </Box>

      <Divider />

      {/* Nav Items */}
      <List sx={{ flex: 1, px: 1.5, py: 1 }}>
        {navItems.map((item) =>
          item.children ? (
            <Box key={item.text}>
              <ListItemButton
                onClick={item.toggle}
                sx={{
                  borderRadius: 2,
                  mb: 0.5,
                  '&:hover': { backgroundColor: 'rgba(31,78,121,0.08)' },
                }}
              >
                <ListItemIcon sx={{ minWidth: 40, color: '#5A6A7A' }}>{item.icon}</ListItemIcon>
                <ListItemText
                  primary={item.text}
                  primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 500 }}
                />
                {item.open ? <ExpandLess /> : <ExpandMore />}
              </ListItemButton>
              <Collapse in={item.open} timeout="auto">
                <List disablePadding>
                  {item.children.map((child) => (
                    <ListItemButton
                      key={child.path}
                      onClick={() => {
                        navigate(child.path);
                        if (isMobile) setMobileOpen(false);
                      }}
                      selected={location.pathname === child.path}
                      sx={{
                        pl: 4,
                        borderRadius: 2,
                        mb: 0.3,
                        '&.Mui-selected': {
                          backgroundColor: 'rgba(31,78,121,0.12)',
                          borderLeft: '3px solid #1F4E79',
                          '&:hover': { backgroundColor: 'rgba(31,78,121,0.18)' },
                        },
                        '&:hover': { backgroundColor: 'rgba(31,78,121,0.06)' },
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 36, color: location.pathname === child.path ? '#1F4E79' : '#8A9AAA' }}>
                        {child.icon}
                      </ListItemIcon>
                      <ListItemText
                        primary={child.text}
                        primaryTypographyProps={{
                          fontSize: '0.8125rem',
                          fontWeight: location.pathname === child.path ? 600 : 400,
                          color: location.pathname === child.path ? '#1F4E79' : '#5A6A7A',
                        }}
                      />
                    </ListItemButton>
                  ))}
                </List>
              </Collapse>
            </Box>
          ) : (
            <ListItemButton
              key={item.path}
              onClick={() => {
                navigate(item.path);
                if (isMobile) setMobileOpen(false);
              }}
              selected={location.pathname === item.path}
              sx={{
                borderRadius: 2,
                mb: 0.5,
                '&.Mui-selected': {
                  backgroundColor: 'rgba(31,78,121,0.12)',
                  borderLeft: '3px solid #1F4E79',
                  '&:hover': { backgroundColor: 'rgba(31,78,121,0.18)' },
                },
                '&:hover': { backgroundColor: 'rgba(31,78,121,0.06)' },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40, color: location.pathname === item.path ? '#1F4E79' : '#5A6A7A' }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={item.text}
                primaryTypographyProps={{
                  fontSize: '0.875rem',
                  fontWeight: location.pathname === item.path ? 600 : 500,
                  color: location.pathname === item.path ? '#1F4E79' : '#333',
                }}
              />
            </ListItemButton>
          )
        )}
      </List>

      {/* User Info at Bottom */}
      <Divider />
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Avatar
          sx={{
            width: 36,
            height: 36,
            background: 'linear-gradient(135deg, #C8A95B, #DBC984)',
            color: '#0D1B2A',
            fontSize: '0.8rem',
            fontWeight: 700,
          }}
        >
          {user?.username?.charAt(0)?.toUpperCase() || 'U'}
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.2 }} noWrap>
            {user?.username}
          </Typography>
          <Box sx={{ mt: 0.3 }}>{getRoleBadge(user?.role)}</Box>
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: '#F7F8FA' }}>
      {/* Sidebar */}
      <Box component="nav" sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}>
        {/* Mobile drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { width: DRAWER_WIDTH, backgroundColor: '#FFFFFF' },
          }}
        >
          {drawer}
        </Drawer>
        {/* Desktop drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { width: DRAWER_WIDTH, backgroundColor: '#FFFFFF', borderRight: '1px solid #E5E7EB' },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      {/* Main content */}
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top Bar */}
        <AppBar
          position="sticky"
          elevation={0}
          sx={{
            backgroundColor: '#FFFFFF',
            borderBottom: '1px solid #E5E7EB',
            color: '#0D1B2A',
          }}
        >
          <Toolbar>
            <IconButton
              color="inherit"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2, display: { md: 'none' } }}
            >
              <MenuIcon />
            </IconButton>

            <Box sx={{ flexGrow: 1 }} />

            {/* User Menu */}
            <IconButton onClick={handleMenuOpen} sx={{ p: 0.5 }}>
              <Avatar
                sx={{
                  width: 36,
                  height: 36,
                  background: 'linear-gradient(135deg, #0D1B2A, #1F4E79)',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                }}
              >
                {user?.username?.charAt(0)?.toUpperCase()}
              </Avatar>
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
              PaperProps={{
                sx: { mt: 1, minWidth: 200, borderRadius: 2 },
              }}
            >
              <Box sx={{ px: 2, py: 1.5 }}>
                <Typography variant="subtitle2" fontWeight={600}>
                  {user?.username}
                </Typography>
                <Box sx={{ mt: 0.5 }}>{getRoleBadge(user?.role)}</Box>
              </Box>
              <Divider />
              <MenuItem onClick={handleLogout} sx={{ color: '#EF4444' }}>
                <ListItemIcon>
                  <LogoutIcon fontSize="small" sx={{ color: '#EF4444' }} />
                </ListItemIcon>
                Logout
              </MenuItem>
            </Menu>
          </Toolbar>
        </AppBar>

        {/* Page Content */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: { xs: 2, sm: 3 },
            maxWidth: '100%',
            overflow: 'auto',
          }}
        >
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
};

export default DashboardLayout;
