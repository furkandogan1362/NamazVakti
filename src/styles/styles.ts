// styles.ts
import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    changeLocationContainer: {
        marginTop: 20,
    },
    locationInfoContainer: {
        marginTop: 20,
        flexDirection: 'row',
        justifyContent: 'center',
    },
    locationText: {
        fontSize: 16,
        fontWeight: 'bold',
    },

    offlineText: {
        color: 'red',
        fontWeight: 'bold',
        marginBottom: 10,
    },
    // Add any other existing styles here
});

export default styles;
