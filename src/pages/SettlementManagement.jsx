import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Button, Card, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, Divider, Grid, IconButton, InputAdornment, MenuItem, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Tooltip,
  Typography,
} from '@mui/material';
import {
  Add as AddIcon,
  CheckCircle as CompleteIcon,
  Download as PdfIcon,
  Edit as EditIcon,
  LockOpen as UnlockIcon,
  RemoveCircleOutline as RemoveIcon,
  Search as SearchIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import { format, differenceInCalendarDays } from 'date-fns';
import toast from 'react-hot-toast';
import { settlementService } from '../services/settlement.service';
import { companyService } from '../services/company.service';
import { partyService } from '../services/party.service';
import SearchableDropdown from '../components/SearchableDropdown';
import SearchableProductDropdown from '../components/SearchableProductDropdown';
import { useAuth } from '../context/AuthContext';

const statusColors = {
  PENDING: { bg: '#FEF3C7', color: '#B45309' },
  PARTIAL: { bg: '#DBEAFE', color: '#1D4ED8' },
  MATCHED: { bg: '#D1FAE5', color: '#047857' },
  SETTLED: { bg: '#DCFCE7', color: '#166534' },
  REJECTED: { bg: '#FEE2E2', color: '#B91C1C' },
  ON_HOLD: { bg: '#F3E8FF', color: '#7E22CE' },
};

const formatDate = (value) => (value ? format(new Date(value), 'dd/MM/yyyy') : '-');
const money = (value) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(value || 0));

const emptyProduct = () => ({
  productId: '',
  productName: '',
  productNameSnapshot: '',
  sku: '',
  productCode: '',
  mrp: '',
  mrpSnapshot: '',
  masterMrpSnapshot: '',
  quantity: '',
  unit: 'pcs',
  remarks: '',
});

const productValue = (product) => Number(product.mrp || 0) * Number(product.quantity || 0);

const StatusChip = ({ status }) => (
  <Chip
    label={status || 'PENDING'}
    size="small"
    sx={{ fontWeight: 700, bgcolor: statusColors[status]?.bg || '#F3F4F6', color: statusColors[status]?.color || '#374151' }}
  />
);

const InfoItem = ({ label, value }) => (
  <Box>
    <Typography variant="caption" color="#6B7280" fontWeight={700}>{label}</Typography>
    <Typography variant="body2" fontWeight={600} sx={{ overflowWrap: 'anywhere' }}>{value || '-'}</Typography>
  </Box>
);

const SectionCard = ({ title, children }) => (
  <Card variant="outlined" sx={{ p: 2, borderRadius: 2, height: '100%' }}>
    <Typography variant="subtitle2" fontWeight={800} color="#0D1B2A" mb={1.5}>{title}</Typography>
    {children}
  </Card>
);

