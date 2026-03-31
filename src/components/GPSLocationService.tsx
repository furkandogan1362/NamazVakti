// GPSLocationService.tsx

/**
 * GPS konum izni isteyen ve konum verilerini alan bileşen
 * Bu bileşen, kullanıcıdan konum izni isteyerek GPS verisi ile
 * otomatik olarak namaz vakitlerini yükler.
 * Özellikler:
 * - Modern ve tema uyumlu UI
 * - Konum izni isteme
 * - GPS ile koordinat alma
 * - Diyanet API'si ile şehir bilgisi alma
 */

import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    ActivityIndicator,
    Platform,
    PermissionsAndroid,
    Linking,
    AppState,
    AppStateStatus,
    Animated,
} from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../contexts/ThemeContext';
import { DiyanetService, CityDetail, PrayerTimeData } from '../api/apiDiyanet';
import { loadGPSCityInfo, loadLastLocationId } from '../services/storageService';
import GlassView from './ui/GlassView';
import { PrayerTime } from '../types/types';

// GPS ile alınan konum sonucu tipi
export interface GPSLocationResult {
    success: boolean;
    cancelled?: boolean;
    sameLocation?: boolean; // Aynı konum mu?
    cityDetail?: CityDetail;
    prayerTimes?: PrayerTime[];
    error?: string;
    locationData?: {
        latitude: number;
        longitude: number;
    };
}

interface GPSLocationServiceProps {
    visible: boolean;
    onComplete: (result: GPSLocationResult) => void;
    onSkip: () => void;
}

type PermissionStatus = 'checking' | 'requesting' | 'denied' | 'blocked' | 'loading_location' | 'loading_data' | 'checking_cache' | 'error' | 'success';

