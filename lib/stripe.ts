import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';
import { encrypt, decrypt } from '@/lib/crypto';
import { recordInvoicePayment } from '@/lib/invoices';
import { getSystemAccount, SYSTEM_ACCOUNT_CODES } from '@/lib/system-accounts';

type StripeCredentials = { secretKey: string; webhookSecret: string };

function readCredentials(encrypted: string): StripeCredentials {
  return JSON.parse(decrypt(encrypted));
}

async function getIntegration(organizationId: string) {
  return prisma.integration.findUnique({
    where: { organizationId_provider: { organizationId, provider: 'STRIPE' } },
  });
}

async function getStripeClient(organizationId: string) {
  const integration = await getIntegration(organizationId);
  if (!integration || integration.status !== 'CONNECTED') return null;
  const { secretKey } = readCredentials(integration.credentials);
  return new Stripe(secretKey, { apiVersion: '2025-02-24.acacia' });
}

/** Validates the key against Stripe, then stores it (and the webhook secret) encrypted at rest. */
export async function connectStripe(
  organizationId: string,
  input: { secretKey: string; webhookSecret: string }
) {
  const stripe = new Stripe(input.secretKey, { apiVersion: '2025-02-24.acacia' });
  await stripe.balance.retrieve(); // throws if the key is invalid

  const credentials = encrypt(JSON.stringify(input));
  return prisma.integration.upsert({
    where: { organizationId_provider: { organizationId, provider: 'STRIPE' } },
    update: { credentials, status: 'CONNECTED' },
    create: { organizationId, provider: 'STRIPE', credentials, status: 'CONNECTED' },
  });
}

export async function disconnectStripe(organizationId: string) {
  await prisma.integration
    .update({
      where: { organizationId_provider: { organizationId, provider: 'STRIPE' } },
      data: { status: 'DISCONNECTED' },
    })
    .catch(() => null);
}

export async function getStripeStatus(organizationId: string) {
  const integration = await getIntegration(organizationId);
  return { connected: integration?.status === 'CONNECTED' };
}

/** No-op if Stripe isn't connected — invoices still send fine without a pay link. */
export async function createPaymentLinkForInvoice(invoiceId: string) {
  const invoice = await prisma.invoice.findUniqueOrThrow({ where: { id: invoiceId } });
  const stripe = await getStripeClient(invoice.organizationId);
  if (!stripe) return null;

  // Payment Links need a real Price object (unlike Checkout Sessions, they
  // don't accept ad-hoc price_data), so create a one-off product + price first.
  const product = await stripe.products.create({ name: `Invoice #${invoice.number}` });
  const price = await stripe.prices.create({
    currency: 'usd',
    unit_amount: invoice.totalCents,
    product: product.id,
  });

  const paymentLink = await stripe.paymentLinks.create({
    line_items: [{ price: price.id, quantity: 1 }],
    metadata: { invoiceId: invoice.id, organizationId: invoice.organizationId },
  });

  await prisma.invoice.update({
    where: { id: invoice.id },
    data: { stripePaymentLinkUrl: paymentLink.url, stripePaymentLinkId: paymentLink.id },
  });

  return paymentLink.url;
}

/**
 * Verifies and processes a Stripe webhook for one organization's connected
 * account. Because this app uses bring-your-own-API-key rather than Stripe
 * Connect, the organization is identified by the webhook URL path
 * (/api/integrations/stripe/webhook/[organizationId]) and each org's own
 * webhook signing secret verifies that specific request.
 */
export async function handleStripeWebhook(
  organizationId: string,
  rawBody: string,
  signature: string
) {
  const integration = await getIntegration(organizationId);
  if (!integration) throw new Error('Stripe is not connected for this organization.');
  const { webhookSecret } = readCredentials(integration.credentials);

  const stripe = new Stripe('', { apiVersion: '2025-02-24.acacia' }); // only used for signature verification here
  const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const invoiceId = session.metadata?.invoiceId;
    if (invoiceId && session.payment_status === 'paid') {
      const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
      if (invoice && invoice.status !== 'PAID') {
        const undepositedFunds = await getSystemAccount(
          organizationId,
          SYSTEM_ACCOUNT_CODES.UNDEPOSITED_FUNDS
        );
        await recordInvoicePayment(invoiceId, {
          amountCents: session.amount_total ?? 0,
          date: new Date(),
          depositAccountId: undepositedFunds.id,
          method: 'stripe',
          stripeEventId: event.id,
        });
      }
    }
  }

  return { received: true };
}
