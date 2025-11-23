import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { BlurView } from '@react-native-community/blur';
import { useTheme } from '../../contexts/ThemeContext';

interface GlassViewProps {
  children: React.ReactNode;
  style?: ViewStyle;
  intensity?: number;
  autoHeight?: boolean;
  overlayOpacity?: number;
}

const GlassView: React.FC<GlassViewProps> = ({ 
  children, 
  style, 
  intensity = 20, 
  autoHeight = false,
  overlayOpacity 
}) => {
  const { theme } = useTheme();
  const isDark = theme.type === 'dark';
  
  const finalOpacity = overlayOpacity !== undefined ? overlayOpacity : 0.4;

  return (
    <View style={[styles.container, style]}>
      <BlurView
        style={StyleSheet.absoluteFill}
        blurType={isDark ? 'dark' : 'light'}
        blurAmount={intensity}
        reducedTransparencyFallbackColor={isDark ? '#1E293B' : '#FFFFFF'}
      />
      <View style={[
        styles.content,
        autoHeight ? null : { flex: 1 },
        {
          backgroundColor: isDark 
            ? `rgba(30, 41, 59, ${finalOpacity})` 
            : `rgba(255, 255, 255, ${finalOpacity})`,
          borderColor: isDark ? 'rgba(148, 163, 184, 0.2)' : 'rgba(255, 255, 255, 0.5)',
        },
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
});

export default GlassView;
