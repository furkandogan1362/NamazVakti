/**
 * Kıble Pusulası Bileşeni
 * Telefon manyetometre sensörünü kullanarak Kıble yönünü gösterir.
 * - Akıcı, anlık tepki veren pusula animasyonları
 * - ±5 derece tolerans ile doğru yön bildirimi
 * - Titreşim ile yön bildirimi
 * - Karanlık/Aydınlık tema desteği
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    Vibration,
    AppState,
} from 'react-native';
import { magnetometer, SensorTypes, setUpdateIntervalForType } from 'react-native-sensors';
import { Subscription } from 'rxjs';
import { map } from 'rxjs/operators';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
} from 'react-native-reanimated';
import Svg, { Circle, Line, G, Polygon } from 'react-native-svg';
import { useTheme } from '../contexts/ThemeContext';
import GlassView from './ui/GlassView';
import { DiyanetService, CityDetail } from '../api/apiDiyanet';
import { loadGPSCityInfo, loadLocationMode, loadLocationData } from '../services/storageService';

interface QiblaCompassProps {
    visible: boolean;
    onClose: () => void;
}

const QiblaCompass: React.FC<QiblaCompassProps> = ({ visible, onClose }) => {
    const { theme, screenWidth } = useTheme();
    const [qiblaAngle, setQiblaAngle] = useState<number | null>(null);
    const [deviceHeading, setDeviceHeading] = useState<number>(0);
    const [cityName, setCityName] = useState<string>('');
    const [regionName, setRegionName] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // AppState takibi
    const appState = useRef(AppState.currentState);
    const lastHeadingRef = useRef<number>(0);
    const lastUpdateRef = useRef<number>(0);

    // Tolerans takibi için ref
    const wasInToleranceRef = useRef<boolean>(false);
    const subscriptionRef = useRef<Subscription | null>(null);

    // Animasyon değerleri - reanimated shared values
    const compassRotation = useSharedValue(0);

    const compassSize = Math.min(screenWidth - 80, 280);
    const styles = createStyles(theme, compassSize);

    // Manyetometre verisinden açı hesapla
    const calculateHeading = useCallback((x: number, y: number): number => {
        let angle = Math.atan2(y, x) * (180 / Math.PI);
        // Kuzeyi 0 derece olarak ayarla
        angle = angle - 90;
        if (angle < 0) {
            angle += 360;
        }
        return Math.round(angle * 10) / 10; // 0.1 derece hassasiyet
    }, []);

    // Kıble açısını yükle
    const loadQiblaAngle = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);

            const locationMode = await loadLocationMode();

            let cityDetail: CityDetail | null = null;

            if (locationMode === 'gps') {
                const gpsCityInfo = await loadGPSCityInfo();
                if (gpsCityInfo?.id) {
                    cityDetail = await DiyanetService.getCityDetail(gpsCityInfo.id);
                    setCityName(gpsCityInfo.city);
                    setRegionName(gpsCityInfo.name);
                }
            } else {
                const locationData = await loadLocationData();
                if (locationData?.district?.id) {
                    cityDetail = await DiyanetService.getCityDetail(locationData.district.id.toString());
                    setCityName(locationData.city?.name || '');
                    setRegionName(locationData.district?.name || '');
                }
            }

            if (cityDetail?.qiblaAngle) {
                const angle = parseFloat(cityDetail.qiblaAngle);
                setQiblaAngle(angle);
            } else {
                setError('Kıble açısı alınamadı');
            }
        } catch (err) {
            console.error('Kıble açısı yüklenirken hata:', err);
            setError('Kıble bilgisi yüklenemedi');
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Manyetometre dinleyicisini başlat
    const startMagnetometer = useCallback(() => {
        try {
            // Varsa önceki aboneliği temizle
            if (subscriptionRef.current) {
                subscriptionRef.current.unsubscribe();
            }

            // Güncelleme aralığını ayarla - 50ms (20fps) yeterli, UI thread'i bloklamaz
            setUpdateIntervalForType(SensorTypes.magnetometer, 50);

            const subscription = magnetometer.pipe(
                map(({ x, y }) => {
                    const heading = calculateHeading(x, y);
                    return heading;
                })
            ).subscribe({
                next: (heading) => {
                    // Animasyon her zaman akıcı olsun (Reanimated UI thread'de çalışır)
                    compassRotation.value = withSpring(-heading, {
                        damping: 20,
                        stiffness: 200,
                        mass: 0.5,
                    });

                    // State update'i throttle et (her 100ms'de bir veya 1 dereceden fazla değişimde)
                    // Bu sayede JS thread'i rahatlar ve UI donmaz
                    const now = Date.now();
                    const diff = Math.abs(heading - lastHeadingRef.current);

                    if (now - lastUpdateRef.current > 100 || diff > 1) {
                        setDeviceHeading(heading);
                        lastHeadingRef.current = heading;
                        lastUpdateRef.current = now;
                    }
                },
                error: (err) => {
                    console.error('Manyetometre hatası:', err);
                    setError('Pusula sensörüne erişilemedi');
                },
            });

            subscriptionRef.current = subscription;
        } catch (err) {
            console.error('Manyetometre başlatılamadı:', err);
            setError('Pusula sensörüne erişilemedi');
        }
    }, [calculateHeading, compassRotation]);

    // Manyetometre dinleyicisini durdur
    const stopMagnetometer = useCallback(() => {
        if (subscriptionRef.current) {
            subscriptionRef.current.unsubscribe();
            subscriptionRef.current = null;
        }
    }, []);

    // Modal açıldığında sensörü başlat
    useEffect(() => {
        if (visible) {
            loadQiblaAngle();
            startMagnetometer();
            wasInToleranceRef.current = false;
        } else {
            stopMagnetometer();
        }

        return () => {
            stopMagnetometer();
        };
    }, [visible, loadQiblaAngle, startMagnetometer, stopMagnetometer]);

    // AppState takibi - Arka plana atılınca sensörü durdur, geri gelince başlat
    useEffect(() => {
        const subscription = AppState.addEventListener('change', nextAppState => {
            if (
                appState.current.match(/inactive|background/) &&
                nextAppState === 'active' &&
                visible
            ) {
                // Uygulama ön plana geldi ve modal açık -> sensörü yeniden başlat
                console.log('Pusula: Uygulama ön plana geldi, sensör başlatılıyor');
                startMagnetometer();
            } else if (
                appState.current === 'active' &&
                nextAppState.match(/inactive|background/)
            ) {
                // Uygulama arka plana gitti -> sensörü durdur
                console.log('Pusula: Uygulama arka plana gitti, sensör durduruluyor');
                stopMagnetometer();
            }

            appState.current = nextAppState;
        });

        return () => {
            subscription.remove();
        };
    }, [visible, startMagnetometer, stopMagnetometer]);

    // Tolerans kontrolü ve titreşim
    useEffect(() => {
        if (qiblaAngle === null) {return;}

        const TOLERANCE = 5; // ±5 derece
        let diff = qiblaAngle - deviceHeading;

        // Açı farkını -180 ile 180 arasına normalize et
        if (diff > 180) {diff -= 360;}
        if (diff < -180) {diff += 360;}

        const isInTolerance = Math.abs(diff) <= TOLERANCE;

        // Tolerans alanına giriş veya çıkışta titret
        if (isInTolerance !== wasInToleranceRef.current) {
            Vibration.vibrate(isInTolerance ? [0, 50, 50, 50] : [0, 100]);
            wasInToleranceRef.current = isInTolerance;
        }
    }, [deviceHeading, qiblaAngle]);

    // Yön hesaplama
    const getDirectionInfo = useCallback(() => {
        if (qiblaAngle === null) {
            return { diff: 0, isCorrect: false, direction: '' };
        }

        let diff = qiblaAngle - deviceHeading;

        // Açı farkını -180 ile 180 arasına normalize et
        if (diff > 180) {diff -= 360;}
        if (diff < -180) {diff += 360;}

        const isCorrect = Math.abs(diff) <= 5;
        let direction = '';

        if (!isCorrect) {
            direction = diff > 0 ? '→ Sağa Dönün' : '← Sola Dönün';
        }

        return { diff, isCorrect, direction };
    }, [qiblaAngle, deviceHeading]);

    const { diff, isCorrect, direction } = getDirectionInfo();

    // Animasyonlu pusula stili
    const animatedCompassStyle = useAnimatedStyle(() => {
        return {
            transform: [{ rotate: `${compassRotation.value}deg` }],
        };
    });

    // Counter rotation style for keeping elements upright
    const counterRotationStyle = useAnimatedStyle(() => {
        return {
            transform: [{ rotate: `${-compassRotation.value}deg` }],
        };
    });

    // Kabe ikonu için pozisyon hesapla (pusula dışında, sabit)
    const getKaabaPosition = () => {
        if (qiblaAngle === null) {return { x: 0, y: 0 };}
        const radius = compassSize / 2 + 25; // Pusula dışında
        const angleRad = (qiblaAngle - 90) * (Math.PI / 180);
        return {
            x: Math.cos(angleRad) * radius,
            y: Math.sin(angleRad) * radius,
        };
    };

    const kaabaPos = getKaabaPosition();

    // Pusula çizgileri
    const renderCompassMarks = () => {
        const marks = [];
        const outerRadius = compassSize / 2 - 5;
        const innerRadius = compassSize / 2 - 20;
        const smallInnerRadius = compassSize / 2 - 12;

        for (let i = 0; i < 360; i += 5) {
            const isMainMark = i % 30 === 0;
            const isMediumMark = i % 10 === 0;
            const angleRad = (i - 90) * (Math.PI / 180);
            const startR = isMainMark ? innerRadius : (isMediumMark ? smallInnerRadius : compassSize / 2 - 8);
            const endR = outerRadius;

            const x1 = Math.cos(angleRad) * startR;
            const y1 = Math.sin(angleRad) * startR;
            const x2 = Math.cos(angleRad) * endR;
            const y2 = Math.sin(angleRad) * endR;

            marks.push(
                <Line
                    key={`mark-${i}`}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={theme.colors.secondaryText}
                    strokeWidth={isMainMark ? 2 : 1}
                    opacity={isMainMark ? 1 : (isMediumMark ? 0.7 : 0.4)}
                />
            );
        }
        return marks;
    };

    // Yön harfleri
    const renderDirectionLetters = () => {
        const letters = [
            { letter: 'K', angle: 0, color: '#EF4444' }, // Kuzey - Kırmızı
            { letter: 'D', angle: 90 },
            { letter: 'G', angle: 180 },
            { letter: 'B', angle: 270 },
        ];
        const radius = compassSize / 2 - 40;
        const centerOffset = compassSize / 2;

        return letters.map(({ letter, angle, color }) => {
            const angleRad = (angle - 90) * (Math.PI / 180);
            const x = Math.cos(angleRad) * radius;
            const y = Math.sin(angleRad) * radius;

            return (
                <View
                    key={letter}
                    style={[
                        styles.directionLetterContainer,
                        {
                            left: centerOffset + x - 15,
                            top: centerOffset + y - 15,
                        },
                    ]}
                >
                    <Animated.View style={counterRotationStyle}>
                        <Text style={[
                            styles.directionLetterText,
                            { color: color || theme.colors.text },
                        ]}>
                            {letter}
                        </Text>
                    </Animated.View>
                </View>
            );
        });
    };

    // Pusula oku (ortada, telefon yönünü gösterir)
    const renderCompassNeedle = () => {
        const needleLength = compassSize / 2 - 55;
        const needleWidth = 12;

        return (
            <G>
                {/* Kuzey yönü (yeşil veya cyan) */}
                <Polygon
                    points={`0,${-needleLength} ${needleWidth / 2},0 ${-needleWidth / 2},0`}
                    fill={isCorrect ? theme.colors.success : theme.colors.accent}
                />
                {/* Güney yönü (koyu) */}
                <Polygon
                    points={`0,${needleLength / 2} ${needleWidth / 2},0 ${-needleWidth / 2},0`}
                    fill={theme.colors.cardBackground}
                    stroke={theme.colors.secondaryText}
                    strokeWidth={1}
                />
                {/* Merkez daire */}
                <Circle
                    cx={0}
                    cy={0}
                    r={10}
                    fill={isCorrect ? theme.colors.success : theme.colors.accent}
                    stroke={theme.type === 'dark' ? '#1F1F23' : '#FFFFFF'}
                    strokeWidth={2}
                />
            </G>
        );
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <GlassView style={styles.container} autoHeight overlayOpacity={0.99}>
                    <View style={styles.content}>
                        {/* Header */}
                        <View style={styles.header}>
                            <View style={styles.titleContainer}>
                                <Text style={styles.kaabaEmoji}>🕋</Text>
                                <Text style={styles.title}>Kıble Pusulası</Text>
                            </View>
                            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                                <Text style={styles.closeButtonText}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.divider} />

                        {/* Durum göstergesi */}
                        {!isLoading && !error && (
                            <View style={[
                                styles.statusBadge,
                                isCorrect ? styles.statusCorrect : styles.statusIncorrect,
                            ]}>
                                {isCorrect ? (
                                    <>
                                        <Text style={styles.statusIcon}>✓</Text>
                                        <Text style={[styles.statusText, styles.statusTextCorrect]}>
                                            Kıble Yönündesiniz!
                                        </Text>
                                    </>
                                ) : (
                                    <Text style={[styles.statusText, styles.statusTextIncorrect]}>
                                        {direction}
                                    </Text>
                                )}
                            </View>
                        )}

                        {/* Pusula */}
                        <View style={styles.compassContainer}>
                            {isLoading ? (
                                <View style={styles.loadingContainer}>
                                    <Text style={styles.loadingText}>Yükleniyor...</Text>
                                </View>
                            ) : error ? (
                                <View style={styles.errorContainer}>
                                    <Text style={styles.errorIcon}>⚠️</Text>
                                    <Text style={styles.errorText}>{error}</Text>
                                </View>
                            ) : (
                                <>
                                    {/* Kabe ikonu (pusula dışında, sabit pozisyonda) */}
                                    <Animated.View
                                        style={[
                                            styles.kaabaContainer,
                                            animatedCompassStyle,
                                            {
                                                width: compassSize + 60,
                                                height: compassSize + 60,
                                            },
                                        ]}
                                    >
                                        <View
                                            style={[
                                                styles.kaabaIcon,
                                                {
                                                    transform: [
                                                        { translateX: kaabaPos.x },
                                                        { translateY: kaabaPos.y },
                                                    ],
                                                },
                                            ]}
                                        >
                                            <Animated.View style={counterRotationStyle}>
                                                <Text style={styles.kaabaText}>🕋</Text>
                                            </Animated.View>
                                        </View>
                                    </Animated.View>

                                    {/* Pusula kadranı */}
                                    <Animated.View style={[styles.compass, animatedCompassStyle]}>
                                        <Svg
                                            width={compassSize}
                                            height={compassSize}
                                            viewBox={`${-compassSize / 2} ${-compassSize / 2} ${compassSize} ${compassSize}`}
                                        >
                                            {/* Dış çember */}
                                            <Circle
                                                cx={0}
                                                cy={0}
                                                r={compassSize / 2 - 3}
                                                stroke={theme.colors.cardBorder}
                                                strokeWidth={2}
                                                fill="none"
                                            />

                                            {/* Derece işaretleri */}
                                            {renderCompassMarks()}
                                        </Svg>

                                        {/* Yön harfleri */}
                                        {renderDirectionLetters()}
                                    </Animated.View>

                                    {/* Sabit ok (merkez) */}
                                    <View style={styles.needleContainer}>
                                        <Svg
                                            width={compassSize}
                                            height={compassSize}
                                            viewBox={`${-compassSize / 2} ${-compassSize / 2} ${compassSize} ${compassSize}`}
                                        >
                                            {renderCompassNeedle()}
                                        </Svg>
                                    </View>

                                    {/* İç daire (dekoratif) */}
                                    <View style={[styles.innerCircle, { backgroundColor: isCorrect ? theme.colors.success + '20' : theme.colors.accent + '20' }]} />
                                </>
                            )}
                        </View>

                        {/* Konum bilgisi */}
                        {!isLoading && !error && (
                            <>
                                <Text style={styles.cityName}>
                                    {regionName ? `${regionName}, ${cityName}` : cityName}
                                </Text>

                                {/* Açı bilgileri */}
                                <View style={styles.infoContainer}>
                                    <View style={styles.infoItem}>
                                        <Text style={styles.infoLabel}>KIBLE</Text>
                                        <Text style={[styles.infoValue, { color: theme.colors.success }]}>
                                            {qiblaAngle?.toFixed(1)}°
                                        </Text>
                                    </View>
                                    <View style={styles.infoDivider} />
                                    <View style={styles.infoItem}>
                                        <Text style={styles.infoLabel}>MEVCUT</Text>
                                        <Text style={styles.infoValue}>
                                            {deviceHeading.toFixed(1)}°
                                        </Text>
                                    </View>
                                    <View style={styles.infoDivider} />
                                    <View style={styles.infoItem}>
                                        <Text style={styles.infoLabel}>FARK</Text>
                                        <Text style={[
                                            styles.infoValue,
                                            { color: isCorrect ? theme.colors.success : theme.colors.accent },
                                        ]}>
                                            {diff >= 0 ? '+' : ''}{diff.toFixed(1)}°
                                        </Text>
                                    </View>
                                </View>

                                {/* Kullanım ipucu */}
                                <View style={styles.tipContainer}>
                                    <Text style={styles.tipIcon}>📱</Text>
                                    <View style={styles.tipTextContainer}>
                                        <Text style={styles.tipText}>
                                            Telefonu yere paralel tutun ve yavaşça çevirin
                                        </Text>
                                        <Text style={styles.tipSubText}>
                                            ±5° tolerans • Doğru yönde titreşim alacaksınız
                                        </Text>
                                    </View>
                                </View>
                            </>
                        )}
                    </View>
                </GlassView>
            </View>
        </Modal>
    );
};

