import { notFound } from 'next/navigation';
import Image from 'next/image';
import { prisma } from '@/lib/prisma';
import { getOrCreateOrganization } from '@/lib/supabase/server';
import { getReceiptSignedUrl } from '@/lib/storage';
import { ReceiptReviewForm } from '@/components/receipt-review-form';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default async function ReceiptDetailPage({ params }: { params: { id: string } }) {
  const org = await getOrCreateOrganization();
  if (!org) return null;

  const receipt = await prisma.receipt.findFirst({
    where: { id: params.id, organizationId: org.id },
  });
  if (!receipt) notFound();

  const [imageUrl, vendors, expenseAccounts] = await Promise.all([
    getReceiptSignedUrl(receipt.storagePath).catch(() => null),
    prisma.vendor.findMany({ where: { organizationId: org.id, archived: false }, orderBy: { name: 'asc' } }),
    prisma.account.findMany({
      where: { organizationId: org.id, type: 'EXPENSE', archived: false },
      orderBy: { code: 'asc' },
    }),
  ]);

  const extractedRaw = receipt.extractedRaw as { lineItems?: { description: string; amountCents: number }[] } | null;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div>
        <div className="mb-4 flex items-center gap-2">
          <h1 className="font-display text-2xl italic text-ink">Receipt</h1>
          <Badge tone={receipt.status === 'CONVERTED' ? 'credit' : 'warning'}>
            {receipt.status.replace('_', ' ').toLowerCase()}
          </Badge>
        </div>
        {imageUrl ? (
          <div className="relative w-full overflow-hidden rounded-sm border border-rule" style={{ height: 600 }}>
            <Image src={imageUrl} alt="Receipt" fill style={{ objectFit: 'contain' }} unoptimized />
          </div>
        ) : (
          <p className="text-ink-soft">Image unavailable.</p>
        )}
      </div>

      <div>
        {receipt.status === 'CONVERTED' ? (
          <Card>
            <CardBody>
              <p className="text-ink-soft">This receipt has already been converted to a bill.</p>
            </CardBody>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Review & confirm</CardTitle>
            </CardHeader>
            <CardBody>
              <ReceiptReviewForm
                receiptId={receipt.id}
                vendors={vendors}
                expenseAccounts={expenseAccounts}
                extractedVendorName={receipt.extractedVendorName}
                extractedDate={receipt.extractedDate?.toISOString().slice(0, 10) ?? null}
                extractedLines={extractedRaw?.lineItems ?? []}
              />
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}
