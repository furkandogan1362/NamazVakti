// PrayerTimesStyles.ts
import { StyleSheet, Dimensions } from 'react-native';

const windowWidth = Dimensions.get('window').width;
const cardWidth = (windowWidth - 25) / 6; // 25 for total gap (5px between each card)

const PrayerTimesStyles = StyleSheet.create({
    prayerTimesGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 15,
        paddingHorizontal: 2,
    },
    prayerTimeCard: {
        width: cardWidth,
        aspectRatio: 1,
        backgroundColor: 'rgba(50, 50, 50, 0.75)', // Daha açık gri
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: 2, // Kutucuklar arası minimal boşluk
    },
    activePrayerCard: {
        backgroundColor: '#FFA500', // Turuncu renk
        borderWidth: 2,
        borderColor: '#FFD700', // Altın sarısı kenar
    },
    prayerName: {
        color: '#E0E0E0', // Daha açık beyaz
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 2,
    },
    prayerTime: {
        color: '#E0E0E0',
        fontSize: 14,
        fontWeight: 'bold',
    },
    activePrayerText: {
        color: '#FFFFFF', // Tam beyaz
        fontWeight: '900', // Daha kalın font
    },
});

export default PrayerTimesStyles;
