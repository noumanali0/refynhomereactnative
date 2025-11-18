import React, { useCallback, memo, useState } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Image,
    Pressable,
} from "react-native";
import {
    CalendarDays,
    MapPin,
    Navigation,
    ChevronDown,
    Upload,
} from "lucide-react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { Formik } from "formik";
import * as Yup from "yup";
import Dropdown from "../../../src/components/common/Dropdown";
import { router } from "expo-router";

// ✅ Reusable components
const SectionTitle = memo(({ title }: { title: string }) => (
    <Text className="text-sm font-medium text-gray-700 mb-2">{title}</Text>
));

const RadioButton = memo(
    ({
        label,
        selected,
        onPress,
    }: {
        label: string;
        selected: boolean;
        onPress: () => void;
    }) => (
        <TouchableOpacity onPress={onPress} className="flex-row items-center mr-6">
            <View
                className={`w-5 h-5 rounded-full border mr-2 ${selected ? "border-blue-500 bg-blue-500" : "border-gray-400"
                    }`}
            />
            <Text className="text-gray-700">{label}</Text>
        </TouchableOpacity>
    )
);

const InfoList = memo(({ items }: { items: string[] }) => (
    <View className="border-0 rounded-lg p-4 mb-5">
        <Text className="text-sm font-semibold text-blue-700 mb-2">How it works:</Text>
        {items.map((text, i) => (
            <Text key={i} className="text-sm text-gray-700 mb-1">
                • {text}
            </Text>
        ))}
    </View>
));

const Disclaimer = memo(
    ({ agreed, onToggle }: { agreed: boolean; onToggle: () => void }) => (
        <View className="mt-6 flex-row items-start space-x-3 border border-gray-200 rounded-lg p-4 mb-4">
            <Pressable
                onPress={onToggle}
                className={`w-5 h-5 rounded-full border-2 ${agreed ? "border-blue-600 bg-blue-600" : "border-gray-400"
                    } flex items-center justify-center mt-1`}
            >
                {agreed && <Ionicons name="checkmark" size={12} color="white" />}
            </Pressable>
            <Text className="flex-1 text-xs text-gray-600 leading-5">
                RefynHome connects you with independent service providers. All payments are
                handled directly between customers and vendors. RefynHome is not responsible
                for any damages or disputes.
            </Text>
        </View>
    )
);


const requestServiceSchema = Yup.object().shape({
    selectedService: Yup.string().required("Service category is required"),
    needService: Yup.string().required("Please select when you need the service"),
    city: Yup.string().trim().required("City is required"),
    description: Yup.string()
        .trim()
        .min(10, "Description must be at least 10 characters")
        .required("Problem description is required"),
    isAgreed: Yup.boolean()
        .oneOf([true], "You must agree to the disclaimer before submitting"),
});

