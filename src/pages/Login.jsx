import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  InputAdornment,
  IconButton,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Person as PersonIcon,
  Lock as LockIcon,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: { username: '', password: '' },
  });

  const onSubmit = async (data) => {
    setError('');
    setIsLoading(true);
    try {
      await login(data);
      const from = location.state?.from?.pathname || '/';
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box
      sx={{
        position: 'relative',
        zIndex: 1,
        width: '100%',
        maxWidth: 440,
        mx: 2,
      }}
    >
      <Card
        sx={{
          borderRadius: 4,
          overflow: 'hidden',
          boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        {/* Gold accent bar */}
        <Box
          sx={{
            height: 4,
            background: 'linear-gradient(90deg, #C8A95B, #DBC984, #C8A95B)',
          }}
        />

        <CardContent sx={{ p: { xs: 3, sm: 4.5 } }}>
          {/* Brand */}
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Box
              component="img"
              src="/uploads/logos/logo-1785663560330-694249617.png"
              alt="Het Arya Logo"
              sx={{
                width: 64,
                height: 64,
                objectFit: 'contain',
                borderRadius: 2,
                mx: 'auto',
                mb: 2,
                boxShadow: '0 8px 24px rgba(13,27,42,0.3)',
              }}
            />
            <Typography
              variant="h5"
              sx={{
                fontWeight: 700,
                color: '#0D1B2A',
                letterSpacing: '-0.01em',
              }}
            >
              HET ARYA ENTERPRISE
            </Typography>
            <Typography
              variant="body2"
              sx={{ color: '#8A9AAA', mt: 0.5, fontWeight: 500 }}
            >
              FMCG Replacement ERP System
            </Typography>
          </Box>

          {/* Error Alert */}
          {error && (
            <Alert
              severity="error"
              onClose={() => setError('')}
              sx={{ mb: 3, borderRadius: 2 }}
            >
              {error}
            </Alert>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)}>
            <TextField
              fullWidth
              label="Username"
              placeholder="Enter your username"
              {...register('username', {
                required: 'Username is required',
              })}
              error={!!errors.username}
              helperText={errors.username?.message}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonIcon sx={{ color: '#8A9AAA' }} />
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 2.5 }}
            />

            <TextField
              fullWidth
              label="Password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your password"
              {...register('password', {
                required: 'Password is required',
              })}
              error={!!errors.password}
              helperText={errors.password?.message}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon sx={{ color: '#8A9AAA' }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                      size="small"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 3.5 }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={isLoading}
              sx={{
                py: 1.5,
                fontSize: '1rem',
                fontWeight: 700,
                background: 'linear-gradient(135deg, #0D1B2A 0%, #1F4E79 100%)',
                boxShadow: '0 4px 16px rgba(13,27,42,0.3)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #122538 0%, #1B3A5C 100%)',
                  boxShadow: '0 6px 20px rgba(13,27,42,0.4)',
                },
                '&:disabled': {
                  background: '#CCC',
                },
              }}
            >
              {isLoading ? (
                <CircularProgress size={24} sx={{ color: '#FFF' }} />
              ) : (
                'Sign In'
              )}
            </Button>
          </form>

          {/* Footer */}
          <Box sx={{ textAlign: 'center', mt: 4 }}>
            <Typography variant="caption" sx={{ color: '#AAA' }}>
              © {new Date().getFullYear()} HET ARYA ENTERPRISE. All rights reserved.
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Login;
