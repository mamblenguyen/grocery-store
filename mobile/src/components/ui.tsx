import { Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator, Pressable, PressableProps, StyleProp, StyleSheet, Text, TextInput, TextInputProps, TextProps, TextStyle, View, ViewStyle,
} from 'react-native';
import { C, R, S, shadow } from '@/lib/theme';
import { money } from '@/lib/format';

export type IconName = keyof typeof Ionicons.glyphMap;

export const T = ({ style, variant = 'body', ...p }: TextProps & { variant?: 'h1' | 'h2' | 'h3' | 'body' | 'small' | 'muted' | 'label' }) => (
  <Text {...p} style={[t[variant], style]} />
);
const t = StyleSheet.create({
  h1: { fontSize: 24, fontWeight: '800', color: C.ink },
  h2: { fontSize: 19, fontWeight: '700', color: C.ink },
  h3: { fontSize: 16, fontWeight: '700', color: C.ink },
  body: { fontSize: 15, color: C.text },
  small: { fontSize: 13, color: C.text },
  muted: { fontSize: 13, color: C.muted },
  label: { fontSize: 13, fontWeight: '600', color: C.text, marginBottom: 6 },
});

type BtnVariant = 'primary' | 'outline' | 'ghost' | 'danger' | 'accent' | 'soft';
export function Button({ title, onPress, variant = 'primary', icon, loading, disabled, size = 'md', style, testID }: {
  title?: string; onPress?: () => void; variant?: BtnVariant; icon?: IconName; loading?: boolean; disabled?: boolean; size?: 'sm' | 'md' | 'lg'; style?: StyleProp<ViewStyle>; testID?: string;
}) {
  const v = btn[variant];
  const h = size === 'sm' ? 36 : size === 'lg' ? 52 : 44;
  return (
    <Pressable testID={testID} accessibilityRole="button" onPress={onPress} disabled={disabled || loading}
      style={({ pressed }) => [b.base, { height: h, paddingHorizontal: size === 'sm' ? 12 : 16 }, v.box, (disabled || loading) && { opacity: 0.5 }, pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] }, style]}>
      {loading ? <ActivityIndicator color={v.fg} /> : icon && <Ionicons name={icon} size={size === 'sm' ? 16 : 19} color={v.fg} />}
      {!!title && <Text style={[b.text, { color: v.fg, fontSize: size === 'sm' ? 13 : size === 'lg' ? 16 : 15 }]} numberOfLines={1}>{title}</Text>}
    </Pressable>
  );
}
const b = StyleSheet.create({
  base: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: R.md },
  text: { fontWeight: '700' },
});
const btn: Record<BtnVariant, { box: ViewStyle; fg: string }> = {
  primary: { box: { backgroundColor: C.brand600 }, fg: C.white },
  accent: { box: { backgroundColor: C.accent }, fg: C.white },
  outline: { box: { backgroundColor: C.white, borderWidth: 1.5, borderColor: C.line }, fg: C.ink },
  soft: { box: { backgroundColor: C.brand50 }, fg: C.brand700 },
  ghost: { box: { backgroundColor: 'transparent' }, fg: C.text },
  danger: { box: { backgroundColor: C.red }, fg: C.white },
};

export const Input = ({ label, icon, error, style, inputRef, ...p }: TextInputProps & { label?: string; icon?: IconName; error?: string; inputRef?: React.Ref<any> }) => (
  <View style={{ gap: 0 }}>
    {label && <T variant="label">{label}</T>}
    <View style={[inp.box, !!error && { borderColor: C.red }, p.editable === false && { backgroundColor: C.line2 }]}>
      {icon && <Ionicons name={icon} size={18} color={C.faint} />}
      <TextInput ref={inputRef} placeholderTextColor={C.faint} {...p} style={[inp.input, style]} />
    </View>
    {!!error && <Text style={{ color: C.red, fontSize: 12, marginTop: 4 }}>{error}</Text>}
  </View>
);
const inp = StyleSheet.create({
  box: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderColor: C.line, borderRadius: R.md, backgroundColor: C.white, paddingHorizontal: 12, minHeight: 46 },
  input: { flex: 1, fontSize: 15, color: C.ink, paddingVertical: 10, outlineStyle: 'none' as any },
});

export const Card = ({ style, children, onPress, testID }: { style?: StyleProp<ViewStyle>; children: React.ReactNode; onPress?: () => void; testID?: string }) =>
  onPress ? (
    <Pressable testID={testID} onPress={onPress} style={({ pressed }) => [card.c, shadow, pressed && { opacity: 0.9 }, style]}>{children}</Pressable>
  ) : <View testID={testID} style={[card.c, shadow, style]}>{children}</View>;
const card = StyleSheet.create({ c: { backgroundColor: C.white, borderRadius: R.lg, padding: S.lg, borderWidth: 1, borderColor: '#eef2f6' } });

export const Badge = ({ label, fg = C.brand700, bg = C.brand50, style }: { label: string; fg?: string; bg?: string; style?: StyleProp<ViewStyle> }) => (
  <View style={[{ backgroundColor: bg, borderRadius: R.full, paddingHorizontal: 10, paddingVertical: 3, alignSelf: 'flex-start' }, style]}>
    <Text style={{ color: fg, fontSize: 12, fontWeight: '700' }}>{label}</Text>
  </View>
);

