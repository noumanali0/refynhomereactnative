import { useEffect } from 'react';
import { BackHandler, Platform } from 'react-native';

export function useBackHandlerExit() {
    useEffect(() => {
        if (Platform.OS === 'web') {
            return;
        }

        const backHandler = BackHandler.addEventListener(
            'hardwareBackPress',
            () => {
                BackHandler.exitApp();
                return true;
            }
        );

        return () => backHandler.remove();
    }, []);
}
