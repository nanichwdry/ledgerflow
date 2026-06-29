import { prisma } from '@/lib/prisma';
import { uploadReceiptImage } from '@/lib/storage';
import { extractReceiptData } from '@/lib/anthropic';
import { createBill, type BillLineInput } from '@/lib/bills';

export async function createReceiptFromUpload(
  organizationId: string,
  file: Buffer,
  contentType: 'image/jpeg' | 'image/png' | 'image/webp'
) {
  const storagePath = await uploadReceiptImage(organizationId, file, contentType);

  const receipt = await prisma.receipt.create({
    data: { organizationId, storagePath, status: 'PROCESSING' },
  });

  try {
    const extracted = await extractReceiptData(file.toString('base64'), contentType);
    return prisma.receipt.update({
      where: { id: receipt.id },
      data: {
        status: 'NEEDS_REVIEW',
        extractedVendorName: extracted.vendorName,
        extractedDate: extracted.date ? new Date(extracted.date) : null,
        extractedTotalCents: extracted.totalCents,
        extractedRaw: extracted as any,
      },
    });
  } catch (err) {
    console.error(`Receipt OCR failed for ${receipt.id}`, err);
    return prisma.receipt.update({ where: { id: receipt.id }, data: { status: 'FAILED' } });
  }
}

/** Confirms a reviewed receipt into a real, posted Bill — the receipt stays linked for audit. */
export async function convertReceiptToBill(
  receiptId: string,
  input: {
    vendorId?: string;
    vendorName?: string;
    billDate: Date;
    dueDate: Date;
    lines: BillLineInput[];
  }
) {
  const receipt = await prisma.receipt.findUniqueOrThrow({ where: { id: receiptId } });
  if (receipt.status === 'CONVERTED') throw new Error('This receipt was already converted.');

  let vendorId = input.vendorId;
  if (!vendorId && input.vendorName) {
    const existing = await prisma.vendor.findFirst({
      where: { organizationId: receipt.organizationId, name: input.vendorName },
    });
    vendorId = existing
      ? existing.id
      : (await prisma.vendor.create({ data: { organizationId: receipt.organizationId, name: input.vendorName } })).id;
  }
  if (!vendorId) throw new Error('A vendor is required to convert this receipt.');

  const bill = await createBill({
    organizationId: receipt.organizationId,
    vendorId,
    billDate: input.billDate,
    dueDate: input.dueDate,
    reference: `Receipt ${receipt.id.slice(0, 8)}`,
    lines: input.lines,
  });

  await prisma.receipt.update({
    where: { id: receipt.id },
    data: { status: 'CONVERTED', billId: bill.id },
  });

  return bill;
}
