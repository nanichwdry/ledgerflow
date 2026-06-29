import { StyleSheet } from '@react-pdf/renderer';

export const pdfStyles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: 'Helvetica', color: '#15261F' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  brand: { fontSize: 16, fontFamily: 'Helvetica-Oblique', color: '#15261F' },
  metaLabel: { fontSize: 8, color: '#6B7A70', textTransform: 'uppercase', letterSpacing: 0.5 },
  metaValue: { fontSize: 10, marginBottom: 6 },
  sectionTitle: {
    fontSize: 9,
    color: '#6B7A70',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 16,
    marginBottom: 4,
  },
  table: { borderTopWidth: 1, borderColor: '#D8D0B4' },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: '#D8D0B4',
    paddingVertical: 6,
  },
  cellLeft: { flex: 3 },
  cellRight: { flex: 1, textAlign: 'right' },
  cellCode: { width: 50, color: '#6B7A70' },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderColor: '#15261F',
    marginTop: 4,
    paddingTop: 6,
  },
  totalLabel: { fontFamily: 'Helvetica-Oblique', fontSize: 11 },
  totalValue: { fontFamily: 'Helvetica-Bold', fontSize: 11 },
  footer: { position: 'absolute', bottom: 30, left: 40, right: 40, fontSize: 8, color: '#6B7A70' },
});

export function formatPdfCents(cents: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}
