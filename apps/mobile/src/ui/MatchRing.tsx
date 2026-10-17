import { View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { colors, fonts } from '../lib/theme';
import { Text } from './primitives';

/**
 * React Native port of the landing page's MatchRing. Shows the computed
 * estimated skill fit; it is never a hiring probability.
 */
export function MatchRing({ score, size = 72, label = 'fit' }: { score: number | null; size?: number; label?: string }) {
  const stroke = Math.max(5, size / 14);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const value = score === null ? 0 : Math.max(0, Math.min(100, score));
  return (
    <View style={{ width: size, height: size }} accessible accessibilityLabel={`Estimated skill fit ${score ?? 'not computed'}`}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Defs>
          <LinearGradient id="fitGradient" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={colors.sap} />
            <Stop offset="1" stopColor="#38BDF8" />
          </LinearGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.ink200} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="url(#fitGradient)"
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${c} ${c}`}
          strokeDashoffset={c - (value / 100) * c}
        />
      </Svg>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontFamily: fonts.extrabold, fontSize: size / 4.2, color: colors.ink950 }}>{score === null ? '—' : score.toFixed(1)}</Text>
        <Text variant="label" style={{ fontSize: 8.5 }}>{label}</Text>
      </View>
    </View>
  );
}
