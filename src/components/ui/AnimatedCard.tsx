import React from 'react';
import { ViewStyle, StyleProp, StyleSheet } from 'react-native';
import Animated, {
  FadeInDown,
} from 'react-native-reanimated';
import GlassView from './GlassView';

interface AnimatedCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  delay?: number;
  index?: number;
  scale?: number;
}

const AnimatedCard: React.FC<AnimatedCardProps> = ({ children, style, delay = 0, index = 0, scale = 1 }) => {
  // Simple entry animation using Layout Animations from Reanimated
  // FadeInDown.delay(delay * index)

  return (
    <Animated.View
      entering={FadeInDown.delay(delay + (index * 100)).springify().damping(12)}
      style={style}
    >
      <Animated.View style={[styles.container, { transform: [{ scale }] }]}>
        <GlassView style={styles.glass}>
          {children}
        </GlassView>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  glass: {
    flex: 1,
  },
});

export default AnimatedCard;
