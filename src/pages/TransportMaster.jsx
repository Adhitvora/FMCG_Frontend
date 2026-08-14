import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import {
  Box, Typography, Button, Card, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TablePagination, IconButton, Chip, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, InputAdornment, Tooltip, CircularProgress, Grid,
} from '@mui/material';
import {
  Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Search as SearchIcon,
} from '@mui/icons-material';
import { transportService } from '../services/transport.service';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const TransportMaster = () => {
  const queryClient = useQueryClient();
  const { isAdmin } = useAuth();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [search, setSearch] = useState('');
  const [searchDebounce, setSearchDebounce] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTransport, setEditingTransport] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState(null);

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    clearTimeout(window._transportSearchTimeout);
    window._transportSearchTimeout = setTimeout(() => {
      setSearchDebounce(e.target.value);
      setPage(0);
    }, 400);
  };

  const { data, isLoading } = useQuery({
    queryKey: ['transports', page + 1, rowsPerPage, searchDebounce],
    queryFn: () => transportService.getTransports({ page: page + 1, limit: rowsPerPage, search: searchDebounce }),
  });

  const transports = data?.data || [];
  const pagination = data?.pagination || { total: 0 };

  const { control, handleSubmit, reset, formState: { errors: formErrors } } = useForm();

  const createMutation = useMutation({
    mutationFn: transportService.createTransport,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['transports'] }); toast.success('Transport created'); closeDialog(); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => transportService.updateTransport(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['transports'] }); toast.success('Transport updated'); closeDialog(); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: transportService.deleteTransport,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['transports'] }); toast.success('Transport deleted'); setDeleteDialog(null); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const openCreateDialog = () => {
    setEditingTransport(null);
    reset({ name: '', contact: '', gst: '', branch: '' });
    setDialogOpen(true);
  };

  const openEditDialog = (t) => {
    setEditingTransport(t);
    reset({ name: t.name, contact: t.contact, gst: t.gst, branch: t.branch });
    setDialogOpen(true);
  };

  const closeDialog = () => { setDialogOpen(false); setEditingTransport(null); reset(); };

  const onFormSubmit = (formData) => {
    if (editingTransport) {
      updateMutation.mutate({ id: editingTransport._id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={700} color="#0D1B2A">Transport Master</Typography>
          <Typography variant="body2" color="#8A9AAA" mt={0.5}>Manage transport companies</Typography>
        </Box>
        {isAdmin() && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateDialog}>Add Transport</Button>
        )}
      </Box>

      <Card sx={{ mb: 2.5, p: 2 }}>
        <TextField fullWidth placeholder="Search transports..." value={search} onChange={handleSearchChange} size="small"
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: '#8A9AAA' }} /></InputAdornment> }}
        />
      </Card>

      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Transport Name</TableCell>
                <TableCell>Contact</TableCell>
                <TableCell>GST</TableCell>
                <TableCell>Branch</TableCell>
                <TableCell>Status</TableCell>
                {isAdmin() && <TableCell align="center">Actions</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} align="center" sx={{ py: 6 }}><CircularProgress size={32} /></TableCell></TableRow>
              ) : transports.length === 0 ? (
                <TableRow><TableCell colSpan={6} align="center" sx={{ py: 6, color: '#8A9AAA' }}>No transports found</TableCell></TableRow>
              ) : (
                transports.map((t) => (
                  <TableRow key={t._id} hover>
                    <TableCell sx={{ fontWeight: 600 }}>{t.name}</TableCell>
                    <TableCell>{t.contact || '—'}</TableCell>
                    <TableCell sx={{ fontSize: '0.8125rem' }}>{t.gst || '—'}</TableCell>
                    <TableCell>{t.branch || '—'}</TableCell>
                    <TableCell>
                      <Chip label={t.status === 'active' ? 'Active' : 'Inactive'} size="small"
                        color={t.status === 'active' ? 'success' : 'default'}
                        variant={t.status === 'active' ? 'filled' : 'outlined'}
                      />
                    </TableCell>
                    {isAdmin() && (
                      <TableCell align="center">
                        <Tooltip title="Edit"><IconButton size="small" onClick={() => openEditDialog(t)}><EditIcon fontSize="small" sx={{ color: '#1F4E79' }} /></IconButton></Tooltip>
                        <Tooltip title="Delete"><IconButton size="small" onClick={() => setDeleteDialog(t)}><DeleteIcon fontSize="small" sx={{ color: '#EF4444' }} /></IconButton></Tooltip>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination component="div" count={pagination.total} page={page}
          onPageChange={(e, p) => setPage(p)} rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
          rowsPerPageOptions={[10, 20, 50]}
        />
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={closeDialog} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>{editingTransport ? 'Edit Transport' : 'Add New Transport'}</DialogTitle>
        <form onSubmit={handleSubmit(onFormSubmit)}>
          <DialogContent sx={{ pt: 1 }}>
            <Grid container spacing={2.5}>
              <Grid item xs={12}>
                <Controller name="name" control={control} rules={{ required: 'Transport name is required' }}
                  render={({ field }) => <TextField {...field} fullWidth label="Transport Name *" error={!!formErrors.name} helperText={formErrors.name?.message} />}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller name="contact" control={control}
                  render={({ field }) => <TextField {...field} fullWidth label="Contact Number" />}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller name="gst" control={control}
                  render={({ field }) => <TextField {...field} fullWidth label="GST Number" />}
                />
              </Grid>
              <Grid item xs={12}>
                <Controller name="branch" control={control}
                  render={({ field }) => <TextField {...field} fullWidth label="Branch" />}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5 }}>
            <Button onClick={closeDialog} variant="outlined" sx={{ borderRadius: 2 }}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={createMutation.isPending || updateMutation.isPending} sx={{ borderRadius: 2 }}>
              {(createMutation.isPending || updateMutation.isPending) ? <CircularProgress size={20} /> : editingTransport ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={!!deleteDialog} onClose={() => setDeleteDialog(null)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700, color: '#EF4444' }}>Delete Transport</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete <strong>{deleteDialog?.name}</strong>?</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setDeleteDialog(null)} variant="outlined" sx={{ borderRadius: 2 }}>Cancel</Button>
          <Button variant="contained" color="error" disabled={deleteMutation.isPending}
            onClick={() => deleteMutation.mutate(deleteDialog._id)} sx={{ borderRadius: 2 }}>
            {deleteMutation.isPending ? <CircularProgress size={20} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TransportMaster;
