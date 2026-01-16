import * as ImagePicker from "expo-image-picker";
import { Alert } from "react-native";
import { useState, useCallback } from "react";

/**
 * Enhanced Image Picker Hook
 *
 * Supports:
 * - Profile photos (square 1:1)
 * - Document photos with proper aspect ratio (16:10 for NIC/CNIC)
 * - Camera and gallery options
 */

export type ImageType = 'profile' | 'document' | 'custom';

interface UseImagePickerOptions {
    /**
     * Type of image being picked
     * - 'profile': Square aspect ratio (1:1)
     * - 'document': NIC/CNIC aspect ratio (16:10)
     * - 'custom': Use custom aspect ratio
     */
    imageType?: ImageType;
    /**
     * Custom aspect ratio [width, height]
     * Only used when imageType is 'custom'
     */
    customAspect?: [number, number];
    /**
     * Image quality (0-1)
     * - For profile photos: 0.7
     * - For documents: 0.9 (higher for text clarity)
     */
    quality?: number;
    /**
     * Allow camera capture
     */
    allowCamera?: boolean;
}

const useImagePicker = (options?: UseImagePickerOptions) => {
    const {
        imageType = 'profile',
        customAspect,
        quality: customQuality,
        allowCamera = true,
    } = options || {};

    const [imageUri, setImageUri] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    // Determine aspect ratio based on image type
    const aspectRatio = customAspect || (imageType === 'document' ? [16, 10] : [1, 1]);

    // Determine quality based on image type
    const quality = customQuality || (imageType === 'document' ? 0.9 : 0.7);

    /**
     * Pick image from gallery
     */
    const pickFromGallery = useCallback(async () => {
        try {
            // Request permissions
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== "granted") {
                Alert.alert(
                    "Permission Required",
                    "Please enable photo library access from your settings."
                );
                return null;
            }

            setLoading(true);

            // Open image picker
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: aspectRatio,
                quality: quality,
            });

            // Handle cancel or valid selection
            if (result.canceled) {
                setLoading(false);
                return null;
            }

            const uri = result.assets?.[0]?.uri;
            if (!uri) {
                Alert.alert("Error", "Something went wrong while selecting the image.");
                setLoading(false);
                return null;
            }

            setImageUri(uri);
            setLoading(false);
            return uri;
        } catch (error: any) {
            console.error("Image picker error:", error?.message);
            Alert.alert("Error", "Failed to pick image. Please try again.");
            setLoading(false);
            return null;
        }
    }, [aspectRatio, quality]);

    /**
     * Capture photo from camera
     */
    const captureFromCamera = useCallback(async () => {
        try {
            // Request camera permissions
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== "granted") {
                Alert.alert(
                    "Permission Required",
                    "Please enable camera access from your settings."
                );
                return null;
            }

            setLoading(true);

            // Launch camera
            const result = await ImagePicker.launchCameraAsync({
                allowsEditing: true,
                aspect: aspectRatio,
                quality: quality,
            });

            // Handle cancel or valid selection
            if (result.canceled) {
                setLoading(false);
                return null;
            }

            const uri = result.assets?.[0]?.uri;
            if (!uri) {
                Alert.alert("Error", "Something went wrong while capturing photo.");
                setLoading(false);
                return null;
            }

            setImageUri(uri);
            setLoading(false);
            return uri;
        } catch (error: any) {
            console.error("Camera error:", error?.message);
            Alert.alert("Error", "Failed to capture photo. Please try again.");
            setLoading(false);
            return null;
        }
    }, [aspectRatio, quality]);

    /**
     * Main pick image function - shows action sheet if camera is allowed
     */
    const pickImage = useCallback(async () => {
        if (!allowCamera) {
            // If camera not allowed, go directly to gallery
            return pickFromGallery();
        }

        // Show action sheet
        return new Promise<string | null>((resolve) => {
            Alert.alert(
                "Select Photo",
                "Choose a photo from your gallery or take a new one",
                [
                    {
                        text: "Take Photo",
                        onPress: async () => {
                            const uri = await captureFromCamera();
                            resolve(uri);
                        },
                    },
                    {
                        text: "Choose from Gallery",
                        onPress: async () => {
                            const uri = await pickFromGallery();
                            resolve(uri);
                        },
                    },
                    {
                        text: "Cancel",
                        style: "cancel",
                        onPress: () => resolve(null),
                    },
                ]
            );
        });
    }, [allowCamera, pickFromGallery, captureFromCamera]);

    return {
        pickImage,
        pickFromGallery,
        captureFromCamera,
        imageUri,
        loading,
        setImageUri, // Allow manual URI update if needed
    };
};

export default useImagePicker;
