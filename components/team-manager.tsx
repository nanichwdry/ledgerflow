'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

type Member = {
  id: string;
  email: string;
  role: string;
  status: string;
};

export function TeamManager({ members }: { members: Member[] }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('EMPLOYEE');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await fetch('/api/team', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, role }),
    });
    setSubmitting(false);
    if (res.ok) {
      setEmail('');
      router.refresh();
    } else {
      const body = await res.json();
      setError(typeof body.error === 'string' ? body.error : 'Could not send that invite.');
    }
  }

  async function changeRole(id: string, newRole: string) {
    await fetch(`/api/team/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: newRole }),
    });
    router.refresh();
  }

  async function remove(id: string) {
    await fetch(`/api/team/${id}`, { method: 'DELETE' });
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <form onSubmit={handleInvite} className="flex flex-wrap items-end gap-2">
        <div className="w-64">
          <label className="mb-1 block text-xs uppercase tracking-wider text-ink-soft">
            Invite by email
          </label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="w-40">
          <label className="mb-1 block text-xs uppercase tracking-wider text-ink-soft">Role</label>
          <Select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="ADMIN">Admin</option>
            <option value="ACCOUNTANT">Accountant</option>
            <option value="EMPLOYEE">Employee</option>
          </Select>
        </div>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Inviting…' : 'Send invite'}
        </Button>
        {error && <p className="w-full text-sm text-debit">{error}</p>}
      </form>

      <table className="w-full text-sm">
        <thead>
          <tr className="ledger-rule-strong text-xs uppercase tracking-wider text-ink-soft">
            <th className="px-3 py-2.5 text-left">Email</th>
            <th className="px-3 py-2.5 text-left">Role</th>
            <th className="px-3 py-2.5 text-left">Status</th>
            <th className="px-3 py-2.5"></th>
          </tr>
        </thead>
        <tbody>
          {members.map((m) => (
            <tr key={m.id} className="ledger-rule">
              <td className="px-3 py-2.5 text-ink">{m.email}</td>
              <td className="px-3 py-2.5">
                {m.role === 'OWNER' ? (
                  <span className="text-ink-soft">Owner</span>
                ) : (
                  <Select
                    value={m.role}
                    onChange={(e) => changeRole(m.id, e.target.value)}
                    className="w-36"
                  >
                    <option value="ADMIN">Admin</option>
                    <option value="ACCOUNTANT">Accountant</option>
                    <option value="EMPLOYEE">Employee</option>
                  </Select>
                )}
              </td>
              <td className="px-3 py-2.5">
                <Badge tone={m.status === 'ACTIVE' ? 'credit' : 'warning'}>
                  {m.status.toLowerCase()}
                </Badge>
              </td>
              <td className="px-3 py-2.5 text-right">
                {m.role !== 'OWNER' && (
                  <button onClick={() => remove(m.id)} className="text-xs text-debit hover:underline">
                    Remove
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
