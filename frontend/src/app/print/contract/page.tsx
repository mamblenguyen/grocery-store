'use client';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { ContractView } from '@/components/partner/PartnerParts';
import { PrintShell } from '@/components/PrintShell';
import { Spinner } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { api } from '@/lib/api';
import type { PartnerApplication } from '@/lib/partner';

/** In hợp đồng đối tác: ?id=<hồ sơ> (super admin) hoặc hồ sơ của chính người đăng nhập */
function Inner() {
  const id = useSearchParams().get('id');
  const { user, loading, isSuper } = useAuth();
  const [app, setApp] = useState<PartnerApplication | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    if (loading) return;
    if (!user) { setError('Vui lòng đăng nhập'); return; }
    (isSuper && id ? api<PartnerApplication>(`/super/partner-applications/${id}`) : api<PartnerApplication>('/partner/application'))
      .then((a) => (a?.contractData ? setApp(a) : setError('Hồ sơ chưa có hợp đồng')))
      .catch((e) => setError(e.message));
  }, [user, loading, isSuper, id]);
  if (error) return <div className="p-10 text-center">{error}</div>;
  if (!app?.contractData) return <Spinner />;
  return (
    <PrintShell ready width="210mm" page="size: A4; margin: 0;">
      <div className="p-[18mm]">
        <ContractView c={app.contractData} hash={app.contractHash}
          signed={app.contractSignedAt ? { name: app.contractSignerName ?? app.representative, at: app.contractSignedAt, ip: app.contractSignerIp } : null} />
      </div>
    </PrintShell>
  );
}

export default function ContractPrintPage() {
  return <Suspense fallback={<Spinner />}><Inner /></Suspense>;
}
