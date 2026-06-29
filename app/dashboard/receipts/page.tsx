import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getOrCreateOrganization } from '@/lib/supabase/server';
import { ReceiptUpload } from '@/components/receipt-upload';
import { Card, CardBody } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCents } from '@/lib/utils';

const STATUS_TONE: Record<string, 'neutral' | 'debit' | 'credit' | 'warning'> = {
  PROCESSING: 'neutral',
  NEEDS_REVIEW: 'warning',
  CONVERTED: 'credit',
  FAILED: 'debit',
};

export default async function ReceiptsPage() {
  const org = await getOrCreateOrganization();
  if (!org) return null;

  const receipts = await prisma.receipt.findMany({
    where: { organizationId: org.id },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl italic text-ink">Receipts</h1>
        <p className="text-sm text-ink-soft">
          Snap a photo — Claude reads the vendor, date, and total, then you confirm it into a bill.
        </p>
      </div>

      <ReceiptUpload />

      <Card>
        <CardBody className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="ledger-rule-strong text-xs uppercase tracking-wider text-ink-soft">
                <th className="px-5 py-2.5 text-left">Vendor (read)</th>
                <th className="px-5 py-2.5 text-left">Date</th>
                <th className="px-5 py-2.5 text-left">Status</th>
                <th className="px-5 py-2.5 text-right">Total (read)</th>
              </tr>
            </thead>
            <tbody>
              {receipts.map((r) => (
                <tr key={r.id} className="ledger-rule">
                  <td className="px-5 py-2.5 text-ink">
                    <Link href={`/dashboard/receipts/${r.id}`} className="hover:underline">
                      {r.extractedVendorName ?? 'Unreadable'}
                    </Link>
                  </td>
                  <td className="px-5 py-2.5 text-ink-soft">
                    {r.extractedDate
                      ? r.extractedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                      : '—'}
                  </td>
                  <td className="px-5 py-2.5">
                    <Badge tone={STATUS_TONE[r.status]}>{r.status.replace('_', ' ').toLowerCase()}</Badge>
                  </td>
                  <td className="tabular px-5 py-2.5 text-right font-mono text-ink-soft">
                    {r.extractedTotalCents != null ? formatCents(r.extractedTotalCents) : '—'}
                  </td>
                </tr>
              ))}
              {receipts.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-ink-soft">
                    No receipts uploaded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </div>
  );
}
