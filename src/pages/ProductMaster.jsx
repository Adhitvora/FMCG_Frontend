import { useCallback, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Button, Card, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, Grid, IconButton, InputAdornment, MenuItem, Table, TableBody,
  TableCell, TableContainer, TableHead, TablePagination, TableRow, TextField,
  Tooltip, Typography,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Edit as EditIcon,
  FileUpload as ImportIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import { productService } from '../services/product.service';
import { companyService } from '../services/company.service';
import SearchableDropdown from '../components/SearchableDropdown';
import { useAuth } from '../context/AuthContext';

const emptyForm = () => ({
  name: '',
  productCode: '',
  sku: '',
  mrp: '',
  companyId: '',
  status: 'active',
});

const ProductMaster = () => {
  const queryClient = useQueryClient();
  const { isSuperAdmin } = useAuth();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [search, setSearch] = useState('');
  const [searchDebounce, setSearchDebounce] = useState('');
  const [filterCompanyId, setFilterCompanyId] = useState('');
  const [formDialog, setFormDialog] = useState(null); // null | 'create' | product object
  const [form, setForm] = useState(emptyForm());
  const [importDialog, setImportDialog] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importCompanyId, setImportCompanyId] = useState('');
  const [deleteDialog, setDeleteDialog] = useState(null);
  const searchTimer = useRef(null);

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setSearchDebounce(e.target.value);
      setPage(0);
    }, 400);
  };

  const queryParams = {
    page: page + 1,
    limit: rowsPerPage,
    search: searchDebounce,
    ...(filterCompanyId && { companyId: filterCompanyId }),
  };

  const { data, isLoading } = useQuery({
    queryKey: ['products', queryParams],
    queryFn: () => productService.getProducts(queryParams),
  });

  const { data: companiesData } = useQuery({
    queryKey: ['companies-all'],
    queryFn: () => companyService.getAllCompanies(),
  });

  const products = data?.data || [];
  const pagination = data?.pagination || {};
  const companies = companiesData?.data || [];

  const createMutation = useMutation({
    mutationFn: (payload) => productService.createProduct(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setFormDialog(null);
      toast.success('Product created successfully');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to create product'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => productService.updateProduct(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setFormDialog(null);
      toast.success('Product updated successfully');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to update product'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => productService.deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setDeleteDialog(null);
      toast.success('Product deleted successfully');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to delete product'),
  });

  const importMutation = useMutation({
    mutationFn: ({ file, companyId }) => productService.importProducts(file, companyId),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setImportDialog(false);
      setImportFile(null);
      const d = result.data || {};
      toast.success(`Import complete: ${d.inserted || 0} added, ${d.skipped || 0} skipped`);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Import failed'),
  });

  const openCreate = () => {
    setForm(emptyForm());
    setFormDialog('create');
  };

  const openEdit = (product) => {
    setForm({
      name: product.name || product.productName || '',
      productCode: product.productCode || product.code || '',
      sku: product.sku || '',
      mrp: product.mrp || '',
      companyId: product.companyId?._id || product.companyId || '',
      status: product.status || 'active',
    });
    setFormDialog(product);
  };

  const handleSave = () => {
    if (!form.name.trim()) { toast.error('Product name is required'); return; }
    const payload = {
      name: form.name.trim(),
      productCode: form.productCode.trim(),
      sku: form.sku.trim(),
      mrp: form.mrp !== '' ? Number(form.mrp) : 0,
      companyId: form.companyId || null,
      status: form.status,
    };
    if (formDialog === 'create') {
      createMutation.mutate(payload);
    } else {
      updateMutation.mutate({ id: formDialog._id, payload });
    }
  };

  const handleImport = () => {
    if (!importFile) { toast.error('Please select a file'); return; }
    importMutation.mutate({ file: importFile, companyId: importCompanyId });
  };

  const money = (v) => v ? `₹${Number(v).toLocaleString('en-IN')}` : '-';

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, gap: 2, flexWrap: 'wrap' }}>
        <Box>
          <Typography variant="h4" fontWeight={800} color="#0D1B2A">Product Register</Typography>
          <Typography variant="body2" color="#6B7280" mt={0.5}>Manage product master data with bulk import</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button variant="outlined" startIcon={<DownloadIcon />} onClick={() => productService.downloadSampleExcel()} size="small">
            Sample Excel
          </Button>
          <Button variant="outlined" startIcon={<ImportIcon />} onClick={() => setImportDialog(true)} size="small" color="secondary">
            Bulk Import
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate} size="small">
            Add Product
          </Button>
        </Box>
      </Box>

      {/* Filters */}
      <Card sx={{ p: 2, mb: 2.5, borderRadius: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth size="small"
              placeholder="Search product name, code, SKU..."
              value={search}
              onChange={handleSearchChange}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: '#8A9AAA' }} /></InputAdornment> }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <SearchableDropdown
              label="Filter by Company"
              value={filterCompanyId}
              onChange={(v) => { setFilterCompanyId(v); setPage(0); }}
              options={companies}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Typography variant="body2" color="#6B7280" fontWeight={700}>
              Total: {pagination.total || 0} products
            </Typography>
          </Grid>
        </Grid>
      </Card>

      {/* Product Table */}
      <Card sx={{ borderRadius: 2 }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>#</TableCell>
                <TableCell sx={{ fontWeight: 700, minWidth: 200 }}>Product Name</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Product Code</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>SKU</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">MRP</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Company</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} align="center" sx={{ py: 6 }}><CircularProgress size={30} /></TableCell></TableRow>
              ) : products.length === 0 ? (
                <TableRow><TableCell colSpan={8} align="center" sx={{ py: 6, color: '#6B7280' }}>No products found. Add products manually or import via Excel.</TableCell></TableRow>
              ) : (
                products.map((product, idx) => (
                  <TableRow key={product._id} hover>
                    <TableCell>{(page * rowsPerPage) + idx + 1}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{product.name || product.productName}</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{product.productCode || product.code || '-'}</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{product.sku || '-'}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>{product.mrp ? money(product.mrp) : '-'}</TableCell>
                    <TableCell>{product.companyId?.name || '-'}</TableCell>
                    <TableCell>
                      <Chip
                        label={product.status || 'active'}
                        size="small"
                        sx={{
                          fontWeight: 600, textTransform: 'capitalize',
                          bgcolor: product.status === 'active' ? '#D1FAE5' : '#FEE2E2',
                          color: product.status === 'active' ? '#047857' : '#B91C1C',
                        }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.4 }}>
                        <Tooltip title="Edit Product">
                          <IconButton size="small" onClick={() => openEdit(product)}>
                            <EditIcon fontSize="small" sx={{ color: '#1F4E79' }} />
                          </IconButton>
                        </Tooltip>
                        {isSuperAdmin() && (
                          <Tooltip title="Delete Product">
                            <IconButton size="small" onClick={() => setDeleteDialog(product)}>
                              <DeleteIcon fontSize="small" sx={{ color: '#DC2626' }} />
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
        <TablePagination
          component="div"
          count={pagination.total || 0}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
          rowsPerPageOptions={[10, 20, 50, 100]}
        />
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={!!formDialog} onClose={() => setFormDialog(null)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>
          {formDialog === 'create' ? 'Add New Product' : `Edit Product — ${form.name}`}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField fullWidth label="Product Name *" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="Product Code" value={form.productCode} onChange={(e) => setForm((f) => ({ ...f, productCode: e.target.value }))} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="SKU" value={form.sku} onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="MRP (optional)" type="number" value={form.mrp} onChange={(e) => setForm((f) => ({ ...f, mrp: e.target.value }))} inputProps={{ min: 0, step: '0.01' }} helperText="Leave empty if MRP varies" />
            </Grid>
            <Grid item xs={6}>
              <SearchableDropdown label="Company (optional)" value={form.companyId} onChange={(v) => setForm((f) => ({ ...f, companyId: v }))} options={companies} />
            </Grid>
            {formDialog !== 'create' && (
              <Grid item xs={6}>
                <TextField select fullWidth label="Status" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="inactive">Inactive</MenuItem>
                </TextField>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button variant="outlined" onClick={() => setFormDialog(null)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            {(createMutation.isPending || updateMutation.isPending) ? <CircularProgress size={18} /> : formDialog === 'create' ? 'Create' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteDialog} onClose={() => setDeleteDialog(null)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>Delete Product</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete <strong>{deleteDialog?.name || deleteDialog?.productName}</strong>?</Typography>
          <Typography variant="body2" color="error" mt={1}>This action cannot be undone.</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button variant="outlined" onClick={() => setDeleteDialog(null)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={() => deleteMutation.mutate(deleteDialog._id)} disabled={deleteMutation.isPending}>
            {deleteMutation.isPending ? <CircularProgress size={18} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={importDialog} onClose={() => setImportDialog(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>Bulk Import Products</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="#6B7280" mb={2}>
            Upload an Excel file (.xlsx) with columns: Product Name*, Product Code, SKU, MRP.
            Download the sample file for the correct format.
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Button variant="outlined" size="small" startIcon={<DownloadIcon />} onClick={() => productService.downloadSampleExcel()} sx={{ mb: 2 }}>
                Download Sample Excel
              </Button>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                type="file"
                inputProps={{ accept: '.xlsx,.xls,.csv' }}
                onChange={(e) => setImportFile(e.target.files[0])}
                InputLabelProps={{ shrink: true }}
                label="Excel File"
              />
            </Grid>
            <Grid item xs={12}>
              <SearchableDropdown label="Company (optional)" value={importCompanyId} onChange={setImportCompanyId} options={companies} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button variant="outlined" onClick={() => setImportDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleImport} disabled={importMutation.isPending || !importFile}>
            {importMutation.isPending ? <CircularProgress size={18} /> : 'Import'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProductMaster;
