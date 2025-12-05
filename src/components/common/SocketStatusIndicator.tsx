// src/components/common/SocketStatusIndicator.tsx
/**
 * Visual indicator for WebSocket connection status
 * Shows connection state with color-coded dot and optional label
 */

import React from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { useSelector } from 'react-redux';
import Text from '@/components/common/Text';
import { selectConnectionStatus, selectIsConnected } from '@/store/slices/dispatchSlice';
import { COLORS } from '@/constants/colors';
import { moderateScale, scale, verticalScale } from 'react-native-size-matters';
import type { ConnectionStatus } from '@/types/socket';

interface SocketStatusIndicatorProps {
  showLabel?: boolean;
  size?: 'small' | 'medium' | 'large';
  style?: object;
}

const STATUS_COLORS: Record<ConnectionStatus, string> = {
  connected: COLORS.success,
  connecting: COLORS.warning,
  disconnected: COLORS.gray400,
  error: COLORS.error,
};

const STATUS_LABELS: Record<ConnectionStatus, string> = {
  connected: 'Connected',
  connecting: 'Connecting...',
  disconnected: 'Offline',
  error: 'Connection Error',
};

const SIZE_MAP = {
  small: 8,
  medium: 10,
  large: 12,
};

export function SocketStatusIndicator({
  showLabel = false,
  size = 'small',
  style,
}: SocketStatusIndicatorProps) {
  const status = useSelector(selectConnectionStatus);
  const isConnected = useSelector(selectIsConnected);

  const dotSize = SIZE_MAP[size];
  const color = STATUS_COLORS[status];
  const label = STATUS_LABELS[status];

  // Pulse animation for connecting state
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    if (status === 'connecting') {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.4,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [status]);

  return (
    <View style={[styles.container, style]}>
      <Animated.View
        style={[
          styles.dot,
          {
            width: dotSize,
            height: dotSize,
            borderRadius: dotSize / 2,
            backgroundColor: color,
            opacity: pulseAnim,
          },
        ]}
      />
      {showLabel && (
        <Text type="caption" style={[styles.label, { color }]}>
          {label}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
  },
  dot: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  label: {
    letterSpacing: 0.3,
  },
});

export default SocketStatusIndicator;
