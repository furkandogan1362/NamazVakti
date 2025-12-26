import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Modal, FlatList, TextInput } from 'react-native';
import { useLocation } from '../contexts/LocationContext';
import { useTheme } from '../contexts/ThemeContext';
import { DiyanetManuelService } from '../api/apiDiyanetManuel';
import { loadLastLocationId, loadGPSCityInfo } from '../services/storageService';
import { PlaceItem } from '../types/types';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import GlassView from './ui/GlassView';

interface LocationPickerProps {
    onClose: () => void;
}

interface PickerItem {
    label: string;
    value: string;
}

interface CustomPickerProps {
    label: string;
    items: PickerItem[];
    selectedValue: string;
    onValueChange: (value: string) => void;
    placeholder: string;
    enabled?: boolean;
    theme: any;
    styles: any;
}

const CustomPicker: React.FC<CustomPickerProps> = ({
    label,
    items,
    selectedValue,
    onValueChange,
    placeholder,
    enabled = true,
    theme,
    styles,
}) => {
    const [modalVisible, setModalVisible] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const flatListRef = React.useRef<FlatList>(null);

    const ITEM_HEIGHT = 55; // Fixed height for smoother scrolling

    const filteredItems = useMemo(() => {
        if (!searchQuery) {return items;}

        const normalize = (text: string) => {
            let normalized = text.replace(/İ/g, 'i').replace(/I/g, 'i').replace(/ı/g, 'i');
            return normalized
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '');
        };

        const normalizedQuery = normalize(searchQuery.trim());

        return items.filter(item =>
            normalize(item.label).includes(normalizedQuery)
        );
    }, [items, searchQuery]);

    const selectedItem = items.find(i => i.value === selectedValue);

    // Scroll to selected item when modal opens
    useEffect(() => {
        if (modalVisible && selectedValue && filteredItems.length > 0 && !searchQuery) {
            const index = filteredItems.findIndex(item => item.value === selectedValue);
            if (index !== -1) {
                // Wait for modal animation and layout
                setTimeout(() => {
                    flatListRef.current?.scrollToIndex({
                        index,
                        animated: true,
                        viewPosition: 0.5,
                    });
                }, 300);
            }
        }
    }, [filteredItems, modalVisible, searchQuery, selectedValue]); // Removed filteredItems dependency to avoid scroll on search

    const handleSelect = (value: string) => {
        onValueChange(value);
        setModalVisible(false);
        setSearchQuery('');
    };

    const handleOpen = () => {
        if (enabled) {
            setModalVisible(true);
        } else {
            // Opsiyonel: Kullanıcıya neden açılmadığını belirten bir uyarı (Toast vs.)
            // Şimdilik sadece logluyoruz veya sessiz kalıyoruz.
            // Kullanıcı deneyimi için bir önceki seçimin yapılması gerektiğini belirten bir animasyon eklenebilir.
        }
    };

    return (
        <View style={styles.pickerContainer}>
            <Text style={styles.label}>{label}</Text>
            <TouchableOpacity
                style={[styles.pickerButton, !enabled && styles.disabledPicker]}
                onPress={handleOpen}
                activeOpacity={0.7}
            >
                <Text style={[styles.pickerButtonText, !selectedItem && styles.placeholderText]}>
                    {selectedItem ? selectedItem.label : placeholder}
                </Text>
                <MaterialIcons name="arrow-drop-down" size={24} color={theme.colors.secondaryText} />
            </TouchableOpacity>

            <Modal
                animationType="fade"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <GlassView style={styles.pickerModalContent} autoHeight={false} overlayOpacity={0.98}>
                        <View style={styles.pickerModalHeader}>
                            <Text style={styles.pickerModalTitle}>{label} Seçiniz</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeButton}>
                                <MaterialIcons name="close" size={24} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.searchContainer}>
                            <View style={styles.searchWrapper}>
                                <MaterialIcons name="search" size={20} color={theme.colors.secondaryText} style={styles.searchIcon} />
                                <TextInput
                                    style={styles.searchInput}
                                    placeholder="Konumunuzu arayın..."
                                    placeholderTextColor={theme.colors.secondaryText}
                                    value={searchQuery}
                                    onChangeText={setSearchQuery}
                                    autoCorrect={false}
                                />
                                {searchQuery.length > 0 && (
                                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                                        <MaterialIcons name="cancel" size={20} color={theme.colors.secondaryText} />
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>

                        <FlatList
                            ref={flatListRef}
                            data={filteredItems}
                            keyExtractor={(item) => item.value}
                            getItemLayout={(data, index) => (
                                { length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index }
                            )}
                            onScrollToIndexFailed={(info) => {
                                const wait = new Promise(resolve => setTimeout(resolve, 500));
                                wait.then(() => {
                                    flatListRef.current?.scrollToIndex({ index: info.index, animated: true });
                                });
                            }}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={[
                                        styles.pickerItem,
                                        item.value === selectedValue && styles.selectedPickerItem,
                                        { height: ITEM_HEIGHT }, // Enforce fixed height
                                    ]}
                                    onPress={() => handleSelect(item.value)}
                                >
                                    <Text style={[
                                        styles.pickerItemText,
                                        item.value === selectedValue && styles.selectedPickerItemText,
                                    ]}>
                                        {item.label}
                                    </Text>
                                    {item.value === selectedValue && (
                                        <MaterialIcons name="check" size={20} color={theme.colors.accent} />
                                    )}
                                </TouchableOpacity>
                            )}
                            contentContainerStyle={styles.listContent}
                            keyboardShouldPersistTaps="handled"
                            ListEmptyComponent={
                                <View style={styles.emptyContainer}>
                                    <Text style={styles.emptyText}>Veriler Bekleniyor</Text>
                                </View>
                            }
                        />
                    </GlassView>
                </View>
            </Modal>
        </View>
    );
};

