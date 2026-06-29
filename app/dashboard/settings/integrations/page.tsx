import { getOrCreateOrganization } from '@/lib/supabase/server';
import { getStripeStatus } from '@/lib/stripe';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';
import { StripeConnectForm } from '@/components/stripe-connect-form';

export default async function IntegrationsPage() {
  const org = await getOrCreateOrganization();
  if (!org) return null;

  const { connected } = await getStripeStatus(org.id);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl italic text-ink">Integrations</h1>
        <p className="text-sm text-ink-soft">Connect other apps to LedgerFlow.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Stripe</CardTitle>
        </CardHeader>
        <CardBody>
          <StripeConnectForm
            connected={connected}
            webhookUrl={`${appUrl}/api/integrations/stripe/webhook/${org.id}`}
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Plaid</CardTitle>
        </CardHeader>
        <CardBody>
          <p className="text-sm text-ink-soft">
            Bank feeds are managed from the <span className="text-ink">Bank feeds</span> page, not here.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
