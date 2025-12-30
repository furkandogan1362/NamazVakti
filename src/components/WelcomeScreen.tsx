import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { createWelcomeScreenStyles } from '../styles/WelcomeScreenStyles';

interface WelcomeScreenProps {
    onLocationPress: () => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onLocationPress }) => {
    const { theme } = useTheme();
    const styles = createWelcomeScreenStyles(theme);

    return (
        <View style={styles.welcomeContainer}>
            <View style={styles.welcomeIconContainer}>
                <Text style={styles.welcomeIcon}>🕌</Text>
            </View>
            <Text style={styles.welcomeTitle}>Hoş Geldiniz</Text>
            <Text style={styles.welcomeText}>
                Namaz vakitlerini doğru bir şekilde görüntüleyebilmek için lütfen konumunuzu belirleyin.
            </Text>
            <TouchableOpacity
                style={styles.welcomeButton}
                onPress={onLocationPress}
            >
                <Text style={styles.welcomeButtonText}>Konum Seç</Text>
            </TouchableOpacity>
        </View>
    );
};

export default WelcomeScreen;