export const Chip = ({ label, active, onPress, icon }: { label: string; active?: boolean; onPress?: () => void; icon?: IconName }) => (
  <Pressable onPress={onPress} style={[chip.c, active && chip.a]}>
    {icon && <Ionicons name={icon} size={15} color={active ? C.brand700 : C.text} />}
    <Text style={[chip.t, active && { color: C.brand700, fontWeight: '700' }]}>{label}</Text>
  </Pressable>
);
const chip = StyleSheet.create({
  c: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1.5, borderColor: C.line, backgroundColor: C.white, borderRadius: R.full, paddingHorizontal: 14, paddingVertical: 7 },
  a: { borderColor: C.brand600, backgroundColor: C.brand50 },
  t: { fontSize: 14, color: C.text },
});

export const Row = ({ style, children, gap = 8 }: { style?: StyleProp<ViewStyle>; children: React.ReactNode; gap?: number }) => (
  <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]}>{children}</View>
);

export const Price = ({ value, compare, size = 16, style }: { value: number; compare?: number | null; size?: number; style?: StyleProp<TextStyle> }) => (
  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
    <Text style={[{ fontSize: size, fontWeight: '800', color: C.brand700 }, style]}>{money(value)}</Text>
    {!!compare && compare > value && <Text style={{ fontSize: Math.max(12, size - 4), color: C.faint, textDecorationLine: 'line-through' }}>{money(compare)}</Text>}
  </View>
);

export function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <Row gap={1}>
      {[1, 2, 3, 4, 5].map((i) => <Ionicons key={i} name={value >= i - 0.25 ? 'star' : value >= i - 0.75 ? 'star-half' : 'star-outline'} size={size} color="#fbbf24" />)}
    </Row>
  );
}

export const Loading = ({ full = true }: { full?: boolean }) => (
  <View style={full ? { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 } : { padding: 24, alignItems: 'center' }}>
    <ActivityIndicator size="large" color={C.brand600} />
  </View>
);

export const Empty = ({ icon = 'file-tray-outline', text, children }: { icon?: IconName; text: string; children?: React.ReactNode }) => (
  <View style={{ alignItems: 'center', padding: 32, gap: 12 }}>
    <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: C.line2, alignItems: 'center', justifyContent: 'center' }}><Ionicons name={icon} size={32} color={C.faint} /></View>
    <T variant="muted" style={{ textAlign: 'center', fontSize: 15 }}>{text}</T>
    {children}
  </View>
);

export function QtyStepper({ value, onChange, max, min = 1, size = 'md' }: { value: number; onChange: (v: number) => void; max?: number; min?: number; size?: 'sm' | 'md' }) {
  const h = size === 'sm' ? 32 : 44;
  return (
    <Row gap={0} style={{ borderWidth: 1.5, borderColor: C.line, borderRadius: R.md, height: h, backgroundColor: C.white }}>
      <Pressable accessibilityLabel="Giảm" disabled={value <= min} onPress={() => onChange(value - 1)} style={{ width: h, alignItems: 'center', opacity: value <= min ? 0.3 : 1 }}><Ionicons name="remove" size={18} color={C.ink} /></Pressable>
      <Text style={{ minWidth: 32, textAlign: 'center', fontWeight: '700', fontSize: 15, color: C.ink }}>{value}</Text>
      <Pressable accessibilityLabel="Tăng" disabled={max !== undefined && value >= max} onPress={() => onChange(value + 1)} style={{ width: h, alignItems: 'center', opacity: max !== undefined && value >= max ? 0.3 : 1 }}><Ionicons name="add" size={18} color={C.ink} /></Pressable>
    </Row>
  );
}

export const SectionHeader = ({ title, action, onAction, icon }: { title: string; action?: string; onAction?: () => void; icon?: IconName }) => (
  <Row style={{ justifyContent: 'space-between', marginBottom: 12 }}>
    <Row gap={6}>{icon && <Ionicons name={icon} size={20} color={C.accent} />}<T variant="h2">{title}</T></Row>
    {action && <Pressable onPress={onAction}><Text style={{ color: C.brand700, fontWeight: '700' }}>{action} ›</Text></Pressable>}
  </Row>
);

export const ListItem = ({ icon, title, subtitle, onPress, right, danger, testID }: { icon?: IconName; title: string; subtitle?: string; onPress?: () => void; right?: React.ReactNode; danger?: boolean; testID?: string }) => (
  <Pressable testID={testID} onPress={onPress} style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingHorizontal: 4 }, pressed && { opacity: 0.6 }]}>
    {icon && <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: danger ? C.red50 : C.brand50, alignItems: 'center', justifyContent: 'center' }}><Ionicons name={icon} size={19} color={danger ? C.red : C.brand700} /></View>}
    <View style={{ flex: 1 }}><Text style={{ fontSize: 15, fontWeight: '600', color: danger ? C.red : C.ink }}>{title}</Text>{subtitle && <T variant="muted">{subtitle}</T>}</View>
    {right ?? (onPress && <Ionicons name="chevron-forward" size={18} color={C.faint} />)}
  </Pressable>
);

export const Divider = () => <View style={{ height: 1, backgroundColor: C.line2, marginVertical: 4 }} />;

export const StatusPill = ({ map, value }: { map: Record<string, { label: string; fg: string; bg: string }>; value: string }) => {
  const s = map[value] ?? { label: value, fg: C.text, bg: C.line2 };
  return <Badge label={s.label} fg={s.fg} bg={s.bg} />;
};

export function Pressy(props: PressableProps & { style?: StyleProp<ViewStyle> }) {
  return <Pressable {...props} style={({ pressed }) => [props.style, pressed && { opacity: 0.7 }]} />;
}
