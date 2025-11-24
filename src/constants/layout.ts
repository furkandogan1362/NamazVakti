import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

export const SCREEN = {
  width,
  height,
  isSmall: width < 375,
  isLarge: width > 768,
};

export const SHADOWS = {
  light: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  heavy: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 12,
    },
    shadowOpacity: 0.25,
    shadowRadius: 30,
    elevation: 15,
  },
};
