import { router } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { Badge, Button, Card, Divider, ListItem, T } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { useNotifications } from '@/context/notifications';
import { useSettings } from '@/context/settings';
import { useWishlist } from '@/context/wishlist';
import { confirmAsync } from '@/lib/confirm';
import { C } from '@/lib/theme';

const ROLE: Record<string, string> = { ADMIN: 'Quản trị viên', STAFF: 'Nhân viên', CUSTOMER: 'Khách hàng' };

export default function AccountTab() {
  const { user, logout, isStaff } = useAuth();
  const { unread } = useNotifications();
  const wl = useWishlist();
  const { settings } = useSettings();
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 14, maxWidth: 760, width: '100%', alignSelf: 'center' }}>
      {user ? (
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: C.brand600, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#fff', fontSize: 22, fontWeight: '800' }}>{user.fullName.trim().split(' ').pop()?.[0]?.toUpperCase()}</Text></View>
          <View style={{ flex: 1, gap: 2 }}><T variant="h3">{user.fullName}</T><T variant="muted">{user.email}</T><Badge label={ROLE[user.role]} /></View>
        </Card>
      ) : (
        <Card style={{ gap: 12, alignItems: 'center' }}>
          <T variant="h3">Chào mừng đến {settings.storeName}!</T>
          <T variant="muted" style={{ textAlign: 'center' }}>Đăng nhập để theo dõi đơn hàng, lưu địa chỉ và nhận ưu đãi.</T>
          <Button testID="account-login" title="Đăng nhập / Đăng ký" onPress={() => router.push('/login')} style={{ alignSelf: 'stretch' }} />
        </Card>
      )}
      {user && (
        <Card style={{ paddingVertical: 6 }}>
          <ListItem icon="receipt-outline" title="Đơn hàng của tôi" onPress={() => router.push('/orders')} />
          <Divider />
          <ListItem icon="notifications-outline" title="Thông báo" onPress={() => router.push('/account/notifications')} right={unread ? <Badge label={String(unread)} fg="#fff" bg={C.red} /> : undefined} />
          <Divider />
          <ListItem icon="heart-outline" title="Sản phẩm yêu thích" subtitle={wl.count ? `${wl.count} sản phẩm` : undefined} onPress={() => router.push('/account/wishlist')} />
          <Divider />
          <ListItem icon="location-outline" title="Sổ địa chỉ" onPress={() => router.push('/account/addresses')} />
          <Divider />
          <ListItem icon="person-outline" title="Thông tin cá nhân" onPress={() => router.push('/account/profile')} />
          <Divider />
          <ListItem icon="key-outline" title="Đổi mật khẩu" onPress={() => router.push('/account/password')} />
        </Card>
      )}
      {isStaff && (
        <Card style={{ paddingVertical: 6 }}>
          <ListItem icon="briefcase-outline" title="Khu vực quản lý cửa hàng" subtitle="POS, kho, đơn hàng, báo cáo" onPress={() => router.push('/manage')} />
        </Card>
      )}
      <Card style={{ gap: 6 }}>
        <T variant="h3">Liên hệ cửa hàng</T>
        {!!settings.hotline && <T>📞 {settings.hotline}</T>}
        {!!settings.address && <T>📍 {settings.address}</T>}
        {!!settings.openingHours && <T>🕒 {settings.openingHours}</T>}
      </Card>
      {user && <Button testID="logout" title="Đăng xuất" icon="log-out-outline" variant="ghost" onPress={async () => { if (await confirmAsync('Đăng xuất khỏi tài khoản?')) logout(); }} />}
    </ScrollView>
  );
}
