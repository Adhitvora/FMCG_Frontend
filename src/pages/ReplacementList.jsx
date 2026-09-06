import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import {
  Box, Typography, Button, Card, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TablePagination, IconButton, Chip, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, MenuItem, InputAdornment, Tooltip,
  CircularProgress, Grid, Tabs, Tab, Divider,
} from '@mui/material';
import {
  Add as AddIcon, Visibility as ViewIcon, LocalShipping as DispatchIcon,
  CheckCircle as ApproveIcon, Search as SearchIcon, FilterList as FilterIcon,
  Lock as LockIcon, LockOpen as UnlockIcon,
} from '@mui/icons-material';
import { replacementService } from '../services/replacement.service';
import { companyService } from '../services/company.service';
import SearchableDropdown from '../components/SearchableDropdown';
import SearchableProductDropdown from '../components/SearchableProductDropdown';
import { partyService } from '../services/party.service';
import { transportService } from '../services/transport.service';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const statusColors = {
  Pending: { bg: '#FEF3C7', color: '#D97706' },
  Approved: { bg: '#D1FAE5', color: '#059669' },
  Rejected: { bg: '#FEE2E2', color: '#DC2626' },
  Partial: { bg: '#DBEAFE', color: '#1F4E79' },
};

const settlementColors = {
  PENDING: { bg: '#FEF3C7', color: '#B45309' },
  PARTIAL: { bg: '#DBEAFE', color: '#1D4ED8' },
  MATCHED: { bg: '#D1FAE5', color: '#047857' },
  SETTLED: { bg: '#DCFCE7', color: '#166534' },
  REJECTED: { bg: '#FEE2E2', color: '#B91C1C' },
  ON_HOLD: { bg: '#F3E8FF', color: '#7E22CE' },
};

const money = (value) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(value || 0));
const shortDate = (value) => (value ? format(new Date(value), 'dd/MM/yy') : '-');
const displayStatus = (value) => String(value || '').replace(/_/g, ' ');

const CALCULATION_MODE = {
  QTY: 'QTY',
  VALUE: 'VALUE',
};

const MRP_SCALE = 4;
const QTY_SCALE = 4;
const VALUE_SCALE = 2;

const pow10 = (scale) => 10n ** BigInt(scale);

const parseDecimalUnits = (value, scale, { blankAsZero = false } = {}) => {
  if (value === undefined || value === null || value === '') return blankAsZero ? 0n : null;
  const text = String(value).trim().replace(/,/g, '');
  if (!text) return blankAsZero ? 0n : null;
  if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(text)) return null;

  const [wholeRaw = '0', fractionRaw = ''] = text.split('.');
  const whole = wholeRaw || '0';
  const fraction = fractionRaw.slice(0, scale).padEnd(scale, '0');
  const roundDigit = Number(fractionRaw[scale] || 0);
  let units = BigInt(whole) * pow10(scale) + BigInt(fraction || '0');
  if (roundDigit >= 5) units += 1n;
  return units;
};

const roundDivide = (numerator, denominator) => {
  if (denominator <= 0n) return null;
  const quotient = numerator / denominator;
  const remainder = numerator % denominator;
  return quotient + (remainder * 2n >= denominator ? 1n : 0n);
};

const roundScale = (units, fromScale, toScale) => {
  if (fromScale === toScale) return units;
  if (fromScale < toScale) return units * pow10(toScale - fromScale);
  return roundDivide(units, pow10(fromScale - toScale));
};

const formatUnits = (units, scale) => {
  if (units === null || units === undefined) return '';
  const divisor = pow10(scale);
  const whole = units / divisor;
  const fraction = String(units % divisor).padStart(scale, '0');
  return scale === 0 ? String(whole) : `${whole}.${fraction}`;
};

const unitsToNumber = (units, scale) => Number(formatUnits(units || 0n, scale));

const calculateValueUnits = (mrp, quantity) => {
  const mrpUnits = parseDecimalUnits(mrp, MRP_SCALE, { blankAsZero: true });
  const quantityUnits = parseDecimalUnits(quantity, QTY_SCALE);
  if (mrpUnits === null || quantityUnits === null) return null;
  return roundScale(mrpUnits * quantityUnits, MRP_SCALE + QTY_SCALE, VALUE_SCALE);
};

const calculateQuantityUnits = (value, mrp) => {
  const valueUnits = parseDecimalUnits(value, VALUE_SCALE);
  const mrpUnits = parseDecimalUnits(mrp, MRP_SCALE, { blankAsZero: true });
  if (valueUnits === null || mrpUnits === null || mrpUnits <= 0n) return null;
  return roundDivide(valueUnits * pow10(MRP_SCALE + QTY_SCALE - VALUE_SCALE), mrpUnits);
};

const formatQuantityInput = (value) => {
  const units = parseDecimalUnits(value, QTY_SCALE);
  return units === null ? '' : formatUnits(units, QTY_SCALE);
};

const formatValueInput = (value) => {
  const units = parseDecimalUnits(value, VALUE_SCALE);
  return units === null ? '' : formatUnits(units, VALUE_SCALE);
};

const normalizeCalculationMode = (mode) => (mode === CALCULATION_MODE.VALUE ? CALCULATION_MODE.VALUE : CALCULATION_MODE.QTY);

const recalculateApprovalProduct = (product, mode = product.calculationMode) => {
  const calculationMode = normalizeCalculationMode(mode);
  if (calculationMode === CALCULATION_MODE.VALUE) {
    const quantityUnits = calculateQuantityUnits(product.value, product.mrp);
    const valueUnits = parseDecimalUnits(product.value, VALUE_SCALE);
    const normalizedValue = valueUnits === null ? '' : formatUnits(valueUnits, VALUE_SCALE);
    return {
      ...product,
      calculationMode,
      quantity: quantityUnits === null ? '' : formatUnits(quantityUnits, QTY_SCALE),
      calculatedValue: normalizedValue,
      totalValue: normalizedValue,
    };
  }

  const valueUnits = calculateValueUnits(product.mrp, product.quantity);
  const value = valueUnits === null ? '' : formatUnits(valueUnits, VALUE_SCALE);
  return {
    ...product,
    calculationMode,
    value,
    calculatedValue: value,
    totalValue: value,
  };
};

const approvalProductValueUnits = (product) => {
  const valueUnits = parseDecimalUnits(product.value, VALUE_SCALE);
  if (valueUnits !== null) return valueUnits;
  return calculateValueUnits(product.mrp, product.quantity) || 0n;
};

const approvalProductValue = (product) => unitsToNumber(approvalProductValueUnits(product), VALUE_SCALE);

const approvalProductQuantity = (product) => unitsToNumber(parseDecimalUnits(product.quantity, QTY_SCALE, { blankAsZero: true }), QTY_SCALE);

const approvalProductMrp = (value) => unitsToNumber(parseDecimalUnits(value, MRP_SCALE, { blankAsZero: true }), MRP_SCALE);

const StatusBadge = ({ value, type = 'approval' }) => {
  const palette = type === 'settlement' ? settlementColors : statusColors;
  const colors = palette[value] || { bg: '#F3F4F6', color: '#374151' };
  return <Chip label={displayStatus(value || 'PENDING')} size="small" sx={{ fontWeight: 700, bgcolor: colors.bg, color: colors.color }} />;
};

const InfoItem = ({ label, value }) => (
  <Box>
    <Typography variant="caption" color="#6B7280" fontWeight={700}>{label}</Typography>
    <Typography variant="body2" fontWeight={650} sx={{ overflowWrap: 'anywhere' }}>{value || '-'}</Typography>
  </Box>
);

const emptyApprovalProduct = () => ({
  productId: '',
  productName: '',
  productNameSnapshot: '',
  sku: '',
  productCode: '',
  mrp: '',
  mrpSnapshot: '',
  masterMrpSnapshot: '',
  quantity: '',
  value: '',
  calculatedValue: '',
  totalValue: '',
  calculationMode: CALCULATION_MODE.QTY,
  status: 'Approved',
});

