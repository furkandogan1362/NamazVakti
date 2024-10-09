// App.tsx

/**
 * Ana uygulama bileşeni
 * Bu bileşen, uygulamanın temel yapısını oluşturur ve diğer tüm bileşenleri bir araya getirir.
 * - NetworkProvider ve LocationProvider ile uygulama genelinde durum yönetimini sağlar
 * - Kullanıcı arayüzünün ana düzenini oluşturur
 * - Konum seçimi ve namaz vakitlerinin görüntülenmesini koordine eder
 * Sorumlulukları:
 * - Uygulama durumunun yönetimi
 * - Ana kullanıcı arayüzünün oluşturulması
 * - Çevrimdışı/çevrimiçi durum yönetimi
 */

import React from 'react';
import { View, Text, Button, ScrollView } from 'react-native';
import LocationPicker from './components/LocationPicker';
import PrayerTimesDisplay from './components/PrayerTimesDisplay';
import { NetworkProvider, useNetwork } from './contexts/NetworkContext';
import { LocationProvider, useLocation } from './contexts/LocationContext';
import { useLocationData } from './hooks/useLocationData';
import { usePrayerTimes } from './hooks/usePrayerTimes';
import styles from './styles/styles';

const AppContent: React.FC = () => {
    const { isOnline } = useNetwork();
    const {
        isSelectingLocation,
        selectedLocation,
        setIsSelectingLocation,
    } = useLocation();
    const prayerTimes = usePrayerTimes();
    useLocationData();

    const resetLocation = () => {
        setIsSelectingLocation(true);
    };

    return (
        <ScrollView contentContainerStyle={styles.container}>
            {!isOnline && <Text style={styles.offlineText}>Offline Mode</Text>}

            {isSelectingLocation ? (
                isOnline ? (
                    <LocationPicker />
                ) : (
                    <Text style={styles.offlineText}>
                        Please connect to the internet to select a location.
                    </Text>
                )
            ) : (
                <View style={styles.locationInfoContainer}>
                    <Text style={styles.locationText}>
                        {selectedLocation.country}, {selectedLocation.city}, {selectedLocation.region}
                    </Text>
                </View>
            )}

            {prayerTimes && <PrayerTimesDisplay prayerTimes={prayerTimes} />}

            <View style={styles.changeLocationContainer}>
                <Button
                    title="CHANGE LOCATION"
                    onPress={resetLocation}
                    disabled={!isOnline}
                />
            </View>
        </ScrollView>
    );
};

const App: React.FC = () => {
    return (
        <NetworkProvider>
            <LocationProvider>
                <AppContent />
            </LocationProvider>
        </NetworkProvider>
    );
};

export default App;
