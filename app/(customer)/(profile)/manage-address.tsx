// app/(customer)/(profile)/manage-address.tsx
import React, { useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    TextInput,
    Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { moderateScale } from "react-native-size-matters";

interface Address {
    id: string;
    type: string;
    address: string;
    city: string;
    isDefault: boolean;
}

export default function ManageAddressScreen() {
    const router = useRouter();
    const [addresses, setAddresses] = useState<Address[]>([
        {
            id: "1",
            type: "Home",
            address: "123 Main Street, Apt 4B",
            city: "Karachi",
            isDefault: true,
        },
        {
            id: "2",
            type: "Work",
            address: "456 Business Ave, Floor 10",
            city: "Karachi",
            isDefault: false,
        },
    ]);
    const [showAddForm, setShowAddForm] = useState(false);
    const [selectedType, setSelectedType] = useState("Home");
    const [newAddress, setNewAddress] = useState({ address: "", city: "" });

    const handleAddAddress = () => {
        if (!newAddress.address || !newAddress.city) {
            Alert.alert("Error", "Please fill all fields");
            return;
        }

        const newAddr: Address = {
            id: Date.now().toString(),
            type: selectedType,
            address: newAddress.address,
            city: newAddress.city,
            isDefault: false,
        };

        setAddresses([...addresses, newAddr]);
        setShowAddForm(false);
        setNewAddress({ address: "", city: "" });
        Alert.alert("Success", "Address added successfully");
    };

    const handleDeleteAddress = (id: string) => {
        Alert.alert("Delete Address", "Are you sure you want to delete this address?", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Delete",
                onPress: () => {
                    setAddresses(addresses.filter((addr) => addr.id !== id));
                },
                style: "destructive",
            },
        ]);
    };

    return (
        <View style={styles.container}>
            {/* Header with Gradient */}
            <LinearGradient
                colors={["#667eea", "#764ba2"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.header}
            >
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Manage Addresses</Text>
                <View style={styles.placeholder} />
            </LinearGradient>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Address List */}
                {addresses.map((item) => (
                    <View key={item.id} style={styles.addressCard}>
                        <View style={styles.addressHeader}>
                            <View style={styles.addressTypeContainer}>
                                <Ionicons
                                    name={item.type === "Home" ? "home" : "business"}
                                    size={20}
                                    color="#6366f1"
                                />
                                <Text style={styles.addressType}>{item.type}</Text>
                                {item.isDefault && (
                                    <View style={styles.defaultBadge}>
                                        <Text style={styles.defaultText}>Default</Text>
                                    </View>
                                )}
                            </View>
                            <View style={styles.addressActions}>
                                <TouchableOpacity style={styles.actionBtn}>
                                    <Ionicons name="pencil" size={18} color="#6366f1" />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.actionBtn}
                                    onPress={() => handleDeleteAddress(item.id)}
                                >
                                    <Ionicons name="trash" size={18} color="#ef4444" />
                                </TouchableOpacity>
                            </View>
                        </View>
                        <Text style={styles.addressText}>{item.address}</Text>
                        <Text style={styles.cityText}>{item.city}</Text>
                    </View>
                ))}

                {/* Add New Address Button */}
                <TouchableOpacity
                    style={styles.addAddressBtn}
                    onPress={() => setShowAddForm(!showAddForm)}
                    activeOpacity={0.8}
                >
                    <LinearGradient
                        colors={["#667eea", "#764ba2"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.addAddressBtnGradient}
                    >
                        <Ionicons name="add-circle-outline" size={20} color="#fff" />
                        <Text style={styles.addAddressText}>
                            {showAddForm ? "Cancel" : "Add New Address"}
                        </Text>
                    </LinearGradient>
                </TouchableOpacity>

                {/* Add Address Form */}
                {showAddForm && (
                    <View style={styles.addAddressForm}>
                        <Text style={styles.formTitle}>New Address</Text>

                        {/* Address Type Selection */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Address Type</Text>
                            <View style={styles.typeButtons}>
                                <TouchableOpacity
                                    style={[
                                        styles.typeBtn,
                                        selectedType === "Home" && styles.typeBtnActive,
                                    ]}
                                    onPress={() => setSelectedType("Home")}
                                >
                                    <Ionicons
                                        name="home"
                                        size={18}
                                        color={selectedType === "Home" ? "#fff" : "#6366f1"}
                                    />
                                    <Text
                                        style={[
                                            styles.typeBtnText,
                                            selectedType === "Home" && styles.typeBtnTextActive,
                                        ]}
                                    >
                                        Home
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[
                                        styles.typeBtn,
                                        selectedType === "Work" && styles.typeBtnActive,
                                    ]}
                                    onPress={() => setSelectedType("Work")}
                                >
                                    <Ionicons
                                        name="business"
                                        size={18}
                                        color={selectedType === "Work" ? "#fff" : "#6366f1"}
                                    />
                                    <Text
                                        style={[
                                            styles.typeBtnText,
                                            selectedType === "Work" && styles.typeBtnTextActive,
                                        ]}
                                    >
                                        Work
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Street Address */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Street Address</Text>
                            <TextInput
                                style={styles.textArea}
                                placeholder="Enter complete address"
                                placeholderTextColor="#999"
                                multiline
                                numberOfLines={3}
                                value={newAddress.address}
                                onChangeText={(text) =>
                                    setNewAddress({ ...newAddress, address: text })
                                }
                            />
                        </View>

                        {/* City */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>City</Text>
                            <TextInput
                                style={styles.textInput}
                                placeholder="Enter city name"
                                placeholderTextColor="#999"
                                value={newAddress.city}
                                onChangeText={(text) =>
                                    setNewAddress({ ...newAddress, city: text })
                                }
                            />
                        </View>

                        {/* Save Button */}
                        <TouchableOpacity
                            style={styles.saveBtn}
                            onPress={handleAddAddress}
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={["#667eea", "#764ba2"]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.saveBtnGradient}
                            >
                                <Ionicons name="checkmark" size={20} color="#fff" />
                                <Text style={styles.saveBtnText}>Save Address</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f8f9ff",
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingTop: moderateScale(50),
        paddingBottom: moderateScale(20),
        paddingHorizontal: moderateScale(16),
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "rgba(255,255,255,0.2)",
        justifyContent: "center",
        alignItems: "center",
    },
    headerTitle: {
        fontSize: moderateScale(20),
        fontWeight: "700",
        color: "#fff",
    },
})