const approvalProductForEditing = (product = {}) => {
  const quantity = formatQuantityInput(product.quantity);
  const savedValue = formatValueInput(product.value ?? product.calculatedValue ?? product.totalValue ?? '');
  const fallbackValue = savedValue || formatUnits(calculateValueUnits(product.mrp, quantity) || 0n, VALUE_SCALE);
  const calculationMode = normalizeCalculationMode(product.calculationMode);
  const row = {
    ...emptyApprovalProduct(),
    ...product,
    productId: product.productId?._id || product.productId || '',
    productName: product.productName || product.productNameSnapshot || '',
    productNameSnapshot: product.productNameSnapshot || product.productName || '',
    mrp: product.mrp || '',
    mrpSnapshot: product.mrpSnapshot || product.mrp || '',
    masterMrpSnapshot: product.masterMrpSnapshot || '',
    quantity,
    value: fallbackValue,
    calculatedValue: fallbackValue,
    totalValue: fallbackValue,
    calculationMode,
    status: product.status || 'Approved',
  };
  return recalculateApprovalProduct(row, calculationMode);
};

const DocumentButtons = ({ label, urls = [] }) => {
  const files = urls.filter(Boolean);
  return (
    <Box>
      <Typography variant="caption" color="#6B7280" fontWeight={700}>{label}</Typography>
      <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mt: 0.5 }}>
        {files.length ? files.map((url, index) => (
          <Button key={`${label}-${index}`} size="small" variant="outlined" onClick={() => window.open(url, '_blank')}>
            {files.length > 1 ? `Open ${index + 1}` : 'Open'}
          </Button>
        )) : <Typography variant="body2" color="#9CA3AF">Not uploaded</Typography>}
      </Box>
    </Box>
  );
};

