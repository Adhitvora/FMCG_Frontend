import { useQuery } from '@tanstack/react-query';
import {
  Box, Typography, Card, CardContent, Grid, CircularProgress, Chip, Table,
  TableBody, TableCell, TableHead, TableRow, Avatar,
} from '@mui/material';
import {
  CallReceived as ReceivedIcon, CallMade as SentIcon,
  HourglassTop as PendingIcon, Receipt as InvoiceIcon,
  AccountBalance as AmountIcon, TrendingUp as TrendIcon,
  AssignmentTurnedIn as SettlementIcon,
} from '@mui/icons-material';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend,
} from 'recharts';
import api from '../services/api';

const COLORS = ['#1F4E79', '#D4AF37', '#059669', '#DC2626', '#7C3AED', '#D97706', '#0891B2', '#E11D48', '#4F46E5', '#0D9488'];

const StatCard = ({ title, value, icon: Icon, color, subtitle }) => (
  <Card sx={{
    borderRadius: 3, border: '1px solid #E5E7EB', position: 'relative', overflow: 'hidden',
    '&::before': { content: '""', position: 'absolute', top: 0, left: 0, width: 4, height: '100%', bgcolor: color },
  }}>
    <CardContent sx={{ p: 2.5 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="caption" color="#8A9AAA" fontWeight={600} textTransform="uppercase" letterSpacing={0.5}>
            {title}
          </Typography>
          <Typography variant="h4" fontWeight={800} color="#0D1B2A" mt={0.5}>{value}</Typography>
          {subtitle && <Typography variant="caption" color="#8A9AAA">{subtitle}</Typography>}
        </Box>
        <Avatar sx={{ bgcolor: `${color}15`, color: color, width: 44, height: 44 }}>
          <Icon />
        </Avatar>
      </Box>
    </CardContent>
  </Card>
);

const Dashboard = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const res = await api.get('/dashboard');
      return res.data.data;
    },
    refetchInterval: 60000,
  });

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress size={48} />
      </Box>
    );
  }

  const stats = data || {};
  const today = stats.today || {};
  const pending = stats.pending || {};
  const totals = stats.totals || {};
  const settlements = stats.settlements || {};
  const charts = stats.charts || {};
  const topPending = stats.topPending || {};

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={800} color="#0D1B2A">Dashboard</Typography>
        <Typography variant="body2" color="#8A9AAA">HET ARYA ENTERPRISE — Real-time overview</Typography>
      </Box>

      {/* Stat Cards */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={4} md={2.4}>
          <StatCard title="Today Received" value={today.received || 0} icon={ReceivedIcon} color="#1F4E79" />
        </Grid>
        <Grid item xs={6} sm={4} md={2.4}>
          <StatCard title="Today Sent" value={today.sent || 0} icon={SentIcon} color="#059669" />
        </Grid>
        <Grid item xs={6} sm={4} md={2.4}>
          <StatCard title="Pending Approval" value={pending.approval || 0} icon={PendingIcon} color="#D97706" />
        </Grid>
        <Grid item xs={6} sm={4} md={2.4}>
          <StatCard title="Pending Dispatch" value={pending.dispatch || 0} icon={SentIcon} color="#7C3AED" />
        </Grid>
        <Grid item xs={6} sm={4} md={2.4}>
          <StatCard title="Pending Invoice" value={pending.invoice || 0} icon={InvoiceIcon} color="#DC2626" />
        </Grid>
      </Grid>

      {/* Amount Cards */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <StatCard title="Total Cases Received" value={(totals.casesReceived || 0).toLocaleString('en-IN')} icon={ReceivedIcon} color="#1F4E79" />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard title="Total Cases Sent" value={(totals.casesSent || 0).toLocaleString('en-IN')} icon={SentIcon} color="#059669" />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard title="Approval Amount" value={`₹${(totals.approvalAmount || 0).toLocaleString('en-IN')}`} icon={AmountIcon} color="#D4AF37" />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard title="Pending Amount" value={`₹${(totals.pendingAmount || 0).toLocaleString('en-IN')}`} icon={TrendIcon} color="#DC2626" />
        </Grid>
      </Grid>

      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3} md={1.5}>
          <StatCard title="Settlement Pending" value={settlements.pending || 0} icon={SettlementIcon} color="#D97706" />
        </Grid>
        <Grid item xs={6} sm={3} md={1.5}>
          <StatCard title="Settlement Today" value={settlements.today || 0} icon={SettlementIcon} color="#1F4E79" />
        </Grid>
        <Grid item xs={6} sm={3} md={1.5}>
          <StatCard title="Completed" value={settlements.completed || 0} icon={SettlementIcon} color="#059669" />
        </Grid>
        <Grid item xs={6} sm={3} md={1.5}>
          <StatCard title="Partial" value={settlements.partial || 0} icon={PendingIcon} color="#7C3AED" />
        </Grid>
        <Grid item xs={6} sm={3} md={1.5}>
          <StatCard title="On Hold" value={settlements.onHold || 0} icon={PendingIcon} color="#B45309" />
        </Grid>
        <Grid item xs={6} sm={3} md={2.25}>
          <StatCard title="Approved Value" value={`Rs. ${(settlements.totalApprovedValue || 0).toLocaleString('en-IN')}`} icon={AmountIcon} color="#D4AF37" />
        </Grid>
        <Grid item xs={6} sm={3} md={2.25}>
          <StatCard title="Pending Settlement Value" value={`Rs. ${(settlements.pendingSettlementValue || 0).toLocaleString('en-IN')}`} icon={TrendIcon} color="#DC2626" />
        </Grid>
      </Grid>

      {/* Charts Row */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {/* Monthly Trend */}
        <Grid item xs={12} md={8}>
          <Card sx={{ borderRadius: 3, p: 2.5 }}>
            <Typography variant="subtitle1" fontWeight={700} mb={2}>Monthly Replacement Trend</Typography>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={charts.monthlyStats || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="_id" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <RechartsTooltip />
                <Legend />
                <Line type="monotone" dataKey="count" stroke="#1F4E79" strokeWidth={2} name="Entries" dot={{ r: 4 }} />
                <Line type="monotone" dataKey="cases" stroke="#D4AF37" strokeWidth={2} name="Cases" dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Grid>

        {/* Company Wise Pie */}
        <Grid item xs={12} md={4}>
          <Card sx={{ borderRadius: 3, p: 2.5 }}>
            <Typography variant="subtitle1" fontWeight={700} mb={2}>Company Wise Distribution</Typography>
            {(charts.companyWise || []).length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={charts.companyWise} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={90}
                    label={({ name, percent }) => `${name.substring(0, 10)} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false} fontSize={9}>
                    {(charts.companyWise || []).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 280, color: '#8A9AAA' }}>
                <Typography>No data yet</Typography>
              </Box>
            )}
          </Card>
        </Grid>
      </Grid>

      {/* Party Wise Bar + Top Pending */}
      <Grid container spacing={2.5}>
        {/* Party Wise Bar */}
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 3, p: 2.5 }}>
            <Typography variant="subtitle1" fontWeight={700} mb={2}>Top Parties by Replacements</Typography>
            {(charts.partyWise || []).length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={charts.partyWise} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10 }} />
                  <RechartsTooltip />
                  <Bar dataKey="count" fill="#1F4E79" radius={[0, 4, 4, 0]} name="Entries" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 280, color: '#8A9AAA' }}>
                <Typography>No data yet</Typography>
              </Box>
            )}
          </Card>
        </Grid>

        {/* Top Pending */}
        <Grid item xs={12} md={3}>
          <Card sx={{ borderRadius: 3, p: 2.5 }}>
            <Typography variant="subtitle1" fontWeight={700} mb={1.5}>Top Pending Parties</Typography>
            {(topPending.parties || []).length > 0 ? (
              <Table size="small">
                <TableBody>
                  {topPending.parties.map((p, i) => (
                    <TableRow key={i}>
                      <TableCell sx={{ py: 0.8, fontWeight: 500, fontSize: '0.8rem' }}>{p.name}</TableCell>
                      <TableCell align="right" sx={{ py: 0.8 }}>
                        <Chip label={p.pendingCount} size="small" sx={{ fontWeight: 700, bgcolor: '#FEF3C7', color: '#92400E', fontSize: '0.75rem' }} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <Typography variant="body2" color="#8A9AAA" textAlign="center" py={4}>No pending items</Typography>
            )}
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card sx={{ borderRadius: 3, p: 2.5 }}>
            <Typography variant="subtitle1" fontWeight={700} mb={1.5}>Top Pending Companies</Typography>
            {(topPending.companies || []).length > 0 ? (
              <Table size="small">
                <TableBody>
                  {topPending.companies.map((c, i) => (
                    <TableRow key={i}>
                      <TableCell sx={{ py: 0.8, fontWeight: 500, fontSize: '0.8rem' }}>{c.name}</TableCell>
                      <TableCell align="right" sx={{ py: 0.8 }}>
                        <Chip label={c.pendingCount} size="small" sx={{ fontWeight: 700, bgcolor: '#FEE2E2', color: '#DC2626', fontSize: '0.75rem' }} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <Typography variant="body2" color="#8A9AAA" textAlign="center" py={4}>No pending items</Typography>
            )}
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
