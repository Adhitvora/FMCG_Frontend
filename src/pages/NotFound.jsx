import { Box, Button, Typography } from '@mui/material';
import { Home as HomeIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: 2,
        bgcolor: '#F7F8FA',
        textAlign: 'center',
      }}
    >
      <Box sx={{ maxWidth: 460 }}>
        <Typography variant="h1" sx={{ fontSize: { xs: 72, sm: 96 }, fontWeight: 900, color: '#1F4E79' }}>
          404
        </Typography>
        <Typography variant="h4" sx={{ fontWeight: 800, color: '#0D1B2A', mb: 1 }}>
          Page Not Found
        </Typography>
        <Typography variant="body1" sx={{ color: '#5A6A7A', mb: 3 }}>
          The page you are looking for does not exist.
        </Typography>
        <Button variant="contained" startIcon={<HomeIcon />} onClick={() => navigate('/')}>
          Dashboard
        </Button>
      </Box>
    </Box>
  );
};

export default NotFound;
