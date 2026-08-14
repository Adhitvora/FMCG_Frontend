import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import {
  Box, Typography, Button, Card, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TablePagination, IconButton, Chip, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, InputAdornment, Tooltip, Alert,
  CircularProgress, Grid, Avatar,
} from '@mui/material';
import {
  Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon,
  Search as SearchIcon, Business as BusinessIcon, CloudUpload as UploadIcon,
} from '@mui/icons-material';
import { companyService } from '../services/company.service';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const CompanyMaster = () => {
  const queryClient = useQueryClient();
  const { isAdmin } = useAuth();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [search, setSearch] = useState('');
  const [searchDebounce, setSearchDebounce] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [logoFile, setLogoFile] = useState(null);

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    clearTimeout(window._companySearchTimeout);
    window._companySearchTimeout = setTimeout(() => {
      setSearchDebounce(e.target.value);
      setPage(0);
    }, 400);
  };

  const { data, isLoading } = useQuery({
    queryKey: ['companies', page + 1, rowsPerPage, searchDebounce],
    queryFn: () => companyService.getCompanies({ page: page + 1, limit: rowsPerPage, search: searchDebounce }),
  });

  const companies = data?.data || [];
  const pagination = data?.pagination || { total: 0 };

  const { control, handleSubmit, reset, formState: { errors: formErrors } } = useForm();

  const createMutation = useMutation({
    mutationFn: companyService.createCompany,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['companies'] }); toast.success('Company created'); closeDialog(); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => companyService.updateCompany(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['companies'] }); toast.success('Company updated'); closeDialog(); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: companyService.deleteCompany,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['companies'] }); toast.success('Company deleted'); setDeleteDialog(null); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const openCreateDialog = () => {
    setEditingCompany(null);
    setLogoPreview(null);
    setLogoFile(null);
    reset({ name: '', address: '', gst: '', contact: '', email: '', approvalDays: 30, invoicePrefix: 'HAE' });
    setDialogOpen(true);
  };

  const openEditDialog = (company) => {
    setEditingCompany(company);
    setLogoPreview(company.logo ? company.logo : null);
    setLogoFile(null);
    reset({
      name: company.name, address: company.address, gst: company.gst,
      contact: company.contact, email: company.email,
      approvalDays: company.approvalDays, invoicePrefix: company.invoicePrefix,
    });
    setDialogOpen(true);
  };

  const closeDialog = () => { setDialogOpen(false); setEditingCompany(null); setLogoPreview(null); setLogoFile(null); reset(); };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const onFormSubmit = (formData) => {
    const fd = new FormData();
    Object.entries(formData).forEach(([key, value]) => { if (value !== undefined && value !== '') fd.append(key, value); });
    if (logoFile) fd.append('logo', logoFile);

    if (editingCompany) {
      updateMutation.mutate({ id: editingCompany._id, data: fd });
    } else {
      createMutation.mutate(fd);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={700} color="#0D1B2A">Company Master</Typography>
          <Typography variant="body2" color="#8A9AAA" mt={0.5}>Manage FMCG companies for replacement tracking</Typography>
        </Box>
        {isAdmin() && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateDialog}>Add Company</Button>
        )}
      </Box>

      <Card sx={{ mb: 2.5, p: 2 }}>
        <TextField fullWidth placeholder="Search companies..." value={search} onChange={handleSearchChange} size="small"
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: '#8A9AAA' }} /></InputAdornment> }}
        />
      </Card>

      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Company</TableCell>
                <TableCell>GST</TableCell>
                <TableCell>Contact</TableCell>
                <TableCell>Email</TableCell>
                <TableCell align="center">Approval Days</TableCell>
                <TableCell>Invoice Prefix</TableCell>
                <TableCell>Status</TableCell>
                {isAdmin() && <TableCell align="center">Actions</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} align="center" sx={{ py: 6 }}><CircularProgress size={32} /></TableCell></TableRow>
              ) : companies.length === 0 ? (
                <TableRow><TableCell colSpan={8} align="center" sx={{ py: 6, color: '#8A9AAA' }}>No companies found</TableCell></TableRow>
              ) : (
                companies.map((c) => (
                  <TableRow key={c._id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar src={c.logo} sx={{ width: 36, height: 36, bgcolor: '#1F4E79', fontSize: '0.8rem' }}>
                          {c.name?.charAt(0)}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight={600}>{c.name}</Typography>
                          <Typography variant="caption" color="#8A9AAA">{c.address?.substring(0, 40)}{c.address?.length > 40 ? '...' : ''}</Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.8125rem' }}>{c.gst || '—'}</TableCell>
                    <TableCell sx={{ fontSize: '0.8125rem' }}>{c.contact || '—'}</TableCell>
                    <TableCell sx={{ fontSize: '0.8125rem' }}>{c.email || '—'}</TableCell>
                    <TableCell align="center">
                      <Chip label={`${c.approvalDays} days`} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell><Chip label={c.invoicePrefix} size="small" sx={{ fontWeight: 600, bgcolor: '#DBEAFE', color: '#1F4E79' }} /></TableCell>
                    <TableCell>
                      <Chip label={c.status === 'active' ? 'Active' : 'Inactive'} size="small"
                        color={c.status === 'active' ? 'success' : 'default'}
                        variant={c.status === 'active' ? 'filled' : 'outlined'}
                      />
                    </TableCell>
                    {isAdmin() && (
                      <TableCell align="center">
                        <Tooltip title="Edit"><IconButton size="small" onClick={() => openEditDialog(c)}><EditIcon fontSize="small" sx={{ color: '#1F4E79' }} /></IconButton></Tooltip>
                        <Tooltip title="Delete"><IconButton size="small" onClick={() => setDeleteDialog(c)}><DeleteIcon fontSize="small" sx={{ color: '#EF4444' }} /></IconButton></Tooltip>
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
      <Dialog open={dialogOpen} onClose={closeDialog} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>{editingCompany ? 'Edit Company' : 'Add New Company'}</DialogTitle>
        <form onSubmit={handleSubmit(onFormSubmit)}>
          <DialogContent sx={{ pt: 1 }}>
            <Grid container spacing={2.5}>
              <Grid item xs={12} sm={6}>
                <Controller name="name" control={control} rules={{ required: 'Company name is required' }}
                  render={({ field }) => <TextField {...field} fullWidth label="Company Name *" error={!!formErrors.name} helperText={formErrors.name?.message} />}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller name="gst" control={control}
                  render={({ field }) => <TextField {...field} fullWidth label="GST Number" />}
                />
              </Grid>
              <Grid item xs={12}>
                <Controller name="address" control={control}
                  render={({ field }) => <TextField {...field} fullWidth label="Address" multiline rows={2} />}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller name="contact" control={control}
                  render={({ field }) => <TextField {...field} fullWidth label="Contact Number" />}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller name="email" control={control}
                  render={({ field }) => <TextField {...field} fullWidth label="Email" />}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <Controller name="approvalDays" control={control}
                  render={({ field }) => <TextField {...field} fullWidth label="Approval Days" type="number" InputProps={{ inputProps: { min: 0 } }} />}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <Controller name="invoicePrefix" control={control}
                  render={({ field }) => <TextField {...field} fullWidth label="Invoice Prefix" />}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <Box>
                  <Typography variant="body2" color="#5A6A7A" mb={1}>Company Logo</Typography>
                  <Button component="label" variant="outlined" startIcon={<UploadIcon />} size="small" sx={{ borderRadius: 2 }}>
                    Upload Logo
                    <input type="file" hidden accept="image/*" onChange={handleLogoChange} />
                  </Button>
                  {logoPreview && (
                    <Box sx={{ mt: 1 }}>
                      <img src={logoPreview} alt="Logo" style={{ maxHeight: 60, maxWidth: 120, objectFit: 'contain', borderRadius: 6 }} />
                    </Box>
                  )}
                </Box>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5 }}>
            <Button onClick={closeDialog} variant="outlined" sx={{ borderRadius: 2 }}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={createMutation.isPending || updateMutation.isPending} sx={{ borderRadius: 2 }}>
              {(createMutation.isPending || updateMutation.isPending) ? <CircularProgress size={20} /> : editingCompany ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={!!deleteDialog} onClose={() => setDeleteDialog(null)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700, color: '#EF4444' }}>Delete Company</DialogTitle>
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

export default CompanyMaster;
