import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material';
import {
  Close as CloseIcon,
  Download as DownloadIcon,
  Print as PrintIcon,
} from '@mui/icons-material';

const InvoicePdfPreviewDialog = ({
  open,
  invoice,
  previewHtml,
  pdfUrl,
  loading,
  onClose,
  onDownload,
  onPrint,
}) => {
  // Prefer HTML preview (pixel-perfect, instant) over PDF blob
  const hasHtml = Boolean(previewHtml);
  const hasPdf = Boolean(pdfUrl);
  const hasContent = hasHtml || hasPdf;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="lg"
      PaperProps={{ sx: { height: '92vh', borderRadius: 3, display: 'flex', flexDirection: 'column' } }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
        <Box>
          <Typography fontWeight={800}>Invoice Preview</Typography>
          <Typography variant="caption" color="text.secondary">{invoice?.invoiceNumber}</Typography>
        </Box>
        <Button size="small" startIcon={<CloseIcon />} onClick={onClose}>Close</Button>
      </DialogTitle>
      <DialogContent dividers sx={{ p: 0, bgcolor: '#F1F5F9', flex: 1, minHeight: 0 }}>
        {loading ? (
          <Box sx={{ height: '100%', display: 'grid', placeItems: 'center' }}>
            <CircularProgress />
          </Box>
        ) : hasHtml ? (
          <Box sx={{
            width: '100%', height: '100%', overflow: 'auto',
            display: 'flex', justifyContent: 'center', py: 2, bgcolor: '#E2E8F0',
          }}>
            <iframe
              title={invoice?.invoiceNumber || 'Invoice Preview'}
              srcDoc={previewHtml}
              style={{
                width: '210mm',
                minHeight: '297mm',
                border: 'none',
                background: '#fff',
                boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
              }}
            />
          </Box>
        ) : hasPdf ? (
          <iframe
            title={invoice?.invoiceNumber || 'Invoice PDF preview'}
            src={pdfUrl}
            style={{ width: '100%', height: '100%', border: 0, display: 'block', background: '#fff' }}
          />
        ) : (
          <Box sx={{ height: '100%', display: 'grid', placeItems: 'center' }}>
            <Typography color="text.secondary">No preview available</Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} variant="outlined">Close</Button>
        <Button onClick={onDownload} disabled={!hasContent} startIcon={<DownloadIcon />} variant="contained">
          Download PDF
        </Button>
        <Button onClick={onPrint} disabled={!hasContent} startIcon={<PrintIcon />} variant="contained" color="success">
          Print
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default InvoicePdfPreviewDialog;
