import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
    Image,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Calendar, MapPin, DollarSign, Camera } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';

const requestSchema = yup.object({
    serviceType: yup.string().required('Service type is required'),
    title: yup.string().required('Title is required').min(5, 'Title too short'),
    description: yup.string().required('Description is required').min(20, 'Description too short'),
    preferredDate: yup.date().required('Preferred date is required').min(new Date(), 'Date must be in future'),
    estimatedBudget: yup.number().positive('Budget must be positive').nullable(),
});

interface CreateRequestFormProps {
    onSubmit: (data: any) => void;
    onCancel: () => void;
}

export const CreateRequestForm: React.FC<CreateRequestFormProps> = ({
    onSubmit,
    onCancel,
}) => {
    const [photos, setPhotos] = useState<string[]>([]);
    const [selectedAddress, setSelectedAddress] = useState<any>(null);

    const {
        control,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm({
        resolver: yupResolver(requestSchema),
        defaultValues: {
            serviceType: '',
            title: '',
            description: '',
            preferredDate: new Date(),
            estimatedBudget: null,
        },
    });

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsMultipleSelection: true,
            quality: 0.8,
        });

        if (!result.canceled) {
            const uris = result.assets.map(asset => asset.uri);
            setPhotos([...photos, ...uris]);
        }
    };

    const onSubmitForm = (data: any) => {
        onSubmit({
            ...data,
            photos,
            address: selectedAddress || {
                street: '123 Main St',
                city: 'San Francisco',
                state: 'CA',
                zipCode: '94102',
                country: 'US',
                latitude: 37.7749,
                longitude: -122.4194,
            },
        });
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <Text style={styles.title}>Create Service Request</Text>

            {/* Service Type */}
            <View style={styles.fieldContainer}>
                <Text style={styles.label}>Service Type *</Text>
                <Controller
                    control={control}
                    name="serviceType"
                    render={({ field: { onChange, value } }) => (
                        <TextInput
                            style={[styles.input, errors.serviceType && styles.inputError]}
                            placeholder="e.g., AC Repair, Plumbing"
                            value={value}
                            onChangeText={onChange}
                        />
                    )}
                />
                {errors.serviceType && (
                    <Text style={styles.errorText}>{errors.serviceType.message}</Text>
                )}
            </View>

            {/* Title */}
            <View style={styles.fieldContainer}>
                <Text style={styles.label}>Title *</Text>
                <Controller
                    control={control}
                    name="title"
                    render={({ field: { onChange, value } }) => (
                        <TextInput
                            style={[styles.input, errors.title && styles.inputError]}
                            placeholder="Brief description of the issue"
                            value={value}
                            onChangeText={onChange}
                        />
                    )}
                />
                {errors.title && (
                    <Text style={styles.errorText}>{errors.title.message}</Text>
                )}
            </View>

            {/* Description */}
            <View style={styles.fieldContainer}>
                <Text style={styles.label}>Description *</Text>
                <Controller
                    control={control}
                    name="description"
                    render={({ field: { onChange, value } }) => (
                        <TextInput
                            style={[styles.input, styles.textArea, errors.description && styles.inputError]}
                            placeholder="Detailed description of what needs to be done"
                            value={value}
                            onChangeText={onChange}
                            multiline
                            numberOfLines={4}
                        />
                    )}
                />
                {errors.description && (
                    <Text style={styles.errorText}>{errors.description.message}</Text>
                )}
            </View>

            {/* Estimated Budget */}
            <View style={styles.fieldContainer}>
                <Text style={styles.label}>Estimated Budget (Optional)</Text>
                <Controller
                    control={control}
                    name="estimatedBudget"
                    render={({ field: { onChange, value } }) => (
                        <View style={styles.inputWithIcon}>
                            <DollarSign size={20} color="#6B7280" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="0.00"
                                value={value?.toString() || ''}
                                onChangeText={(text) => onChange(text ? parseFloat(text) : null)}
                                keyboardType="decimal-pad"
                            />
                        </View>
                    )}
                />
            </View>

            {/* Location */}
            <View style={styles.fieldContainer}>
                <Text style={styles.label}>Service Location *</Text>
                <TouchableOpacity style={styles.locationButton} onPress={() => { }}>
                    <MapPin size={20} color="#2563EB" />
                    <Text style={styles.locationButtonText}>
                        {selectedAddress ? selectedAddress.street : 'Select location on map'}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Photos */}
            <View style={styles.fieldContainer}>
                <Text style={styles.label}>Photos (Optional)</Text>
                <TouchableOpacity style={styles.photoButton} onPress={pickImage}>
                    <Camera size={24} color="#2563EB" />
                    <Text style={styles.photoButtonText}>Add Photos</Text>
                </TouchableOpacity>
                {photos.length > 0 && (
                    <View style={styles.photoGrid}>
                        {photos.map((uri, index) => (
                            <Image key={index} source={{ uri }} style={styles.photoThumbnail} />
                        ))}
                    </View>
                )}
            </View>

            {/* Actions */}
            <View style={styles.actions}>
                <TouchableOpacity
                    style={[styles.button, styles.cancelButton]}
                    onPress={onCancel}
                >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.button, styles.submitButton]}
                    onPress={handleSubmit(onSubmitForm)}
                    disabled={isSubmitting}
                >
                    <Text style={styles.submitButtonText}>
                        {isSubmitting ? 'Creating...' : 'Create Request'}
                    </Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    content: {
        padding: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 24,
    },
    fieldContainer: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        padding: 14,
        fontSize: 15,
        color: '#111827',
    },
    inputError: {
        borderColor: '#EF4444',
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
    },
    inputWithIcon: {
        position: 'relative',
    },
    inputIcon: {
        position: 'absolute',
        left: 14,
        top: 14,
        zIndex: 1,
    },
    locationButton: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        padding: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    locationButtonText: {
        fontSize: 15,
        color: '#374151',
    },
    photoButton: {
        backgroundColor: '#FFFFFF',
        borderWidth: 2,
        borderColor: '#2563EB',
        borderStyle: 'dashed',
        borderRadius: 12,
        padding: 24,
        alignItems: 'center',
        gap: 8,
    },
    photoButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#2563EB',
    },
    photoGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 12,
    },
    photoThumbnail: {
        width: 80,
        height: 80,
        borderRadius: 8,
    },
    errorText: {
        fontSize: 13,
        color: '#EF4444',
        marginTop: 4,
    },
    actions: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 24,
    },
    button: {
        flex: 1,
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#374151',
    },
    submitButton: {
        backgroundColor: '#2563EB',
    },
    submitButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
    },
});