const GPSLocationService: React.FC<GPSLocationServiceProps> = ({
    visible,
    onComplete,
    onSkip,
}) => {
    const { theme } = useTheme();

    const [status, setStatus] = useState<PermissionStatus>('checking');
    const [errorMessage, setErrorMessage] = useState<string>('');
    const [locationName, setLocationName] = useState<string>('');
    const [permissionAskedOnce, setPermissionAskedOnce] = useState<boolean>(false);
    const appState = useRef(AppState.currentState);
    const [waitingForSettings, setWaitingForSettings] = useState<boolean>(false);

    // Animasyon değerleri
    const contentOpacity = useRef(new Animated.Value(1)).current;
    const contentScale = useRef(new Animated.Value(1)).current;

    // Modal açıldığında animasyon değerlerini reset et
    useEffect(() => {
        if (visible) {
            // Modal açılınca opacity ve scale'i 1'e ayarla
            contentOpacity.setValue(1);
            contentScale.setValue(1);
        }
    }, [visible, contentOpacity, contentScale]);

    // Status değiştiğinde smooth geçiş
    const animateTransition = (callback: () => void) => {
        Animated.parallel([
            Animated.timing(contentOpacity, {
                toValue: 0.7,
                duration: 150,
                useNativeDriver: true,
            }),
            Animated.timing(contentScale, {
                toValue: 0.98,
                duration: 150,
                useNativeDriver: true,
            }),
        ]).start(() => {
            callback();
            Animated.parallel([
                Animated.timing(contentOpacity, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
                Animated.timing(contentScale, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start();
        });
    };

    // Animasyonlu status değiştirme
    const setStatusAnimated = (newStatus: PermissionStatus) => {
        if (status === newStatus) {
            setStatus(newStatus);
            return;
        }
        animateTransition(() => setStatus(newStatus));
    };

    // Diyanet API'den gelen veriyi PrayerTime formatına dönüştür
    const convertToPrayerTime = (data: PrayerTimeData): PrayerTime => {
        return {
            date: data.gregorianDateShort.split('.').reverse().join('-'), // "26.11.2025" -> "2025-11-26"
            fajr: data.fajr,
            sun: data.sunrise,
            dhuhr: data.dhuhr,
            asr: data.asr,
            maghrib: data.maghrib,
            isha: data.isha,
            hijriDate: data.hijriDateShort.split('.')[0],
            hijriMonth: data.hijriDateLong.split(' ')[1],
            hijriYear: data.hijriDateShort.split('.')[2],
            gregorianDateLong: data.gregorianDateLong,
            hijriDateLong: data.hijriDateLong,
        };
    };

    // GPS konumunu al
    const getCurrentLocation = (): Promise<{ latitude: number; longitude: number }> => {
        return new Promise((resolve, reject) => {
            Geolocation.getCurrentPosition(
                (position) => {
                    resolve({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                    });
                },
                (error) => {
                    console.error('Geolocation error:', error);
                    reject(error);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 15000,
                    maximumAge: 10000,
                }
            );
        });
    };

    // Tam akış: İzin -> Konum -> API
    const startLocationFlow = async (isRetry: boolean = false, fromSettings: boolean = false) => {
        setStatus('checking');
        setErrorMessage('');

        // Android'de önce izin durumunu kontrol et
        if (Platform.OS === 'android') {
            const currentPermission = await PermissionsAndroid.check(
                PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
            );

            if (!currentPermission) {
                // İzin yok
                if (fromSettings) {
                    // Ayarlardan döndü, hala izin yoksa blocked göster
                    setStatusAnimated('blocked');
                    return;
                } else if (!permissionAskedOnce) {
                    // İlk kez - custom modal göster (requesting state)
                    setStatusAnimated('requesting');
                    return; // Kullanıcı "İzin Ver" butonuna basmasını bekle
                } else if (isRetry || permissionAskedOnce) {
                    // Daha önce izin istendi ve retry - doğrudan blocked'a geç
                    setStatusAnimated('blocked');
                    return;
                }
            }
            // İzin zaten var, devam et
            await continueWithLocation();
        } else {
            // iOS için izin kontrolü
            try {
                const authStatus = await Geolocation.requestAuthorization('whenInUse');
                if (authStatus !== 'granted') {
                    setStatusAnimated(authStatus === 'denied' ? 'blocked' : 'denied');
                    return;
                }
                await continueWithLocation();
            } catch (err) {
                console.error('iOS permission error:', err);
                setStatus('error');
                setErrorMessage('Konum izni alınırken bir hata oluştu.');
                return;
            }
        }
    };

    // Kullanıcı "İzin Ver" butonuna bastığında sistem dialogunu aç
    const requestSystemPermission = async () => {
        setPermissionAskedOnce(true);

        const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );

        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
            // İzin verildi, devam et
            await continueWithLocation();
        } else if (granted === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
            setStatusAnimated('blocked');
        } else {
            // Reddedildi
            setStatusAnimated('denied');
        }
    };

    // Konum alma ve API çağrısı devam fonksiyonu
    const continueWithLocation = async () => {
        // 2. GPS konumunu al (izin varsa direkt konum almaya geç)
        setStatus('loading_location');

        try {
            const coords = await getCurrentLocation();

            // 3. Diyanet API'den şehir bilgisini al (retry mekanizması ile)
            setStatus('loading_data');

            let cityDetail = null;
            let retryCount = 0;
            const maxRetries = 3;

            while (!cityDetail && retryCount < maxRetries) {
                try {
                    cityDetail = await DiyanetService.getCityFromLocation(
                        coords.latitude,
                        coords.longitude
                    );
                } catch (apiError: any) {
                    retryCount++;
                    console.log(`API çağrısı başarısız (deneme ${retryCount}/${maxRetries}):`, apiError.message);
                    console.log('API Hata Detayı:', JSON.stringify(apiError.response?.data || apiError.message));

                    if (retryCount < maxRetries) {
                        // Biraz daha uzun bekleme sonra tekrar dene (token alınması için)
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    } else {
                        throw apiError;
                    }
                }
            }

            if (cityDetail) {
                setLocationName(`${cityDetail.name}, ${cityDetail.city}`);

                // Mevcut GPS ve Manuel konum cache'leri ile karşılaştır
                setStatus('checking_cache');
                const cachedGPSCityInfo = await loadGPSCityInfo();
                const cachedManualLocationId = await loadLastLocationId();

                console.log('🔍 GPSLocationService cache kontrolü:', {
                    cachedGPSCityInfo,
                    cachedManualLocationId,
                    newCityDetailId: cityDetail.id,
                    newCityDetailName: cityDetail.name,
                    gpsIdMatch: cachedGPSCityInfo ? cachedGPSCityInfo.id === cityDetail.id : 'no cache',
                    manualIdMatch: cachedManualLocationId ? cachedManualLocationId === Number(cityDetail.id) : 'no cache',
                });

                // GPS cache ile karşılaştır
                if (cachedGPSCityInfo && cachedGPSCityInfo.id === cityDetail.id) {
                    console.log('📍 Aynı GPS konumu tespit edildi, modal gösterilecek:', cityDetail.name);

                    // Aynı konum - hemen sameLocation flag'i ile tamamla
                    onComplete({
                        success: false,
                        sameLocation: true,
                        cityDetail,
                        locationData: {
                            latitude: coords.latitude,
                            longitude: coords.longitude,
                        },
                    });
                    return;
                }

                // Manuel cache ile karşılaştır (GPS -> Manuel geçişi)
                if (cachedManualLocationId && cachedManualLocationId === Number(cityDetail.id)) {
                    console.log('📍 Manuel konum ile aynı GPS konumu tespit edildi, modal gösterilecek:', cityDetail.name);

                    // Aynı konum - hemen sameLocation flag'i ile tamamla
                    onComplete({
                        success: false,
                        sameLocation: true,
                        cityDetail,
                        locationData: {
                            latitude: coords.latitude,
                            longitude: coords.longitude,
                        },
                    });
                    return;
                }

                // 4. Namaz vakitlerini al (farklı konum veya cache boş)
                console.log('🔄 Yeni GPS konumu için namaz vakitleri çekiliyor:', cityDetail.name);
                const prayerTimesData = await DiyanetService.getPrayerTimes(cityDetail.id, 'Monthly');

                // Veriyi dönüştür
                const convertedPrayerTimes = prayerTimesData.map(convertToPrayerTime);

                setStatus('success');

                // Kısa bir süre bekle, sonra tamamla
                setTimeout(() => {
                    onComplete({
                        success: true,
                        cityDetail,
                        prayerTimes: convertedPrayerTimes,
                        locationData: {
                            latitude: coords.latitude,
                            longitude: coords.longitude,
                        },
                    });
                }, 1500);
            } else {
                throw new Error('Konum bilgisi alınamadı');
            }
        } catch (error: any) {
            console.error('Location flow error:', error);

            if (error.code === 1) {
                setErrorMessage('Konum izni reddedildi.');
            } else if (error.code === 2) {
                setErrorMessage('Konum servisi kullanılamıyor. Lütfen GPS\'inizi açın.');
            } else if (error.code === 3) {
                setErrorMessage('Konum alınırken zaman aşımı oluştu.');
            } else if (error.response?.status === 401) {
                setErrorMessage('Sunucu bağlantısında bir sorun oluştu. Lütfen tekrar deneyin.');
            } else {
                setErrorMessage('Konum bilgisi alınırken bir hata oluştu.');
            }

            setStatusAnimated('error');
        }
    };

    // Ayarlara yönlendir
    const openSettings = () => {
        setWaitingForSettings(true);
        if (Platform.OS === 'ios') {
            Linking.openURL('app-settings:');
        } else {
            Linking.openSettings();
        }
    };

    // Ayarlardan döndüğünde izin durumunu kontrol et
    useEffect(() => {
        const handleAppStateChange = async (nextAppState: AppStateStatus) => {
            // Uygulama arka plandan ön plana geldiğinde
            if (
                appState.current.match(/inactive|background/) &&
                nextAppState === 'active' &&
                waitingForSettings &&
                visible
            ) {
                console.log('Ayarlardan dönüldü, izin akışı yeniden başlatılıyor...');
                setWaitingForSettings(false);

                // Ayarlardan dönüldüğünü belirterek akışı başlat
                // Bu sayede sistem izin dialogu hemen gösterilecek
                startLocationFlow(false, true);
            }
            appState.current = nextAppState;
        };

        const subscription = AppState.addEventListener('change', handleAppStateChange);

        return () => {
            subscription.remove();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [waitingForSettings, visible]);

    // Modal açıldığında akışı başlat
    useEffect(() => {
        if (visible) {
            startLocationFlow();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visible]);

    // Durum ikonunu belirle
    const getStatusIcon = () => {
        switch (status) {
            case 'checking':
            case 'requesting':
                return <MaterialIcons name="location-searching" size={60} color="#FFFFFF" />;
            case 'loading_location':
                return <MaterialIcons name="my-location" size={60} color="#FFFFFF" />;
            case 'loading_data':
            case 'checking_cache':
                return <MaterialIcons name="cloud-download" size={60} color="#FFFFFF" />;
            case 'success':
                return <MaterialIcons name="check-circle" size={60} color="#4ADE80" />;
            case 'denied':
            case 'blocked':
            case 'error':
                return <MaterialIcons name="location-off" size={60} color="#EF4444" />;
            default:
                return <MaterialIcons name="location-on" size={60} color="#FFFFFF" />;
        }
    };

    // Durum başlığını belirle
    const getStatusTitle = () => {
        switch (status) {
            case 'checking':
                return 'Konum İzni Kontrol Ediliyor';
            case 'requesting':
                return 'Konum İzni İsteniyor';
            case 'loading_location':
                return 'Konumunuz Alınıyor';
            case 'loading_data':
                return 'Namaz Vakitleri Yükleniyor';
            case 'checking_cache':
                return 'Konum Kontrol Ediliyor';
            case 'success':
                return 'Konum Belirlendi!';
            case 'denied':
                return 'İzin Reddedildi';
            case 'blocked':
                return 'İzin Engellendi';
            case 'error':
                return 'Bir Hata Oluştu';
            default:
                return 'Konum Servisi';
        }
    };

    // Durum mesajını belirle
    const getStatusMessage = () => {
        switch (status) {
            case 'checking':
                return 'Konum izni durumu kontrol ediliyor...';
            case 'requesting':
                return 'Namaz vakitlerini doğru gösterebilmemiz için konum izni vermenizi bekliyoruz.';
            case 'loading_location':
                return 'GPS sinyali aranıyor, lütfen bekleyin...';
            case 'loading_data':
                return 'Konumunuza göre namaz vakitleri getiriliyor...';
            case 'checking_cache':
                return 'Mevcut konum kontrol ediliyor...';
            case 'success':
                return locationName ? `📍 ${locationName}` : 'Konum başarıyla belirlendi!';
            case 'denied':
                return 'Konum izni olmadan GPS ile namaz vakitlerini gösteremiyoruz. Dilerseniz manuel olarak konum seçebilirsiniz.';
            case 'blocked':
                return 'Konum izni kalıcı olarak reddedildi. Ayarlardan izin vermeniz gerekiyor veya manuel konum seçebilirsiniz.';
            case 'error':
                return errorMessage || 'Konum alınırken bir sorun oluştu.';
            default:
                return '';
        }
    };

    // Yükleniyor durumu (requesting hariç - kullanıcı aksiyonu bekliyor)
    const isLoading = ['checking', 'loading_location', 'loading_data', 'checking_cache'].includes(status);

    // Animasyonlu kapanış
    const animateOut = (callback: () => void) => {
        Animated.parallel([
            Animated.timing(contentOpacity, {
                toValue: 0,
                duration: 150,
                useNativeDriver: true,
            }),
            Animated.timing(contentScale, {
                toValue: 0.95,
                duration: 150,
                useNativeDriver: true,
            }),
        ]).start(() => callback());
    };

    // Geri tuşu ile modalı kapatma
    const handleBackPress = () => {
        // Yükleme durumunda değilse veya hata/red/izin isteme durumundaysa geri dönebilir
        if (!isLoading || status === 'error' || status === 'denied' || status === 'blocked' || status === 'requesting') {
            // cancelled: true ile konum yöntemi seçim ekranına dön
            animateOut(() => onComplete({ success: false, cancelled: true }));
        }
    };

    // Animasyonlu Manuel Konum Seç
    const handleSkip = () => {
        animateOut(() => onSkip());
    };

    const styles = createStyles(theme);

    return (
        <Modal
            animationType="none"
            transparent={true}
            visible={visible}
            onRequestClose={handleBackPress}
            statusBarTranslucent={true}
        >
            <View style={styles.modalOverlay}>
                <Animated.View
                    style={[
                        styles.animatedContainer,
                        {
                            opacity: contentOpacity,
                            transform: [{ scale: contentScale }],
                        },
                    ]}
                >
                    <GlassView style={styles.modalContent} autoHeight={true} overlayOpacity={0.99}>
                        <View style={styles.modalInner}>
                            {/* İkon */}
                            <View style={styles.iconContainer}>
                                {getStatusIcon()}
                                {isLoading && (
                                    <View style={styles.loadingOverlay}>
                                        <ActivityIndicator
                                            size="large"
                                            color={theme.colors.accent}
                                            style={styles.spinner}
                                        />
                                    </View>
                                )}
                            </View>

                            {/* Başlık */}
                            <Text style={styles.title}>{getStatusTitle()}</Text>

                            {/* Mesaj */}
                            <Text style={styles.message}>{getStatusMessage()}</Text>

                            {/* GPS animasyon göstergesi */}
                            {status === 'loading_location' && (
                                <View style={styles.pulseContainer}>
                                    <View style={[styles.pulse, styles.pulse1]} />
                                    <View style={[styles.pulse, styles.pulse2]} />
                                    <View style={[styles.pulse, styles.pulse3]} />
                                </View>
                            )}

                            {/* Butonlar */}
                            <View style={styles.buttonContainer}>
                                {/* Hata/Red durumunda */}
                                {(status === 'denied' || status === 'error') && (
                                    <>
                                        <TouchableOpacity
                                            style={styles.retryButton}
                                            onPress={() => startLocationFlow(true)}
                                        >
                                            <MaterialIcons name="refresh" size={20} color="#FFFFFF" />
                                            <Text style={styles.retryButtonText}>Tekrar Dene</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.skipButton}
                                            onPress={handleSkip}
                                        >
                                            <Text style={styles.skipButtonText}>Manuel Konum Seç</Text>
                                        </TouchableOpacity>
                                    </>
                                )}

                                {/* Kalıcı engel durumunda */}
                                {status === 'blocked' && (
                                    <>
                                        <TouchableOpacity
                                            style={styles.settingsButton}
                                            onPress={openSettings}
                                        >
                                            <MaterialIcons name="settings" size={20} color="#FFFFFF" />
                                            <Text style={styles.settingsButtonText}>Ayarları Aç</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.skipButton}
                                            onPress={handleSkip}
                                        >
                                            <Text style={styles.skipButtonText}>Manuel Konum Seç</Text>
                                        </TouchableOpacity>
                                    </>
                                )}

                                {/* İzin isteme durumunda - Custom Modal */}
                                {status === 'requesting' && (
                                    <>
                                        <TouchableOpacity
                                            style={styles.retryButton}
                                            onPress={requestSystemPermission}
                                        >
                                            <MaterialIcons name="check" size={20} color="#FFFFFF" />
                                            <Text style={styles.retryButtonText}>İzin Ver</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.skipButton}
                                            onPress={handleSkip}
                                        >
                                            <Text style={styles.skipButtonText}>Manuel Konum Seç</Text>
                                        </TouchableOpacity>
                                    </>
                                )}
                            </View>
                        </View>
                    </GlassView>
                </Animated.View>
            </View>
        </Modal>
    );
};

const createStyles = (theme: any) => {
    return StyleSheet.create({
        modalOverlay: {
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
        },
        animatedContainer: {
            width: '95%',
            maxWidth: 400,
        },
        modalContent: {
            borderRadius: 20,
            width: '100%',
        },
        modalInner: {
            padding: 30,
            alignItems: 'center',
        },
        iconContainer: {
            width: 100,
            height: 100,
            borderRadius: 50,
            backgroundColor: theme.colors.accent,
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 24,
        },
        loadingOverlay: {
            position: 'absolute',
            width: 120,
            height: 120,
            justifyContent: 'center',
            alignItems: 'center',
        },
        spinner: {
            transform: [{ scale: 1.5 }],
        },
        title: {
            fontSize: 22,
            fontWeight: 'bold',
            color: theme.colors.text,
            marginBottom: 12,
            textAlign: 'center',
        },
        message: {
            fontSize: 15,
            color: theme.colors.secondaryText,
            textAlign: 'center',
            lineHeight: 22,
            marginBottom: 24,
            paddingHorizontal: 10,
        },
        pulseContainer: {
            position: 'absolute',
            top: 30,
            width: 100,
            height: 100,
            justifyContent: 'center',
            alignItems: 'center',
        },
        pulse: {
            position: 'absolute',
            width: 100,
            height: 100,
            borderRadius: 50,
            borderWidth: 2,
            borderColor: theme.colors.accent,
            opacity: 0.3,
        },
        pulse1: {
            transform: [{ scale: 1.2 }],
            opacity: 0.2,
        },
        pulse2: {
            transform: [{ scale: 1.4 }],
            opacity: 0.15,
        },
        pulse3: {
            transform: [{ scale: 1.6 }],
            opacity: 0.1,
        },
        buttonContainer: {
            width: '100%',
            gap: 12,
        },
        retryButton: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.colors.accent,
            paddingVertical: 14,
            paddingHorizontal: 24,
            borderRadius: 20,
            gap: 8,
        },
        retryButtonText: {
            color: '#FFFFFF',
            fontSize: 16,
            fontWeight: 'bold',
        },
        settingsButton: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.colors.accent,
            paddingVertical: 14,
            paddingHorizontal: 24,
            borderRadius: 20,
            gap: 8,
        },
        settingsButtonText: {
            color: '#FFFFFF',
            fontSize: 16,
            fontWeight: 'bold',
        },
        skipButton: {
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.colors.card,
            paddingVertical: 14,
            paddingHorizontal: 24,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: theme.colors.cardBorder,
        },
        skipButtonText: {
            color: theme.colors.text,
            fontSize: 16,
            fontWeight: '600',
        },
        skipLinkButton: {
            alignItems: 'center',
            paddingVertical: 10,
        },
        skipLinkText: {
            color: theme.colors.secondaryText,
            fontSize: 14,
            textDecorationLine: 'underline',
        },
    });
};

export default GPSLocationService;