const SettlementManagement = () => {
  const queryClient = useQueryClient();
  const { isSuperAdmin } = useAuth();
  const [viewMode, setViewMode] = useState('pending');
  const [search, setSearch] = useState('');
  const [searchDebounce, setSearchDebounce] = useState('');
  const [filters, setFilters] = useState({});
  const [detailDialog, setDetailDialog] = useState(null);
  const [formDialog, setFormDialog] = useState(null);
  const [sentProducts, setSentProducts] = useState([emptyProduct()]);
  const [lastSaleInvoiceNo, setLastSaleInvoiceNo] = useState('');
  const [remarks, setRemarks] = useState('');

  const handleSearchChange = (event) => {
    setSearch(event.target.value);
    clearTimeout(window._settlementSearchTimeout);
    window._settlementSearchTimeout = setTimeout(() => {
      setSearchDebounce(event.target.value);
    }, 400);
  };

  const queryParams = { search: searchDebounce, ...filters };

  const { data, isLoading } = useQuery({
    queryKey: ['settlements', viewMode, queryParams],
    queryFn: () => viewMode === 'pending'
      ? settlementService.getPendingSettlements(queryParams)
      : settlementService.getSettlements({ ...queryParams, limit: 100 }),
  });

  const { data: dashboardData } = useQuery({
    queryKey: ['settlement-dashboard', filters],
    queryFn: () => settlementService.getDashboard(filters),
  });
  const { data: companiesData } = useQuery({ queryKey: ['companies-all'], queryFn: () => companyService.getAllCompanies() });
  const { data: partiesData } = useQuery({ queryKey: ['parties-all'], queryFn: () => partyService.getAllParties() });

  const settlements = data?.data || [];
  const stats = dashboardData?.data || {};
  const companies = companiesData?.data || [];
  const parties = partiesData?.data || [];

  const openDetail = async (settlement) => {
    try {
      const response = await settlementService.getSettlement(settlement._id);
      setDetailDialog(response.data);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load settlement');
    }
  };

  const openSettlementPDF = async (settlement) => {
    try {
      await settlementService.openPDF(settlement._id, settlement.settlementNo);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to open settlement PDF');
    }
  };

  const openForm = async (settlement) => {
    try {
      const response = await settlementService.getSettlement(settlement._id);
      const full = response.data;
      setFormDialog(full);
      setLastSaleInvoiceNo(full.lastSaleInvoiceNo || '');
      setRemarks(full.remarks || '');
      setSentProducts(full.sentProducts?.length ? full.sentProducts.map((product) => ({
        productId: product.productId || '',
        productName: product.productName || '',
        productNameSnapshot: product.productNameSnapshot || product.productName || '',
        sku: product.sku || '',
        productCode: product.productCode || '',
        mrp: product.mrp || '',
        mrpSnapshot: product.mrpSnapshot || product.mrp || '',
        masterMrpSnapshot: product.masterMrpSnapshot || '',
        quantity: product.quantity || '',
        unit: product.unit || 'pcs',
        remarks: product.remarks || '',
      })) : [emptyProduct()]);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to open settlement');
    }
  };

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => settlementService.updateSettlement(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settlements'] });
      queryClient.invalidateQueries({ queryKey: ['settlement-dashboard'] });
      toast.success('Settlement saved');
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Failed to save settlement'),
  });

  const completeMutation = useMutation({
    mutationFn: ({ id, payload }) => settlementService.completeSettlement(id, payload),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['settlements'] });
      queryClient.invalidateQueries({ queryKey: ['settlement-dashboard'] });
      setFormDialog(null);
      toast.success('Settlement completed');
      openSettlementPDF(response.data);
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Failed to complete settlement'),
  });

  const unlockMutation = useMutation({
    mutationFn: (id) => settlementService.unlockSettlement(id, { reason: 'Correction required' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settlements'] });
      toast.success('Settlement unlocked');
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Failed to unlock settlement'),
  });

  const payload = useMemo(() => ({
    lastSaleInvoiceNo,
    remarks,
    sentProducts: sentProducts
      .map((product) => ({ ...product, calculatedValue: productValue(product), value: productValue(product) }))
      .filter((product) => product.productName || product.mrp || product.quantity),
  }), [lastSaleInvoiceNo, remarks, sentProducts]);

  const sentTotal = payload.sentProducts.reduce((sum, product) => sum + Number(product.value || 0), 0);
  const difference = sentTotal - Number(formDialog?.approvedValue || 0);
  const computedStatus = payload.sentProducts.length === 0 ? 'PENDING' : difference === 0 ? 'MATCHED' : sentTotal < Number(formDialog?.approvedValue || 0) ? 'PARTIAL' : 'ON_HOLD';

  const saveSettlement = () => {
    updateMutation.mutate({ id: formDialog._id, payload });
  };

  const completeSettlement = () => {
    const confirmMismatch = difference !== 0 || formDialog?.matchDetails?.some((row) => row.matchStatus !== 'MATCHED');
    if (confirmMismatch && !window.confirm('Approved and sent values/products do not fully match. Continue with manual confirmation?')) return;
    completeMutation.mutate({ id: formDialog._id, payload: { ...payload, confirmMismatch } });
  };

  const addProduct = () => setSentProducts((rows) => [...rows, emptyProduct()]);
  const updateProduct = (index, key, value) => setSentProducts((rows) => rows.map((row, i) => (i === index ? { ...row, [key]: value } : row)));
  const selectProduct = (index, selectedProduct) => {
    setSentProducts((rows) => rows.map((row, i) => {
      if (i !== index) return row;
      if (!selectedProduct) return { ...row, productId: '', productName: '', productNameSnapshot: '', sku: '', productCode: '' };

      const productName = selectedProduct.productName || selectedProduct.name || '';
      const currentMrp = row.mrp !== undefined && row.mrp !== '' ? row.mrp : selectedProduct.mrp || '';
      return {
        ...row,
        productId: selectedProduct.productId || selectedProduct._id,
        productName,
        productNameSnapshot: productName,
        sku: selectedProduct.sku || '',
        productCode: selectedProduct.productCode || selectedProduct.code || '',
        mrp: currentMrp,
        mrpSnapshot: currentMrp,
        masterMrpSnapshot: selectedProduct.mrp || 0,
      };
    }));
  };
  const removeProduct = (index) => setSentProducts((rows) => (rows.length === 1 ? rows : rows.filter((_, i) => i !== index)));

  const statCards = [
    ['Settlement Pending', stats.settlementPending ?? stats.pending ?? 0],
    ['Settlement Today', stats.settlementToday ?? stats.today ?? 0],
    ['Completed', stats.settlementCompleted ?? stats.completed ?? 0],
    ['Partial', stats.partialSettlement ?? stats.partial ?? 0],
    ['On Hold', stats.onHold ?? 0],
    ['Approved Value', money(stats.totalApprovedValue || 0)],
    ['Settled Value', money(stats.totalSettledValue || 0)],
    ['Pending Value', money(stats.pendingSettlementValue || 0)],
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, gap: 2, flexWrap: 'wrap' }}>
        <Box>
          <Typography variant="h4" fontWeight={800} color="#0D1B2A">Settlement Pending</Typography>
          <Typography variant="body2" color="#6B7280" mt={0.5}>Company approval versus actual party settlement</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant={viewMode === 'pending' ? 'contained' : 'outlined'} onClick={() => setViewMode('pending')}>Pending</Button>
          <Button variant={viewMode === 'all' ? 'contained' : 'outlined'} onClick={() => setViewMode('all')}>History</Button>
        </Box>
      </Box>

      <Grid container spacing={1.5} sx={{ mb: 2.5 }}>
        {statCards.map(([label, value]) => (
          <Grid item xs={6} sm={3} md={1.5} key={label}>
            <Card sx={{ p: 1.5, borderRadius: 2, height: '100%' }}>
              <Typography variant="caption" color="#6B7280" fontWeight={700}>{label}</Typography>
              <Typography variant="h6" fontWeight={800} color="#0D1B2A" sx={{ lineHeight: 1.3 }}>{value}</Typography>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Card sx={{ p: 2, mb: 2.5, borderRadius: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search settlement, RL, CN, invoice..."
              value={search}
              onChange={handleSearchChange}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: '#8A9AAA' }} /></InputAdornment> }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <SearchableDropdown label="Company" value={filters.companyId} onChange={(v) => setFilters((f) => ({ ...f, companyId: v || undefined }))} options={companies} />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <SearchableDropdown label="Party" value={filters.partyId} onChange={(v) => setFilters((f) => ({ ...f, partyId: v || undefined }))} options={parties} getOptionLabel={(option) => `${option.name}${option.town ? ` - ${option.town}` : ''}`} />
          </Grid>
          <Grid item xs={6} md={1.7}>
            <TextField select fullWidth size="small" label="Status" value={filters.settlementStatus || ''} onChange={(e) => setFilters((f) => ({ ...f, settlementStatus: e.target.value || undefined }))}>
              <MenuItem value="">All</MenuItem>
              {Object.keys(statusColors).map((status) => <MenuItem key={status} value={status}>{status}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={6} md={1.7}>
            <TextField select fullWidth size="small" label="Approval Type" value={filters.approvalType || ''} onChange={(e) => setFilters((f) => ({ ...f, approvalType: e.target.value || undefined }))}>
              <MenuItem value="">All</MenuItem>
              <MenuItem value="Amount">Amount</MenuItem>
              <MenuItem value="Product">Product</MenuItem>
            </TextField>
          </Grid>
        </Grid>
      </Card>

      <Card sx={{ borderRadius: 2 }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Settlement ID</TableCell>
                <TableCell>Replacement ID</TableCell>
                <TableCell>Party</TableCell>
                <TableCell>Town</TableCell>
                <TableCell>Company</TableCell>
                <TableCell>Approval Date</TableCell>
                <TableCell>Approved Product</TableCell>
                <TableCell align="right">Approved</TableCell>
                <TableCell>RL</TableCell>
                <TableCell>CN</TableCell>
                <TableCell>Last Sale Invoice</TableCell>
                <TableCell>Sent Date</TableCell>
                <TableCell align="right">Sent</TableCell>
                <TableCell align="right">Difference</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Age</TableCell>
                <TableCell align="center">Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={17} align="center" sx={{ py: 6 }}><CircularProgress size={30} /></TableCell></TableRow>
              ) : settlements.length === 0 ? (
                <TableRow><TableCell colSpan={17} align="center" sx={{ py: 6, color: '#6B7280' }}>No settlement records found</TableCell></TableRow>
              ) : (
                settlements.map((settlement) => {
                  const replacement = settlement.replacementId || {};
                  const approvedProduct = settlement.approvedProducts?.map((product) => product.productName).filter(Boolean).join(', ') || 'Amount Approval';
                  const age = differenceInCalendarDays(new Date(), new Date(replacement.approvalDate || settlement.createdAt));
                  return (
                    <TableRow key={settlement._id} hover>
                      <TableCell sx={{ fontWeight: 700, fontFamily: 'monospace', fontSize: '0.74rem' }}>{settlement.settlementNo}</TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.74rem' }}>{replacement.replacementId || '-'}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{settlement.partyId?.name || '-'}</TableCell>
                      <TableCell>{settlement.partyId?.town || replacement.town || '-'}</TableCell>
                      <TableCell>{settlement.companyId?.name || '-'}</TableCell>
                      <TableCell>{formatDate(replacement.approvalDate)}</TableCell>
                      <TableCell>{approvedProduct}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>{money(settlement.approvedValue)}</TableCell>
                      <TableCell>{settlement.companyRLNo || '-'}</TableCell>
                      <TableCell>{settlement.cnNo || '-'}</TableCell>
                      <TableCell>{settlement.lastSaleInvoiceNo || '-'}</TableCell>
                      <TableCell>{formatDate(replacement.sentDate)}</TableCell>
                      <TableCell align="right">{money(settlement.sentValue)}</TableCell>
                      <TableCell align="right" sx={{ color: settlement.difference === 0 ? '#047857' : '#B45309', fontWeight: 700 }}>{money(settlement.difference)}</TableCell>
                      <TableCell><StatusChip status={settlement.settlementStatus} /></TableCell>
                      <TableCell>{Math.max(age, 0)} days</TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.4 }}>
                          <Tooltip title="View Settlement"><IconButton size="small" onClick={() => openDetail(settlement)}><ViewIcon fontSize="small" sx={{ color: '#1F4E79' }} /></IconButton></Tooltip>
                          {settlement.settlementStatus !== 'SETTLED' && <Tooltip title="Create Settlement"><IconButton size="small" onClick={() => openForm(settlement)}><EditIcon fontSize="small" sx={{ color: '#047857' }} /></IconButton></Tooltip>}
                          <Tooltip title="Settlement PDF"><IconButton size="small" onClick={() => openSettlementPDF(settlement)}><PdfIcon fontSize="small" sx={{ color: '#7C3AED' }} /></IconButton></Tooltip>
                          {isSuperAdmin() && settlement.isLocked && <Tooltip title="Unlock Settlement"><IconButton size="small" onClick={() => unlockMutation.mutate(settlement._id)}><UnlockIcon fontSize="small" sx={{ color: '#B45309' }} /></IconButton></Tooltip>}
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      <Dialog open={!!formDialog} onClose={() => setFormDialog(null)} maxWidth="lg" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>Create Settlement - {formDialog?.settlementNo}</DialogTitle>
        <DialogContent>
          {formDialog && (
            <Box>
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} md={3}><InfoItem label="Party" value={formDialog.partyId?.name} /></Grid>
                <Grid item xs={12} md={3}><InfoItem label="Company" value={formDialog.companyId?.name} /></Grid>
                <Grid item xs={12} md={3}><InfoItem label="Replacement ID" value={formDialog.replacementId?.replacementId} /></Grid>
                <Grid item xs={12} md={3}><InfoItem label="Company RL / CN" value={`${formDialog.companyRLNo || '-'} / ${formDialog.cnNo || '-'}`} /></Grid>
              </Grid>

              <SectionCard title="Company Approved">
                <Grid container spacing={1.5}>
                  <Grid item xs={6} md={3}><InfoItem label="Approval Type" value={formDialog.approvalType} /></Grid>
                  <Grid item xs={6} md={3}><InfoItem label="Approved Value" value={money(formDialog.approvedValue)} /></Grid>
                  <Grid item xs={6} md={3}><InfoItem label="Approval Date" value={formatDate(formDialog.replacementId?.approvalDate)} /></Grid>
                  <Grid item xs={6} md={3}><InfoItem label="Status" value={formDialog.settlementStatus} /></Grid>
                </Grid>
                <Table size="small" sx={{ mt: 1 }}>
                  <TableHead><TableRow><TableCell>Approved Product</TableCell><TableCell align="right">Qty</TableCell><TableCell align="right">MRP</TableCell><TableCell align="right">Value</TableCell></TableRow></TableHead>
                  <TableBody>
                    {formDialog.approvedProducts?.length ? formDialog.approvedProducts.map((product) => (
                      <TableRow key={product._id || product.productName}><TableCell>{product.productName}</TableCell><TableCell align="right">{product.quantity || '-'}</TableCell><TableCell align="right">{product.mrp ? money(product.mrp) : '-'}</TableCell><TableCell align="right">{money(product.value || product.calculatedValue)}</TableCell></TableRow>
                    )) : <TableRow><TableCell colSpan={4}>Amount approval: {money(formDialog.approvedValue)}</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </SectionCard>

              <Grid container spacing={2} sx={{ mt: 0.5, mb: 2 }}>
                <Grid item xs={12} md={4}>
                  <TextField fullWidth label="Last Sale Invoice Number *" value={lastSaleInvoiceNo} onChange={(e) => setLastSaleInvoiceNo(e.target.value)} />
                </Grid>
                <Grid item xs={12} md={8}>
                  <TextField fullWidth label="Settlement Remarks" value={remarks} onChange={(e) => setRemarks(e.target.value)} />
                </Grid>
              </Grid>

              <Typography variant="subtitle2" fontWeight={800} mb={1}>Sent Product Details</Typography>
              <TableContainer component={Card} variant="outlined" sx={{ borderRadius: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ minWidth: 220 }}>Product Name</TableCell>
                      <TableCell align="right">MRP</TableCell>
                      <TableCell align="right">Quantity</TableCell>
                      <TableCell>Unit</TableCell>
                      <TableCell>Remarks</TableCell>
                      <TableCell align="right">Value</TableCell>
                      <TableCell align="center">Remove</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sentProducts.map((product, index) => (
                      <TableRow key={index}>
                        <TableCell sx={{ minWidth: 260 }}>
                          <SearchableProductDropdown
                            label="Product Name"
                            value={product.productId}
                            selectedProduct={product}
                            companyId={formDialog?.companyId?._id || formDialog?.companyId}
                            onChange={(selectedProduct) => selectProduct(index, selectedProduct)}
                            required
                          />
                        </TableCell>
                        <TableCell><TextField size="small" type="number" value={product.mrp} onChange={(e) => setSentProducts((rows) => rows.map((row, i) => (i === index ? { ...row, mrp: e.target.value, mrpSnapshot: e.target.value } : row)))} inputProps={{ min: 0, step: '0.01' }} /></TableCell>
                        <TableCell><TextField size="small" type="number" value={product.quantity} onChange={(e) => updateProduct(index, 'quantity', e.target.value)} inputProps={{ min: 0, step: '0.01' }} /></TableCell>
                        <TableCell><TextField size="small" value={product.unit || 'pcs'} onChange={(e) => updateProduct(index, 'unit', e.target.value)} /></TableCell>
                        <TableCell><TextField size="small" value={product.remarks || ''} onChange={(e) => updateProduct(index, 'remarks', e.target.value)} placeholder="Optional" /></TableCell>
                        <TableCell align="right" sx={{ fontWeight: 800 }}>{money(productValue(product))}</TableCell>
                        <TableCell align="center"><IconButton size="small" color="error" onClick={() => removeProduct(index)}><RemoveIcon fontSize="small" /></IconButton></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <Button startIcon={<AddIcon />} sx={{ mt: 1.5 }} onClick={addProduct}>Add Product</Button>

              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={6} md={3}><Card sx={{ p: 1.5 }}><InfoItem label="Approved Value" value={money(formDialog.approvedValue)} /></Card></Grid>
                <Grid item xs={6} md={3}><Card sx={{ p: 1.5 }}><InfoItem label="Total Sent Value" value={money(sentTotal)} /></Card></Grid>
                <Grid item xs={6} md={3}><Card sx={{ p: 1.5 }}><InfoItem label="Difference" value={money(difference)} /></Card></Grid>
                <Grid item xs={6} md={3}><Card sx={{ p: 1.5 }}><Typography variant="caption" color="#6B7280" fontWeight={700}>Computed Status</Typography><Box mt={0.5}><StatusChip status={computedStatus} /></Box></Card></Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button variant="outlined" onClick={() => setFormDialog(null)}>Close</Button>
          <Button variant="outlined" onClick={saveSettlement} disabled={updateMutation.isPending}>Save</Button>
          <Button variant="contained" color="success" startIcon={<CompleteIcon />} onClick={completeSettlement} disabled={completeMutation.isPending || !lastSaleInvoiceNo}>
            {completeMutation.isPending ? <CircularProgress size={18} /> : 'Complete Settlement'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!detailDialog} onClose={() => setDetailDialog(null)} maxWidth="lg" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>Settlement Lifecycle - {detailDialog?.settlementNo}</DialogTitle>
        <DialogContent>
          {detailDialog && (
            <Box>
              <Card sx={{ p: 2, mb: 2, bgcolor: '#F8FAFC', borderRadius: 2 }}>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} md={3}><Typography variant="h6" fontWeight={800}>{detailDialog.partyId?.name}</Typography><Typography variant="body2" color="#6B7280">{detailDialog.partyId?.town}</Typography></Grid>
                  <Grid item xs={6} md={2}><InfoItem label="Replacement ID" value={detailDialog.replacementId?.replacementId} /></Grid>
                  <Grid item xs={6} md={2}><InfoItem label="Settlement ID" value={detailDialog.settlementNo} /></Grid>
                  <Grid item xs={6} md={2}><InfoItem label="Company" value={detailDialog.companyId?.name} /></Grid>
                  <Grid item xs={6} md={1.5}><StatusChip status={detailDialog.settlementStatus} /></Grid>
                </Grid>
              </Card>

              <Card variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2 }}>
                <Grid container spacing={1} alignItems="center">
                  {['REPLACEMENT RECEIVED', 'DISPATCHED', 'COMPANY APPROVED', 'SETTLEMENT', 'SETTLED'].map((step, index) => (
                    <Grid item xs={12} sm={2.4} key={step}>
                      <Box sx={{ p: 1.2, textAlign: 'center', borderRadius: 1, bgcolor: index <= 3 || detailDialog.settlementStatus === 'SETTLED' ? '#E0F2FE' : '#F3F4F6', color: '#0D1B2A', fontWeight: 800, fontSize: '0.75rem' }}>{step}</Box>
                    </Grid>
                  ))}
                </Grid>
              </Card>

              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <SectionCard title="Party Information">
                    <Grid container spacing={1.5}>
                      <Grid item xs={6}><InfoItem label="Party Name" value={detailDialog.partyId?.name} /></Grid>
                      <Grid item xs={6}><InfoItem label="Town" value={detailDialog.partyId?.town} /></Grid>
                      <Grid item xs={6}><InfoItem label="GST" value={detailDialog.partyId?.gst} /></Grid>
                      <Grid item xs={6}><InfoItem label="Mobile" value={detailDialog.partyId?.mobile} /></Grid>
                      <Grid item xs={12}><InfoItem label="Address" value={detailDialog.partyId?.address} /></Grid>
                    </Grid>
                  </SectionCard>
                </Grid>
                <Grid item xs={12} md={6}>
                  <SectionCard title="Replacement Received">
                    <Grid container spacing={1.5}>
                      <Grid item xs={6}><InfoItem label="Receiving Date" value={formatDate(detailDialog.replacementId?.receivingDate)} /></Grid>
                      <Grid item xs={6}><InfoItem label="Transport" value={detailDialog.replacementId?.receivingTransport?.name} /></Grid>
                      <Grid item xs={6}><InfoItem label="Receiving LR" value={detailDialog.replacementId?.receivingLRNo} /></Grid>
                      <Grid item xs={6}><InfoItem label="Received Cases" value={detailDialog.replacementId?.receivingCases} /></Grid>
                    </Grid>
                  </SectionCard>
                </Grid>
                <Grid item xs={12} md={6}>
                  <SectionCard title="Dispatch">
                    <Grid container spacing={1.5}>
                      <Grid item xs={6}><InfoItem label="Sent Date" value={formatDate(detailDialog.replacementId?.sentDate)} /></Grid>
                      <Grid item xs={6}><InfoItem label="Transport" value={detailDialog.replacementId?.dispatchTransport?.name} /></Grid>
                      <Grid item xs={6}><InfoItem label="Sent LR" value={detailDialog.replacementId?.dispatchLRNo} /></Grid>
                      <Grid item xs={6}><InfoItem label="Invoice No" value={detailDialog.replacementId?.invoiceNumber || detailDialog.invoiceId?.invoiceNumber} /></Grid>
                      <Grid item xs={6}><InfoItem label="Sent Cases" value={detailDialog.replacementId?.dispatchCases} /></Grid>
                      <Grid item xs={6}><InfoItem label="Cartons" value={detailDialog.replacementId?.dispatchCartons || detailDialog.replacementId?.masterCartonId?.cartonNumber} /></Grid>
                    </Grid>
                  </SectionCard>
                </Grid>
                <Grid item xs={12} md={6}>
                  <SectionCard title="Company Approval">
                    <Grid container spacing={1.5}>
                      <Grid item xs={6}><InfoItem label="Approval Type" value={detailDialog.approvalType} /></Grid>
                      <Grid item xs={6}><InfoItem label="Approved Amount" value={money(detailDialog.approvedValue)} /></Grid>
                      <Grid item xs={6}><InfoItem label="Approval Date" value={formatDate(detailDialog.replacementId?.approvalDate)} /></Grid>
                      <Grid item xs={6}><InfoItem label="Company RL Number" value={detailDialog.companyRLNo} /></Grid>
                      <Grid item xs={6}><InfoItem label="CN Number" value={detailDialog.cnNo} /></Grid>
                      <Grid item xs={12}><InfoItem label="Approval Remark" value={detailDialog.replacementId?.approvalRemark} /></Grid>
                    </Grid>
                  </SectionCard>
                </Grid>
              </Grid>

              <Card variant="outlined" sx={{ p: 2, mt: 2, borderRadius: 2 }}>
                <Typography variant="subtitle2" fontWeight={800} mb={1}>Approved vs Sent</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <Typography variant="caption" color="#6B7280" fontWeight={800}>APPROVED</Typography>
                    {(detailDialog.approvedProducts?.length ? detailDialog.approvedProducts : [{ productName: 'Amount Approval', value: detailDialog.approvedValue }]).map((product) => (
                      <Box key={product._id || product.productName} sx={{ mt: 1, p: 1.2, bgcolor: '#F8FAFC', borderRadius: 1 }}>
                        <Typography fontWeight={800}>{product.productName}</Typography>
                        <Typography variant="body2">Approved Value: {money(product.value || product.calculatedValue || detailDialog.approvedValue)}</Typography>
                      </Box>
                    ))}
                  </Grid>
                  <Grid item xs={12} md={8}>
                    <Typography variant="caption" color="#6B7280" fontWeight={800}>SENT</Typography>
                    <Table size="small">
                      <TableHead><TableRow><TableCell>Product</TableCell><TableCell align="right">MRP</TableCell><TableCell align="right">Qty</TableCell><TableCell align="right">Value</TableCell></TableRow></TableHead>
                      <TableBody>
                        {detailDialog.sentProducts?.length ? detailDialog.sentProducts.map((product) => (
                          <TableRow key={product._id || product.productName}><TableCell>{product.productName}</TableCell><TableCell align="right">{money(product.mrp)}</TableCell><TableCell align="right">{product.quantity} {product.unit}</TableCell><TableCell align="right">{money(product.value || product.calculatedValue)}</TableCell></TableRow>
                        )) : <TableRow><TableCell colSpan={4}>No sent product entries yet.</TableCell></TableRow>}
                      </TableBody>
                    </Table>
                    <Divider sx={{ my: 1.5 }} />
                    <Grid container spacing={1}>
                      <Grid item xs={4}><InfoItem label="Total Sent Value" value={money(detailDialog.sentValue)} /></Grid>
                      <Grid item xs={4}><InfoItem label="Difference" value={money(detailDialog.difference)} /></Grid>
                      <Grid item xs={4}><StatusChip status={detailDialog.settlementStatus} /></Grid>
                    </Grid>
                  </Grid>
                </Grid>
              </Card>

              <Grid container spacing={2} sx={{ mt: 0.5 }}>
                <Grid item xs={12} md={6}><SectionCard title="Settlement Details"><Grid container spacing={1.5}><Grid item xs={6}><InfoItem label="Last Sale Invoice" value={detailDialog.lastSaleInvoiceNo} /></Grid><Grid item xs={6}><InfoItem label="Settlement Date" value={formatDate(detailDialog.settlementDate || detailDialog.completedAt)} /></Grid><Grid item xs={6}><InfoItem label="Locked" value={detailDialog.isLocked ? 'Yes' : 'No'} /></Grid><Grid item xs={6}><InfoItem label="Prepared By" value={detailDialog.createdBy?.username} /></Grid></Grid></SectionCard></Grid>
                <Grid item xs={12} md={6}><SectionCard title="Documents"><Button startIcon={<PdfIcon />} variant="outlined" onClick={() => openSettlementPDF(detailDialog)}>Settlement PDF</Button><Typography variant="body2" color="#6B7280" mt={1}>Replacement invoice remains available in the invoice module.</Typography></SectionCard></Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button variant="outlined" onClick={() => setDetailDialog(null)}>Close</Button>
          {detailDialog?.settlementStatus !== 'SETTLED' && <Button variant="contained" onClick={() => { const current = detailDialog; setDetailDialog(null); openForm(current); }}>View Settlement</Button>}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SettlementManagement;
