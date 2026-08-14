import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Button, Card, CardContent, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TablePagination, IconButton, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem,
  CircularProgress, Grid, Checkbox, Alert, Divider, InputAdornment,
} from '@mui/material';
import {
  Inventory as CartonIcon, Add as AddIcon, Lock as SealIcon,
  Delete as RemoveIcon, Search as SearchIcon,
} from '@mui/icons-material';
import { masterCartonService, replacementService } from '../services/replacement.service';
import { companyService } from '../services/company.service';
import SearchableDropdown from '../components/SearchableDropdown';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const CartonMerge = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [createDialog, setCreateDialog] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [selectedReplacements, setSelectedReplacements] = useState([]);
  const [viewCarton, setViewCarton] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(false);
  const [companySearch, setCompanySearch] = useState('');

  const { data: cartonsData, isLoading } = useQuery({
    queryKey: ['master-cartons', page + 1, rowsPerPage],
    queryFn: () => masterCartonService.getMasterCartons({ page: page + 1, limit: rowsPerPage }),
  });

  const { data: companiesData } = useQuery({
    queryKey: ['companies-all'],
    queryFn: () => companyService.getAllCompanies(),
  });

  // Fetch unmerged replacements for selected company
  const { data: replacementsData, isLoading: repLoading } = useQuery({
    queryKey: ['replacements-unmerged', selectedCompany],
    queryFn: () => replacementService.getReplacements({
      company: selectedCompany, limit: 100,
    }),
    enabled: !!selectedCompany,
  });

  const cartons = cartonsData?.data || [];
  const pagination = cartonsData?.pagination || { total: 0 };
  const companies = companiesData?.data || [];
  const availableReplacements = (replacementsData?.data || []).filter(r => !r.masterCartonId && !r.cartonId && (!r.cartonStatus || r.cartonStatus === 'AVAILABLE'));

  const createMutation = useMutation({
    mutationFn: masterCartonService.createMasterCarton,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master-cartons'] });
      queryClient.invalidateQueries({ queryKey: ['replacements'] });
      toast.success('Master carton created!');
      setCreateDialog(false);
      setSelectedReplacements([]);
      setSelectedCompany('');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const sealMutation = useMutation({
    mutationFn: masterCartonService.sealCarton,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master-cartons'] });
      toast.success('Carton sealed');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const toggleReplacement = (rep) => {
    setSelectedReplacements(prev => {
      const exists = prev.find(r => r._id === rep._id);
      if (exists) return prev.filter(r => r._id !== rep._id);
      return [...prev, rep];
    });
  };

  const handleCreateCarton = () => {
    if (selectedReplacements.length === 0) {
      toast.error('Select at least one replacement');
      return;
    }
    const entries = selectedReplacements.map(r => ({
      party: r.party._id || r.party,
      partyName: r.party?.name || '',
      cases: r.receivingCases || 0,
      replacementId: r._id,
    }));
    createMutation.mutate({ company: selectedCompany, entries });
    setConfirmDialog(false);
  };

  const totalSelectedCases = selectedReplacements.reduce((sum, r) => sum + (r.receivingCases || 0), 0);

  const statusColors = { Open: '#1F4E79', Sealed: '#D97706', Dispatched: '#059669' };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={700} color="#0D1B2A">Carton Merge</Typography>
          <Typography variant="body2" color="#8A9AAA" mt={0.5}>Merge multiple party replacements into master cartons</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateDialog(true)}>
          New Master Carton
        </Button>
      </Box>

      {/* Cartons Table */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Carton No</TableCell>
                <TableCell>Company</TableCell>
                <TableCell align="center">Parties</TableCell>
                <TableCell align="center">Total Cases</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Created</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} align="center" sx={{ py: 6 }}><CircularProgress size={32} /></TableCell></TableRow>
              ) : cartons.length === 0 ? (
                <TableRow><TableCell colSpan={7} align="center" sx={{ py: 6, color: '#8A9AAA' }}>No master cartons yet</TableCell></TableRow>
              ) : (
                cartons.map((c) => (
                  <TableRow key={c._id} hover>
                    <TableCell>
                      <Chip icon={<CartonIcon />} label={c.cartonNumber} size="small"
                        sx={{ fontWeight: 700, bgcolor: '#FEF3C7', color: '#92400E', '& .MuiChip-icon': { color: '#92400E' } }}
                      />
                    </TableCell>
                    <TableCell>{c.company?.name || '—'}</TableCell>
                    <TableCell align="center">
                      <Chip label={c.entries?.length || 0} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell align="center">
                      <Typography fontWeight={800} color="#1F4E79">{c.totalCases}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={c.status} size="small"
                        sx={{ fontWeight: 600, bgcolor: `${statusColors[c.status]}20`, color: statusColors[c.status] }}
                      />
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.8125rem' }}>
                      {c.createdAt ? format(new Date(c.createdAt), 'dd/MM/yy') : '—'}
                    </TableCell>
                    <TableCell align="center">
                      <Button size="small" variant="text" onClick={() => setViewCarton(c)}>View</Button>
                      {c.status === 'Open' && (
                        <Button size="small" variant="text" color="warning"
                          onClick={() => sealMutation.mutate(c._id)}
                          disabled={sealMutation.isPending}>
                          Seal
                        </Button>
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

      {/* Create Master Carton Dialog */}
      <Dialog open={createDialog} onClose={() => { setCreateDialog(false); setSelectedReplacements([]); setSelectedCompany(''); }}
        maxWidth="lg" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>Create Master Carton</DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 3 }}>
            <Box sx={{ maxWidth: 420 }}>
              <SearchableDropdown
                label="Select Company *"
                value={selectedCompany}
                options={companies}
                onSearch={setCompanySearch}
                onChange={(nextValue) => { setSelectedCompany(nextValue); setSelectedReplacements([]); }}
                required
              />
            </Box>
          </Box>

          {selectedCompany && (
            <>
              {selectedReplacements.length > 0 && (
                <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
                  <strong>{selectedReplacements.length}</strong> replacements selected • <strong>{totalSelectedCases}</strong> total cases
                </Alert>
              )}

              <Typography variant="subtitle2" fontWeight={700} mb={1}>Select Replacements to Merge:</Typography>
              {repLoading ? (
                <Box sx={{ textAlign: 'center', py: 4 }}><CircularProgress size={32} /></Box>
              ) : availableReplacements.length === 0 ? (
                <Alert severity="warning">No unmerged replacements found for this company</Alert>
              ) : (
                <TableContainer sx={{ maxHeight: 400 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell padding="checkbox" />
                        <TableCell>Party</TableCell>
                        <TableCell>Town</TableCell>
                        <TableCell align="center">Cases</TableCell>
                        <TableCell>Rcv Date</TableCell>
                        <TableCell>LR No</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {availableReplacements.map((r) => {
                        const isSelected = !!selectedReplacements.find(s => s._id === r._id);
                        return (
                          <TableRow key={r._id} hover selected={isSelected} onClick={() => toggleReplacement(r)}
                            sx={{ cursor: 'pointer' }}>
                            <TableCell padding="checkbox">
                              <Checkbox checked={isSelected} size="small" />
                            </TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>{r.party?.name}</TableCell>
                            <TableCell>{r.town}</TableCell>
                            <TableCell align="center"><Chip label={r.receivingCases} size="small" sx={{ fontWeight: 700 }} /></TableCell>
                            <TableCell sx={{ fontSize: '0.8125rem' }}>{r.receivingDate ? format(new Date(r.receivingDate), 'dd/MM/yy') : '—'}</TableCell>
                            <TableCell sx={{ fontSize: '0.8125rem' }}>{r.receivingLRNo || '—'}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => { setCreateDialog(false); setSelectedReplacements([]); }} variant="outlined">Cancel</Button>
          <Button variant="contained" onClick={() => setConfirmDialog(true)}
            disabled={selectedReplacements.length === 0 || createMutation.isPending}>
            {createMutation.isPending ? <CircularProgress size={20} /> : `Create Carton (${totalSelectedCases} Cases)`}
          </Button>
        </DialogActions>
      </Dialog>


      <Dialog open={confirmDialog} onClose={() => setConfirmDialog(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>Confirm Carton Merge</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            You are merging {selectedReplacements.length} selected parties into 1 physical carton.
          </Alert>
          <Table size="small">
            <TableBody>
              {selectedReplacements.map((rep) => (
                <TableRow key={rep._id}>
                  <TableCell>{rep.party?.name || rep.replacementId}</TableCell>
                  <TableCell align="right">{rep.receivingCases || 0} cases</TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Total actual cases</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>{totalSelectedCases}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Physical merged carton</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>1</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setConfirmDialog(false)} variant="outlined">Back</Button>
          <Button variant="contained" onClick={handleCreateCarton} disabled={createMutation.isPending}>
            {createMutation.isPending ? <CircularProgress size={20} /> : 'Confirm Merge'}
          </Button>
        </DialogActions>
      </Dialog>
      {/* View Carton Dialog */}
      <Dialog open={!!viewCarton} onClose={() => setViewCarton(null)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>
          <Chip icon={<CartonIcon />} label={viewCarton?.cartonNumber} sx={{ fontWeight: 700, bgcolor: '#FEF3C7', color: '#92400E', fontSize: '1rem', '& .MuiChip-icon': { color: '#92400E' } }} />
        </DialogTitle>
        <DialogContent>
          {viewCarton && (
            <Box>
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={6}><Typography variant="caption" color="#8A9AAA">Company</Typography><Typography fontWeight={600}>{viewCarton.company?.name}</Typography></Grid>
                <Grid item xs={3}><Typography variant="caption" color="#8A9AAA">Total Cases</Typography><Typography fontWeight={800} fontSize="1.5rem" color="#1F4E79">{viewCarton.totalCases}</Typography></Grid>
                <Grid item xs={3}><Typography variant="caption" color="#8A9AAA">Status</Typography><Chip label={viewCarton.status} size="small" sx={{ fontWeight: 600 }} /></Grid>
              </Grid>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="subtitle2" fontWeight={700} mb={1}>Contents:</Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Party</TableCell>
                    <TableCell align="center">Cases</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {viewCarton.entries?.map((e, i) => (
                    <TableRow key={i}>
                      <TableCell sx={{ fontWeight: 500 }}>{e.partyName || e.party?.name}</TableCell>
                      <TableCell align="center"><Chip label={e.cases} size="small" sx={{ fontWeight: 700 }} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setViewCarton(null)} variant="outlined">Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CartonMerge;

