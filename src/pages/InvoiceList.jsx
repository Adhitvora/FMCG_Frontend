import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Card,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  InputAdornment,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Add as AddIcon,
  Cancel as CancelIcon,
  Download as DownloadIcon,
  ListAlt as PartyListIcon,
  LockOpen as UnlockIcon,
  PictureAsPdf as PdfIcon,
  Print as PrintIcon,
  Replay as ReprintIcon,
  Search as SearchIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import InvoicePdfPreviewDialog from '../components/InvoicePdfPreviewDialog';
import SearchableDropdown from '../components/SearchableDropdown';
import { useAuth } from '../context/AuthContext';
import { companyService } from '../services/company.service';
import { invoiceService } from '../services/invoice.service';
import { replacementService } from '../services/replacement.service';
import api from '../services/api';

const InvoiceList = () => {
  const queryClient = useQueryClient();
  const { isAdmin, isSuperAdmin } = useAuth();
  const searchTimerRef = useRef(null);

  // ── List State ──
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [search, setSearch] = useState('');
  const [searchDebounce, setSearchDebounce] = useState('');

  // ── Create Dialog State ──
  const [createDialog, setCreateDialog] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [companySearch, setCompanySearch] = useState('');
  const [transportSearch, setTransportSearch] = useState('');
  const [selectedReplacements, setSelectedReplacements] = useState([]);

  // ── Dispatch Popup State ──
  const [dispatchDialog, setDispatchDialog] = useState(false);
  const [selectedTransport, setSelectedTransport] = useState('');
  const [lrNo, setLrNo] = useState('');
  const [dispatchDate, setDispatchDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [invoiceDate, setInvoiceDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [remarks, setRemarks] = useState('');

  // ── Other Dialogs ──
  const [cancelDialog, setCancelDialog] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [previewInvoice, setPreviewInvoice] = useState(null);
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => () => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
  }, []);

  useEffect(() => () => {
    if (previewUrl) window.URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  // ── Queries ──
  const { data, isLoading } = useQuery({
    queryKey: ['invoices', page + 1, rowsPerPage, searchDebounce],
    queryFn: () => invoiceService.getInvoices({ page: page + 1, limit: rowsPerPage, search: searchDebounce }),
  });

  const { data: companiesData } = useQuery({
    queryKey: ['companies-all'],
    queryFn: () => companyService.getAllCompanies(),
  });

  const { data: replacementsData, isLoading: replacementsLoading } = useQuery({
    queryKey: ['replacements-uninvoiced', selectedCompany],
    queryFn: () => replacementService.getReplacements({
      company: selectedCompany,
      invoiceStatus: 'pending',
      limit: 200,
    }),
    enabled: Boolean(selectedCompany),
  });

  const { data: transportsData } = useQuery({
    queryKey: ['transports-all', transportSearch],
    queryFn: async () => {
      const res = await api.get('/transports', { params: { limit: 50, search: transportSearch } });
      return res.data;
    },
    enabled: dispatchDialog,
  });

  const invoices = data?.data || [];
  const pagination = data?.pagination || { total: 0 };
  const companies = companiesData?.data || [];
  const availableReplacements = (replacementsData?.data || []).filter((rep) => !rep.cartonId || rep.cartonStatus === 'MERGED' || rep.cartonStatus === 'AVAILABLE');
  const transports = transportsData?.data || [];

  const totalSelectedCases = selectedReplacements.reduce(
    (total, r) => total + Number(r.receivingCases || 0), 0,
  );

  // ── Dialog Helpers ──
  const closeCreateDialog = () => {
    setCreateDialog(false);
    setSelectedCompany('');
    setSelectedReplacements([]);
  };

  const closeDispatchDialog = () => {
    setDispatchDialog(false);
    setSelectedTransport('');
    setLrNo('');
    setDispatchDate(format(new Date(), 'yyyy-MM-dd'));
    setInvoiceDate(format(new Date(), 'yyyy-MM-dd'));
    setRemarks('');
  };

  const closePreview = () => {
    setPreviewInvoice(null);
    setPreviewHtml('');
    setPreviewUrl('');
    setPreviewLoading(false);
  };

  // ── Preview ──
  const handlePreviewInvoice = async (invoice) => {
    setPreviewInvoice(invoice);
    setPreviewHtml('');
    setPreviewUrl('');
    setPreviewLoading(true);

    try {
      const html = await invoiceService.getInvoiceHtml(invoice._id);
      setPreviewHtml(html);
    } catch {
      try {
        const pdfBlob = await invoiceService.getPDFBlob(invoice._id);
        setPreviewUrl(window.URL.createObjectURL(pdfBlob));
      } catch (err) {
        setPreviewInvoice(null);
        toast.error(err.response?.data?.message || 'Invoice preview could not be opened');
      }
    } finally {
      setPreviewLoading(false);
    }
  };

  // ── Download ──
  const handleDownloadPDF = async (invoice) => {
    try {
      await invoiceService.downloadPDF(invoice._id, invoice.invoiceNumber);
      toast.success('Invoice PDF downloaded');
    } catch {
      toast.error('Invoice download failed');
    }
  };

  // ── Print ──
  const handlePrintInvoice = async (invoice) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Allow pop-ups to open the invoice print preview');
      return;
    }

    try {
      const pdfBlob = await invoiceService.getPDFBlob(invoice._id);
      const url = window.URL.createObjectURL(pdfBlob);
      printWindow.document.title = invoice.invoiceNumber;
      printWindow.location.replace(url);
      window.setTimeout(() => window.URL.revokeObjectURL(url), 120000);

      // Track print
      await invoiceService.trackPrint(invoice._id).catch(() => {});
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Opened print preview');
    } catch {
      printWindow.close();
      toast.error('Invoice print preview failed');
    }
  };

  // ── Party List ──
  const handleDownloadPartyList = async (invoice) => {
    const companyId = invoice.company?._id || invoice.company || invoice.companyId;
    if (!companyId) {
      toast.error('Company information is missing');
      return;
    }
    try {
      await invoiceService.downloadPartyListPDF(
        companyId,
        invoice.items?.map((item) => item.replacement),
        format(new Date(invoice.invoiceDate), 'dd/MM/yyyy'),
        invoice.transportName || '',
        invoice.invoiceNumber,
      );
      toast.success('Party List PDF downloaded');
    } catch {
      toast.error('Party List download failed');
    }
  };

  // ── Mutations ──
  const createMutation = useMutation({
    mutationFn: invoiceService.createInvoice,
    onSuccess: async (response) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['replacements'] });
      closeCreateDialog();
      closeDispatchDialog();
      toast.success('Invoice ' + response.data.invoiceNumber + ' created!');
      await handlePreviewInvoice(response.data);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Invoice creation failed'),
  });

  const reprintMutation = useMutation({
    mutationFn: invoiceService.reprintInvoice,
    onSuccess: async (response) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Invoice PDF regenerated');
      await handlePreviewInvoice(response.data);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Reprint failed'),
  });

  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }) => invoiceService.cancelInvoice(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['replacements'] });
      setCancelDialog(null);
      toast.success('Invoice cancelled');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Cancel failed'),
  });

  const unlockMutation = useMutation({
    mutationFn: invoiceService.unlockInvoice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Invoice unlocked');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Unlock failed'),
  });

  // ── Selection ──
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearch(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = window.setTimeout(() => {
      setSearchDebounce(value);
      setPage(0);
    }, 400);
  };

  const cartonKey = (replacement) => {
    const carton = replacement.cartonId || replacement.masterCartonId;
    if (!carton) return '';
    return String(typeof carton === 'object' ? carton._id : carton);
  };

  const toggleReplacement = (rep) => {
    setSelectedReplacements((prev) => {
      const mergedCartonKey = cartonKey(rep);
      const group = mergedCartonKey
        ? availableReplacements.filter((replacement) => cartonKey(replacement) === mergedCartonKey)
        : [rep];
      const groupIds = new Set(group.map((replacement) => replacement._id));
      const isFullySelected = group.every((replacement) => prev.some((selected) => selected._id === replacement._id));
      const next = isFullySelected
        ? prev.filter((selected) => !groupIds.has(selected._id))
        : [...prev.filter((selected) => !groupIds.has(selected._id)), ...group];
      // Selection order must stay the same as the replacement list. That keeps
      // persisted merge members together without moving parties for PDF output.
      return next.sort((left, right) => availableReplacements.findIndex((item) => item._id === left._id)
        - availableReplacements.findIndex((item) => item._id === right._id));
    });
  };

  const selectAll = () => {
    if (selectedReplacements.length === availableReplacements.length) {
      setSelectedReplacements([]);
    } else {
      setSelectedReplacements([...availableReplacements]);
    }
  };

  const allSelected = availableReplacements.length > 0
    && selectedReplacements.length === availableReplacements.length;

  // ── Step 2: Generate Invoice ──
  const handleGenerateInvoice = () => {
    if (!selectedCompany) return toast.error('Select a company');
    if (selectedReplacements.length === 0) return toast.error('Select at least one replacement');

    createMutation.mutate({
      company: selectedCompany,
      replacementIds: selectedReplacements.map((r) => r._id),
      invoiceDate,
      remarks,
      transport: selectedTransport || undefined,
      lrNo,
      dispatchDate,
    });
  };

  // ─── RENDER ───

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={700} color="#0D1B2A">Invoices</Typography>
          <Typography variant="body2" color="#64748B" mt={0.5}>
            Generate, preview, print, and manage replacement invoices
          </Typography>
        </Box>
        {isAdmin() && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateDialog(true)}>
            Generate Invoice
          </Button>
        )}
      </Box>

      {/* Search */}
      <Card sx={{ mb: 2.5, p: 2 }}>
        <TextField
          fullWidth
          placeholder="Search by invoice no, company, party, town, LR, transport, carton..."
          value={search}
          onChange={handleSearchChange}
          size="small"
          InputProps={{
            startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: '#64748B' }} /></InputAdornment>,
          }}
        />
      </Card>

      {/* Invoice Table */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Invoice No.</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Company</TableCell>
                <TableCell>Transport</TableCell>
                <TableCell align="center">Items</TableCell>
                <TableCell align="right">Grand Total</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} align="center" sx={{ py: 6 }}><CircularProgress size={32} /></TableCell></TableRow>
              ) : invoices.length === 0 ? (
                <TableRow><TableCell colSpan={8} align="center" sx={{ py: 6, color: '#64748B' }}>No invoices found</TableCell></TableRow>
              ) : invoices.map((inv) => (
                <TableRow key={inv._id} hover sx={{ opacity: inv.status === 'Cancelled' ? 0.55 : 1 }}>
                  <TableCell>
                    <Typography fontWeight={700} fontFamily="monospace" fontSize="0.85rem" color="#1F4E79">
                      {inv.invoiceNumber}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.8125rem' }}>{format(new Date(inv.invoiceDate), 'dd/MM/yyyy')}</TableCell>
                  <TableCell>{inv.companyName || inv.company?.name}</TableCell>
                  <TableCell sx={{ fontSize: '0.8125rem' }}>{inv.transportName || '—'}</TableCell>
                  <TableCell align="center">{inv.items?.length || 0}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>{inv.totalActualCases ?? 0}</TableCell>
                  <TableCell>
                    <Chip
                      label={inv.status}
                      size="small"
                      color={inv.status === 'Active' ? 'success' : 'error'}
                      variant={inv.status === 'Active' ? 'filled' : 'outlined'}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Preview"><IconButton size="small" onClick={() => handlePreviewInvoice(inv)}><ViewIcon fontSize="small" sx={{ color: '#1F4E79' }} /></IconButton></Tooltip>
                    <Tooltip title="Download PDF"><IconButton size="small" onClick={() => handleDownloadPDF(inv)}><DownloadIcon fontSize="small" sx={{ color: '#2563EB' }} /></IconButton></Tooltip>
                    <Tooltip title="Print"><IconButton size="small" onClick={() => handlePrintInvoice(inv)}><PrintIcon fontSize="small" sx={{ color: '#059669' }} /></IconButton></Tooltip>
                    {isAdmin() && (
                      <Tooltip title="Regenerate PDF"><IconButton size="small" disabled={reprintMutation.isPending} onClick={() => reprintMutation.mutate(inv._id)}><ReprintIcon fontSize="small" sx={{ color: '#7C3AED' }} /></IconButton></Tooltip>
                    )}
                    <Tooltip title="Party List"><IconButton size="small" onClick={() => handleDownloadPartyList(inv)}><PartyListIcon fontSize="small" sx={{ color: '#D97706' }} /></IconButton></Tooltip>
                    {isSuperAdmin() && inv.isLocked && inv.status === 'Active' && (
                      <Tooltip title="Unlock"><IconButton size="small" disabled={unlockMutation.isPending} onClick={() => unlockMutation.mutate(inv._id)}><UnlockIcon fontSize="small" sx={{ color: '#0891B2' }} /></IconButton></Tooltip>
                    )}
                    {isSuperAdmin() && inv.status === 'Active' && (
                      <Tooltip title="Cancel"><IconButton size="small" onClick={() => { setCancelDialog(inv); setCancelReason(''); }}><CancelIcon fontSize="small" sx={{ color: '#DC2626' }} /></IconButton></Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={pagination.total}
          page={page}
          onPageChange={(e, p) => setPage(p)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
          rowsPerPageOptions={[10, 20, 50]}
        />
      </Card>

      {/* ═══════════ STEP 1: Select Replacements ═══════════ */}
      <Dialog open={createDialog} onClose={closeCreateDialog} maxWidth="lg" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>Step 1 — Select Pending Replacements</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} sm={6}>
              <SearchableDropdown
                label="Company *"
                value={selectedCompany}
                options={companies}
                onSearch={setCompanySearch}
                onChange={(nextValue) => { setSelectedCompany(nextValue); setSelectedReplacements([]); }}
                required
              />
            </Grid>
          </Grid>

          {selectedCompany && (
            <>
              {selectedReplacements.length > 0 && (
                <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
                  <strong>{selectedReplacements.length}</strong> selected • <strong>{totalSelectedCases}</strong> total cases
                </Alert>
              )}

              {replacementsLoading ? (
                <Box sx={{ textAlign: 'center', py: 4 }}><CircularProgress size={32} /></Box>
              ) : availableReplacements.length === 0 ? (
                <Alert severity="warning">No pending replacements for this company</Alert>
              ) : (
                <TableContainer sx={{ maxHeight: 400 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell padding="checkbox">
                          <Checkbox
                            checked={allSelected}
                            indeterminate={selectedReplacements.length > 0 && !allSelected}
                            onChange={selectAll}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>ID</TableCell>
                        <TableCell>Party</TableCell>
                        <TableCell>Town</TableCell>
                        <TableCell>LR No.</TableCell>
                        <TableCell align="center">Cases</TableCell>
                        <TableCell>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {availableReplacements.map((rep) => {
                        const selected = selectedReplacements.some((r) => r._id === rep._id);
                        return (
                          <TableRow key={rep._id} hover selected={selected} onClick={() => toggleReplacement(rep)} sx={{ cursor: 'pointer' }}>
                            <TableCell padding="checkbox"><Checkbox checked={selected} size="small" /></TableCell>
                            <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{rep.replacementId}</TableCell>
                            <TableCell sx={{ fontWeight: 500 }}>{rep.party?.name || '—'}</TableCell>
                            <TableCell>{rep.town || rep.party?.town || '—'}</TableCell>
                            <TableCell>{rep.receivingLRNo || '—'}</TableCell>
                            <TableCell align="center"><Chip label={rep.receivingCases ?? 0} size="small" /></TableCell>
                            <TableCell>
                              {rep.sentDate ? (
                                <Chip label="Dispatched" size="small" color="success" variant="outlined" sx={{ fontSize: '0.7rem' }} />
                              ) : (
                                <Chip label="Pending" size="small" color="warning" variant="outlined" sx={{ fontSize: '0.7rem' }} />
                              )}
                            </TableCell>
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
          <Button onClick={closeCreateDialog} variant="outlined">Cancel</Button>
          <Button
            variant="contained"
            disabled={selectedReplacements.length === 0}
            onClick={() => setDispatchDialog(true)}
          >
            Generate Dispatch ({selectedReplacements.length} items)
          </Button>
        </DialogActions>
      </Dialog>

      {/* ═══════════ STEP 2: Dispatch & Invoice Popup ═══════════ */}
      <Dialog open={dispatchDialog} onClose={closeDispatchDialog} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>Step 2 — Dispatch & Generate Invoice</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2.5, borderRadius: 2 }}>
            {selectedReplacements.length} items • {totalSelectedCases} cases will be dispatched and invoiced
          </Alert>

          <Grid container spacing={2}>
            <Grid item xs={12}>
              <SearchableDropdown
                label="Transport"
                value={selectedTransport}
                options={transports}
                onSearch={setTransportSearch}
                onChange={setSelectedTransport}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="LR Number" value={lrNo} onChange={(e) => setLrNo(e.target.value)} size="small" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Dispatch Date" type="date" value={dispatchDate}
                onChange={(e) => setDispatchDate(e.target.value)} size="small" InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Invoice Date" type="date" value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)} size="small" InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Remarks" value={remarks} onChange={(e) => setRemarks(e.target.value)} size="small" />
            </Grid>
            <Grid item xs={12}>
              <Alert severity="info" sx={{ borderRadius: 2 }}>
                Carton counts are automatic: saved carton merges print as one physical carton; all other rows retain their received case quantity.
              </Alert>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={closeDispatchDialog} variant="outlined">Back</Button>
          <Button
            variant="contained"
            onClick={handleGenerateInvoice}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? <CircularProgress size={20} /> : 'Generate Invoice'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ═══════════ Cancel Dialog ═══════════ */}
      <Dialog open={Boolean(cancelDialog)} onClose={() => setCancelDialog(null)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700, color: '#DC2626' }}>Cancel Invoice</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Cancellation unlinks the replacement records. The saved PDF remains for audit.
          </Alert>
          <Typography mb={1}>Invoice: <strong>{cancelDialog?.invoiceNumber}</strong></Typography>
          <TextField
            fullWidth label="Cancellation Reason *" value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)} multiline rows={2} sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setCancelDialog(null)} variant="outlined">Back</Button>
          <Button
            variant="contained" color="error"
            disabled={!cancelReason || cancelMutation.isPending}
            onClick={() => cancelMutation.mutate({ id: cancelDialog._id, reason: cancelReason })}
          >
            {cancelMutation.isPending ? <CircularProgress size={20} /> : 'Cancel Invoice'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ═══════════ Preview Dialog ═══════════ */}
      <InvoicePdfPreviewDialog
        open={Boolean(previewInvoice)}
        invoice={previewInvoice}
        previewHtml={previewHtml}
        pdfUrl={previewUrl}
        loading={previewLoading}
        onClose={closePreview}
        onDownload={() => previewInvoice && handleDownloadPDF(previewInvoice)}
        onPrint={() => previewInvoice && handlePrintInvoice(previewInvoice)}
      />
    </Box>
  );
};

export default InvoiceList;

