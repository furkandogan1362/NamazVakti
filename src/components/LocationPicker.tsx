import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useLocation } from '../contexts/LocationContext';
import { useTheme } from '../contexts/ThemeContext';
import { fetchCountries } from '../api/apiService';

interface LocationPickerProps {
    onClose: () => void;
}

const LocationPicker: React.FC<LocationPickerProps> = ({ onClose }) => {
    const {
        countries,
        cities,
        regions,
        selectedLocation,
        setSelectedLocation,
        setCountries,
    } = useLocation();
    const { theme, isSmallScreen, screenWidth } = useTheme();
    const [loading, setLoading] = useState(countries.length === 0);
    const [error, setError] = useState('');

    const loadCountries = async () => {
        setLoading(true);
        setError('');
        try {
            const data = await fetchCountries();
            setCountries(data);
        } catch (err) {
            setError('Veriler yüklenirken bir hata oluştu.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (countries.length === 0) {
            loadCountries();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleConfirmLocation = () => {
        if (selectedLocation.country && selectedLocation.city && selectedLocation.region) {
            onClose();
        }
    };

    const styles = useMemo(() => createStyles(theme, isSmallScreen, screenWidth), [theme, isSmallScreen, screenWidth]);

    // Memoize picker items to prevent unnecessary re-renders of large lists
    const countryItems = useMemo(() => {
        return [
            <Picker.Item key="default" label="Ülke Seçiniz" value="" />,
            ...countries.map((country) => (
                <Picker.Item key={country} label={country} value={country} />
            )),
        ];
    }, [countries]);

    const cityItems = useMemo(() => {
        return [
            <Picker.Item key="default" label="Şehir Seçiniz" value="" />,
            ...cities.map((city) => (
                <Picker.Item key={city} label={city} value={city} />
            )),
        ];
    }, [cities]);

    const regionItems = useMemo(() => {
        return [
            <Picker.Item key="default" label="İlçe Seçiniz" value="" />,
            ...regions.map((region) => {
                const displayName = region.region || selectedLocation.city;
                return (
                    <Picker.Item
                        key={region.id}
                        label={displayName}
                        value={displayName}
                    />
                );
            }),
        ];
    }, [regions, selectedLocation.city]);

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.accent} />
                <Text style={styles.loadingText}>Veriler yükleniyor...</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.loadingContainer}>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={loadCountries}>
                    <Text style={styles.retryButtonText}>Tekrar Dene</Text>
                </TouchableOpacity>
            </View>
        );
    }

    if (countries.length === 0) {
        return (
            <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Veri bulunamadı.</Text>
                <TouchableOpacity style={styles.retryButton} onPress={loadCountries}>
                    <Text style={styles.retryButtonText}>Yenile</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.pickerContainer}>
                <Text style={styles.label}>Ülke</Text>
                <View style={styles.pickerWrapper}>
                    <Picker
                        selectedValue={selectedLocation.country}
                        onValueChange={(country: string) =>
                            setSelectedLocation({...selectedLocation, country, city: '', region: ''})}
                        style={styles.picker}
                        dropdownIconColor={theme.colors.text}
                    >
                        {countryItems}
                    </Picker>
                </View>
            </View>

            <View style={styles.pickerContainer}>
                <Text style={styles.label}>Şehir</Text>
                <View style={[styles.pickerWrapper, !selectedLocation.country && styles.disabledPicker]}>
                    <Picker
                        selectedValue={selectedLocation.city}
                        onValueChange={(city: string) =>
                            setSelectedLocation({...selectedLocation, city, region: ''})}
                        style={styles.picker}
                        enabled={!!selectedLocation.country}
                        dropdownIconColor={theme.colors.text}
                    >
                        {cityItems}
                    </Picker>
                </View>
            </View>

            <View style={styles.pickerContainer}>
                <Text style={styles.label}>İlçe</Text>
                <View style={[styles.pickerWrapper, !selectedLocation.city && styles.disabledPicker]}>
                    <Picker
                        selectedValue={selectedLocation.region}
                        onValueChange={(region: string) =>
                            setSelectedLocation({...selectedLocation, region})}
                        style={styles.picker}
                        enabled={!!selectedLocation.city}
                        dropdownIconColor={theme.colors.text}
                    >
                        {regionItems}
                    </Picker>
                </View>
            </View>

            {selectedLocation.country && selectedLocation.city && selectedLocation.region && (
                <TouchableOpacity
                    style={styles.confirmButton}
                    onPress={handleConfirmLocation}
                >
                    <View style={styles.confirmButtonInner}>
                        <Text style={styles.confirmButtonText}>✓ Konumu Onayla</Text>
                    </View>
                </TouchableOpacity>
            )}
        </View>
    );
};

export default React.memo(LocationPicker);

const createStyles = (theme: any, _isSmallScreen: boolean, _screenWidth: number) => {
    return StyleSheet.create({
        container: {
            width: '100%',
        },
        pickerContainer: {
            marginBottom: 15,
        },
        label: {
            fontSize: 14,
            fontWeight: '600',
            marginBottom: 8,
            color: theme.colors.secondaryText,
            marginLeft: 4,
        },
        pickerWrapper: {
            borderRadius: 12,
            borderWidth: 1,
            borderColor: theme.colors.cardBorder,
            backgroundColor: theme.type === 'light' ? '#F0F0F0' : 'rgba(255,255,255,0.1)',
            overflow: 'hidden',
        },
        disabledPicker: {
            opacity: 0.5,
            backgroundColor: theme.type === 'light' ? '#E0E0E0' : 'rgba(0,0,0,0.05)',
        },
        picker: {
            width: '100%',
            height: 50,
            color: theme.colors.text,
            backgroundColor: 'transparent',
        },
        confirmButton: {
            marginTop: 10,
            height: 50,
            borderRadius: 25,
            overflow: 'hidden',
            backgroundColor: theme.colors.buttonBackground || theme.colors.card,
            borderWidth: 1,
            borderColor: theme.colors.cardBorder,
        },
        confirmButtonInner: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: theme.type === 'light' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.2)',
        },
        confirmButtonText: {
            color: theme.colors.text,
            fontSize: 16,
            fontWeight: 'bold',
        },
        loadingContainer: {
            padding: 20,
            alignItems: 'center',
            justifyContent: 'center',
        },
        loadingText: {
            fontSize: 16,
            fontWeight: 'bold',
            color: theme.colors.text,
            marginBottom: 8,
        },
        loadingSubText: {
            fontSize: 14,
            color: theme.colors.secondaryText,
            textAlign: 'center',
        },
        errorText: {
            fontSize: 14,
            color: 'red',
            marginBottom: 10,
        },
        retryButton: {
            marginTop: 10,
            paddingVertical: 10,
            paddingHorizontal: 20,
            borderRadius: 25,
            backgroundColor: theme.colors.buttonBackground,
            borderWidth: 1,
            borderColor: theme.colors.cardBorder,
        },
        retryButtonText: {
            color: theme.colors.text,
            fontSize: 16,
            fontWeight: 'bold',
        },
    });
};

export default LocationPicker;
