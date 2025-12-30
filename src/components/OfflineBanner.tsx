import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { createOfflineBannerStyles } from '../styles/OfflineBannerStyles';

const OfflineBanner: React.FC = () => {
    const { theme } = useTheme();
    const styles = createOfflineBannerStyles(theme);

    return (
        <View style={styles.offlineContainer}>
            <Text style={styles.offlineIcon}>📡</Text>
            <View>
                <Text style={styles.offlineTitle}>Çevrimdışı Mod</Text>
                <Text style={styles.offlineSubText}>Veriler cihaz hafızasından gösteriliyor</Text>
            </View>
        </View>
    );
};

export default OfflineBanner;