const RequestServiceScreen = () => {
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [photo, setPhoto] = useState<string | null>(null);

    const pickImage = useCallback(async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.7,
        });
        if (!result.canceled) setPhoto(result.assets[0].uri);
    }, []);

    return (
        <Formik
            initialValues={{
                selectedService: "",
                needService: "asap",
                selectedDate: null,
                city: "Karachi",
                description: "",
                isAgreed: false,
            }}
            validationSchema={requestServiceSchema}
            onSubmit={(values) => {
                console.log("Form submitted:", values);
            }}
        >
            {({
                handleChange,
                handleSubmit,
                setFieldValue,
                values,
                errors,
                touched,
            }) => (
                <ScrollView className="flex-1 bg-white px-5 py-6">
                    {/* Header */}
                    <Text className="text-xl font-semibold text-gray-900 mb-1 text-center">
                        Request Service
                    </Text>
                    <Text className="text-md text-gray-500 mb-5 text-center">
                        We'll broadcast your request to qualified technicians near you
                    </Text>

                    {/* Service Category */}
                    {/* <SectionTitle title="Service Category *" /> */}
                    <Dropdown
                        label="Service Category *"
                        items={[
                            { label: "AC Repair", value: "ac_repair" },
                            { label: "Plumbing", value: "plumbing" },
                            { label: "Electrical", value: "electrical" },
                        ]}
                        value={values.selectedService}
                        onValueChange={(val) => setFieldValue("selectedService", val)}
                        error={touched.selectedService && errors.selectedService}
                    />
                    {/* <TouchableOpacity
                        className="flex-row justify-between items-center border border-blue-400 rounded-lg px-4 py-3 mb-1"
                        onPress={() => console.log("Open service dropdown")}
                    >
                        <Text
                            className={`${values.selectedService ? "text-gray-700" : "text-gray-400"
                                } text-sm`}
                        >
                            {values.selectedService || "Select a service"}
                        </Text>
                        <ChevronDown size={18} color="#4B5563" />
                    </TouchableOpacity>
                    {touched.selectedService && errors.selectedService && (
                        <Text className="text-xs text-red-500 mb-3">
                            {errors.selectedService}
                        </Text>
                    )} */}

                    {/* Need Service */}
                    {/* <SectionTitle title="When do you need service? *" />
                    <View className="flex-row mb-1">
                        <RadioButton
                            label="ASAP"
                            selected={values.needService === "asap"}
                            onPress={() => setFieldValue("needService", "asap")}
                        />
                        <RadioButton
                            label="Schedule for later"
                            selected={values.needService === "schedule"}
                            onPress={() => setFieldValue("needService", "schedule")}
                        />
                    </View>
                    {touched.needService && errors.needService && (
                        <Text className="text-xs text-red-500 mb-3">{errors.needService}</Text>
                    )} */}

                    {/* Date Picker */}
                    {/* r */}

                    {/* City */}
                    <SectionTitle title="City *" />
                    <TextInput
                        value={values.city}
                        onChangeText={handleChange("city")}
                        placeholder="Enter city"
                        className="border border-blue-400 rounded-lg px-4 py-3 mb-1 text-gray-700 text-sm"
                    />
                    {touched.city && errors.city && (
                        <Text className="text-xs text-red-500 mb-3">{errors.city}</Text>
                    )}

                    {/* Description */}
                    <SectionTitle title="Problem Description *" />
                    <TextInput
                        value={values.description}
                        onChangeText={handleChange("description")}
                        placeholder="Describe the issue in detail (e.g., AC not cooling)"
                        multiline
                        numberOfLines={5}
                        textAlignVertical="top"
                        className="border border-blue-400 rounded-lg px-4 py-3 mb-1 text-gray-700 text-sm"
                    />
                    {touched.description && errors.description && (
                        <Text className="text-xs text-red-500 mb-3">{errors.description}</Text>
                    )}

                    {/* Photo Upload */}
                    <SectionTitle title="Photos (Optional)" />
                    <TouchableOpacity
                        onPress={pickImage}
                        className="flex-row items-center justify-between border border-blue-400 rounded-lg px-4 py-3 mb-5"
                    >
                        <Text className="text-gray-600 text-sm">
                            {photo ? "1 file selected" : "Choose Files"}
                        </Text>
                        <Upload size={18} color="#2563EB" />
                    </TouchableOpacity>
                    {photo && (
                        <Image
                            source={{ uri: photo }}
                            className="w-full h-40 rounded-lg mb-5"
                            resizeMode="cover"
                        />
                    )}

                    {/* Info Section */}
                    <InfoList
                        items={[
                            "We'll notify qualified technicians near you",
                            "First qualified technician to accept gets priority",
                            "You'll have 5 minutes to confirm the assignment",
                            "Contact details revealed after confirmation",
                        ]}
                    />

                    {/* Disclaimer */}
                    <Disclaimer
                        agreed={values.isAgreed}
                        onToggle={() => setFieldValue("isAgreed", !values.isAgreed)}
                    />
                    {touched.isAgreed && errors.isAgreed && (
                        <Text className="text-xs text-red-500 mb-3">{errors.isAgreed}</Text>
                    )}

                    {/* Buttons */}
                    <View className="flex-row justify-between mb-10">
                        <TouchableOpacity className="flex-1 border  border-blue-400  rounded-lg py-4 mr-2"
                            onPress={() => router.push("customer/services")}
                        >
                            <Text className="text-center text-blue-400 font-medium">Cancel</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            disabled={!values.isAgreed}
                            onPress={() => router.push("/(customer)/(home)/live-offers")}
                            // onPress={() => handleSubmit()}
                            className={`flex-1 rounded-lg py-4 ml-2 ${values.isAgreed ? "bg-blue-600" : "bg-blue-300"
                                }`}
                        >
                            <Text className="text-center text-white font-semibold">
                                Submit Request
                            </Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            )}
        </Formik>
    );
};

export default RequestServiceScreen;


