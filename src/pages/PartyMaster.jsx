import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import {
  Box, Typography, Button, Card, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TablePagination, IconButton, Chip, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, MenuItem, InputAdornment, Tooltip,
  CircularProgress, Grid, Alert, Radio, RadioGroup, FormControlLabel, FormControl,
  FormLabel, LinearProgress,
} from '@mui/material';
import {
  Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon,
  Search as SearchIcon, FileUpload as ImportIcon, FileDownload as DownloadIcon,
  History as HistoryIcon, Download as PdfIcon,
} from '@mui/icons-material';
import { partyService } from '../services/party.service';
import { transportService } from '../services/transport.service';
import { settlementService } from '../services/settlement.service';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const money = (value) => `Rs. ${Number(value || 0).toLocaleString('en-IN')}`;
const displayDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString('en-IN');
};

const PartyMaster = () => {
  const queryClient = useQueryClient();
  const { isAdmin } = useAuth();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [search, setSearch] = useState('');
  const [searchDebounce, setSearchDebounce] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingParty, setEditingParty] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState(null);
  const [importDialog, setImportDialog] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importStrategy, setImportStrategy] = useState('skip');
  const [importResult, setImportResult] = useState(null);
  const [importing, setImporting] = useState(false);
  const [historyDialog, setHistoryDialog] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const fileInputRef = useRef(null);

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    clearTimeout(window._partySearchTimeout);
    window._partySearchTimeout = setTimeout(() => {
      setSearchDebounce(e.target.value);
      setPage(0);
    }, 400);
  };

  const { data, isLoading } = useQuery({
    queryKey: ['parties', page + 1, rowsPerPage, searchDebounce],
    queryFn: () => partyService.getParties({ page: page + 1, limit: rowsPerPage, search: searchDebounce }),
  });

  // Fetch transports for dropdown
  const { data: transportData } = useQuery({
    queryKey: ['transports-all'],
    queryFn: () => transportService.getAllTransports(),
  });

  const parties = data?.data || [];
  const pagination = data?.pagination || { total: 0 };
  const transports = transportData?.data || [];

  const { control, handleSubmit, reset, formState: { errors: formErrors } } = useForm();

  const createMutation = useMutation({
    mutationFn: partyService.createParty,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['parties'] }); toast.success('Party created'); closeDialog(); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => partyService.updateParty(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['parties'] }); toast.success('Party updated'); closeDialog(); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: partyService.deleteParty,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['parties'] }); toast.success('Party deleted'); setDeleteDialog(null); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const openCreateDialog = () => {
    setEditingParty(null);
    reset({ name: '', town: '', gst: '', mobile: '', address: '', route: '', transport: '' });
    setDialogOpen(true);
  };

  const openEditDialog = (party) => {
    setEditingParty(party);
    reset({
      name: party.name, town: party.town, gst: party.gst, mobile: party.mobile,
      address: party.address, route: party.route, transport: party.transport?._id || '',
    });
    setDialogOpen(true);
  };

  const closeDialog = () => { setDialogOpen(false); setEditingParty(null); reset(); };

  const onFormSubmit = (formData) => {
    const payload = { ...formData, transport: formData.transport || null };
    if (editingParty) {
      updateMutation.mutate({ id: editingParty._id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleImport = async () => {
    if (!importFile) return;
    setImporting(true);
    try {
      const result = await partyService.importParties(importFile, importStrategy);
      setImportResult(result.data);
      queryClient.invalidateQueries({ queryKey: ['parties'] });
      toast.success('Import completed');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const handleDownloadSample = async () => {
    try {
      await partyService.downloadSampleExcel();
      toast.success('Sample downloaded');
    } catch {
      toast.error('Download failed');
    }
  };

  const openSettlementHistory = async (party) => {
    setHistoryLoading(true);
    try {
      const response = await settlementService.getPartySettlements(party._id);
      setHistoryDialog({ party, ...response.data });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Settlement history failed');
    } finally {
      setHistoryLoading(false);
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={700} color="#0D1B2A">Party Master</Typography>
          <Typography variant="body2" color="#8A9AAA" mt={0.5}>Manage parties and distributors</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          {isAdmin() && (
            <>
              <Button variant="outlined" startIcon={<ImportIcon />}
                onClick={() => { setImportDialog(true); setImportFile(null); setImportResult(null); }}
                sx={{ borderRadius: 2 }}>
                Bulk Import
              </Button>
              <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateDialog}>Add Party</Button>
            </>
          )}
        </Box>
      </Box>

      {/* Search */}
      <Card sx={{ mb: 2.5, p: 2 }}>
        <TextField fullWidth placeholder="Search parties by name, town, GST, or mobile..." value={search}
          onChange={handleSearchChange} size="small"
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: '#8A9AAA' }} /></InputAdornment> }}
        />
      </Card>

      {/* Table */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Party Name</TableCell>
                <TableCell>Town</TableCell>
                <TableCell>GST</TableCell>
                <TableCell>Mobile</TableCell>
                <TableCell>Route</TableCell>
                <TableCell>Transport</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} align="center" sx={{ py: 6 }}><CircularProgress size={32} /></TableCell></TableRow>
              ) : parties.length === 0 ? (
                <TableRow><TableCell colSpan={8} align="center" sx={{ py: 6, color: '#8A9AAA' }}>No parties found</TableCell></TableRow>
              ) : (
                parties.map((p) => (
                  <TableRow key={p._id} hover>
                    <TableCell sx={{ fontWeight: 600 }}>{p.name}</TableCell>
                    <TableCell>{p.town || '—'}</TableCell>
                    <TableCell sx={{ fontSize: '0.8125rem' }}>{p.gst || '—'}</TableCell>
                    <TableCell sx={{ fontSize: '0.8125rem' }}>{p.mobile || '—'}</TableCell>
                    <TableCell>{p.route || '—'}</TableCell>
                    <TableCell>{p.transport?.name || '—'}</TableCell>
                    <TableCell>
                      <Chip label={p.status === 'active' ? 'Active' : 'Inactive'} size="small"
                        color={p.status === 'active' ? 'success' : 'default'}
                        variant={p.status === 'active' ? 'filled' : 'outlined'}
                      />
                    </TableCell>
                    <TableCell align="center">
                        <Tooltip title="Settlement History"><IconButton size="small" onClick={() => openSettlementHistory(p)}><HistoryIcon fontSize="small" sx={{ color: '#059669' }} /></IconButton></Tooltip>
                      {isAdmin() && (
                        <>
                        <Tooltip title="Edit"><IconButton size="small" onClick={() => openEditDialog(p)}><EditIcon fontSize="small" sx={{ color: '#1F4E79' }} /></IconButton></Tooltip>
                        <Tooltip title="Delete"><IconButton size="small" onClick={() => setDeleteDialog(p)}><DeleteIcon fontSize="small" sx={{ color: '#EF4444' }} /></IconButton></Tooltip>
                        </>
                      )}
                    </TableCell>
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
        <DialogTitle sx={{ fontWeight: 700 }}>{editingParty ? 'Edit Party' : 'Add New Party'}</DialogTitle>
        <form onSubmit={handleSubmit(onFormSubmit)}>
          <DialogContent sx={{ pt: 1 }}>
            <Grid container spacing={2.5}>
              <Grid item xs={12} sm={6}>
                <Controller name="name" control={control} rules={{ required: 'Party name is required' }}
                  render={({ field }) => <TextField {...field} fullWidth label="Party Name *" error={!!formErrors.name} helperText={formErrors.name?.message} />}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller name="town" control={control}
                  render={({ field }) => <TextField {...field} fullWidth label="Town" />}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller name="gst" control={control}
                  render={({ field }) => <TextField {...field} fullWidth label="GST Number" />}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller name="mobile" control={control}
                  render={({ field }) => <TextField {...field} fullWidth label="Mobile" />}
                />
              </Grid>
              <Grid item xs={12}>
                <Controller name="address" control={control}
                  render={({ field }) => <TextField {...field} fullWidth label="Address" multiline rows={2} />}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller name="route" control={control}
                  render={({ field }) => <TextField {...field} fullWidth label="Route" />}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller name="transport" control={control}
                  render={({ field }) => (
                    <TextField {...field} fullWidth select label="Transport">
                      <MenuItem value="">— None —</MenuItem>
                      {transports.map((t) => <MenuItem key={t._id} value={t._id}>{t.name}</MenuItem>)}
                    </TextField>
                  )}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5 }}>
            <Button onClick={closeDialog} variant="outlined" sx={{ borderRadius: 2 }}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={createMutation.isPending || updateMutation.isPending} sx={{ borderRadius: 2 }}>
              {(createMutation.isPending || updateMutation.isPending) ? <CircularProgress size={20} /> : editingParty ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={importDialog} onClose={() => setImportDialog(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>Bulk Import Parties</DialogTitle>
        <DialogContent>
          {!importResult ? (
            <Box>
              <Button variant="outlined" startIcon={<DownloadIcon />} onClick={handleDownloadSample}
                sx={{ mb: 3, borderRadius: 2 }}>Download Sample Excel</Button>

              <Box sx={{ border: '2px dashed #CCC', borderRadius: 3, p: 3, textAlign: 'center', mb: 2.5, cursor: 'pointer',
                '&:hover': { borderColor: '#1F4E79', bgcolor: '#F7F8FA' } }}
                onClick={() => fileInputRef.current?.click()}>
                <ImportIcon sx={{ fontSize: 40, color: '#8A9AAA', mb: 1 }} />
                <Typography variant="body2" color="#5A6A7A">
                  {importFile ? importFile.name : 'Click to select Excel file (.xlsx)'}
                </Typography>
                <input type="file" ref={fileInputRef} hidden accept=".xlsx,.xls" onChange={(e) => setImportFile(e.target.files[0])} />
              </Box>

              <FormControl sx={{ mb: 2 }}>
                <FormLabel sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Duplicate Handling</FormLabel>
                <RadioGroup value={importStrategy} onChange={(e) => setImportStrategy(e.target.value)}>
                  <FormControlLabel value="skip" control={<Radio size="small" />} label="Skip existing parties" />
                  <FormControlLabel value="update" control={<Radio size="small" />} label="Update existing parties" />
                </RadioGroup>
              </FormControl>

              {importing && <LinearProgress sx={{ mb: 1 }} />}
            </Box>
          ) : (
            <Box>
              <Typography variant="h6" fontWeight={600} mb={2}>Import Results</Typography>
              <Grid container spacing={2}>
                <Grid item xs={4}>
                  <Card sx={{ p: 2, textAlign: 'center', bgcolor: '#D1FAE5' }}>
                    <Typography variant="h4" fontWeight={800} color="#059669">{importResult.inserted}</Typography>
                    <Typography variant="caption" color="#5A6A7A">Inserted</Typography>
                  </Card>
                </Grid>
                <Grid item xs={4}>
                  <Card sx={{ p: 2, textAlign: 'center', bgcolor: '#DBEAFE' }}>
                    <Typography variant="h4" fontWeight={800} color="#1F4E79">{importResult.updated}</Typography>
                    <Typography variant="caption" color="#5A6A7A">Updated</Typography>
                  </Card>
                </Grid>
                <Grid item xs={4}>
                  <Card sx={{ p: 2, textAlign: 'center', bgcolor: '#FEF3C7' }}>
                    <Typography variant="h4" fontWeight={800} color="#D97706">{importResult.skipped}</Typography>
                    <Typography variant="caption" color="#5A6A7A">Skipped</Typography>
                  </Card>
                </Grid>
              </Grid>
              {importResult.errors?.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Alert severity="warning" sx={{ mb: 1 }}>{importResult.errors.length} rows had errors</Alert>
                  {importResult.errors.slice(0, 10).map((err, i) => (
                    <Typography key={i} variant="body2" color="error" sx={{ fontSize: '0.8rem' }}>
                      Row {err.row}: {err.message}
                    </Typography>
                  ))}
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => { setImportDialog(false); setImportResult(null); }} variant="outlined" sx={{ borderRadius: 2 }}>
            {importResult ? 'Close' : 'Cancel'}
          </Button>
          {!importResult && (
            <Button variant="contained" disabled={!importFile || importing} onClick={handleImport} sx={{ borderRadius: 2 }}>
              {importing ? <CircularProgress size={20} /> : 'Import'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={!!deleteDialog} onClose={() => setDeleteDialog(null)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700, color: '#EF4444' }}>Delete Party</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete <strong>{deleteDialog?.name}</strong> ({deleteDialog?.town})?</Typography>
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

export default PartyMaster;
