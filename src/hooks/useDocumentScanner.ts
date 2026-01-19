/**
 * useDocumentScanner Hook
 *
 * Provides document scanning functionality with auto edge detection
 * and perspective correction for NIC/CNIC documents.
 *
 * Uses react-native-document-scanner-plugin for native scanning capabilities.
 *
 * Features:
 * - Auto edge detection
 * - Perspective correction (fixes skewed photos)
 * - Built-in cropping UI
 * - Supports both camera capture and gallery selection
 */

import { useState, useCallback } from 'react';
import { Alert, Platform } from 'react-native';
import DocumentScanner, { ResponseType } from 'react-native-document-scanner-plugin';
import * as ImagePicker from 'expo-image-picker';

export interface DocumentScanResult {
    uri: string;
    width?: number;
    height?: number;
}

export interface UseDocumentScannerOptions {
    /**
     * Maximum number of documents to scan in one session
     * @default 1
     */
    maxNumDocuments?: number;
    /**
     * Response type for scanned images
     * @default 'imageFilePath'
     */
    responseType?: ResponseType;
    /**
     * Allow user to adjust corners after auto-detection
     * @default true
     */
    letUserAdjustCrop?: boolean;
}

const useDocumentScanner = (options?: UseDocumentScannerOptions) => {
    const {
        maxNumDocuments = 1,
        responseType = ResponseType.ImageFilePath,
        letUserAdjustCrop = true,
    } = options || {};

    const [scannedDocument, setScannedDocument] = useState<DocumentScanResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    /**
     * Scan document using camera with auto edge detection
     * Opens native document scanner with edge detection and cropping UI
     */
    const scanDocument = useCallback(async (): Promise<DocumentScanResult | null> => {
        try {
            setLoading(true);
            setError(null);

            // Request camera permission
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert(
                    'Permission Required',
                    'Camera access is required to scan documents. Please enable it in your device settings.',
                    [{ text: 'OK' }]
                );
                setLoading(false);
                return null;
            }

            // Start document scanner
            const result = await DocumentScanner.scanDocument({
                maxNumDocuments,
                responseType,
                letUserAdjustCrop,
            });

            // Handle cancel
            if (!result.scannedImages || result.scannedImages.length === 0) {
                setLoading(false);
                return null;
            }

            // Get the first scanned image
            const scannedUri = result.scannedImages[0];

            // Format URI for platform
            const uri = Platform.OS === 'android' && !scannedUri.startsWith('file://')
                ? `file://${scannedUri}`
                : scannedUri;

            const scanResult: DocumentScanResult = {
                uri,
            };

            setScannedDocument(scanResult);
            setLoading(false);

            if (__DEV__) {
                console.log('[useDocumentScanner] Document scanned successfully:', uri);
            }

            return scanResult;
        } catch (err: any) {
            console.error('[useDocumentScanner] Scan error:', err);

            // Handle specific errors
            if (err?.message?.includes('cancel')) {
                // User cancelled - not an error
                setLoading(false);
                return null;
            }

            const errorMessage = err?.message || 'Failed to scan document. Please try again.';
            setError(errorMessage);
            setLoading(false);

            Alert.alert('Scan Error', errorMessage);
            return null;
        }
    }, [maxNumDocuments, responseType, letUserAdjustCrop]);

    /**
     * Pick document image from gallery
     * Falls back to regular image picker for gallery selection
     * (Document scanner only works with camera)
     */
    const pickFromGallery = useCallback(async (): Promise<DocumentScanResult | null> => {
        try {
            setLoading(true);
            setError(null);

            // Request gallery permission
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert(
                    'Permission Required',
                    'Photo library access is required. Please enable it in your device settings.',
                    [{ text: 'OK' }]
                );
                setLoading(false);
                return null;
            }

            // Use expo-image-picker for gallery (document scanner is camera-only)
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [16, 10], // NIC aspect ratio
                quality: 0.9, // High quality for document text clarity
            });

            if (result.canceled || !result.assets?.[0]?.uri) {
                setLoading(false);
                return null;
            }

            const scanResult: DocumentScanResult = {
                uri: result.assets[0].uri,
                width: result.assets[0].width,
                height: result.assets[0].height,
            };

            setScannedDocument(scanResult);
            setLoading(false);

            if (__DEV__) {
                console.log('[useDocumentScanner] Image picked from gallery:', scanResult.uri);
            }

            return scanResult;
        } catch (err: any) {
            console.error('[useDocumentScanner] Gallery pick error:', err);
            const errorMessage = err?.message || 'Failed to pick image. Please try again.';
            setError(errorMessage);
            setLoading(false);

            Alert.alert('Error', errorMessage);
            return null;
        }
    }, []);

    /**
     * Show options to scan or pick from gallery
     */
    const pickDocument = useCallback(async (): Promise<DocumentScanResult | null> => {
        return new Promise((resolve) => {
            Alert.alert(
                'Upload NIC Document',
                'Scan with camera for best results (auto edge detection)',
                [
                    {
                        text: 'Scan Document',
                        onPress: async () => {
                            const result = await scanDocument();
                            resolve(result);
                        },
                    },
                    {
                        text: 'Choose from Gallery',
                        onPress: async () => {
                            const result = await pickFromGallery();
                            resolve(result);
                        },
                    },
                    {
                        text: 'Cancel',
                        style: 'cancel',
                        onPress: () => resolve(null),
                    },
                ]
            );
        });
    }, [scanDocument, pickFromGallery]);

    /**
     * Clear scanned document
     */
    const clearDocument = useCallback(() => {
        setScannedDocument(null);
        setError(null);
    }, []);

    return {
        // Main function - shows scan/gallery options
        pickDocument,
        // Direct scan with camera (edge detection)
        scanDocument,
        // Pick from gallery (manual cropping)
        pickFromGallery,
        // Scanned document result
        scannedDocument,
        // Loading state
        loading,
        // Error message if any
        error,
        // Clear document
        clearDocument,
        // Manual URI update
        setScannedDocument,
    };
};

export default useDocumentScanner;
