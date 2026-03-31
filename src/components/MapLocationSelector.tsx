// MapLocationSelector.tsx

/**
 * Haritadan Konum Seçici Bileşeni
 * WebView + OpenStreetMap/Leaflet ile harita seçim ekranı
 *
 * Özellikler:
 * - Tam ekran harita görünümü (WebView ile)
 * - Sabit pin ile merkez seçimi
 * - Konum izni yönetimi (GPSLocationService tarzı)
 * - Adres bilgisi çekme (MapLocationService)
 * - Tema uyumlu tasarım
 * - Native bağımlılık sorunu yok
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    View,
    Text,
    Modal,
    TouchableOpacity,
    ActivityIndicator,
    PermissionsAndroid,
    Animated as RNAnimated,
    StyleSheet,
    Dimensions,
    Linking,
    AppState,
    AppStateStatus,
} from 'react-native';
import { WebView } from 'react-native-webview';
import Geolocation from 'react-native-geolocation-service';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../contexts/ThemeContext';
import { MapLocationService, CompleteLocationData } from '../api/apiDiyanet';
import { createStyles } from '../styles/MapLocationSelectorStyles';
import GlassView from './ui/GlassView';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Shimmer efektli skeleton elemanı
const ShimmerElement: React.FC<{ style: any; theme: any }> = ({ style, theme }) => {
    const shimmerAnim = useRef(new RNAnimated.Value(0)).current;

    useEffect(() => {
        const animation = RNAnimated.loop(
            RNAnimated.timing(shimmerAnim, {
                toValue: 1,
                duration: 1500,
                useNativeDriver: true,
            })
        );
        animation.start();
        return () => animation.stop();
    }, [shimmerAnim]);

    const translateX = shimmerAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [-SCREEN_WIDTH * 2, SCREEN_WIDTH * 2],
    });

    return (
        <View style={[style, { overflow: 'hidden' }]}>
            <RNAnimated.View
                style={{
                    ...StyleSheet.absoluteFillObject,
                    backgroundColor: theme.type === 'dark'
                        ? 'rgba(255,255,255,0.08)'
                        : 'rgba(255,255,255,0.7)',
                    transform: [{ translateX }],
                }}
            />
        </View>
    );
};

// Shimmer Skeleton Bileşeni
const MapSkeleton: React.FC<{ theme: any }> = ({ theme }) => {
    const skeletonColor = theme.type === 'dark' ? '#3f3f46' : '#d4d4d8';
    const cardBg = theme.type === 'dark' ? '#27272a' : '#ffffff';

    const skeletonStyles = StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: theme.type === 'dark' ? '#1a1a1d' : '#f5f5f5',
        },
        mapArea: {
            flex: 1,
            backgroundColor: theme.type === 'dark' ? '#27272a' : '#e5e5e5',
        },
        // Header - gerçek konumda
        header: {
            position: 'absolute',
            top: 50,
            left: 16,
            right: 16,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
        },
        headerBack: {
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: skeletonColor,
        },
        headerTitle: {
            width: 120,
            height: 20,
            borderRadius: 10,
            backgroundColor: skeletonColor,
        },
        // Merkez pin - gerçek konumda
        pinContainer: {
            position: 'absolute',
            top: '50%',
            left: '50%',
            marginLeft: -24,
            marginTop: -48,
            alignItems: 'center',
        },
        pin: {
            width: 48,
            height: 48,
            backgroundColor: skeletonColor,
            borderRadius: 24,
        },
        pinShadow: {
            width: 20,
            height: 6,
            borderRadius: 3,
            backgroundColor: skeletonColor,
            marginTop: 4,
            opacity: 0.5,
        },
        // My location button - gerçek konumda
        myLocationButton: {
            position: 'absolute',
            right: 16,
            bottom: 220,
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: skeletonColor,
        },
        // Bottom card - gerçek konumda
        bottomCard: {
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: cardBg,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            padding: 20,
            paddingBottom: 30,
            borderWidth: 1,
            borderColor: theme.colors.cardBorder,
        },
        addressRow: {
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 16,
        },
        addressIcon: {
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: skeletonColor,
            marginRight: 12,
        },
        addressLines: {
            flex: 1,
        },
        addressLine1: {
            width: '35%',
            height: 12,
            borderRadius: 6,
            backgroundColor: skeletonColor,
            marginBottom: 8,
        },
        addressLine2: {
            width: '70%',
            height: 16,
            borderRadius: 8,
            backgroundColor: skeletonColor,
        },
        coordsLine: {
            width: '50%',
            height: 14,
            borderRadius: 7,
            backgroundColor: skeletonColor,
            alignSelf: 'center',
            marginBottom: 16,
        },
        button: {
            height: 52,
            borderRadius: 16,
            backgroundColor: skeletonColor,
        },
    });

    return (
        <View style={skeletonStyles.container}>
            {/* Harita alanı (düz arka plan) */}
            <View style={skeletonStyles.mapArea} />

            {/* Header Skeleton */}
            <View style={skeletonStyles.header}>
                <ShimmerElement style={skeletonStyles.headerBack} theme={theme} />
                <ShimmerElement style={skeletonStyles.headerTitle} theme={theme} />
            </View>

            {/* Pin Skeleton */}
            <View style={skeletonStyles.pinContainer}>
                <ShimmerElement style={skeletonStyles.pin} theme={theme} />
                <View style={skeletonStyles.pinShadow} />
            </View>

            {/* My Location Button Skeleton */}
            <ShimmerElement style={skeletonStyles.myLocationButton} theme={theme} />

            {/* Bottom Card Skeleton */}
            <View style={skeletonStyles.bottomCard}>
                <View style={skeletonStyles.addressRow}>
                    <ShimmerElement style={skeletonStyles.addressIcon} theme={theme} />
                    <View style={skeletonStyles.addressLines}>
                        <ShimmerElement style={skeletonStyles.addressLine1} theme={theme} />
                        <ShimmerElement style={skeletonStyles.addressLine2} theme={theme} />
                    </View>
                </View>
                <ShimmerElement style={skeletonStyles.coordsLine} theme={theme} />
                <ShimmerElement style={skeletonStyles.button} theme={theme} />
            </View>
        </View>
    );
};

