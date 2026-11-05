'use client';
import { useAuth } from '@/context/auth';
import { SettingsProvider } from '@/context/settings';
import { setApiStore } from '@/lib/api';

/** Trang in: nhân viên dùng cài đặt của cửa hàng đang quản trị */
export default function PrintLayout({ children }: { children: React.ReactNode }) {
  setApiStore(null);
  const { isStaff, loading } = useAuth();
  if (loading) return null;
  return <SettingsProvider admin={isStaff}>{children}</SettingsProvider>;
}