const createStyles = (theme: any, compassSize: number) => {
    return StyleSheet.create({
        overlay: {
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
        },
        container: {
            width: '100%',
            maxWidth: 380,
            borderRadius: 24,
        },
        content: {
            padding: 20,
            alignItems: 'center',
        },
        header: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: '100%',
            marginBottom: 12,
        },
        titleContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
        },
        kaabaEmoji: {
            fontSize: 24,
        },
        title: {
            fontSize: 20,
            fontWeight: 'bold',
            color: theme.colors.text,
        },
        closeButton: {
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: theme.type === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
            justifyContent: 'center',
            alignItems: 'center',
        },
        closeButtonText: {
            fontSize: 16,
            color: theme.colors.text,
            fontWeight: '600',
        },
        divider: {
            width: '100%',
            height: 1,
            backgroundColor: theme.colors.cardBorder,
            marginBottom: 16,
        },
        statusBadge: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 10,
            paddingHorizontal: 20,
            borderRadius: 20,
            marginBottom: 20,
            gap: 8,
        },
        statusCorrect: {
            backgroundColor: theme.colors.success + '25',
        },
        statusIncorrect: {
            backgroundColor: theme.type === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
        },
        statusIcon: {
            fontSize: 16,
            color: theme.colors.success,
            fontWeight: 'bold',
        },
        statusText: {
            fontSize: 15,
            fontWeight: '600',
        },
        statusTextCorrect: {
            color: theme.colors.success,
        },
        statusTextIncorrect: {
            color: theme.colors.secondaryText,
        },
        compassContainer: {
            width: compassSize + 60,
            height: compassSize + 60,
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 20,
        },
        compass: {
            position: 'absolute',
        },
        kaabaContainer: {
            position: 'absolute',
            justifyContent: 'center',
            alignItems: 'center',
        },
        kaabaIcon: {
            position: 'absolute',
            width: 50,
            height: 50,
            borderRadius: 25,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: theme.type === 'dark' ? 'rgba(67, 193, 239, 1)' : '#44c585ff',
            borderWidth: 1,
            borderColor: theme.type === 'dark' ? 'rgba(250, 250, 249, 0.2)' : 'rgba(0, 0, 2, 0.1)',
            shadowColor: '#000',
            shadowOffset: {
                width: 0,
                height: 2,
            },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
            elevation: 5,
            marginLeft: -25,
            marginTop: -25,
        },
        kaabaText: {
            fontSize: 32,
            textShadowColor: 'rgba(0,0,0,0.3)',
            textShadowOffset: { width: 0, height: 2 },
            textShadowRadius: 3,
            opacity: 1,
            marginTop: -11,
        },
        needleContainer: {
            position: 'absolute',
        },
        innerCircle: {
            position: 'absolute',
            width: compassSize * 0.35,
            height: compassSize * 0.35,
            borderRadius: compassSize * 0.175,
        },
        loadingContainer: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
        },
        loadingText: {
            fontSize: 16,
            color: theme.colors.secondaryText,
        },
        errorContainer: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
        },
        errorIcon: {
            fontSize: 40,
            marginBottom: 10,
        },
        errorText: {
            fontSize: 14,
            color: theme.colors.error,
            textAlign: 'center',
        },
        cityName: {
            fontSize: 18,
            fontWeight: 'bold',
            color: theme.colors.text,
            marginBottom: 16,
            textTransform: 'uppercase',
            letterSpacing: 1,
        },
        infoContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: theme.type === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
            borderRadius: 16,
            paddingVertical: 12,
            paddingHorizontal: 16,
            marginBottom: 16,
            width: '100%',
        },
        infoItem: {
            flex: 1,
            alignItems: 'center',
        },
        infoDivider: {
            width: 1,
            height: 30,
            backgroundColor: theme.colors.cardBorder,
        },
        infoLabel: {
            fontSize: 11,
            color: theme.colors.secondaryText,
            fontWeight: '600',
            marginBottom: 4,
            letterSpacing: 0.5,
        },
        infoValue: {
            fontSize: 18,
            fontWeight: 'bold',
            color: theme.colors.text,
        },
        tipContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: theme.type === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
            borderRadius: 12,
            padding: 12,
            width: '100%',
            gap: 10,
        },
        tipIcon: {
            fontSize: 24,
        },
        tipTextContainer: {
            flex: 1,
        },
        tipText: {
            fontSize: 13,
            color: theme.colors.text,
            fontWeight: '500',
        },
        tipSubText: {
            fontSize: 11,
            color: theme.colors.secondaryText,
            marginTop: 2,
        },
        directionLetterContainer: {
            position: 'absolute',
            width: 30,
            height: 30,
            justifyContent: 'center',
            alignItems: 'center',
        },
        directionLetterText: {
            fontSize: 18,
            fontWeight: 'bold',
            textAlign: 'center',
        },
    });
};

export default React.memo(QiblaCompass);