const LocationPicker: React.FC<LocationPickerProps> = ({ onClose }) => {
    const {
        countries,
        cities,
        districts,
        selectedLocation: globalSelectedLocation,
        setSelectedLocation: setGlobalSelectedLocation,
        setCountries,
        setCities,
        setDistricts,
        addSavedLocation,
    } = useLocation();
    const { theme, isSmallScreen, screenWidth } = useTheme();

    // Local state for selection process
    const [tempSelectedLocation, setTempSelectedLocation] = useState(globalSelectedLocation);

    // Fetch cities when country changes in TEMP state
    useEffect(() => {
        const loadCitiesData = async () => {
            if (tempSelectedLocation.country) {
                const countryId = tempSelectedLocation.country.id;
                try {
                    setError('');
                    const freshData = await DiyanetManuelService.getStates(countryId);
                    setCities(freshData);
                } catch (error) {
                    console.warn('Error loading cities for temp location:', error);
                    setError('Şehirler yüklenirken bir hata oluştu. Lütfen tekrar deneyin.');
                    setCities([]);
                }
            } else {
                setCities([]);
            }
        };
        loadCitiesData();
    }, [tempSelectedLocation.country, setCities]);

    // Fetch districts when city changes in TEMP state
    useEffect(() => {
        const loadDistrictsData = async () => {
            if (tempSelectedLocation.city) {
                const cityId = tempSelectedLocation.city.id;
                try {
                    setError('');
                    const freshData = await DiyanetManuelService.getDistricts(cityId);
                    setDistricts(freshData);
                } catch (error) {
                    console.warn('Error loading districts for temp location:', error);
                    setError('İlçeler yüklenirken bir hata oluştu. Lütfen tekrar deneyin.');
                    setDistricts([]);
                }
            } else {
                setDistricts([]);
            }
        };
        loadDistrictsData();
    }, [tempSelectedLocation.city, setDistricts]);

    const [loading, setLoading] = useState(countries.length === 0);

    const [error, setError] = useState('');
    const [showSameLocationModal, setShowSameLocationModal] = useState(false);
    const [sameLocationName, setSameLocationName] = useState('');

    // Modal açıldığında mevcut cache'deki ID'leri sakla (bir kez)
    const [initialCachedIds, setInitialCachedIds] = useState<{
        manualId: number | null;
        gpsId: number | null;
    } | null>(null);

    // Component mount olduğunda cache'deki ID'leri oku
    useEffect(() => {
        const loadInitialCachedIds = async () => {
            const cachedManualLocationId = await loadLastLocationId();
            const cachedGPSCityInfo = await loadGPSCityInfo();
            const cachedGPSLocationId = cachedGPSCityInfo ? parseInt(cachedGPSCityInfo.id, 10) : null;

            setInitialCachedIds({
                manualId: cachedManualLocationId,
                gpsId: cachedGPSLocationId,
            });

            console.log('🔒 Başlangıç cache ID\'leri kaydedildi:', {
                manualId: cachedManualLocationId,
                gpsId: cachedGPSLocationId,
            });
        };

        loadInitialCachedIds();
    }, []);

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
            setTempSelectedLocation({ country: null, city: null, district: null });
            return;
        }
        const country = countries.find(c => c.id.toString() === countryId);
        if (country) {
            setTempSelectedLocation({ country, city: null, district: null });
        }
    };

    const handleCityChange = (cityId: string) => {
        if (!cityId) {
            setTempSelectedLocation({ ...tempSelectedLocation, city: null, district: null });
            return;
        }
        const city = cities.find(c => c.id.toString() === cityId);
        if (city) {
            setTempSelectedLocation({ ...tempSelectedLocation, city, district: null });
        }
    };

    const handleDistrictChange = (districtId: string) => {
        if (!districtId) {
            setTempSelectedLocation({ ...tempSelectedLocation, district: null });
            return;
        }
        const district = districts.find(d => d.id.toString() === districtId);
        if (district) {
            setTempSelectedLocation({ ...tempSelectedLocation, district });
        }
    };

    const handleConfirmLocation = async () => {
        if (tempSelectedLocation.country && tempSelectedLocation.city && tempSelectedLocation.district) {
            const selectedDistrictId = tempSelectedLocation.district.id;

            // Başlangıçta kaydedilen cache ID'lerini kullan (güncellenmiş değil!)
            if (!initialCachedIds) {
                // Henüz yüklenmemişse, yeni konum olarak kabul et
                console.log('🔄 Yeni manuel konum seçildi (cache henüz yüklenmedi):', tempSelectedLocation.district.name);
                onClose();
                return;
            }

            // Seçilen ID, BAŞLANGIÇTA kaydedilen herhangi bir cache ID ile aynı mı?
            const isSameAsManual = initialCachedIds.manualId !== null && initialCachedIds.manualId === selectedDistrictId;
            const isSameAsGPS = initialCachedIds.gpsId !== null && initialCachedIds.gpsId === selectedDistrictId;
            const isSameLocation = isSameAsManual || isSameAsGPS;

            console.log('🔍 Konum karşılaştırması (başlangıç değerleri ile):', {
                selectedDistrictId,
                initialManualId: initialCachedIds.manualId,
                initialGPSId: initialCachedIds.gpsId,
                isSameAsManual,
                isSameAsGPS,
                isSameLocation,
            });

            // Herhangi bir cache'de aynı ID varsa modal göster
            if (isSameLocation) {
                console.log('📍 Aynı konum seçildi, API isteği yapılmıyor:', tempSelectedLocation.district.name);
                setSameLocationName(tempSelectedLocation.district.name);
                setShowSameLocationModal(true);
                return;
            }

            // Farklı konum seçildi, modal kapat ve usePrayerTimes hook'u API'yi çağıracak
            console.log('🔄 Yeni manuel konum seçildi:', tempSelectedLocation.district.name);
            addSavedLocation(tempSelectedLocation);
            // Update global state only on confirm
            setGlobalSelectedLocation(tempSelectedLocation);
            onClose();
        }
    };

    const handleSameLocationModalClose = () => {
        setShowSameLocationModal(false);
        onClose();
    };

    const styles = useMemo(() => createStyles(theme, isSmallScreen, screenWidth), [theme, isSmallScreen, screenWidth]);

    // Memoize picker items
    const countryItems = useMemo(() => {
        return countries.map((country: PlaceItem) => ({
            label: country.name,
            value: country.id.toString(),
        }));
    }, [countries]);

    const cityItems = useMemo(() => {
        return cities.map((city: PlaceItem) => ({
            label: city.name,
            value: city.id.toString(),
        }));
    }, [cities]);

    const districtItems = useMemo(() => {
        return districts.map((district: PlaceItem) => ({
            label: district.name,
            value: district.id.toString(),
        }));
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
            <CustomPicker
                label="Ülke"
                items={countryItems}
                selectedValue={tempSelectedLocation.country?.id.toString() || ''}
                onValueChange={handleCountryChange}
                placeholder="Ülke Seçiniz"
                theme={theme}
                styles={styles}
            />

            <CustomPicker
                label="Şehir"
                items={cityItems}
                selectedValue={tempSelectedLocation.city?.id.toString() || ''}
                onValueChange={handleCityChange}
                placeholder="Şehir Seçiniz"
                enabled={!!tempSelectedLocation.country}
                theme={theme}
                styles={styles}
            />

            <CustomPicker
                label="İlçe"
                items={districtItems}
                selectedValue={tempSelectedLocation.district?.id.toString() || ''}
                onValueChange={handleDistrictChange}
                placeholder="İlçe Seçiniz"
                enabled={!!tempSelectedLocation.city}
                theme={theme}
                styles={styles}
            />

            {tempSelectedLocation.country && tempSelectedLocation.city && tempSelectedLocation.district && (
                <TouchableOpacity
                    style={styles.confirmButton}
                    onPress={handleConfirmLocation}
                >
                    <View style={styles.confirmButtonInner}>
                        <Text style={styles.confirmButtonText}>✓ Konumu Onayla</Text>
                    </View>
                </TouchableOpacity>
            )}

            {/* Aynı Konum Modalı */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={showSameLocationModal}
                onRequestClose={handleSameLocationModalClose}
            >
                <View style={styles.modalOverlay}>
                    <GlassView style={styles.sameLocationModal} autoHeight={true} overlayOpacity={0.95}>
                        <View style={styles.sameLocationModalInner}>
                            <View style={styles.sameLocationIconContainer}>
                                <MaterialIcons name="location-on" size={40} color={theme.colors.accent} />
                            </View>
                            <Text style={styles.sameLocationTitle}>Aynı Konum</Text>
                            <Text style={styles.sameLocationMessage}>
                                Zaten <Text style={styles.sameLocationHighlight}>{sameLocationName}</Text> konumundasınız.
                            </Text>
                            <Text style={styles.sameLocationSubMessage}>
                                Mevcut namaz vakitleri kullanılmaya devam edecek.
                            </Text>
                            <TouchableOpacity
                                style={styles.sameLocationButton}
                                onPress={handleSameLocationModalClose}
                            >
                                <Text style={styles.sameLocationButtonText}>Tamam</Text>
                            </TouchableOpacity>
                        </View>
                    </GlassView>
                </View>
            </Modal>
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
        pickerButton: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: 50,
            paddingHorizontal: 15,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: theme.colors.cardBorder,
            backgroundColor: theme.type === 'light' ? '#F0F0F0' : 'rgba(255,255,255,0.05)',
        },
        pickerButtonText: {
            fontSize: 16,
            color: theme.colors.text,
            flex: 1,
        },
        placeholderText: {
            color: theme.colors.secondaryText,
        },
        disabledPicker: {
            opacity: 0.5,
            backgroundColor: theme.type === 'light' ? '#E0E0E0' : 'rgba(0,0,0,0.02)',
        },
        // Modal Styles
        modalOverlay: {
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
        },
        pickerModalContent: {
            width: '100%',
            maxHeight: '80%',
            borderRadius: 20,
            overflow: 'hidden',
            flex: 1,
        },
        pickerModalHeader: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 16,
        },
        pickerModalTitle: {
            fontSize: 18,
            fontWeight: 'bold',
            color: theme.colors.text,
        },
        closeButton: {
            padding: 4,
        },
        searchContainer: {
            padding: 16,
        },
        searchWrapper: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: theme.type === 'light' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.1)',
            borderRadius: 12,
            paddingHorizontal: 12,
            height: 46,
        },
        searchIcon: {
            marginRight: 8,
        },
        searchInput: {
            flex: 1,
            height:theme.colors.text,
            fontSize: 16,
        },
        listContent: {
            paddingVertical: 8,
        },
        pickerItem: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingVertical: 14,
            paddingHorizontal: 20,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: theme.colors.cardBorder + '40',
        },
        selectedPickerItem: {
            backgroundColor: theme.colors.accent + '15',
        },
        pickerItemText: {
            fontSize: 16,
            color: theme.colors.text,
        },
        selectedPickerItemText: {
            color: theme.colors.accent,
            fontWeight: '600',
        },
        emptyContainer: {
            padding: 20,
            alignItems: 'center',
        },
        emptyText: {
            color: theme.colors.secondaryText,
            fontSize: 16,
        },
        // Confirm Button
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
            fontSize: 15,
            color: theme.colors.error,
            marginBottom: 16,
            textAlign: 'center',
            lineHeight: 22,
            paddingHorizontal: 10,
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
        // Aynı Konum Modal Stilleri
        sameLocationModal: {
            borderRadius: 20,
            width: '90%',
            maxWidth: 350,
        },
        sameLocationModalInner: {
            padding: 25,
            alignItems: 'center',
        },
        sameLocationIconContainer: {
            width: 70,
            height: 70,
            borderRadius: 35,
            backgroundColor: theme.colors.accent + '20',
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 16,
        },
        sameLocationTitle: {
            fontSize: 20,
            fontWeight: 'bold',
            color: theme.colors.text,
            marginBottom: 12,
            textAlign: 'center',
        },
        sameLocationMessage: {
            fontSize: 15,
            color: theme.colors.secondaryText,
            textAlign: 'center',
            lineHeight: 22,
            marginBottom: 8,
        },
        sameLocationHighlight: {
            color: theme.colors.accent,
            fontWeight: 'bold',
        },
        sameLocationSubMessage: {
            fontSize: 13,
            color: theme.colors.secondaryText,
            textAlign: 'center',
            marginBottom: 20,
            opacity: 0.8,
        },
        sameLocationButton: {
            backgroundColor: theme.colors.accent,
            paddingVertical: 12,
            paddingHorizontal: 40,
            borderRadius: 25,
            minWidth: 140,
        },
        sameLocationButtonText: {
            color: '#FFFFFF',
            fontSize: 16,
            fontWeight: 'bold',
            textAlign: 'center',
        },
    });
};
