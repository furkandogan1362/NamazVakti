// NetworkContext.tsx

/**
 * Ağ durumu yönetimi için context sağlayıcı
 * Bu context, uygulamanın çevrimiçi/çevrimdışı durumunu takip eder ve
 * bu bilgiyi tüm uygulama bileşenlerine sağlar.
 * Özellikler:
 * - Ağ durumunu gerçek zamanlı olarak izler
 * - useNetwork hook'u ile kolay erişim sağlar
 * - Ağ değişikliklerinde otomatik olarak güncellenir
 */

import React, { createContext, useState, useEffect, useContext } from 'react';
import NetInfo from '@react-native-community/netinfo';

interface NetworkContextType {
    isOnline: boolean;
}

const NetworkContext = createContext<NetworkContextType>({ isOnline: true });

export const NetworkProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
    const [isOnline, setIsOnline] = useState(true);

    useEffect(() => {
        const unsubscribe = NetInfo.addEventListener(state => {
            setIsOnline(state.isConnected ?? false);
        });

        return () => unsubscribe();
    }, []);

    return (
        <NetworkContext.Provider value={{ isOnline }}>
            {children}
        </NetworkContext.Provider>
    );
};

export const useNetwork = () => useContext(NetworkContext);
