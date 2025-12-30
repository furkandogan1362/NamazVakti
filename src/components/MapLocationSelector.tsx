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
    Platform,
    PermissionsAndroid,
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
    const [currentCoords, setCurrentCoords] = useState<{ lat: number; lon: number } | null>(null);
    const [locationData, setLocationData] = useState<CompleteLocationData | null>(null);
    const [isLoadingAddress, setIsLoadingAddress] = useState(false);
    const [isMoving, setIsMoving] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string>('');
    const [permissionAskedOnce, setPermissionAskedOnce] = useState(false);
    const [waitingForSettings, setWaitingForSettings] = useState(false);
    const [mapInitialized, setMapInitialized] = useState(false);

    // Refs
    const webViewRef = useRef<WebView>(null);
    const appState = useRef(AppState.currentState);
    const initialCoordsRef = useRef<{ lat: number; lon: number } | null>(null);

    // Varsayılan konum (Türkiye merkezi - Ankara)
    const defaultCoords = { lat: 39.9334, lon: 32.8597 };

    // HTML'i sadece bir kez oluştur (harita reset olmasın diye)
    const mapHtml = useMemo(() => {
        const coords = initialCoordsRef.current || defaultCoords;
        return getMapHtml(coords.lat, coords.lon);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mapInitialized]);

    // İzin kontrolü ve akış başlatma
    useEffect(() => {
        if (visible) {
            checkPermissionAndStart();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visible]);

    // Ayarlardan dönüş kontrolü
    useEffect(() => {
        const handleAppStateChange = async (nextAppState: AppStateStatus) => {
            if (
                appState.current.match(/inactive|background/) &&
                nextAppState === 'active' &&
                waitingForSettings &&
                visible
            ) {
                setWaitingForSettings(false);
                checkPermissionAndStart(true);
            }
            appState.current = nextAppState;
        };

        const subscription = AppState.addEventListener('change', handleAppStateChange);
        return () => subscription.remove();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [waitingForSettings, visible]);

    // İzin kontrolü
    const checkPermissionAndStart = async (fromSettings: boolean = false) => {
        setPermissionStatus('checking');
        setErrorMessage('');

        if (Platform.OS === 'android') {
            const hasPermission = await PermissionsAndroid.check(
                PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
            );

            if (!hasPermission) {
                if (fromSettings || !permissionAskedOnce) {
                    if (!fromSettings) {
                        setPermissionAskedOnce(true);
                    }
                    setPermissionStatus('requesting');

                    const granted = await PermissionsAndroid.request(
                        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                        {
                            title: 'Konum İzni',
                            message: 'Haritada konumunuzu gösterebilmek için konum erişimine ihtiyacımız var.',
                            buttonPositive: 'İzin Ver',
                            buttonNegative: 'İptal',
                        }
                    );

                    if (granted === PermissionsAndroid.RESULTS.GRANTED) {
                        setPermissionStatus('granted');
                        getCurrentLocation();
                    } else if (granted === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
                        setPermissionStatus('blocked');
                    } else {
                        if (fromSettings) {
                            setPermissionStatus('blocked');
                        } else {
                            setPermissionStatus('denied');
                        }
                    }
                } else {
                    setPermissionStatus('blocked');
                }
            } else {
                setPermissionStatus('granted');
                getCurrentLocation();
            }
        } else {
            // iOS için
            try {
                const authStatus = await Geolocation.requestAuthorization('whenInUse');
                if (authStatus === 'granted') {
                    setPermissionStatus('granted');
                    getCurrentLocation();
                } else if (authStatus === 'denied') {
                    setPermissionStatus('blocked');
                } else {
                    setPermissionStatus('denied');
                }
            } catch (err) {
                console.error('iOS permission error:', err);
                setPermissionStatus('denied');
            }
        }
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
            (error) => {
                console.error('GPS Error:', error);
                // Hata durumunda varsayılan bölgeyi kullan
                if (!initialCoordsRef.current) {
                    initialCoordsRef.current = defaultCoords;
                    setMapInitialized(true);
                }
                setCurrentCoords(defaultCoords);
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

    // Ayarları aç
    const openSettings = () => {
        setWaitingForSettings(true);
        if (Platform.OS === 'ios') {
            Linking.openURL('app-settings:');
        } else {
            Linking.openSettings();
        }
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

    // İzin ekranı render
    const renderPermissionScreen = () => {
        const isBlocked = permissionStatus === 'blocked';
        const isDenied = permissionStatus === 'denied';
        const isRequesting = permissionStatus === 'requesting' || permissionStatus === 'checking';

        return (
            <View style={styles.permissionContainer}>
                <View style={styles.permissionIconContainer}>
                    {isRequesting ? (
                        <ActivityIndicator size="large" color="#FFFFFF" />
                    ) : (
                        <MaterialIcons
                            name={isBlocked ? 'location-off' : 'location-on'}
                            size={50}
                            color="#FFFFFF"
                        />
                    )}
                </View>

                <Text style={styles.permissionTitle}>
                    {isRequesting
                        ? 'Konum İzni Kontrol Ediliyor'
                        : isBlocked
                        ? 'Konum İzni Engellendi'
                        : 'Konum İzni Gerekli'}
                </Text>

                <Text style={styles.permissionMessage}>
                    {isRequesting
                        ? 'Konum izni durumu kontrol ediliyor...'
                        : isBlocked
                        ? 'Haritayı kullanabilmek için ayarlardan konum iznini etkinleştirmeniz gerekiyor.'
                        : 'Haritada konumunuzu gösterebilmemiz için konum iznine ihtiyacımız var.'}
                </Text>

                <View style={styles.permissionButtonContainer}>
                    {isDenied && (
                        <TouchableOpacity
                            style={styles.permissionButton}
                            onPress={() => checkPermissionAndStart(false)}
                        >
                            <MaterialIcons name="refresh" size={20} color="#FFFFFF" />
                            <Text style={styles.permissionButtonText}>Tekrar Dene</Text>
                        </TouchableOpacity>
                    )}

                    {isBlocked && (
                        <TouchableOpacity
                            style={styles.settingsButton}
                            onPress={openSettings}
                        >
                            <MaterialIcons name="settings" size={20} color="#FFFFFF" />
                            <Text style={styles.settingsButtonText}>Ayarları Aç</Text>
                        </TouchableOpacity>
                    )}

                    {!isRequesting && (
                        <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
                            <Text style={styles.cancelButtonText}>Vazgeç</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        );
    };

    // Harita ekranı render
    const renderMapScreen = () => {
        // Harita henüz hazır değilse loading göster
        if (!mapInitialized) {
            return (
                <View style={styles.container}>
                    <View style={styles.loadingOverlay}>
                        <ActivityIndicator size="large" color={theme.colors.accent} />
                        <Text style={styles.loadingText}>Konum alınıyor...</Text>
                    </View>
                </View>
            );
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
                            <View style={styles.loadingOverlay}>
                                <ActivityIndicator size="large" color={theme.colors.accent} />
                                <Text style={styles.loadingText}>Harita yükleniyor...</Text>
                            </View>
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

                    {/* Konumuma Git */}
                    <TouchableOpacity style={styles.myLocationButton} onPress={handleMyLocation}>
                        <MaterialIcons name="my-location" size={24} color={theme.colors.accent} />
                    </TouchableOpacity>
                </View>

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

    // İzin durumuna göre render
    const renderContent = () => {
        if (permissionStatus === 'granted') {
            return renderMapScreen();
        }
        return renderPermissionScreen();
    };

    return (
        <Modal
            animationType="slide"
            transparent={false}
            visible={visible}
            onRequestClose={handleClose}
            statusBarTranslucent={true}
        >
            <View style={styles.modalOverlay}>{renderContent()}</View>
        </Modal>
    );
};

export default MapLocationSelector;
