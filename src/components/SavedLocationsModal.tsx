import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, FlatList, Animated, InteractionManager } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { Swipeable, GestureHandlerRootView } from 'react-native-gesture-handler';
import GlassView from './ui/GlassView';
import { useTheme } from '../contexts/ThemeContext';
import { useLocation } from '../contexts/LocationContext';
import { SelectedLocation } from '../types/types';

interface SavedLocationsModalProps {
    visible: boolean;
    onClose: () => void;
    onAddLocation: () => void;
    currentLocation?: {
        id?: number;        // GPS/Harita konumu ID'si
        country?: string;
        city?: string;
        district?: string;
    };
}

const SavedLocationsModal: React.FC<SavedLocationsModalProps> = ({
    visible,
    onClose,
    onAddLocation,
    currentLocation,
}) => {
    const { theme, isSmallScreen, screenWidth } = useTheme();
    const { savedLocations, selectedLocation, setSelectedLocation, removeSavedLocation, updateSavedLocations } = useLocation();
    const [locationToDelete, setLocationToDelete] = useState<SelectedLocation | null>(null);

    const swipeableRows = useRef<Array<Swipeable | null>>([]);
    const [openRowIndex, setOpenRowIndex] = useState<number | null>(null);
    const flatListRef = useRef<FlatList>(null);

    const styles = createStyles(theme, isSmallScreen, screenWidth);

    // Scroll to selected location when modal opens
    useEffect(() => {
        if (visible && savedLocations.length > 0) {
            // InteractionManager ile animasyonun bitmesini bekle
            const task = InteractionManager.runAfterInteractions(() => {
                const index = savedLocations.findIndex(loc => isLocationSelected(loc));
                if (index !== -1) {
                    flatListRef.current?.scrollToIndex({
                        index,
                        animated: true,
                        viewPosition: 0.5,
                    });
                }
            });

            return () => task.cancel();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visible, savedLocations, currentLocation]);

    const isLocationSelected = (loc: SelectedLocation) => {
        // 1. Önce ID bazlı karşılaştırma (en güvenilir)
        // GPS/Harita modunda currentLocation.id varsa ve loc.district.id ile eşleşiyorsa
        if (currentLocation?.id && loc.district?.id && currentLocation.id === loc.district.id) {
            return true;
        }

        // 2. İsim bazlı karşılaştırma (fallback)
        // Use passed currentLocation prop if available, otherwise fallback to context
        const targetCity = currentLocation?.city || selectedLocation.city?.name;
        const targetDistrict = currentLocation?.district || selectedLocation.district?.name;

        const locName = (loc.district?.name || loc.city?.name || '').toLowerCase().trim();
        const selectedName = (targetDistrict || targetCity || '').toLowerCase().trim();

        return locName === selectedName && locName !== '';
    };

    const handleSelectLocation = (location: SelectedLocation) => {
        setSelectedLocation(location);
        // Modal kapanmadan önce seçimin işlenmesi için kısa bir gecikme
        // Ancak kullanıcı deneyimi için hemen kapatmak daha iyidir.
        // App.tsx'deki useEffect zaten selectedLocation değişimini dinleyip modu güncelleyecek.
        onClose();
    };

    const handleMakePrimary = (location: SelectedLocation) => {
        const newLocations = savedLocations.filter(l => !isSameLocation(l, location));
        newLocations.unshift(location);
        updateSavedLocations(newLocations);
    };

    const isSameLocation = (loc1: SelectedLocation, loc2: SelectedLocation) => {
        // Similar logic to isLocationSelected but for two arbitrary locations
        if (loc1.district?.id && loc2.district?.id && loc1.district.id !== 0 && loc2.district.id !== 0) {
            return loc1.district.id === loc2.district.id;
        }
        const name1 = (loc1.district?.name || loc1.city?.name || '').toLowerCase().trim();
        const name2 = (loc2.district?.name || loc2.city?.name || '').toLowerCase().trim();
        return name1 === name2 && name1 !== '';
    };

    const confirmDelete = (location: SelectedLocation, index: number) => {
        if (index === 0) {
            if (swipeableRows.current[index]) {
                swipeableRows.current[index]?.close();
            }
            return;
        }
        setOpenRowIndex(index);
        setLocationToDelete(location);
    };

    const closeOpenRow = () => {
        if (openRowIndex !== null && swipeableRows.current[openRowIndex]) {
            swipeableRows.current[openRowIndex]?.close();
            setOpenRowIndex(null);
        }
    };

    const executeDelete = () => {
        if (locationToDelete) {
            // Silinen konum aktif konum mu kontrol et
            const isDeletingActiveLocation = isLocationSelected(locationToDelete);

            removeSavedLocation(locationToDelete);

            // Eğer aktif konum silindiyse, birincil konumu (ilk konum) seç
            if (isDeletingActiveLocation && savedLocations.length > 1) {
                // savedLocations henüz güncellenmedi, o yüzden silindikten sonraki ilk konumu bulmalıyız
                const remainingLocations = savedLocations.filter(l => !isSameLocation(l, locationToDelete));
                if (remainingLocations.length > 0) {
                    // İlk konum (birincil konum) seçilir
                    setSelectedLocation(remainingLocations[0]);
                }
            }

            setLocationToDelete(null);
            setOpenRowIndex(null);
        }
    };

    const cancelDelete = () => {
        closeOpenRow();
        setLocationToDelete(null);
    };

    const renderRightActions = (progress: Animated.AnimatedInterpolation<number>, dragX: Animated.AnimatedInterpolation<number>, _location: SelectedLocation) => {
        const scale = dragX.interpolate({
            inputRange: [-100, 0],
            outputRange: [1, 0],
            extrapolate: 'clamp',
        });

        return (
            <View style={styles.deleteAction}>
                <Animated.View style={{ transform: [{ scale }] }}>
                    <MaterialIcons name="delete-outline" size={30} color="#FFF" />
                </Animated.View>
            </View>
        );
    };

    const renderItem = useCallback(({ item, index }: { item: SelectedLocation; index: number }) => {
        const isSelected = isLocationSelected(item);

        return (
            <View style={styles.itemWrapper}>
                {index === 0 && (
                    <View style={styles.primaryBadge}>
                        <MaterialIcons name="star" size={12} color="#FFF" />
                        <Text style={styles.primaryBadgeText}>Birincil Konum</Text>
                    </View>
                )}
                <Swipeable
                    ref={ref => { swipeableRows.current[index] = ref; }}
                    renderRightActions={(progress, dragX) => renderRightActions(progress, dragX, item)}
                    onSwipeableWillOpen={() => confirmDelete(item, index)}
                    containerStyle={styles.swipeableContainer}
                    friction={2}
                    overshootRight={false}
                    enabled={index !== 0} // Disable swipe for primary location directly
                >
                    <TouchableOpacity
                        style={[styles.locationItem, isSelected && styles.selectedItem]}
                        onPress={() => handleSelectLocation(item)}
                        activeOpacity={0.9}
                    >
                        <View style={styles.locationInfo}>
                            <Text style={[styles.locationName, isSelected && styles.selectedText]}>
                                {item.district?.name || item.city?.name}
                            </Text>
                            <Text style={[styles.locationDetail, isSelected && styles.selectedSubText]}>
                                {item.city?.name}, {item.country?.name}
                            </Text>
                        </View>

                        <View style={styles.actions}>
                            {index !== 0 && (
                                <TouchableOpacity
                                    style={styles.actionButton}
                                    onPress={(e) => {
                                        e.stopPropagation();
                                        handleMakePrimary(item);
                                    }}
                                >
                                    <MaterialIcons name="star-outline" size={24} color={isSelected ? '#FFF' : theme.colors.secondaryText} />
                                </TouchableOpacity>
                            )}
                            {isSelected && (
                                <MaterialIcons name="check-circle" size={24} color={theme.colors.accent} style={[styles.checkIcon, isSelected && styles.selectedIcon]} />
                            )}
                            {index !== 0 && (
                                <TouchableOpacity
                                    style={styles.deleteButton}
                                    onPress={(e) => {
                                        e.stopPropagation();
                                        confirmDelete(item, index);
                                    }}
                                >
                                    <MaterialIcons name="delete-outline" size={24} color={isSelected ? '#FFF' : theme.colors.error} />
                                </TouchableOpacity>
                            )}
                        </View>
                    </TouchableOpacity>
                </Swipeable>
            </View>
        );
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [savedLocations, selectedLocation, theme, currentLocation]);

    return (
        <Modal
            animationType="fade"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <GlassView style={styles.modalContent} autoHeight={false} overlayOpacity={0.99}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Kayıtlı Konumlar</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <MaterialIcons name="close" size={24} color={theme.colors.text} />
                        </TouchableOpacity>
                    </View>

                    <GestureHandlerRootView style={styles.listContainer}>
                        <FlatList
                            ref={flatListRef}
                            data={savedLocations}
                            renderItem={renderItem}
                            keyExtractor={(item, index) => `${item.district?.id || index}-${item.city?.id || index}`}
                            contentContainerStyle={styles.listContent}
                            ListEmptyComponent={
                                <View style={styles.emptyContainer}>
                                    <MaterialIcons name="location-off" size={48} color={theme.colors.secondaryText} />
                                    <Text style={styles.emptyText}>Henüz kayıtlı konumunuz yok.</Text>
                                </View>
                            }
                            onScrollToIndexFailed={(info) => {
                                const wait = new Promise(resolve => setTimeout(resolve, 500));
                                wait.then(() => {
                                    flatListRef.current?.scrollToIndex({ index: info.index, animated: true });
                                });
                            }}
                        />
                    </GestureHandlerRootView>

                    <View style={styles.footer}>
                        <TouchableOpacity
                            style={[styles.addButton, savedLocations.length >= 10 && styles.disabledButton]}
                            onPress={onAddLocation}
                            disabled={savedLocations.length >= 10}
                        >
                            <MaterialIcons name="add" size={24} color="#FFF" />
                            <Text style={styles.addButtonText}>
                                {savedLocations.length >= 10 ? 'Maksimum Konum Sayısına Ulaşıldı' : 'Yeni Konum Ekle'}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Delete Confirmation Overlay */}
                    {locationToDelete && (
                        <View style={styles.confirmOverlay}>
                            <GlassView style={styles.confirmContent} autoHeight={true} overlayOpacity={0.98}>
                                <View style={styles.confirmInner}>
                                    <View style={styles.warningIconContainer}>
                                        <MaterialIcons name="warning" size={40} color={theme.colors.error} />
                                    </View>
                                    <Text style={styles.confirmTitle}>Konumu Sil</Text>
                                    <Text style={styles.confirmMessage}>
                                        <Text style={styles.highlightText}>{locationToDelete.district?.name || locationToDelete.city?.name}</Text> konumunu silmek istediğinize emin misiniz?
                                    </Text>
                                    <View style={styles.confirmButtons}>
                                        <TouchableOpacity style={styles.cancelButton} onPress={cancelDelete}>
                                            <Text style={styles.cancelButtonText}>Vazgeç</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity style={styles.confirmDeleteButton} onPress={executeDelete}>
                                            <Text style={styles.confirmDeleteButtonText}>Evet, Sil</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </GlassView>
                        </View>
                    )}
                </GlassView>
            </View>
        </Modal>
    );
};

const createStyles = (theme: any, _isSmallScreen: boolean, _screenWidth: number) => {
    return StyleSheet.create({
        modalOverlay: {
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
        },
        modalContent: {
            borderRadius: 20,
            width: '100%',
            maxWidth: 400,
            height: '70%',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
        },
        header: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: 20,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.cardBorder,
        },
        title: {
            fontSize: 20,
            fontWeight: 'bold',
            color: theme.colors.text,
        },
        closeButton: {
            padding: 5,
        },
        listContainer: {
            flex: 1,
        },
        listContent: {
            padding: 15,
        },
        emptyContainer: {
            alignItems: 'center',
            justifyContent: 'center',
            padding: 40,
        },
        emptyText: {
            marginTop: 10,
            fontSize: 16,
            color: theme.colors.secondaryText,
            textAlign: 'center',
        },
        itemWrapper: {
            marginBottom: 10,
            position: 'relative',
        },
        swipeableContainer: {
            borderRadius: 12,
            overflow: 'hidden',
        },
        locationItem: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 15,
            backgroundColor: theme.type === 'dark' ? '#2e2e30ff' : '#FFFFFF', // Solid background to prevent transparency issues during swipe
            borderWidth: 1,
            borderColor: theme.colors.cardBorder,
            borderRadius: 12, // Added explicit border radius
        },
        selectedItem: {
            borderColor: theme.colors.accent,
            backgroundColor: theme.colors.accent,
        },
        locationInfo: {
            flex: 1,
        },
        locationName: {
            fontSize: 16,
            fontWeight: 'bold',
            color: theme.colors.text,
        },
        locationDetail: {
            fontSize: 14,
            color: theme.colors.secondaryText,
            marginTop: 2,
        },
        selectedText: {
            color: '#FFFFFF', // White text for selected item
        },
        selectedSubText: {
            color: 'rgba(255, 255, 255, 0.8)', // White subtext for selected item
        },
        actions: {
            flexDirection: 'row',
            alignItems: 'center',
        },
        checkIcon: {
            marginRight: 10,
        },
        actionButton: {
            padding: 8,
            marginRight: 4,
        },
        selectedIcon: {
            color: '#FFFFFF',
        },
        deleteButton: {
            padding: 8,
        },
        deleteAction: {
            backgroundColor: theme.colors.error,
            justifyContent: 'center',
            alignItems: 'center',
            width: 80,
            height: '100%',
        },
        primaryBadge: {
            position: 'absolute',
            top: -8,
            left: 10,
            zIndex: 10,
            backgroundColor: theme.colors.accent,
            paddingHorizontal: 8,
            paddingVertical: 2,
            borderRadius: 10,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            shadowColor: '#000',
            shadowOffset: {
                width: 0,
                height: 1,
            },
            shadowOpacity: 0.22,
            shadowRadius: 2.22,
            elevation: 3,
        },
        primaryBadgeText: {
            color: '#FFF',
            fontSize: 10,
            fontWeight: 'bold',
        },
        footer: {
            padding: 20,
            borderTopWidth: 1,
            borderTopColor: theme.colors.cardBorder,
        },
        addButton: {
            backgroundColor: theme.colors.accent,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 15,
            borderRadius: 12,
        },
        disabledButton: {
            backgroundColor: theme.colors.secondaryText,
            opacity: 0.5,
        },
        addButtonText: {
            color: '#FFF',
            fontSize: 16,
            fontWeight: 'bold',
            marginLeft: 8,
        },
        // Confirmation Overlay Styles
        confirmOverlay: {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
        },
        confirmContent: {
            width: '100%',
            maxWidth: 320,
            borderRadius: 20,
        },
        confirmInner: {
            padding: 24,
            alignItems: 'center',
        },
        warningIconContainer: {
            width: 60,
            height: 60,
            borderRadius: 30,
            backgroundColor: theme.type === 'dark' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.1)',
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 16,
        },
        confirmTitle: {
            fontSize: 20,
            fontWeight: 'bold',
            color: theme.colors.text,
            marginBottom: 12,
        },
        confirmMessage: {
            fontSize: 16,
            color: theme.colors.secondaryText,
            textAlign: 'center',
            marginBottom: 24,
            lineHeight: 22,
        },
        highlightText: {
            color: theme.colors.text,
            fontWeight: 'bold',
        },
        confirmButtons: {
            flexDirection: 'row',
            gap: 12,
            width: '100%',
        },
        cancelButton: {
            flex: 1,
            paddingVertical: 12,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: theme.colors.cardBorder,
            alignItems: 'center',
        },
        cancelButtonText: {
            color: theme.colors.text,
            fontWeight: '600',
            fontSize: 16,
        },
        confirmDeleteButton: {
            flex: 1,
            paddingVertical: 12,
            borderRadius: 12,
            backgroundColor: theme.colors.error,
            alignItems: 'center',
        },
        confirmDeleteButtonText: {
            color: '#FFF',
            fontWeight: 'bold',
            fontSize: 16,
        },
    });
};

export default SavedLocationsModal;