const PartyReplacementSearch = () => {
  const [partyName, setPartyName] = useState('');
  const [town, setTown] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [selectedParty, setSelectedParty] = useState('');
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [filters, setFilters] = useState({});
  const [historyPage, setHistoryPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [detailId, setDetailId] = useState('');

  const searchParams = { partyName, town, companyId, page: 1, limit: 20 };
  const historyParams = { ...filters, companyId, page: historyPage + 1, limit: rowsPerPage };
  const hasPartySearch = !!(partyName || town || companyId);

  const { data: companiesData } = useQuery({ queryKey: ['companies-all'], queryFn: () => companyService.getAllCompanies() });
  const { data: partyResultsData, isLoading: partyLoading } = useQuery({
    queryKey: ['replacement-party-search', searchParams],
    queryFn: () => partyService.searchReplacementParties(searchParams),
    enabled: hasPartySearch,
  });
  const { data: partySummaryData, isLoading: summaryLoading } = useQuery({
    queryKey: ['party-replacement-summary', selectedParty, historyParams],
    queryFn: () => partyService.getReplacementSummary(selectedParty, historyParams),
    enabled: !!selectedParty,
  });
  const { data: detailData, isLoading: detailLoading } = useQuery({
    queryKey: ['replacement-360', detailId],
    queryFn: () => replacementService.getReplacement360(detailId),
    enabled: !!detailId,
  });

  const companies = companiesData?.data || [];
  const partyRows = partyResultsData?.data || [];
  const selectedPartyData = partySummaryData?.data || null;
  const summary = selectedPartyData?.summary || {};
  const history = selectedPartyData?.replacementHistory || [];
  const historyPagination = selectedPartyData?.pagination || { total: 0 };
  const detail = detailData?.data || null;
  const townOptions = [...new Set(partyRows.map((row) => row.town).filter(Boolean))].map((name) => ({ _id: name, name }));

  const summaryCards = [
    ['Total Replacements', summary.totalReplacements],
    ['Received', summary.received],
    ['Sent', summary.sent],
    ['Pending Approval', summary.pendingApproval],
    ['Approved', summary.approved],
    ['Settlement Pending', summary.settlementPending],
    ['Settled', summary.settled],
    ['Rejected', summary.rejected],
    ['Total Cases', summary.totalCases],
    ['Approved Amount', money(summary.approvedAmount)],
    ['Settled Amount', money(summary.settledAmount)],
    ['Pending Settlement Amount', money(summary.pendingSettlementAmount)],
  ];

  const timelineSteps = [
    ['Replacement Received', (row) => !!row.receivedDate],
    ['Replacement Sent', (row) => !!row.sentDate],
    ['Company Approved', (row) => row.approvalStatus === 'Approved'],
    ['Settlement Pending', (row) => row.settlementStatus && row.settlementStatus !== 'SETTLED'],
    ['Settlement Completed', (row) => row.settlementStatus === 'SETTLED'],
  ];

  const currentStepIndex = (row) => {
    let active = 0;
    timelineSteps.forEach((step, index) => { if (step[1](row)) active = index; });
    return active;
  };

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={800} color="#0D1B2A">Search</Typography>
        <Typography variant="body2" color="#6B7280" mt={0.5}>Party-wise replacement, approval, and settlement history</Typography>
      </Box>

      <Card sx={{ p: 2, mb: 2.5, borderRadius: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <SearchableDropdown
              label="Party Name"
              value={selectedParty}
              onSearch={setPartyName}
              onChange={(value) => { setSelectedParty(value); setHistoryPage(0); }}
              options={partyRows}
              getOptionLabel={(option) => `${option.name}${option.town ? ' - ' + option.town : ''}`}
              loading={partyLoading}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <SearchableDropdown
              label="Town"
              value={town}
              onSearch={setTown}
              onChange={(value) => { setTown(value); setSelectedParty(''); }}
              options={townOptions}
              getOptionLabel={(option) => option.name}
              getOptionValue={(option) => option._id}
              loading={partyLoading}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <SearchableDropdown label="Company" value={companyId} onChange={(value) => { setCompanyId(value); setSelectedParty(''); }} options={companies} />
          </Grid>
          <Grid item xs={12} md={2}>
            <Button fullWidth variant="outlined" startIcon={<FilterIcon />} onClick={() => setAdvancedOpen((open) => !open)}>Advanced Filters</Button>
          </Grid>
        </Grid>
        {advancedOpen && (
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={6} md={2}>
              <TextField select fullWidth size="small" label="Replacement" value={filters.replacementStatus || ''} onChange={(e) => { setFilters((f) => ({ ...f, replacementStatus: e.target.value || undefined })); setHistoryPage(0); }}>
                <MenuItem value="">All</MenuItem>
                {['RECEIVED', 'SENT', 'PENDING', 'APPROVED', 'REJECTED'].map((status) => <MenuItem key={status} value={status}>{status}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={6} md={2}>
              <TextField select fullWidth size="small" label="Approval" value={filters.approvalStatus || ''} onChange={(e) => { setFilters((f) => ({ ...f, approvalStatus: e.target.value || undefined })); setHistoryPage(0); }}>
                <MenuItem value="">All</MenuItem>
                {['Pending', 'Approved', 'Rejected', 'Partial'].map((status) => <MenuItem key={status} value={status}>{status}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={6} md={2}>
              <TextField select fullWidth size="small" label="Settlement" value={filters.settlementStatus || ''} onChange={(e) => { setFilters((f) => ({ ...f, settlementStatus: e.target.value || undefined })); setHistoryPage(0); }}>
                <MenuItem value="">All</MenuItem>
                {Object.keys(settlementColors).map((status) => <MenuItem key={status} value={status}>{displayStatus(status)}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={6} md={2}><TextField fullWidth size="small" label="Received From" type="date" InputLabelProps={{ shrink: true }} onChange={(e) => setFilters((f) => ({ ...f, receivedDateFrom: e.target.value || undefined }))} /></Grid>
            <Grid item xs={6} md={2}><TextField fullWidth size="small" label="Sent From" type="date" InputLabelProps={{ shrink: true }} onChange={(e) => setFilters((f) => ({ ...f, sentDateFrom: e.target.value || undefined }))} /></Grid>
            <Grid item xs={6} md={2}><TextField fullWidth size="small" label="Invoice / LR / REP" onChange={(e) => setFilters((f) => ({ ...f, quickSearch: e.target.value || undefined }))} /></Grid>
          </Grid>
        )}
      </Card>

      <Card sx={{ mb: 2.5, borderRadius: 2 }}>
        <TableContainer>
          <Table size="small">
            <TableHead><TableRow><TableCell>Party Name</TableCell><TableCell>Town</TableCell><TableCell>Total Replacements</TableCell><TableCell>Pending</TableCell><TableCell>Sent</TableCell><TableCell>Approved</TableCell><TableCell>Settlement Pending</TableCell><TableCell>Settled</TableCell><TableCell>Last Replacement Date</TableCell><TableCell align="center">Action</TableCell></TableRow></TableHead>
            <TableBody>
              {partyLoading ? (
                <TableRow><TableCell colSpan={10} align="center" sx={{ py: 4 }}><CircularProgress size={28} /></TableCell></TableRow>
              ) : partyRows.length === 0 ? (
                <TableRow><TableCell colSpan={10} align="center" sx={{ py: 4, color: '#6B7280' }}>Search party name or town to view replacement history</TableCell></TableRow>
              ) : partyRows.map((party) => (
                <TableRow key={party._id} hover selected={selectedParty === party._id}>
                  <TableCell sx={{ fontWeight: 750 }}>{party.name}</TableCell>
                  <TableCell>{party.town || '-'}</TableCell>
                  <TableCell>{party.summary?.totalReplacements || 0}</TableCell>
                  <TableCell>{party.summary?.pendingApproval || 0}</TableCell>
                  <TableCell>{party.summary?.sent || 0}</TableCell>
                  <TableCell>{party.summary?.approved || 0}</TableCell>
                  <TableCell>{party.summary?.settlementPending || 0}</TableCell>
                  <TableCell>{party.summary?.settled || 0}</TableCell>
                  <TableCell>{shortDate(party.summary?.lastReplacementDate)}</TableCell>
                  <TableCell align="center"><Button size="small" variant="contained" onClick={() => { setSelectedParty(party._id); setHistoryPage(0); }}>View</Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {selectedPartyData && (
        <Box>
          <Card sx={{ p: 2, mb: 2.5, borderRadius: 2 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={7}>
                <Typography variant="h5" fontWeight={850}>{selectedPartyData.party.name}</Typography>
                <Typography variant="body2" color="#6B7280">{selectedPartyData.party.town || '-'}</Typography>
              </Grid>
              <Grid item xs={12} md={5} sx={{ textAlign: { xs: 'left', md: 'right' } }}>
                <StatusBadge value={summary.settled === summary.totalReplacements && summary.totalReplacements > 0 ? 'SETTLED' : summary.settlementPending > 0 ? 'PENDING' : 'PENDING'} type="settlement" />
              </Grid>
            </Grid>
          </Card>

          <Grid container spacing={1.25} sx={{ mb: 2.5 }}>
            {summaryCards.map(([label, value]) => (
              <Grid item xs={6} sm={4} md={2} key={label}>
                <Card variant="outlined" sx={{ p: 1.25, borderRadius: 1.5, height: '100%' }}>
                  <Typography variant="caption" color="#6B7280" fontWeight={750}>{label}</Typography>
                  <Typography variant="h6" fontWeight={850} sx={{ lineHeight: 1.25 }}>{value ?? 0}</Typography>
                </Card>
              </Grid>
            ))}
          </Grid>

          <Card sx={{ p: 2, mb: 2.5, borderRadius: 2 }}>
            <Typography variant="subtitle2" fontWeight={850} mb={1.5}>Party Timeline</Typography>
            <Grid container spacing={1}>
              {history.slice(0, 6).map((row) => (
                <Grid item xs={12} md={6} key={row._id}>
                  <Box sx={{ border: '1px solid #E5E7EB', borderRadius: 1.5, p: 1.25 }}>
                    <Typography variant="body2" fontWeight={800}>{row.replacementId}</Typography>
                    <Box sx={{ display: 'flex', gap: 0.6, mt: 1, flexWrap: 'wrap' }}>
                      {timelineSteps.map(([step], index) => (
                        <Chip key={step} label={step} size="small" variant={index <= currentStepIndex(row) ? 'filled' : 'outlined'} sx={{ bgcolor: index <= currentStepIndex(row) ? '#E0F2FE' : 'transparent', color: '#0D1B2A', fontWeight: 650 }} />
                      ))}
                    </Box>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Card>

          <Card sx={{ borderRadius: 2 }}>
            <Box sx={{ p: 2, pb: 0 }}><Typography variant="subtitle1" fontWeight={850}>Replacement History</Typography></Box>
            <TableContainer>
              <Table size="small">
                <TableHead><TableRow><TableCell>Replacement ID</TableCell><TableCell>Received Date</TableCell><TableCell align="right">Received Cases</TableCell><TableCell>Sent Date</TableCell><TableCell align="right">Sent Cases</TableCell><TableCell>Invoice No</TableCell><TableCell>Approval Status</TableCell><TableCell>Settlement Status</TableCell><TableCell align="right">Settlement Amount</TableCell><TableCell>Last Sale Invoice</TableCell><TableCell align="center">Action</TableCell></TableRow></TableHead>
                <TableBody>
                  {summaryLoading ? (
                    <TableRow><TableCell colSpan={11} align="center" sx={{ py: 4 }}><CircularProgress size={28} /></TableCell></TableRow>
                  ) : history.length === 0 ? (
                    <TableRow><TableCell colSpan={11} align="center" sx={{ py: 4, color: '#6B7280' }}>No replacement history found</TableCell></TableRow>
                  ) : history.map((row) => (
                    <TableRow key={row._id} hover>
                      <TableCell sx={{ fontWeight: 750, fontFamily: 'monospace', fontSize: '0.75rem' }}>{row.replacementId}</TableCell>
                      <TableCell>{shortDate(row.receivedDate)}</TableCell>
                      <TableCell align="right">{row.receivedCases || 0}</TableCell>
                      <TableCell>{shortDate(row.sentDate)}</TableCell>
                      <TableCell align="right">{row.sentCases || 0}</TableCell>
                      <TableCell>{row.invoiceNo || '-'}</TableCell>
                      <TableCell><StatusBadge value={row.approvalStatus} /></TableCell>
                      <TableCell><StatusBadge value={row.settlementStatus || 'PENDING'} type="settlement" /></TableCell>
                      <TableCell align="right">{money(row.settlementAmount)}</TableCell>
                      <TableCell>{row.lastSaleInvoiceNo || '-'}</TableCell>
                      <TableCell align="center"><Button size="small" variant="outlined" onClick={() => setDetailId(row._id)}>View</Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination component="div" count={historyPagination.total || 0} page={historyPage} onPageChange={(e, nextPage) => setHistoryPage(nextPage)} rowsPerPage={rowsPerPage} onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setHistoryPage(0); }} rowsPerPageOptions={[10, 20, 50]} />
          </Card>
        </Box>
      )}

      <Dialog open={!!detailId} onClose={() => setDetailId('')} maxWidth="lg" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
        <DialogTitle sx={{ fontWeight: 850 }}>Replacement Overview - {detail?.replacement?.replacementId || ''}</DialogTitle>
        <DialogContent>
          {detailLoading ? <Box sx={{ py: 6, textAlign: 'center' }}><CircularProgress /></Box> : detail && (
            <Box>
              <Card sx={{ p: 2, mb: 2, bgcolor: '#F8FAFC', borderRadius: 2 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={3}><InfoItem label="Replacement ID" value={detail.replacement.replacementId} /></Grid>
                  <Grid item xs={12} md={3}><InfoItem label="Party" value={detail.replacement.party?.name} /></Grid>
                  <Grid item xs={12} md={3}><InfoItem label="Town" value={detail.replacement.party?.town || detail.replacement.town} /></Grid>
                  <Grid item xs={12} md={3}><InfoItem label="Company" value={detail.replacement.company?.name} /></Grid>
                </Grid>
              </Card>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}><Card variant="outlined" sx={{ p: 2, borderRadius: 2, height: '100%' }}><Typography fontWeight={850} mb={1.5}>Receiving Details</Typography><Grid container spacing={1.5}><Grid item xs={6}><InfoItem label="Receiving Date" value={shortDate(detail.receiving.date)} /></Grid><Grid item xs={6}><InfoItem label="Transport" value={detail.receiving.transport?.name} /></Grid><Grid item xs={6}><InfoItem label="Receiving LR" value={detail.receiving.lrNo} /></Grid><Grid item xs={6}><InfoItem label="Received Cases" value={detail.receiving.cases} /></Grid></Grid></Card></Grid>
                <Grid item xs={12} md={6}><Card variant="outlined" sx={{ p: 2, borderRadius: 2, height: '100%' }}><Typography fontWeight={850} mb={1.5}>Dispatch Details</Typography><Grid container spacing={1.5}><Grid item xs={6}><InfoItem label="Sent Date" value={shortDate(detail.dispatch.date)} /></Grid><Grid item xs={6}><InfoItem label="Transport" value={detail.dispatch.transport?.name} /></Grid><Grid item xs={6}><InfoItem label="Sent LR" value={detail.dispatch.lrNo} /></Grid><Grid item xs={6}><InfoItem label="Invoice Number" value={detail.dispatch.invoiceNumber} /></Grid><Grid item xs={6}><InfoItem label="Sent Cases" value={detail.dispatch.cases} /></Grid></Grid></Card></Grid>
                <Grid item xs={12} md={6}><Card variant="outlined" sx={{ p: 2, borderRadius: 2, height: '100%' }}><Typography fontWeight={850} mb={1.5}>Carton Details</Typography>{detail.carton ? <Grid container spacing={1.5}><Grid item xs={6}><InfoItem label="Carton Group" value={detail.carton.cartonNumber} /></Grid><Grid item xs={6}><InfoItem label="Total Cases" value={detail.carton.totalCases} /></Grid><Grid item xs={12}><InfoItem label="Parties Included" value={detail.carton.partiesIncluded?.map((p) => `${p.partyName} (${p.cases})`).join(', ')} /></Grid></Grid> : <Typography variant="body2" color="#6B7280">Unmerged carton</Typography>}</Card></Grid>
                <Grid item xs={12} md={6}><Card variant="outlined" sx={{ p: 2, borderRadius: 2, height: '100%' }}><Typography fontWeight={850} mb={1.5}>Company Approval</Typography><Grid container spacing={1.5}><Grid item xs={6}><InfoItem label="Approval Status" value={detail.approval.status} /></Grid><Grid item xs={6}><InfoItem label="Approval Type" value={detail.approval.type} /></Grid><Grid item xs={6}><InfoItem label="Approved Date" value={shortDate(detail.approval.date)} /></Grid><Grid item xs={6}><InfoItem label="Approved Amount" value={money(detail.approval.amount)} /></Grid><Grid item xs={6}><InfoItem label="Company RL Number" value={detail.approval.companyRLNo} /></Grid><Grid item xs={6}><InfoItem label="CN Number" value={detail.approval.cnNo} /></Grid><Grid item xs={12}><InfoItem label="Approval Remark" value={detail.approval.remark} /></Grid></Grid></Card></Grid>
                <Grid item xs={12} md={6}><Card variant="outlined" sx={{ p: 2, borderRadius: 2, height: '100%' }}><Typography fontWeight={850} mb={1.5}>Settlement</Typography><Grid container spacing={1.5}><Grid item xs={6}><InfoItem label="Settlement Status" value={detail.settlement?.settlementStatus || 'PENDING'} /></Grid><Grid item xs={6}><InfoItem label="Settlement ID" value={detail.settlement?.settlementNo} /></Grid><Grid item xs={6}><InfoItem label="Settlement Date" value={shortDate(detail.settlement?.settlementDate || detail.settlement?.completedAt)} /></Grid><Grid item xs={6}><InfoItem label="Last Sale Invoice Number" value={detail.settlement?.lastSaleInvoiceNo} /></Grid><Grid item xs={4}><InfoItem label="Approved Value" value={money(detail.settlement?.approvedValue)} /></Grid><Grid item xs={4}><InfoItem label="Sent Value" value={money(detail.settlement?.sentValue)} /></Grid><Grid item xs={4}><InfoItem label="Difference" value={money(detail.settlement?.difference)} /></Grid></Grid></Card></Grid>
                <Grid item xs={12} md={6}><Card variant="outlined" sx={{ p: 2, borderRadius: 2, height: '100%' }}><Typography fontWeight={850} mb={1.5}>Documents</Typography><Grid container spacing={1.5}><Grid item xs={12} sm={6}><DocumentButtons label="Replacement Invoice PDF" urls={[detail.documents.replacementInvoicePdf]} /></Grid><Grid item xs={12} sm={6}><DocumentButtons label="Approval Document" urls={detail.documents.approvalDocuments || []} /></Grid><Grid item xs={12} sm={6}><DocumentButtons label="Settlement PDF" urls={[detail.documents.settlementPdf]} /></Grid><Grid item xs={12} sm={6}><DocumentButtons label="LR Document" urls={detail.documents.lrDocuments || []} /></Grid><Grid item xs={12}><DocumentButtons label="Uploaded Images" urls={detail.documents.uploadedImages || []} /></Grid></Grid></Card></Grid>
              </Grid>
              <Card variant="outlined" sx={{ p: 2, mt: 2, borderRadius: 2 }}>
                <Typography fontWeight={850} mb={1.5}>Approved vs Sent Products</Typography>
                <Table size="small"><TableHead><TableRow><TableCell>Approved Product</TableCell><TableCell align="right">Approved Qty</TableCell><TableCell>Sent Product</TableCell><TableCell align="right">MRP</TableCell><TableCell align="right">Sent Qty</TableCell><TableCell align="right">Value</TableCell><TableCell>Status</TableCell></TableRow></TableHead><TableBody>{detail.settlement?.matchDetails?.length ? detail.settlement.matchDetails.map((row, index) => <TableRow key={index}><TableCell>{row.approvedProduct || '-'}</TableCell><TableCell align="right">{row.approvedQty || 0}</TableCell><TableCell>{row.sentProduct || '-'}</TableCell><TableCell align="right">-</TableCell><TableCell align="right">{row.sentQty || 0}</TableCell><TableCell align="right">{money(row.sentValue)}</TableCell><TableCell><StatusBadge value={row.matchStatus} type="settlement" /></TableCell></TableRow>) : <TableRow><TableCell colSpan={7} align="center">No product matching rows</TableCell></TableRow>}</TableBody></Table>
              </Card>
              <Card variant="outlined" sx={{ p: 2, mt: 2, borderRadius: 2 }}>
                <Typography fontWeight={850} mb={1.5}>Audit History</Typography>
                <Table size="small"><TableHead><TableRow><TableCell>Date</TableCell><TableCell>User</TableCell><TableCell>Action</TableCell><TableCell>Description</TableCell></TableRow></TableHead><TableBody>{detail.audit?.length ? detail.audit.map((row) => <TableRow key={row._id}><TableCell>{shortDate(row.createdAt)}</TableCell><TableCell>{row.username}</TableCell><TableCell>{row.action}</TableCell><TableCell>{row.description}</TableCell></TableRow>) : <TableRow><TableCell colSpan={4} align="center">No audit history found</TableCell></TableRow>}</TableBody></Table>
              </Card>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}><Button variant="outlined" onClick={() => setDetailId('')}>Close</Button></DialogActions>
      </Dialog>
    </Box>
  );
};

const ReplacementWorkflowList = () => {
  const queryClient = useQueryClient();
  const { isAdmin, isOperator, isSuperAdmin } = useAuth();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [search, setSearch] = useState('');
  const [searchDebounce, setSearchDebounce] = useState('');
  const [filters, setFilters] = useState({});
  const [createDialog, setCreateDialog] = useState(false);
  const [dispatchDialog, setDispatchDialog] = useState(null);
  const [approvalDialog, setApprovalDialog] = useState(null);
  const [viewDialog, setViewDialog] = useState(null);
  const [approvalMode, setApprovalMode] = useState('Amount');
  const [approvalProducts, setApprovalProducts] = useState([emptyApprovalProduct()]);

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    clearTimeout(window._repSearchTimeout);
    window._repSearchTimeout = setTimeout(() => {
      setSearchDebounce(e.target.value);
      setPage(0);
    }, 400);
  };

  const { data, isLoading } = useQuery({
    queryKey: ['replacements', page + 1, rowsPerPage, searchDebounce, filters],
    queryFn: () => replacementService.getReplacements({
      page: page + 1, limit: rowsPerPage, search: searchDebounce, ...filters,
    }),
  });

  const { data: companiesData } = useQuery({ queryKey: ['companies-all'], queryFn: () => companyService.getAllCompanies() });
  const { data: partiesData } = useQuery({ queryKey: ['parties-all'], queryFn: () => partyService.getAllParties() });
  const { data: transportsData } = useQuery({ queryKey: ['transports-all'], queryFn: () => transportService.getAllTransports() });

  const replacements = data?.data || [];
  const pagination = data?.pagination || { total: 0 };
  const companies = companiesData?.data || [];
  const parties = partiesData?.data || [];
  const transports = transportsData?.data || [];

  // Create form
  const { control: createControl, handleSubmit: handleCreate, reset: resetCreate, formState: { errors: createErrors } } = useForm();
  const { control: dispatchControl, handleSubmit: handleDispatch, reset: resetDispatch } = useForm();
  const { control: approvalControl, handleSubmit: handleApproval, reset: resetApproval } = useForm();

  const createMutation = useMutation({
    mutationFn: replacementService.createReplacement,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['replacements'] }); toast.success('Replacement created'); setCreateDialog(false); resetCreate(); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const dispatchMutation = useMutation({
    mutationFn: ({ id, data }) => replacementService.updateDispatch(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['replacements'] }); toast.success('Dispatch updated'); setDispatchDialog(null); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const approvalMutation = useMutation({
    mutationFn: ({ id, data }) => replacementService.updateApproval(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['replacements'] }); toast.success('Approval updated'); setApprovalDialog(null); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const unlockDispatchMutation = useMutation({
    mutationFn: (id) => replacementService.unlockDispatch(id, { reason: 'Correction required' }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['replacements'] }); toast.success('Dispatch unlocked'); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const onCreateSubmit = (formData) => {
    const fd = new FormData();
    Object.entries(formData).forEach(([k, v]) => { if (v !== undefined && v !== '') fd.append(k, v); });
    createMutation.mutate(fd);
  };

  const onDispatchSubmit = (formData) => {
    const fd = new FormData();
    Object.entries(formData).forEach(([k, v]) => { if (v !== undefined && v !== '') fd.append(k, v); });
    dispatchMutation.mutate({ id: dispatchDialog._id, data: fd });
  };

  const onApprovalSubmit = (formData) => {
    const fd = new FormData();
    Object.entries(formData).forEach(([k, v]) => { if (v !== undefined && v !== '') fd.append(k, v); });
    fd.set('approvalType', approvalMode);
    if (approvalMode === 'Product') {
      const productRows = approvalProducts.map((product) => {
        const value = approvalProductValue(product);
        const mrp = approvalProductMrp(product.mrp);
        return {
          productId: product.productId,
          productName: product.productName,
          productNameSnapshot: product.productNameSnapshot,
          sku: product.sku,
          productCode: product.productCode,
          mrp,
          mrpSnapshot: approvalProductMrp(product.mrpSnapshot || product.mrp),
          masterMrpSnapshot: approvalProductMrp(product.masterMrpSnapshot),
          quantity: approvalProductQuantity(product),
          value,
          calculatedValue: value,
          totalValue: value,
          calculationMode: normalizeCalculationMode(product.calculationMode),
          status: product.status || 'Approved',
        };
      });
      fd.set('approvalAmount', String(productRows.reduce((sum, product) => sum + Number(product.totalValue || 0), 0)));
      fd.set('approvalProducts', JSON.stringify(productRows));
    }
    approvalMutation.mutate({ id: approvalDialog._id, data: fd });
  };

  const updateApprovalProduct = (index, patch, mode) => {
    setApprovalProducts((rows) => rows.map((row, i) => {
      if (i !== index) return row;
      const next = typeof patch === 'function' ? patch(row) : { ...row, ...patch };
      return recalculateApprovalProduct(next, mode || next.calculationMode);
    }));
  };

  const updateApprovalMrp = (index, value) => {
    updateApprovalProduct(index, { mrp: value, mrpSnapshot: value });
  };

  const updateApprovalQuantity = (index, value) => {
    updateApprovalProduct(index, { quantity: value }, CALCULATION_MODE.QTY);
  };

  const updateApprovalValue = (index, value) => {
    updateApprovalProduct(index, { value }, CALCULATION_MODE.VALUE);
  };

  const finalizeApprovalQuantity = (index) => {
    updateApprovalProduct(index, (row) => ({
      ...row,
      quantity: formatQuantityInput(row.quantity),
    }), CALCULATION_MODE.QTY);
  };

  const finalizeApprovalValue = (index) => {
    updateApprovalProduct(index, (row) => ({
      ...row,
      value: formatValueInput(row.value),
    }), CALCULATION_MODE.VALUE);
  };

  const selectApprovalProduct = (index, selectedProduct) => {
    setApprovalProducts((rows) => rows.map((row, i) => {
      if (i !== index) return row;
      if (!selectedProduct) return { ...row, productId: '', productName: '', productNameSnapshot: '', sku: '', productCode: '' };

      const productName = selectedProduct.productName || selectedProduct.name || '';
      const currentMrp = row.mrp !== undefined && row.mrp !== '' ? row.mrp : selectedProduct.mrp || '';
      const nextRow = {
        ...row,
        productId: selectedProduct.productId || selectedProduct._id,
        productName,
        productNameSnapshot: productName,
        sku: selectedProduct.sku || '',
        productCode: selectedProduct.productCode || selectedProduct.code || '',
        mrp: currentMrp,
        mrpSnapshot: currentMrp,
        masterMrpSnapshot: selectedProduct.mrp || 0,
        status: row.status || 'Approved',
      };
      return recalculateApprovalProduct(nextRow, row.calculationMode);
    }));
  };

  const openDispatchDialog = (rep) => {
    setDispatchDialog(rep);
    resetDispatch({
      sentDate: rep.sentDate ? format(new Date(rep.sentDate), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
      dispatchTransport: rep.dispatchTransport?._id || '',
      dispatchLRNo: rep.dispatchLRNo || '',
      dispatchCases: rep.dispatchCases || rep.receivingCases,
      dispatchCartons: rep.dispatchCartons || rep.receivingCartons,
      dispatchRemarks: rep.dispatchRemarks || '',
    });
  };

  const openApprovalDialog = (rep) => {
    setApprovalDialog(rep);
    setApprovalMode(rep.approvalType || 'Amount');
    setApprovalProducts(rep.approvalProducts?.length
      ? rep.approvalProducts.map(approvalProductForEditing)
      : [emptyApprovalProduct()]);
    resetApproval({
      approvalType: rep.approvalType || 'Amount',
      approvalStatus: rep.approvalStatus || 'Pending',
      approvalAmount: rep.approvalAmount || 0,
      approvedCases: rep.approvedCases || 0,
      rejectedCases: rep.rejectedCases || 0,
      approvalDate: rep.approvalDate ? format(new Date(rep.approvalDate), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
      companyReference: rep.companyReference || '',
      companyRLNo: rep.companyRLNo || rep.companyReference || '',
      cnNo: rep.cnNo || '',
      approvalRemark: rep.approvalRemark || '',
    });
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={700} color="#0D1B2A">Replacements</Typography>
          <Typography variant="body2" color="#8A9AAA" mt={0.5}>Track all FMCG product replacements</Typography>
        </Box>
        {isOperator() && (
          <Button variant="contained" startIcon={<AddIcon />}
            onClick={() => { setCreateDialog(true); resetCreate({ receivingDate: format(new Date(), 'yyyy-MM-dd') }); }}>
            New Replacement
          </Button>
        )}
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 2.5, p: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField fullWidth placeholder="Search by ID, town, LR..." value={search} onChange={handleSearchChange} size="small"
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: '#8A9AAA' }} /></InputAdornment> }}
            />
          </Grid>
          <Grid item xs={6} md={2}>
            <SearchableDropdown
              label="Company"
              value={filters.company}
              onChange={(v) => setFilters(f => ({ ...f, company: v || undefined }))}
              options={companies}
            />
          </Grid>
          <Grid item xs={6} md={2}>
            <TextField select fullWidth size="small" label="Approval" value={filters.approvalStatus || ''}
              onChange={(e) => setFilters(f => ({ ...f, approvalStatus: e.target.value || undefined }))}>
              <MenuItem value="">All</MenuItem>
              <MenuItem value="Pending">Pending</MenuItem>
              <MenuItem value="Approved">Approved</MenuItem>
              <MenuItem value="Rejected">Rejected</MenuItem>
              <MenuItem value="Partial">Partial</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={6} md={2}>
            <TextField select fullWidth size="small" label="Dispatch" value={filters.dispatchStatus || ''}
              onChange={(e) => setFilters(f => ({ ...f, dispatchStatus: e.target.value || undefined }))}>
              <MenuItem value="">All</MenuItem>
              <MenuItem value="pending">Not Dispatched</MenuItem>
              <MenuItem value="dispatched">Dispatched</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={6} md={2}>
            <TextField select fullWidth size="small" label="Invoice" value={filters.invoiceStatus || ''}
              onChange={(e) => setFilters(f => ({ ...f, invoiceStatus: e.target.value || undefined }))}>
              <MenuItem value="">All</MenuItem>
              <MenuItem value="pending">No Invoice</MenuItem>
              <MenuItem value="generated">Invoice Generated</MenuItem>
            </TextField>
          </Grid>
        </Grid>
      </Card>

      {/* Table */}
      <Card>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Company</TableCell>
                <TableCell>Party</TableCell>
                <TableCell>Town</TableCell>
                <TableCell>Rcv Date</TableCell>
                <TableCell align="center">Cases</TableCell>
                <TableCell>Approval</TableCell>
                <TableCell>Dispatch</TableCell>
                <TableCell>Invoice</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={10} align="center" sx={{ py: 6 }}><CircularProgress size={32} /></TableCell></TableRow>
              ) : replacements.length === 0 ? (
                <TableRow><TableCell colSpan={10} align="center" sx={{ py: 6, color: '#8A9AAA' }}>No replacements found</TableCell></TableRow>
              ) : (
                replacements.map((r) => (
                  <TableRow key={r._id} hover>
                    <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', fontFamily: 'monospace' }}>{r.replacementId}</TableCell>
                    <TableCell sx={{ fontSize: '0.8125rem' }}>{r.company?.name || '—'}</TableCell>
                    <TableCell sx={{ fontWeight: 500 }}>
                      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.6 }}>
                        <span>{r.party?.name || '—'}</span>
                        {r.settlementStatus === 'SETTLED' && (
                          <Tooltip title="Settlement Completed">
                            <span className="settlement-complete-icon" style={{ color: '#16A34A', fontSize: 14, fontWeight: 800, lineHeight: 1 }}>✓</span>
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.8125rem' }}>{r.town || '—'}</TableCell>
                    <TableCell sx={{ fontSize: '0.8125rem' }}>{r.receivingDate ? format(new Date(r.receivingDate), 'dd/MM/yy') : '—'}</TableCell>
                    <TableCell align="center">
                      <Chip label={r.receivingCases} size="small" sx={{ fontWeight: 700, bgcolor: '#F0F0F0' }} />
                    </TableCell>
                    <TableCell>
                      <Chip label={r.approvalStatus} size="small"
                        sx={{ fontWeight: 600, bgcolor: statusColors[r.approvalStatus]?.bg, color: statusColors[r.approvalStatus]?.color }}
                      />
                    </TableCell>
                    <TableCell>
                      {r.sentDate ? (
                        <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                          <Chip label={format(new Date(r.sentDate), 'dd/MM/yy')} size="small" color="success" variant="outlined" />
                          {r.isDispatchLocked && <Tooltip title="Dispatch locked after company approval"><LockIcon sx={{ fontSize: 16, color: '#B45309' }} /></Tooltip>}
                        </Box>
                      ) : (
                        <Chip label="Pending" size="small" variant="outlined" sx={{ color: '#D97706', borderColor: '#D97706' }} />
                      )}
                    </TableCell>
                    <TableCell>
                      {r.invoiceNumber ? (
                        <Chip label={r.invoiceNumber} size="small" sx={{ fontWeight: 600, bgcolor: '#DBEAFE', color: '#1F4E79', fontSize: '0.7rem' }} />
                      ) : (
                        <Typography variant="caption" color="#AAA">—</Typography>
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', gap: 0.3, justifyContent: 'center' }}>
                        <Tooltip title="View Details">
                          <IconButton size="small" onClick={() => setViewDialog(r)}>
                            <ViewIcon fontSize="small" sx={{ color: '#1F4E79' }} />
                          </IconButton>
                        </Tooltip>
                        {isOperator() && (!r.isDispatchLocked || isSuperAdmin()) && (
                          <Tooltip title={r.isDispatchLocked ? 'Dispatch correction' : 'Dispatch'}>
                            <IconButton size="small" onClick={() => openDispatchDialog(r)}>
                              <DispatchIcon fontSize="small" sx={{ color: '#7C3AED' }} />
                            </IconButton>
                          </Tooltip>
                        )}
                        {isSuperAdmin() && r.isDispatchLocked && (
                          <Tooltip title="Unlock Dispatch">
                            <IconButton size="small" onClick={() => unlockDispatchMutation.mutate(r._id)}>
                              <UnlockIcon fontSize="small" sx={{ color: '#B45309' }} />
                            </IconButton>
                          </Tooltip>
                        )}
                        {isAdmin() && (
                          <Tooltip title="Approval">
                            <IconButton size="small" onClick={() => openApprovalDialog(r)}>
                              <ApproveIcon fontSize="small" sx={{ color: '#059669' }} />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
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

      {/* Create Dialog */}
      <Dialog open={createDialog} onClose={() => setCreateDialog(false)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>New Replacement Entry</DialogTitle>
        <form onSubmit={handleCreate(onCreateSubmit)}>
          <DialogContent>
            <Grid container spacing={2.5}>
              <Grid item xs={12} sm={6}>
                <Controller name="company" control={createControl} rules={{ required: 'Company is required' }}
                  render={({ field }) => (
                    <SearchableDropdown
                      label="Company *"
                      value={field.value}
                      onChange={field.onChange}
                      options={companies}
                      error={!!createErrors.company}
                      helperText={createErrors.company?.message}
                    />
                  )} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller name="party" control={createControl} rules={{ required: 'Party is required' }}
                  render={({ field }) => (
                    <SearchableDropdown
                      label="Party *"
                      value={field.value}
                      onChange={field.onChange}
                      options={parties}
                      getOptionLabel={(option) => `${option.name} — ${option.town}`}
                      error={!!createErrors.party}
                      helperText={createErrors.party?.message}
                    />
                  )} />
              </Grid>
              <Grid item xs={12} sm={4}>
                <Controller name="receivingDate" control={createControl} rules={{ required: 'Date is required' }}
                  render={({ field }) => <TextField {...field} fullWidth label="Receiving Date *" type="date" InputLabelProps={{ shrink: true }} error={!!createErrors.receivingDate} />} />
              </Grid>
              <Grid item xs={12} sm={4}>
                <Controller name="receivingTransport" control={createControl}
                  render={({ field }) => (
                    <SearchableDropdown
                      label="Receiving Transport"
                      value={field.value}
                      onChange={field.onChange}
                      options={transports}
                    />
                  )} />
              </Grid>
              <Grid item xs={12} sm={4}>
                <Controller name="receivingLRNo" control={createControl}
                  render={({ field }) => <TextField {...field} fullWidth label="LR Number" />} />
              </Grid>
              <Grid item xs={6} sm={3}>
                <Controller name="receivingCases" control={createControl}
                  render={({ field }) => <TextField {...field} fullWidth label="Cases" type="number" InputProps={{ inputProps: { min: 0 } }} />} />
              </Grid>
              <Grid item xs={6} sm={3}>
                <Controller name="receivingCartons" control={createControl}
                  render={({ field }) => <TextField {...field} fullWidth label="Cartons" type="number" InputProps={{ inputProps: { min: 0 } }} />} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller name="receivingRemarks" control={createControl}
                  render={({ field }) => <TextField {...field} fullWidth label="Remarks" multiline rows={2} />} />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5 }}>
            <Button onClick={() => setCreateDialog(false)} variant="outlined" sx={{ borderRadius: 2 }}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={createMutation.isPending} sx={{ borderRadius: 2 }}>
              {createMutation.isPending ? <CircularProgress size={20} /> : 'Create'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Dispatch Dialog */}
      <Dialog open={!!dispatchDialog} onClose={() => setDispatchDialog(null)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>Update Dispatch — {dispatchDialog?.replacementId}</DialogTitle>
        <form onSubmit={handleDispatch(onDispatchSubmit)}>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Controller name="sentDate" control={dispatchControl}
                  render={({ field }) => <TextField {...field} fullWidth label="Sent Date" type="date" InputLabelProps={{ shrink: true }} />} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller name="dispatchTransport" control={dispatchControl}
                  render={({ field }) => (
                    <SearchableDropdown
                      label="Transport"
                      value={field.value}
                      onChange={field.onChange}
                      options={transports}
                    />
                  )} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller name="dispatchLRNo" control={dispatchControl}
                  render={({ field }) => <TextField {...field} fullWidth label="LR Number" />} />
              </Grid>
              <Grid item xs={6} sm={3}>
                <Controller name="dispatchCases" control={dispatchControl}
                  render={({ field }) => <TextField {...field} fullWidth label="Cases" type="number" />} />
              </Grid>
              <Grid item xs={6} sm={3}>
                <Controller name="dispatchCartons" control={dispatchControl}
                  render={({ field }) => <TextField {...field} fullWidth label="Cartons" type="number" />} />
              </Grid>
              <Grid item xs={12}>
                <Controller name="dispatchRemarks" control={dispatchControl}
                  render={({ field }) => <TextField {...field} fullWidth label="Dispatch Remarks" multiline rows={2} />} />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5 }}>
            <Button onClick={() => setDispatchDialog(null)} variant="outlined">Cancel</Button>
            <Button type="submit" variant="contained" color="info" disabled={dispatchMutation.isPending}>
              {dispatchMutation.isPending ? <CircularProgress size={20} /> : 'Update Dispatch'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Approval Dialog */}
      <Dialog
        open={!!approvalDialog}
        onClose={() => setApprovalDialog(null)}
        fullWidth
        maxWidth={false}
        PaperProps={{
          sx: {
            borderRadius: 3,
            width: '90vw',
            maxWidth: 1400,
            maxHeight: '90vh',
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Update Approval — {approvalDialog?.replacementId}</DialogTitle>
        <form onSubmit={handleApproval(onApprovalSubmit)}>
          <DialogContent sx={{ overflowY: 'auto' }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Controller name="approvalStatus" control={approvalControl}
                  render={({ field }) => (
                    <TextField {...field} fullWidth select label="Approval Status">
                      <MenuItem value="Pending">Pending</MenuItem>
                      <MenuItem value="Approved">Approved</MenuItem>
                      <MenuItem value="Rejected">Rejected</MenuItem>
                      <MenuItem value="Partial">Partial</MenuItem>
                    </TextField>
                  )} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller name="approvalDate" control={approvalControl}
                  render={({ field }) => <TextField {...field} fullWidth label="Approval Date" type="date" InputLabelProps={{ shrink: true }} />} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller name="approvalType" control={approvalControl}
                  render={({ field }) => (
                    <TextField {...field} fullWidth select label="Approval Type" value={approvalMode}
                      onChange={(e) => { field.onChange(e); setApprovalMode(e.target.value); }}>
                      <MenuItem value="Amount">Amount</MenuItem>
                      <MenuItem value="Product">Product</MenuItem>
                    </TextField>
                  )} />
              </Grid>
              {approvalMode === 'Amount' && (
                <Grid item xs={6} sm={4}>
                  <Controller name="approvalAmount" control={approvalControl}
                    render={({ field }) => <TextField {...field} fullWidth label="Amount" type="number" />} />
                </Grid>
              )}
              {approvalMode === 'Product' && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" fontWeight={700} mb={1}>Approved Products</Typography>
                  {approvalProducts.map((product, index) => (
                      <Grid container spacing={1} key={index} sx={{ mb: 1, alignItems: 'center' }}>
                        <Grid item xs={12} md={4}>
                          <SearchableProductDropdown
                            label="Product"
                            placeholder="Search Product Master..."
                            value={product.productId}
                            selectedProduct={product}
                            companyId={approvalDialog?.company?._id || approvalDialog?.company}
                            onChange={(selectedProduct) => selectApprovalProduct(index, selectedProduct)}
                            required
                          />
                        </Grid>
                        <Grid item xs={6} sm={3} md={1.4}><TextField fullWidth size="small" label="MRP" type="number" value={product.mrp} onChange={(e) => updateApprovalMrp(index, e.target.value)} inputProps={{ min: 0, step: '0.01' }} /></Grid>
                        <Grid item xs={6} sm={3} md={1.4}><TextField fullWidth size="small" label="Quantity" type="number" value={product.quantity} onChange={(e) => updateApprovalQuantity(index, e.target.value)} onBlur={() => finalizeApprovalQuantity(index)} inputProps={{ min: 0, step: '0.0001' }} /></Grid>
                        <Grid item xs={6} sm={3} md={1.6}><TextField fullWidth size="small" label="Value" type="number" value={product.value} onChange={(e) => updateApprovalValue(index, e.target.value)} onBlur={() => finalizeApprovalValue(index)} inputProps={{ min: 0, step: '0.01' }} /></Grid>
                        <Grid item xs={6} sm={3} md={1.7}>
                          <TextField select fullWidth size="small" label="Status" value={product.status || 'Approved'} onChange={(e) => updateApprovalProduct(index, { status: e.target.value })}>
                            <MenuItem value="Approved">Approved</MenuItem>
                            <MenuItem value="Rejected">Rejected</MenuItem>
                            <MenuItem value="Pending">Pending</MenuItem>
                          </TextField>
                        </Grid>
                        <Grid item xs={12} md={1.4}><Button fullWidth color="error" onClick={() => setApprovalProducts((rows) => rows.length === 1 ? rows : rows.filter((_, i) => i !== index))}>Remove</Button></Grid>
                      </Grid>
                  ))}
                  <Button size="small" startIcon={<AddIcon />} onClick={() => setApprovalProducts((rows) => [...rows, emptyApprovalProduct()])}>Add Product</Button>
                  <Typography variant="body2" fontWeight={700} mt={1}>Total Product Approval Value: {money(approvalProducts.reduce((sum, product) => sum + approvalProductValue(product), 0))}</Typography>
                </Grid>
              )}
              <Grid item xs={6} sm={4}>
                <Controller name="approvedCases" control={approvalControl}
                  render={({ field }) => <TextField {...field} fullWidth label="Approved Cases" type="number" />} />
              </Grid>
              <Grid item xs={6} sm={4}>
                <Controller name="rejectedCases" control={approvalControl}
                  render={({ field }) => <TextField {...field} fullWidth label="Rejected Cases" type="number" />} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller name="companyRLNo" control={approvalControl}
                  render={({ field }) => <TextField {...field} fullWidth label="Company RL Number" />} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller name="cnNo" control={approvalControl}
                  render={({ field }) => <TextField {...field} fullWidth label="CN Number (Optional)" />} />
              </Grid>
              <Grid item xs={12}>
                <Controller name="approvalRemark" control={approvalControl}
                  render={({ field }) => <TextField {...field} fullWidth label="Approval Remark" multiline rows={2} />} />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5 }}>
            <Button onClick={() => setApprovalDialog(null)} variant="outlined">Cancel</Button>
            <Button type="submit" variant="contained" color="success" disabled={approvalMutation.isPending}>
              {approvalMutation.isPending ? <CircularProgress size={20} /> : 'Update Approval'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={!!viewDialog} onClose={() => setViewDialog(null)} maxWidth="lg" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>Replacement Details — {viewDialog?.replacementId}</DialogTitle>
        <DialogContent>
          {viewDialog && (
            <Box>
              <Card sx={{ p: 2, mb: 2, bgcolor: '#F8FAFC', borderRadius: 2 }}>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} md={3}><Typography variant="h6" fontWeight={800}>{viewDialog.party?.name}</Typography><Typography variant="body2" color="#8A9AAA">{viewDialog.town}</Typography></Grid>
                  <Grid item xs={6} md={2}><Typography variant="caption" color="#8A9AAA">Replacement ID</Typography><Typography fontWeight={700}>{viewDialog.replacementId}</Typography></Grid>
                  <Grid item xs={6} md={2}><Typography variant="caption" color="#8A9AAA">Company</Typography><Typography fontWeight={700}>{viewDialog.company?.name}</Typography></Grid>
                  <Grid item xs={6} md={2}><Typography variant="caption" color="#8A9AAA">Status</Typography><Box><Chip label={viewDialog.approvalStatus} size="small" sx={{ fontWeight: 700, bgcolor: statusColors[viewDialog.approvalStatus]?.bg, color: statusColors[viewDialog.approvalStatus]?.color }} /></Box></Grid>
                  <Grid item xs={6} md={2}><Typography variant="caption" color="#8A9AAA">Dispatch Lock</Typography><Typography fontWeight={700}>{viewDialog.isDispatchLocked ? 'Locked' : 'Open'}</Typography></Grid>
                </Grid>
              </Card>
              <Card variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2 }}>
                <Grid container spacing={1}>
                  {['REPLACEMENT RECEIVED', 'DISPATCHED', 'COMPANY APPROVED', 'SETTLEMENT', 'SETTLED'].map((step, index) => (
                    <Grid item xs={12} sm={2.4} key={step}>
                      <Box sx={{ p: 1.1, textAlign: 'center', borderRadius: 1, bgcolor: index === 0 || (index === 1 && viewDialog.sentDate) || (index === 2 && viewDialog.approvalStatus === 'Approved') ? '#E0F2FE' : '#F3F4F6', fontWeight: 800, fontSize: '0.72rem' }}>{step}</Box>
                    </Grid>
                  ))}
                </Grid>
              </Card>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Card variant="outlined" sx={{ p: 2, borderRadius: 2, height: '100%' }}>
                    <Typography variant="subtitle2" fontWeight={800} color="#1F4E79" mb={1.5}>Party Information</Typography>
                    <Grid container spacing={1.5}>
                      <Grid item xs={6}><Typography variant="caption" color="#8A9AAA">Party</Typography><Typography fontWeight={600}>{viewDialog.party?.name || '-'}</Typography></Grid>
                      <Grid item xs={6}><Typography variant="caption" color="#8A9AAA">Town</Typography><Typography fontWeight={600}>{viewDialog.town || '-'}</Typography></Grid>
                      <Grid item xs={6}><Typography variant="caption" color="#8A9AAA">GST</Typography><Typography>{viewDialog.party?.gst || '-'}</Typography></Grid>
                      <Grid item xs={6}><Typography variant="caption" color="#8A9AAA">Mobile</Typography><Typography>{viewDialog.party?.mobile || '-'}</Typography></Grid>
                    </Grid>
                  </Card>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Card variant="outlined" sx={{ p: 2, borderRadius: 2, height: '100%' }}>
                    <Typography variant="subtitle2" fontWeight={800} color="#1F4E79" mb={1.5}>Replacement Received</Typography>
                    <Grid container spacing={1.5}>
                      <Grid item xs={6}><Typography variant="caption" color="#8A9AAA">Receiving Date</Typography><Typography>{viewDialog.receivingDate ? format(new Date(viewDialog.receivingDate), 'dd MMM yyyy') : '-'}</Typography></Grid>
                      <Grid item xs={6}><Typography variant="caption" color="#8A9AAA">Transport</Typography><Typography>{viewDialog.receivingTransport?.name || '-'}</Typography></Grid>
                      <Grid item xs={6}><Typography variant="caption" color="#8A9AAA">Receiving LR</Typography><Typography>{viewDialog.receivingLRNo || '-'}</Typography></Grid>
                      <Grid item xs={6}><Typography variant="caption" color="#8A9AAA">Received Cases</Typography><Typography fontWeight={800}>{viewDialog.receivingCases}</Typography></Grid>
                    </Grid>
                  </Card>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Card variant="outlined" sx={{ p: 2, borderRadius: 2, height: '100%' }}>
                    <Typography variant="subtitle2" fontWeight={800} color="#7C3AED" mb={1.5}>Dispatch</Typography>
                    <Grid container spacing={1.5}>
                      <Grid item xs={6}><Typography variant="caption" color="#8A9AAA">Sent Date</Typography><Typography>{viewDialog.sentDate ? format(new Date(viewDialog.sentDate), 'dd MMM yyyy') : '-'}</Typography></Grid>
                      <Grid item xs={6}><Typography variant="caption" color="#8A9AAA">Transport</Typography><Typography>{viewDialog.dispatchTransport?.name || '-'}</Typography></Grid>
                      <Grid item xs={6}><Typography variant="caption" color="#8A9AAA">Sent LR</Typography><Typography>{viewDialog.dispatchLRNo || '-'}</Typography></Grid>
                      <Grid item xs={6}><Typography variant="caption" color="#8A9AAA">Invoice No</Typography><Typography fontWeight={700}>{viewDialog.invoiceNumber || '-'}</Typography></Grid>
                      <Grid item xs={6}><Typography variant="caption" color="#8A9AAA">Sent Cases</Typography><Typography>{viewDialog.dispatchCases || '-'}</Typography></Grid>
                      <Grid item xs={6}><Typography variant="caption" color="#8A9AAA">Cartons</Typography><Typography>{viewDialog.dispatchCartons || '-'}</Typography></Grid>
                    </Grid>
                  </Card>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Card variant="outlined" sx={{ p: 2, borderRadius: 2, height: '100%' }}>
                    <Typography variant="subtitle2" fontWeight={800} color="#059669" mb={1.5}>Company Approval</Typography>
                    <Grid container spacing={1.5}>
                      <Grid item xs={6}><Typography variant="caption" color="#8A9AAA">Approval Type</Typography><Typography fontWeight={700}>{viewDialog.approvalType}</Typography></Grid>
                      <Grid item xs={6}><Typography variant="caption" color="#8A9AAA">Approved Value</Typography><Typography fontWeight={800}>Rs. {viewDialog.approvalType === 'Product' ? (viewDialog.totalProductApprovalValue || viewDialog.approvalAmount || 0) : (viewDialog.approvalAmount || 0)}</Typography></Grid>
                      <Grid item xs={6}><Typography variant="caption" color="#8A9AAA">Approval Date</Typography><Typography>{viewDialog.approvalDate ? format(new Date(viewDialog.approvalDate), 'dd MMM yyyy') : '-'}</Typography></Grid>
                      <Grid item xs={6}><Typography variant="caption" color="#8A9AAA">Company RL No</Typography><Typography>{viewDialog.companyRLNo || viewDialog.companyReference || '-'}</Typography></Grid>
                      <Grid item xs={6}><Typography variant="caption" color="#8A9AAA">CN No</Typography><Typography>{viewDialog.cnNo || '-'}</Typography></Grid>
                      <Grid item xs={12}><Typography variant="caption" color="#8A9AAA">Approval Remark</Typography><Typography>{viewDialog.approvalRemark || '-'}</Typography></Grid>
                    </Grid>
                  </Card>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setViewDialog(null)} variant="outlined">Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

const ReplacementList = () => {
  const location = useLocation();
  return location.pathname === '/search' ? <PartyReplacementSearch /> : <ReplacementWorkflowList />;
};

export default ReplacementList;

