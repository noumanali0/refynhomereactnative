import * as ImagePicker from "expo-image-picker";
import { Alert } from "react-native";
import { useState, useCallback } from "react";

const useImagePicker = () => {
    const [imageUri, setImageUri] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    // const {showToast} = useToastServices();

    const pickImage = useCallback(async () => {
        try {
            // Step 1: Request permissions once (can move this to app init too)
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== "granted") {
                Alert.alert(
                    "Permission Required",
                    "Please enable photo library access from your settings."
                );
                return;
            }

            // Step 2: Open image picker
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.7,
            });

            // Step 3: Handle cancel or valid selection
            if (result.canceled) return;

            const uri = result.assets?.[0]?.uri;
            if (!uri) {
                Alert.alert("Error", "Something went wrong while selecting the image.");
                return;
            }

            // Step 4: Optimistic UI + upload
            setImageUri(uri);
            // setLoading(true);
            // await uploadTeamAvatar(teamId, uri);
            // showToast("Profile picture updated", "success");
            // Alert.alert("Success", "Profile picture updated successfully!");
        } catch (error: any) {
            // const apiError = error as ApiError
            console.error("Image picker error:", error?.message);
            // showToast("Unable to upload image. Please try again.", "danger");
            // Alert.alert("Upload Failed", "Unable to upload image. Please try again.");
        } finally {
            setLoading(false);
        }
    }, []);

    return { pickImage, imageUri, loading };
};

export default useImagePicker;
