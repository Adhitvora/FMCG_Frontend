import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box, Typography, Card, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TablePagination, Chip, TextField, MenuItem,
  InputAdornment, Grid, CircularProgress, Dialog, DialogTitle,
  DialogContent, DialogActions, Button,
} from '@mui/material';
import { Search as SearchIcon, Visibility as ViewIcon } from '@mui/icons-material';
import api from '../services/api';
import { format } from 'date-fns';

const actionColors = {
  CREATE: { bg: '#D1FAE5', color: '#059669' },
  UPDATE: { bg: '#DBEAFE', color: '#1F4E79' },
  DELETE: { bg: '#FEE2E2', color: '#DC2626' },
  CANCEL: { bg: '#FEF3C7', color: '#D97706' },
  APPROVE: { bg: '#EDE9FE', color: '#7C3AED' },
  IMPORT: { bg: '#CFFAFE', color: '#0891B2' },
  LOGIN: { bg: '#F3F4F6', color: '#6B7280' },
};

const AuditLogPage = () => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(30);
  const [search, setSearch] = useState('');
  const [searchDebounce, setSearchDebounce] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [viewDetail, setViewDetail] = useState(null);

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    clearTimeout(window._auditSearchTimeout);
    window._auditSearchTimeout = setTimeout(() => {
      setSearchDebounce(e.target.value);
      setPage(0);
    }, 400);
  };

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', page + 1, rowsPerPage, searchDebounce, entityFilter, actionFilter],
    queryFn: async () => {
      const params = { page: page + 1, limit: rowsPerPage };
      if (searchDebounce) params.search = searchDebounce;
      if (entityFilter) params.entity = entityFilter;
      if (actionFilter) params.action = actionFilter;
      const res = await api.get('/audit-logs', { params });
      return res.data;
    },
  });

  const logs = data?.data || [];
  const pagination = data?.pagination || { total: 0 };

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={700} color="#0D1B2A">Audit Log</Typography>
        <Typography variant="body2" color="#8A9AAA" mt={0.5}>Complete trail of all system actions — who, when, what</Typography>
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 2.5, p: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={5}>
            <TextField fullWidth placeholder="Search by description, user..." value={search} onChange={handleSearchChange} size="small"
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: '#8A9AAA' }} /></InputAdornment> }}
            />
          </Grid>
          <Grid item xs={6} md={3.5}>
            <TextField select fullWidth size="small" label="Entity" value={entityFilter}
              onChange={(e) => { setEntityFilter(e.target.value); setPage(0); }}>
              <MenuItem value="">All Entities</MenuItem>
              {['User', 'Company', 'Party', 'Transport', 'Replacement', 'MasterCarton', 'Invoice'].map(e => (
                <MenuItem key={e} value={e}>{e}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={6} md={3.5}>
            <TextField select fullWidth size="small" label="Action" value={actionFilter}
              onChange={(e) => { setActionFilter(e.target.value); setPage(0); }}>
              <MenuItem value="">All Actions</MenuItem>
              {['CREATE', 'UPDATE', 'DELETE', 'CANCEL', 'APPROVE', 'IMPORT', 'LOGIN'].map(a => (
                <MenuItem key={a} value={a}>{a}</MenuItem>
              ))}
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
                <TableCell>Timestamp</TableCell>
                <TableCell>User</TableCell>
                <TableCell>Action</TableCell>
                <TableCell>Entity</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>IP</TableCell>
                <TableCell align="center">Details</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} align="center" sx={{ py: 6 }}><CircularProgress size={32} /></TableCell></TableRow>
              ) : logs.length === 0 ? (
                <TableRow><TableCell colSpan={7} align="center" sx={{ py: 6, color: '#8A9AAA' }}>No audit logs found</TableCell></TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log._id} hover>
                    <TableCell sx={{ fontSize: '0.75rem', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                      {log.createdAt ? format(new Date(log.createdAt), 'dd/MM/yy HH:mm:ss') : '—'}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: '0.8125rem' }}>{log.username}</TableCell>
                    <TableCell>
                      <Chip label={log.action} size="small"
                        sx={{ fontWeight: 700, fontSize: '0.7rem',
                          bgcolor: actionColors[log.action]?.bg || '#F3F4F6',
                          color: actionColors[log.action]?.color || '#6B7280',
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.8125rem' }}>{log.entity}</TableCell>
                    <TableCell sx={{ fontSize: '0.8125rem', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {log.description}
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>{log.ipAddress || '—'}</TableCell>
                    <TableCell align="center">
                      <Button size="small" variant="text" onClick={() => setViewDetail(log)} sx={{ fontSize: '0.75rem', minWidth: 'auto' }}>
                        <ViewIcon fontSize="small" />
                      </Button>
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
          rowsPerPageOptions={[20, 30, 50, 100]}
        />
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!viewDetail} onClose={() => setViewDetail(null)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>Audit Log Detail</DialogTitle>
        <DialogContent>
          {viewDetail && (
            <Box>
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={6} sm={3}><Typography variant="caption" color="#8A9AAA">User</Typography><Typography fontWeight={600}>{viewDetail.username}</Typography></Grid>
                <Grid item xs={6} sm={3}><Typography variant="caption" color="#8A9AAA">Action</Typography>
                  <Chip label={viewDetail.action} size="small" sx={{ fontWeight: 700, bgcolor: actionColors[viewDetail.action]?.bg, color: actionColors[viewDetail.action]?.color }} />
                </Grid>
                <Grid item xs={6} sm={3}><Typography variant="caption" color="#8A9AAA">Entity</Typography><Typography>{viewDetail.entity}</Typography></Grid>
                <Grid item xs={6} sm={3}><Typography variant="caption" color="#8A9AAA">Timestamp</Typography><Typography fontSize="0.85rem">{viewDetail.createdAt ? format(new Date(viewDetail.createdAt), 'dd MMM yyyy HH:mm:ss') : '—'}</Typography></Grid>
              </Grid>

              <Typography variant="body2" mb={2}><strong>Description:</strong> {viewDetail.description}</Typography>

              <Grid container spacing={2}>
                <Grid item xs={6} sm={3}><Typography variant="caption" color="#8A9AAA">IP Address</Typography><Typography fontFamily="monospace" fontSize="0.85rem">{viewDetail.ipAddress || '—'}</Typography></Grid>
                <Grid item xs={6} sm={3}><Typography variant="caption" color="#8A9AAA">Browser</Typography><Typography fontSize="0.8rem" sx={{ wordBreak: 'break-all' }}>{viewDetail.userAgent?.substring(0, 60) || '—'}</Typography></Grid>
              </Grid>

              {viewDetail.oldValue && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" fontWeight={700} color="#DC2626" mb={0.5}>Old Value:</Typography>
                  <Box sx={{ bgcolor: '#FEF2F2', p: 1.5, borderRadius: 2, maxHeight: 150, overflow: 'auto' }}>
                    <pre style={{ margin: 0, fontSize: '0.75rem', whiteSpace: 'pre-wrap' }}>{JSON.stringify(viewDetail.oldValue, null, 2)}</pre>
                  </Box>
                </Box>
              )}

              {viewDetail.newValue && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" fontWeight={700} color="#059669" mb={0.5}>New Value:</Typography>
                  <Box sx={{ bgcolor: '#F0FDF4', p: 1.5, borderRadius: 2, maxHeight: 150, overflow: 'auto' }}>
                    <pre style={{ margin: 0, fontSize: '0.75rem', whiteSpace: 'pre-wrap' }}>{JSON.stringify(viewDetail.newValue, null, 2)}</pre>
                  </Box>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setViewDetail(null)} variant="outlined">Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AuditLogPage;
