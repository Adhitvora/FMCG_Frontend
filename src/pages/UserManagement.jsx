import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import {
  Box,
  Typography,
  Button,
  Card,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  InputAdornment,
  Tooltip,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Lock as LockIcon,
  ToggleOn as EnableIcon,
  ToggleOff as DisableIcon,
  Search as SearchIcon,
  PersonAdd as PersonAddIcon,
} from '@mui/icons-material';
import { userService } from '../services/user.service';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const ROLES = [
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'admin', label: 'Admin' },
  { value: 'operator', label: 'Operator' },
  { value: 'view_only', label: 'View Only' },
];

const roleColors = {
  super_admin: 'error',
  admin: 'warning',
  operator: 'info',
  view_only: 'default',
};

const UserManagement = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [passwordDialog, setPasswordDialog] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [searchDebounce, setSearchDebounce] = useState('');

  // Debounced search
  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    clearTimeout(window._userSearchTimeout);
    window._userSearchTimeout = setTimeout(() => {
      setSearchDebounce(e.target.value);
      setPage(0);
    }, 400);
  };

  // Fetch users
  const { data, isLoading, error } = useQuery({
    queryKey: ['users', page + 1, rowsPerPage, searchDebounce],
    queryFn: () =>
      userService.getUsers({
        page: page + 1,
        limit: rowsPerPage,
        search: searchDebounce,
      }),
  });

  const users = data?.data || [];
  const pagination = data?.pagination || { total: 0 };

  // Form
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors: formErrors },
  } = useForm();

  // Mutations
  const createMutation = useMutation({
    mutationFn: userService.createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User created successfully');
      closeDialog();
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to create user'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => userService.updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User updated successfully');
      closeDialog();
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to update user'),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: ({ id, password }) => userService.resetPassword(id, password),
    onSuccess: () => {
      toast.success('Password reset successfully');
      setPasswordDialog(null);
      setNewPassword('');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to reset password'),
  });

  const toggleStatusMutation = useMutation({
    mutationFn: userService.toggleStatus,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success(data.message);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to toggle status'),
  });

  const deleteMutation = useMutation({
    mutationFn: userService.deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User deleted successfully');
      setDeleteDialog(null);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to delete user'),
  });

  const openCreateDialog = () => {
    setEditingUser(null);
    reset({ username: '', password: '', role: 'operator', branch: '' });
    setDialogOpen(true);
  };

  const openEditDialog = (user) => {
    setEditingUser(user);
    reset({ username: user.username, role: user.role, branch: user.branch || '' });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingUser(null);
    reset();
  };

  const onFormSubmit = (formData) => {
    if (editingUser) {
      updateMutation.mutate({ id: editingUser._id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={700} color="#0D1B2A">
            User Management
          </Typography>
          <Typography variant="body2" color="#8A9AAA" sx={{ mt: 0.5 }}>
            Manage system users, roles, and access
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<PersonAddIcon />}
          onClick={openCreateDialog}
          sx={{ borderRadius: 2 }}
        >
          Add User
        </Button>
      </Box>

      {/* Search */}
      <Card sx={{ mb: 2.5, p: 2 }}>
        <TextField
          fullWidth
          placeholder="Search users..."
          value={search}
          onChange={handleSearchChange}
          size="small"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: '#8A9AAA' }} />
              </InputAdornment>
            ),
          }}
        />
      </Card>

      {/* Table */}
      <Card>
        {error && (
          <Alert severity="error" sx={{ m: 2 }}>
            {error.response?.data?.message || 'Failed to load users'}
          </Alert>
        )}

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Username</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Branch</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Last Login</TableCell>
                <TableCell>Created By</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={32} />
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6, color: '#8A9AAA' }}>
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user._id} hover>
                    <TableCell sx={{ fontWeight: 600 }}>{user.username}</TableCell>
                    <TableCell>
                      <Chip
                        label={ROLES.find((r) => r.value === user.role)?.label || user.role}
                        color={roleColors[user.role] || 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{user.branch || '—'}</TableCell>
                    <TableCell>
                      <Chip
                        label={user.status === 'active' ? 'Active' : 'Disabled'}
                        color={user.status === 'active' ? 'success' : 'default'}
                        size="small"
                        variant={user.status === 'active' ? 'filled' : 'outlined'}
                      />
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.8125rem', color: '#5A6A7A' }}>
                      {user.lastLogin
                        ? format(new Date(user.lastLogin), 'dd MMM yyyy, hh:mm a')
                        : 'Never'}
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.8125rem', color: '#5A6A7A' }}>
                      {user.createdBy?.username || '—'}
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                        <Tooltip title="Edit">
                          <IconButton size="small" onClick={() => openEditDialog(user)}>
                            <EditIcon fontSize="small" sx={{ color: '#1F4E79' }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Reset Password">
                          <IconButton size="small" onClick={() => setPasswordDialog(user)}>
                            <LockIcon fontSize="small" sx={{ color: '#D97706' }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={user.status === 'active' ? 'Disable' : 'Enable'}>
                          <IconButton
                            size="small"
                            onClick={() => toggleStatusMutation.mutate(user._id)}
                          >
                            {user.status === 'active' ? (
                              <DisableIcon fontSize="small" sx={{ color: '#EF4444' }} />
                            ) : (
                              <EnableIcon fontSize="small" sx={{ color: '#10B981' }} />
                            )}
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton size="small" onClick={() => setDeleteDialog(user)}>
                            <DeleteIcon fontSize="small" sx={{ color: '#EF4444' }} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          component="div"
          count={pagination.total}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[10, 20, 50]}
        />
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={closeDialog}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          {editingUser ? 'Edit User' : 'Create New User'}
        </DialogTitle>
        <form onSubmit={handleSubmit(onFormSubmit)}>
          <DialogContent sx={{ pt: 1 }}>
            <Controller
              name="username"
              control={control}
              rules={{ required: 'Username is required', minLength: { value: 3, message: 'Min 3 characters' } }}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="Username"
                  error={!!formErrors.username}
                  helperText={formErrors.username?.message}
                  sx={{ mb: 2.5 }}
                />
              )}
            />

            {!editingUser && (
              <Controller
                name="password"
                control={control}
                rules={{ required: 'Password is required', minLength: { value: 6, message: 'Min 6 characters' } }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Password"
                    type="password"
                    error={!!formErrors.password}
                    helperText={formErrors.password?.message}
                    sx={{ mb: 2.5 }}
                  />
                )}
              />
            )}

            <Controller
              name="role"
              control={control}
              rules={{ required: 'Role is required' }}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  select
                  label="Role"
                  error={!!formErrors.role}
                  helperText={formErrors.role?.message}
                  sx={{ mb: 2.5 }}
                >
                  {ROLES.map((role) => (
                    <MenuItem key={role.value} value={role.value}>
                      {role.label}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />

            <Controller
              name="branch"
              control={control}
              render={({ field }) => (
                <TextField {...field} fullWidth label="Branch" placeholder="e.g., Head Office" />
              )}
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5 }}>
            <Button onClick={closeDialog} variant="outlined" sx={{ borderRadius: 2 }}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={createMutation.isPending || updateMutation.isPending}
              sx={{ borderRadius: 2 }}
            >
              {(createMutation.isPending || updateMutation.isPending) ? (
                <CircularProgress size={20} />
              ) : editingUser ? (
                'Update'
              ) : (
                'Create'
              )}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog
        open={!!passwordDialog}
        onClose={() => {
          setPasswordDialog(null);
          setNewPassword('');
        }}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          Reset Password — {passwordDialog?.username}
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <TextField
            fullWidth
            label="New Password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button
            onClick={() => {
              setPasswordDialog(null);
              setNewPassword('');
            }}
            variant="outlined"
            sx={{ borderRadius: 2 }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="warning"
            disabled={!newPassword || newPassword.length < 6 || resetPasswordMutation.isPending}
            onClick={() =>
              resetPasswordMutation.mutate({
                id: passwordDialog._id,
                password: newPassword,
              })
            }
            sx={{ borderRadius: 2 }}
          >
            {resetPasswordMutation.isPending ? <CircularProgress size={20} /> : 'Reset Password'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteDialog}
        onClose={() => setDeleteDialog(null)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 700, color: '#EF4444' }}>Delete User</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete <strong>{deleteDialog?.username}</strong>? This action
            cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setDeleteDialog(null)} variant="outlined" sx={{ borderRadius: 2 }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            disabled={deleteMutation.isPending}
            onClick={() => deleteMutation.mutate(deleteDialog._id)}
            sx={{ borderRadius: 2 }}
          >
            {deleteMutation.isPending ? <CircularProgress size={20} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UserManagement;
