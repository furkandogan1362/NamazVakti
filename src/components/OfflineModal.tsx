import React from 'react';
import { Modal, View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import GlassView from './ui/GlassView';
import { createOfflineModalStyles } from '../styles/OfflineModalStyles';

interface OfflineModalProps {
    visible: boolean;
    onClose: () => void;
}

const OfflineModal: React.FC<OfflineModalProps> = ({ visible, onClose }) => {
    const { theme } = useTheme();
    const styles = createOfflineModalStyles(theme);

    return (
        <Modal
            animationType="fade"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <GlassView style={styles.modalContent} autoHeight={true}>
                    <View style={styles.modalInnerContent}>
                        <Text style={styles.modalIcon}>🌐</Text>
                        <Text style={styles.modalTitle}>İnternet Bağlantısı Gerekli</Text>
                        <Text style={styles.modalMessage}>
                            Konum değiştirmek için internet bağlantınızın olması gerekiyor.
                        </Text>
                        <Text style={styles.modalSubMessage}>
                            Daha önce konum bilgisi girdiyseniz mevcut konumunuz için namaz vakitlerini çevrimdışı olarak görüntülemeye devam edebilirsiniz.
                        </Text>
                        <TouchableOpacity
                            style={styles.modalButton}
                            onPress={onClose}
                        >
                            <Text style={styles.modalButtonText}>Tamam</Text>
                        </TouchableOpacity>
                    </View>
                </GlassView>
            </View>
        </Modal>
    );
};

export default OfflineModal;