// Sonuç tipi
export interface MapLocationResult {
    success: boolean;
    cancelled?: boolean;
    locationData?: CompleteLocationData;
    error?: string;
}

interface MapLocationSelectorProps {
    visible: boolean;
    onComplete: (result: MapLocationResult) => void;
    onClose: () => void;
}

type PermissionStatus = 'checking' | 'requesting' | 'denied' | 'blocked' | 'granted';

// Leaflet harita HTML'i
const getMapHtml = (lat: number, lon: number) => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=10.0, user-scalable=yes" />
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; touch-action: pan-x pan-y; }
        html, body { width: 100%; height: 100%; overflow: hidden; touch-action: manipulation; }
        #map { width: 100%; height: 100%; touch-action: none; }
        .leaflet-control-attribution { display: none !important; }
        .leaflet-control-zoom { display: none !important; }
        .leaflet-tile { image-rendering: -webkit-optimize-contrast; image-rendering: crisp-edges; }
    </style>
</head>
<body>
    <div id="map"></div>
    <script>
        var map = L.map('map', {
            center: [${lat}, ${lon}],
            zoom: 17,
            zoomControl: false,
            attributionControl: false,
            tap: true,
            touchZoom: true,
            dragging: true,
            bounceAtZoomLimits: false
        });

        // Yüksek kaliteli tile layer (CartoDB Voyager - daha net ve okunaklı)
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png', {
            maxZoom: 20,
            minZoom: 3,
            tileSize: 512,
            zoomOffset: -1,
            detectRetina: true
        }).addTo(map);

        // Harita hareket ettiğinde merkez koordinatları gönder
        var debounceTimer;
        map.on('moveend', function() {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(function() {
                var center = map.getCenter();
                window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'moveend',
                    lat: center.lat,
                    lon: center.lng
                }));
            }, 300);
        });

        // Harita hareket etmeye başladığında
        map.on('movestart', function() {
            window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'movestart'
            }));
        });

        // React Native'den mesaj al (konum güncelleme için)
        window.setMapCenter = function(lat, lon) {
            map.setView([lat, lon], 16, { animate: true });
        };

        // İlk yüklemede koordinatları gönder
        setTimeout(function() {
            var center = map.getCenter();
            window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'ready',
                lat: center.lat,
                lon: center.lng
            }));
        }, 500);
    </script>
