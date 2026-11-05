import { headers } from 'next/headers';
import { StoreShell } from './StoreShell';

/** Website của một cửa hàng: /s/<slug> hoặc <slug>.<tên miền sàn> (middleware rewrite) */
export default async function StoreLayout({ children, params }: { children: React.ReactNode; params: Promise<{ store: string }> }) {
  const { store } = await params;
  const slug = decodeURIComponent(store).toLowerCase();
  const onSubdomain = (await headers()).get('x-store-subdomain') === slug;
  return <StoreShell slug={slug} onSubdomain={onSubdomain}>{children}</StoreShell>;
}
