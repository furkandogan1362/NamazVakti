import React from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../contexts/ThemeContext';
import { createHeaderStyles } from '../styles/HeaderStyles';

interface HeaderProps {
    onWidgetPermissionsPress: () => void;
    onQiblaCompassPress: () => void;
    onSavedLocationsPress: () => void;
    onLocationPress: () => void;
    onThemePress: () => void;
    locationButtonRef: React.RefObject<React.ElementRef<typeof TouchableOpacity>>;
    themeButtonRef: React.RefObject<React.ElementRef<typeof TouchableOpacity>>;
}

const Header: React.FC<HeaderProps> = ({
    onWidgetPermissionsPress,
    onQiblaCompassPress,
    onSavedLocationsPress,
    onLocationPress,
    onThemePress,
    locationButtonRef,
    themeButtonRef,
}) => {
    const { theme, isSmallScreen } = useTheme();
    const styles = createHeaderStyles(theme, isSmallScreen);

    return (
        <View style={styles.header}>
            <View style={styles.headerButtons}>
                <TouchableOpacity
                    style={styles.iconButton}
                    onPress={onWidgetPermissionsPress}
                >
                    <View style={styles.iconButtonInner}>
                        <MaterialIcons name="widgets" size={24} color={theme.colors.accent} />
                    </View>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.iconButton}
                    onPress={onQiblaCompassPress}
                >
                    <View style={styles.iconButtonInner}>
                        <Text style={styles.iconButtonText}>🕋</Text>
                    </View>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.iconButton}
                    onPress={onSavedLocationsPress}
                >
                    <View style={styles.iconButtonInner}>
                        <MaterialIcons name="bookmarks" size={24} color={theme.colors.accent} />
                    </View>
                </TouchableOpacity>
                <TouchableOpacity
                    ref={locationButtonRef}
                    style={styles.iconButton}
                    onPress={onLocationPress}
                    onLayout={() => {}} // Force layout calculation
                >
                    <View style={styles.iconButtonInner}>
                        <MaterialIcons
                            name="location-on"
                            size={27}
                            color={theme.colors.accent}
                        />
                    </View>
                </TouchableOpacity>
                <TouchableOpacity
                    ref={themeButtonRef}
                    style={styles.iconButton}
                    onPress={onThemePress}
                    onLayout={() => {}} // Force layout calculation
                >
                    <View style={styles.iconButtonInner}>
                        <Text style={styles.iconButtonText}>
                            {theme.type === 'light' ? '🌙' : '☀️'}
                        </Text>
                    </View>
                </TouchableOpacity>
            </View>
        </View>
    );
};

export default Header;
