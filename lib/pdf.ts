import { renderToBuffer, type DocumentProps } from '@react-pdf/renderer';
import { createElement, type ReactElement } from 'react';
import { InvoicePdf } from '@/components/pdf/invoice-pdf';
import { StatementPdf, type StatementSection } from '@/components/pdf/statement-pdf';

// @react-pdf/renderer types renderToBuffer as accepting a literal <Document>
// element; our wrapper components render one internally, which works fine at
// runtime but doesn't structurally match that prop type, hence the cast.
function castDoc(el: unknown) {
  return el as unknown as ReactElement<DocumentProps>;
}

export async function renderInvoicePdfBuffer(
  orgName: string,
  invoice: Parameters<typeof InvoicePdf>[0]['invoice']
) {
  return renderToBuffer(castDoc(createElement(InvoicePdf, { orgName, invoice })));
}

export async function renderStatementPdfBuffer(props: {
  orgName: string;
  reportTitle: string;
  rangeLabel: string;
  sections: StatementSection[];
  summaryLines?: { label: string; amountCents: number }[];
  grandTotal?: { label: string; amountCents: number };
}) {
  return renderToBuffer(castDoc(createElement(StatementPdf, props)));
}