</body>
</html>
`;

const MapLocationSelector: React.FC<MapLocationSelectorProps> = ({
    visible,
    onComplete,
    onClose,
}) => {
    const { theme } = useTheme();
    const styles = createStyles(theme);

    // State
    const [permissionStatus, setPermissionStatus] = useState<PermissionStatus>('checking');
    const [showPermissionModal, setShowPermissionModal] = useState(false); // Özel izin modalı
    const [permissionAskedOnce, setPermissionAskedOnce] = useState(false); // İzin daha önce soruldu mu?
    const [waitingForSettings, setWaitingForSettings] = useState(false); // Ayarlardan dönüş bekleniyor mu?
    const [currentCoords, setCurrentCoords] = useState<{ lat: number; lon: number } | null>(null);
    const [locationData, setLocationData] = useState<CompleteLocationData | null>(null);
    const [isLoadingAddress, setIsLoadingAddress] = useState(false);
    const [isMoving, setIsMoving] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string>('');
    const [mapInitialized, setMapInitialized] = useState(false);
    const [showToast, setShowToast] = useState(false);

    // Refs
    const webViewRef = useRef<WebView>(null);
    const initialCoordsRef = useRef<{ lat: number; lon: number } | null>(null);
    const toastOpacity = useRef(new RNAnimated.Value(0)).current;
    const appState = useRef(AppState.currentState);

    // Varsayılan konum (Türkiye merkezi - Ankara)
    const defaultCoords = { lat: 39.9334, lon: 32.8597 };

    // HTML'i sadece bir kez oluştur (harita reset olmasın diye)
    const mapHtml = useMemo(() => {
        const coords = initialCoordsRef.current || defaultCoords;
        return getMapHtml(coords.lat, coords.lon);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mapInitialized]);

    // Toast gösterme fonksiyonu
    const showPermissionToast = () => {
        setShowToast(true);
        RNAnimated.timing(toastOpacity, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
        }).start(() => {
            // 3 saniye sonra kapat
            setTimeout(() => {
                RNAnimated.timing(toastOpacity, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                }).start(() => {
                    setShowToast(false);
                });
            }, 3000);
        });
    };

    // İzin kontrolü ve akış başlatma
    useEffect(() => {
        if (visible) {
            checkPermissionAndStart();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visible]);

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
                setWaitingForSettings(false);
                // Ayarlardan dönüldü, izin durumunu tekrar kontrol et
                checkPermissionAndStart(true);
            }
            appState.current = nextAppState;
        };

        const subscription = AppState.addEventListener('change', handleAppStateChange);

        return () => {
            subscription.remove();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [waitingForSettings, visible]);

    // İzin kontrolü (sadece Android)
    const checkPermissionAndStart = async (fromSettings: boolean = false) => {
        setPermissionStatus('checking');
        setErrorMessage('');

        const hasPermission = await PermissionsAndroid.check(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );

        if (!hasPermission) {
            // İlk kez soruyorsak veya ayarlardan döndüysek
            if (!permissionAskedOnce || fromSettings) {
                // İzin yok - modern modalı göster
                setShowPermissionModal(true);
                setPermissionStatus('denied');
            } else {
                // Daha önce soruldu ve reddedildi - blocked olarak işaretle
                setPermissionStatus('blocked');
                setShowPermissionModal(true);
            }
        } else {
            setPermissionStatus('granted');
            getCurrentLocation();
        }
    };

    // Ayarlara yönlendir
    const openSettings = () => {
        setWaitingForSettings(true);
        setShowPermissionModal(false);
        Linking.openSettings();
    };

    // Sistem izin dialogunu aç (kullanıcı modalda "İzin Ver" dediğinde)
    const requestSystemPermission = async () => {
        setShowPermissionModal(false);
        setPermissionStatus('requesting');
        setPermissionAskedOnce(true);

        // Sadece izin iste
        const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );

        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
            setPermissionStatus('granted');
            getCurrentLocation();
        } else if (granted === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
            // Kalıcı olarak engellendi
            setPermissionStatus('blocked');
            setShowPermissionModal(true);
        } else {
            // İzin reddedildi - haritayı varsayılan konumla aç ve toast göster
            openMapWithDefaultLocation();
        }
    };

    // Modal'dan "Vazgeç" butonuna basıldığında
    const handleSkipPermission = () => {
        setShowPermissionModal(false);
        openMapWithDefaultLocation();
    };

    // Varsayılan konumla haritayı aç (izin reddedildiğinde)
    const openMapWithDefaultLocation = () => {
        setPermissionStatus('granted'); // Haritayı göstermek için granted yap
        if (!initialCoordsRef.current) {
            initialCoordsRef.current = defaultCoords;
            setMapInitialized(true);
        }
        setCurrentCoords(defaultCoords);
        // Toast göster
        showPermissionToast();
    };

    // Mevcut konumu al
    const getCurrentLocation = () => {
        Geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                // İlk koordinatları kaydet (harita için)
                if (!initialCoordsRef.current) {
                    initialCoordsRef.current = { lat: latitude, lon: longitude };
                    setMapInitialized(true);
                }
                setCurrentCoords({ lat: latitude, lon: longitude });
            },
            (_error) => {
                // GPS kapalı veya erişilemez - varsayılan konumla haritayı aç ve toast göster
                if (!initialCoordsRef.current) {
                    initialCoordsRef.current = defaultCoords;
                    setMapInitialized(true);
                }
                setCurrentCoords(defaultCoords);
                // Toast göster (GPS kapalı veya erişilemez)
                showPermissionToast();
            },
            {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 10000,
            }
        );
    };

    // Adres bilgisini çek
    const fetchAddressForLocation = async (lat: number, lon: number) => {
        setIsLoadingAddress(true);
        setErrorMessage('');

        try {
            const data = await MapLocationService.getCompleteLocation(lat, lon);

            if (data) {
                setLocationData(data);
            } else {
                setErrorMessage('Bu konum için adres bilgisi bulunamadı. Lütfen farklı bir konum seçin.');
                setLocationData(null);
            }
        } catch (error) {
            console.error('Address fetch error:', error);
            setErrorMessage('Adres bilgisi alınırken bir hata oluştu.');
            setLocationData(null);
        } finally {
            setIsLoadingAddress(false);
        }
    };

    // WebView'dan gelen mesajları işle
    const handleWebViewMessage = (event: any) => {
        try {
            const data = JSON.parse(event.nativeEvent.data);

            if (data.type === 'ready') {
                setCurrentCoords({ lat: data.lat, lon: data.lon });
                fetchAddressForLocation(data.lat, data.lon);
            } else if (data.type === 'movestart') {
                setIsMoving(true);
            } else if (data.type === 'moveend') {
                setIsMoving(false);
                setCurrentCoords({ lat: data.lat, lon: data.lon });
                fetchAddressForLocation(data.lat, data.lon);
            }
        } catch (e) {
            console.error('WebView message parse error:', e);
        }
    };

    // Konumuma git butonu
    const handleMyLocation = () => {
        Geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                setCurrentCoords({ lat: latitude, lon: longitude });

                // WebView'a yeni konum gönder
                if (webViewRef.current) {
                    webViewRef.current.injectJavaScript(
                        `window.setMapCenter(${latitude}, ${longitude}); true;`
                    );
                }
            },
            (error) => {
                console.error('GPS Error:', error);
                setErrorMessage('Konum alınamadı. Lütfen GPS\'inizi kontrol edin.');
            },
            {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 0,
            }
        );
    };

    // Konumu onayla
    const handleConfirm = async () => {
        if (!locationData || !currentCoords) {
            return;
        }

        setIsSubmitting(true);

        try {
            // State'leri resetle (sonraki açılış için)
            setMapInitialized(false);
            initialCoordsRef.current = null;
            setCurrentCoords(null);
            setLocationData(null);
            setPermissionStatus('checking');

            onComplete({
                success: true,
                locationData: locationData,
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Kapat
    const handleClose = () => {
        // State'leri resetle (sonraki açılış için)
        setMapInitialized(false);
        initialCoordsRef.current = null;
        setCurrentCoords(null);
        setLocationData(null);
        setPermissionStatus('checking');

        onComplete({ success: false, cancelled: true });
        onClose();
    };

    // İzin modal render - GPSLocationService tarzı Modern Modal
    const renderPermissionModal = () => {
        if (!showPermissionModal) {
            return null;
        }

        const isBlocked = permissionStatus === 'blocked';

        return (
            <View style={permissionModalStyles.overlay}>
                <View style={permissionModalStyles.backdrop} />
                <GlassView style={permissionModalStyles.modal} autoHeight overlayOpacity={0.99}>
                    <View style={permissionModalStyles.content}>
                        {/* İkon */}
                        <View style={[
                            permissionModalStyles.iconContainer,
                            { backgroundColor: isBlocked ? '#EF4444' + '20' : theme.colors.accent + '20' },
                        ]}>
                            <MaterialIcons
                                name={isBlocked ? 'location-off' : 'location-on'}
                                size={40}
                                color={isBlocked ? '#EF4444' : theme.colors.accent}
                            />
                        </View>

                        {/* Başlık */}
                        <Text style={permissionModalStyles.title}>
                            {isBlocked ? 'İzin Engellendi' : 'Konum İzni Gerekli'}
                        </Text>

                        {/* Açıklama */}
                        <Text style={permissionModalStyles.message}>
                            {isBlocked
                                ? 'Konum izni kalıcı olarak reddedildi. Haritada konumunuzu gösterebilmemiz için ayarlardan izin vermeniz gerekiyor.'
                                : 'Haritada konumunuzu gösterebilmemiz için konum erişim izni vermeniz gerekmektedir.'}
                        </Text>

                        {/* Bilgi Kutusu */}
                        <View style={permissionModalStyles.infoBox}>
                            <MaterialIcons name="info-outline" size={18} color={theme.colors.secondaryText} />
                            <Text style={permissionModalStyles.infoText}>
                                {isBlocked
                                    ? 'Ayarlar > Uygulamalar > Namaz Vakti > İzinler > Konum yolunu izleyerek izin verebilirsiniz.'
                                    : 'İzin vermezseniz de haritayı kullanabilirsiniz, ancak konumunuz otomatik tespit edilemez.'}
                            </Text>
                        </View>

                        {/* Butonlar */}
                        <View style={permissionModalStyles.buttonContainer}>
                            <TouchableOpacity
                                style={permissionModalStyles.secondaryButton}
                                onPress={handleSkipPermission}
                            >
                                <Text style={permissionModalStyles.secondaryButtonText}>
                                    {isBlocked ? 'Manuel Konum Seç' : 'Atla'}
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[
                                    permissionModalStyles.primaryButton,
                                    isBlocked && { backgroundColor: '#3B82F6' },
                                ]}
                                onPress={isBlocked ? openSettings : requestSystemPermission}
                            >
                                <MaterialIcons
                                    name={isBlocked ? 'settings' : 'check'}
                                    size={20}
                                    color="#FFFFFF"
                                />
                                <Text style={permissionModalStyles.primaryButtonText}>
                                    {isBlocked ? 'Ayarları Aç' : 'İzin Ver'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </GlassView>
            </View>
        );
    };

    // İzin modal stilleri
    const permissionModalStyles = StyleSheet.create({
        overlay: {
            ...StyleSheet.absoluteFillObject,
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999,
            elevation: 9999,
        },
        backdrop: {
            ...StyleSheet.absoluteFillObject,
            backgroundColor: 'rgba(0,0,0,0.6)',
        },
        modal: {
            width: '90%',
            maxWidth: 380,
            borderRadius: 24,
        },
        content: {
            padding: 24,
            alignItems: 'center',
        },
        iconContainer: {
            width: 80,
            height: 80,
            borderRadius: 40,
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 20,
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
            marginBottom: 16,
        },
        infoBox: {
            flexDirection: 'row',
            alignItems: 'flex-start',
            backgroundColor: theme.type === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
            borderRadius: 12,
            padding: 12,
            marginBottom: 24,
            gap: 10,
        },
        infoText: {
            flex: 1,
            fontSize: 13,
            color: theme.colors.secondaryText,
            lineHeight: 18,
        },
        buttonContainer: {
            flexDirection: 'row',
            gap: 12,
            width: '100%',
        },
        secondaryButton: {
            flex: 1,
            paddingVertical: 14,
            borderRadius: 14,
            backgroundColor: theme.type === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
            alignItems: 'center',
            justifyContent: 'center',
        },
        secondaryButtonText: {
            fontSize: 16,
            fontWeight: '600',
            color: theme.colors.text,
        },
        primaryButton: {
            flex: 1,
            flexDirection: 'row',
            paddingVertical: 14,
            borderRadius: 14,
            backgroundColor: theme.colors.accent,
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
        },
        primaryButtonText: {
            fontSize: 16,
            fontWeight: 'bold',
            color: '#FFFFFF',
        },
    });

    // Harita ekranı render
    const renderMapScreen = () => {
        // Harita henüz hazır değilse skeleton göster
        if (!mapInitialized) {
            return <MapSkeleton theme={theme} />;
        }

        return (
            <View style={styles.container}>
                {/* Harita (WebView) */}
                <View style={styles.mapContainer}>
                    <WebView
                        ref={webViewRef}
                        source={{ html: mapHtml }}
                        style={styles.map}
                        onMessage={handleWebViewMessage}
                        javaScriptEnabled={true}
                        domStorageEnabled={true}
                        startInLoadingState={true}
                        renderLoading={() => (
                            <MapSkeleton theme={theme} />
                        )}
                        scrollEnabled={true}
                        bounces={false}
                        overScrollMode="never"
                        scalesPageToFit={true}
                        nestedScrollEnabled={true}
                        showsHorizontalScrollIndicator={false}
                        showsVerticalScrollIndicator={false}
                        setBuiltInZoomControls={false}
                        cacheEnabled={true}
                        cacheMode="LOAD_DEFAULT"
                    />

                    {/* Sabit Pin (Harita ortasında) */}
                    <View style={styles.pinContainer} pointerEvents="none">
                        <MaterialIcons
                            name="location-on"
                            size={48}
                            color={isMoving ? theme.colors.secondaryText : theme.colors.accent}
                        />
                        <View style={styles.pinShadow} />
                    </View>

                    {/* Header */}
                    <View style={styles.headerContainer}>
                        <TouchableOpacity style={styles.backButton} onPress={handleClose}>
                            <MaterialIcons name="arrow-back" size={24} color={theme.colors.text} />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Konum Seç</Text>
                        <View style={styles.placeholder} />
                    </View>
                </View>

                {/* Toast + Alt Kart Wrapper - Toast her zaman bottom card'ın hemen üstünde */}
                <View style={styles.bottomWrapper}>
                    {/* Konumuma Git - bottomWrapper'ın hemen üstünde */}
                    <TouchableOpacity style={styles.myLocationButton} onPress={handleMyLocation}>
                        <MaterialIcons name="my-location" size={24} color={theme.colors.accent} />
                    </TouchableOpacity>

                    {/* Toast Mesajı - Bottom card'a teğet */}
                    {showToast && (
                        <RNAnimated.View
                            style={[styles.toastContainerInline, { opacity: toastOpacity }]}
                            pointerEvents="none"
                        >
                            <View style={styles.toastContent}>
                                <MaterialIcons name="location-off" size={20} color={theme.colors.secondaryText} />
                                <Text style={styles.toastText}>
                                    Konumunuz açık olmadığı için konumunuzu tespit edemedik.
                                </Text>
                            </View>
                        </RNAnimated.View>
                    )}

                    {/* Alt Kart */}
                    <GlassView style={styles.bottomCard} autoHeight={true} overlayOpacity={0.99}>
                        <View style={styles.bottomCardInner}>
                        {/* Adres Bilgisi */}
                        <View style={styles.addressContainer}>
                            <View style={styles.addressIconContainer}>
                                <MaterialIcons name="place" size={24} color="#FFFFFF" />
                            </View>
                            <View style={styles.addressTextContainer}>
                                <Text style={styles.addressLabel}>Seçilen Konum</Text>
                                {isLoadingAddress || isMoving ? (
                                    <View style={styles.loadingAddressContainer}>
                                        <ActivityIndicator size="small" color={theme.colors.accent} />
                                        <Text style={styles.loadingAddressText}>
                                            {isMoving ? 'Konum seçiliyor...' : 'Adres bilgisi alınıyor...'}
                                        </Text>
                                    </View>
                                ) : locationData ? (
                                    <Text style={styles.addressText}>{locationData.formattedAddress}</Text>
                                ) : (
                                    <Text style={styles.addressText}>Konum bilgisi yok</Text>
                                )}
                            </View>
                        </View>

                        {/* Koordinatlar */}
                        {currentCoords && (
                            <View style={styles.coordsContainer}>
                                <Text style={styles.coordsText}>
                                    📍 {currentCoords.lat.toFixed(6)}, {currentCoords.lon.toFixed(6)}
                                </Text>
                            </View>
                        )}

                        {/* Hata Mesajı */}
                        {errorMessage && !isLoadingAddress && !isMoving && (
                            <View style={styles.errorContainer}>
                                <Text style={styles.errorText}>{errorMessage}</Text>
                            </View>
                        )}

                        {/* Onayla Butonu */}
                        <TouchableOpacity
                            style={[
                                styles.confirmButton,
                                (!locationData || isLoadingAddress || isSubmitting || isMoving) && styles.confirmButtonDisabled,
                            ]}
                            onPress={handleConfirm}
                            disabled={!locationData || isLoadingAddress || isSubmitting || isMoving}
                        >
                            {isSubmitting ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                                <>
                                    <MaterialIcons name="check" size={22} color="#FFFFFF" />
                                    <Text style={styles.confirmButtonText}>Bu Konumu Onayla</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </GlassView>
                </View>

                {/* Full Screen Loading */}
                {isSubmitting && (
                    <View style={styles.loadingOverlay}>
                        <View style={styles.loadingContent}>
                            <ActivityIndicator size="large" color={theme.colors.accent} />
                            <Text style={styles.loadingText}>Konum işleniyor...</Text>
                        </View>
                    </View>
                )}
            </View>
        );
    };

    // İzin durumuna göre render - artık her zaman skeleton veya map göster
    const renderContent = () => {
        const isLoading = permissionStatus === 'checking' || permissionStatus === 'requesting';

        // Skeleton göster: henüz izin kontrol ediliyorken veya harita hazır değilken
        if (isLoading || !mapInitialized) {
            return <MapSkeleton theme={theme} />;
        }

        return renderMapScreen();
    };

    return (
        <Modal
            animationType="fade"
            transparent={false}
            visible={visible}
            onRequestClose={handleClose}
            statusBarTranslucent={true}
        >
            <View style={styles.modalOverlay}>
                {renderContent()}

                {/* İzin Modalı - Overlay olarak */}
                {renderPermissionModal()}
            </View>
        </Modal>
    );
};

export default MapLocationSelector;
