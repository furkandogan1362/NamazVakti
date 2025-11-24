import React from 'react';
import { View, StyleSheet, ViewStyle, Platform, StyleProp } from 'react-native';
import { BlurView } from '@react-native-community/blur';
import { useTheme } from '../../contexts/ThemeContext';

interface GlassViewProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  intensity?: number;
  autoHeight?: boolean;
  overlayOpacity?: number;
}

const GlassView: React.FC<GlassViewProps> = ({
  children,
  style,
  intensity = 20,
  autoHeight = false,
  overlayOpacity,
}) => {
  const { theme } = useTheme();
  const isDark = theme.type === 'dark';
  const isAndroid = Platform.OS === 'android';

  // Android için blur kapatıldı, opaklık artırıldı
  const defaultOpacity = isAndroid ? 0.95 : 0.4;
  const finalOpacity = overlayOpacity !== undefined ? overlayOpacity : defaultOpacity;

  const dynamicStyles = {
    backgroundColor: isDark
      ? `rgba(63, 63, 70, ${finalOpacity})` // Zinc 700
      : `rgba(255, 255, 255, ${finalOpacity})`,
    borderColor: isDark ? 'rgba(113, 113, 122, 0.3)' : 'rgba(255, 255, 255, 0.5)', // Zinc 500
  };

  return (
    <View style={[styles.container, style]}>
      {!isAndroid && (
        <BlurView
          style={StyleSheet.absoluteFill}
          blurType={isDark ? 'dark' : 'light'}
          blurAmount={intensity}
          reducedTransparencyFallbackColor={isDark ? '#3F3F46' : '#FFFFFF'}
        />
      )}
      <View style={[
        styles.content,
        !autoHeight && styles.flex1,
        dynamicStyles,
      ]}>
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    borderRadius: 20,
  },
  content: {
    borderWidth: 1,
    borderRadius: 20,
  },
  flex1: {
    flex: 1,
  },
});

export default React.memo(GlassView);
