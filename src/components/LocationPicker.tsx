import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useLocation } from '../contexts/LocationContext';
import { useTheme } from '../contexts/ThemeContext';
import { DiyanetManuelService } from '../api/apiDiyanetManuel';
import { PlaceItem } from '../types/types';

interface LocationPickerProps {
    onClose: () => void;
}

const LocationPicker: React.FC<LocationPickerProps> = ({ onClose }) => {
    const {
        countries,
        cities,
        districts,
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
            const data = await DiyanetManuelService.getCountries();
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

    const handleCountryChange = (countryId: string) => {
        if (!countryId) {
            setSelectedLocation({ country: null, city: null, district: null });
            return;
        }
        const country = countries.find(c => c.id.toString() === countryId);
        if (country) {
            setSelectedLocation({ country, city: null, district: null });
        }
    };

    const handleCityChange = (cityId: string) => {
        if (!cityId) {
            setSelectedLocation({ ...selectedLocation, city: null, district: null });
            return;
        }
        const city = cities.find(c => c.id.toString() === cityId);
        if (city) {
            setSelectedLocation({ ...selectedLocation, city, district: null });
        }
    };

    const handleDistrictChange = (districtId: string) => {
        if (!districtId) {
            setSelectedLocation({ ...selectedLocation, district: null });
            return;
        }
        const district = districts.find(d => d.id.toString() === districtId);
        if (district) {
            setSelectedLocation({ ...selectedLocation, district });
        }
    };

    const handleConfirmLocation = () => {
        if (selectedLocation.country && selectedLocation.city && selectedLocation.district) {
            onClose();
        }
    };

    const styles = useMemo(() => createStyles(theme, isSmallScreen, screenWidth), [theme, isSmallScreen, screenWidth]);

    // Memoize picker items
    const countryItems = useMemo(() => {
        return [
            <Picker.Item key="default" label="Ülke Seçiniz" value="" />,
            ...countries.map((country: PlaceItem) => (
                <Picker.Item key={country.id} label={country.name} value={country.id.toString()} />
            )),
        ];
    }, [countries]);

    const cityItems = useMemo(() => {
        return [
            <Picker.Item key="default" label="Şehir Seçiniz" value="" />,
            ...cities.map((city: PlaceItem) => (
                <Picker.Item key={city.id} label={city.name} value={city.id.toString()} />
            )),
        ];
    }, [cities]);

    const districtItems = useMemo(() => {
        return [
            <Picker.Item key="default" label="İlçe Seçiniz" value="" />,
            ...districts.map((district: PlaceItem) => (
                <Picker.Item key={district.id} label={district.name} value={district.id.toString()} />
            )),
        ];
    }, [districts]);

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
                        selectedValue={selectedLocation.country?.id.toString() || ''}
                        onValueChange={handleCountryChange}
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
                        selectedValue={selectedLocation.city?.id.toString() || ''}
                        onValueChange={handleCityChange}
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
                        selectedValue={selectedLocation.district?.id.toString() || ''}
                        onValueChange={handleDistrictChange}
                        style={styles.picker}
                        enabled={!!selectedLocation.city}
                        dropdownIconColor={theme.colors.text}
                    >
                        {districtItems}
                    </Picker>
                </View>
            </View>

            {selectedLocation.country && selectedLocation.city && selectedLocation.district && (
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
