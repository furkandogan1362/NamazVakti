import React, { useEffect, useState } from 'react';
import { View, Text, Button, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LocationPicker from './components/LocationPicker';
import PrayerTimesDisplay from './components/PrayerTimesDisplay';
import styles from './styles/styles';
import {
    fetchCountries,
    fetchCities,
    fetchRegions,
    fetchPrayerTimesByLocationId,
} from './api/apiService';
import NetInfo from '@react-native-community/netinfo';

const App: React.FC = () => {
    const [countries, setCountries] = useState<string[]>([]);
    const [cities, setCities] = useState<string[]>([]);
    const [regions, setRegions] = useState<any[]>([]);
    const [selectedCountry, setSelectedCountry] = useState<string>('');
    const [selectedCity, setSelectedCity] = useState<string>('');
    const [selectedRegion, setSelectedRegion] = useState<string>('');
    const [prayerTimes, setPrayerTimes] = useState<any>(null);
    const [isSelectingLocation, setIsSelectingLocation] = useState<boolean>(true);
    const [isOnline, setIsOnline] = useState<boolean>(true);

    const saveLocationData = async (country: string, city: string, region: string) => {
        try {
            const locationData = { country, city, region };
            await AsyncStorage.setItem('locationData', JSON.stringify(locationData));
        } catch (error) {
            console.error('Error saving location data:', error);
        }
    };

    const savePrayerTimes = async (times: any) => {
        try {
            await AsyncStorage.setItem('prayerTimes', JSON.stringify(times));
        } catch (error) {
            console.error('Error saving prayer times:', error);
        }
    };

    const loadLocationData = async () => {
        try {
            const savedData = await AsyncStorage.getItem('locationData');
            if (savedData) {
                const { country, city, region } = JSON.parse(savedData);
                setSelectedCountry(country);
                setSelectedCity(city);
                setSelectedRegion(region);
                setIsSelectingLocation(false);
            }
        } catch (error) {
            console.error('Error loading location data:', error);
        }
    };

    const loadPrayerTimes = async () => {
        try {
            const savedTimes = await AsyncStorage.getItem('prayerTimes');
            if (savedTimes) {
                setPrayerTimes(JSON.parse(savedTimes));
            }
        } catch (error) {
            console.error('Error loading prayer times:', error);
        }
    };

    useEffect(() => {
        loadLocationData();
        loadPrayerTimes();

        // Check internet connectivity
        const unsubscribe = NetInfo.addEventListener(state => {
            setIsOnline(state.isConnected ?? false);
        });

        return () => {
            unsubscribe();
        };
    }, []);

    useEffect(() => {
        const loadCountries = async () => {
            if (isOnline) {
                try {
                    const data = await fetchCountries();
                    setCountries(data);
                } catch (error) {
                    console.error('Error loading countries:', error);
                }
            }
        };
        loadCountries();
    }, [isOnline]);

    useEffect(() => {
        const loadCities = async () => {
            if (isOnline && selectedCountry) {
                try {
                    const data = await fetchCities(selectedCountry);
                    setCities(data);
                } catch (error) {
                    console.error('Error loading cities:', error);
                }
            }
        };
        loadCities();
    }, [selectedCountry, isOnline]);

    useEffect(() => {
        const loadRegions = async () => {
            if (isOnline && selectedCountry && selectedCity) {
                try {
                    const data = await fetchRegions(selectedCountry, selectedCity);
                    setRegions(data);
                } catch (error) {
                    console.error('Error loading regions:', error);
                }
            }
        };
        loadRegions();
    }, [selectedCountry, selectedCity, isOnline]);

    useEffect(() => {
        const getPrayerTimes = async () => {
            if (isOnline) {
                try {
                    if (selectedRegion) {
                        const selectedRegionObject = regions.find(region => region.region === selectedRegion);
                        if (selectedRegionObject) {
                            const locationId = selectedRegionObject.id;
                            const data = await fetchPrayerTimesByLocationId(locationId);
                            setPrayerTimes(data);
                            savePrayerTimes(data);
                            saveLocationData(selectedCountry, selectedCity, selectedRegion);
                            setIsSelectingLocation(false);
                        }
                    }
                } catch (error) {
                    console.error('Error fetching prayer times:', error);
                }
            }
        };

        if (selectedCountry && selectedCity && selectedRegion && regions.length) {
            getPrayerTimes();
        }
    }, [selectedCountry, selectedCity, selectedRegion, regions, isOnline]);

    const resetLocation = () => {
        setIsSelectingLocation(true);
        setSelectedCountry('');
        setSelectedCity('');
        setSelectedRegion('');
    };

    return (
        <ScrollView contentContainerStyle={styles.container}>
            {!isOnline && <Text style={styles.offlineText}>Offline Mode</Text>}
            {isSelectingLocation ? (
                isOnline ? (
                    <LocationPicker
                        countries={countries}
                        cities={cities}
                        regions={regions}
                        selectedCountry={selectedCountry}
                        selectedCity={selectedCity}
                        selectedRegion={selectedRegion}
                        setSelectedCountry={setSelectedCountry}
                        setSelectedCity={setSelectedCity}
                        setSelectedRegion={setSelectedRegion}
                    />
                ) : (
                    <Text style={styles.offlineText}>Please connect to the internet to select a location.</Text>
                )
            ) : (
                <View style={styles.locationInfoContainer}>
                    <Text style={styles.locationText}>
                        {selectedCountry}, {selectedCity}, {selectedRegion}
                    </Text>
                </View>
            )}

            {prayerTimes && <PrayerTimesDisplay prayerTimes={prayerTimes} />}

            <View style={styles.changeLocationContainer}>
                <Button title="CHANGE LOCATION" onPress={resetLocation} disabled={!isOnline} />
            </View>
        </ScrollView>
    );
};

export default App;
