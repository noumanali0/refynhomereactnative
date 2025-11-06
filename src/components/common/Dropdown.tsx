import React from "react";
import { View, Text } from "react-native";
import RNPickerSelect from "react-native-picker-select";
import { Ionicons } from "@expo/vector-icons";

interface DropdownItem {
    label: string;
    value: string | number;
}

interface Props {
    label: string;
    items: DropdownItem[];
    value?: string;
    onValueChange: (val: string) => void;
    placeholder?: string;
    error?: string | boolean;
    disable?: boolean;
}

const Dropdown: React.FC<Props> = ({
    label,
    items,
    value,
    onValueChange,
    placeholder = "Select...",
    error,
    disable = false,
}) => {
    return (
        <View className="mb-5">
            {/* Label */}
            <Text className="text-sm font-medium text-gray-700 mb-2">{label}</Text>

            {/* Dropdown */}
            <View
                className={`flex-row items-center justify-between border rounded-lg px-3 h-12 ${error ? "border-red-500" : "border-blue-400"
                    } ${disable ? "opacity-50" : "opacity-100"}`}
            >
                <RNPickerSelect
                    onValueChange={onValueChange}
                    items={items}
                    value={value}
                    disabled={disable}
                    useNativeAndroidPickerStyle={false}
                    placeholder={{ label: placeholder, value: "" }}
                    style={{
                        inputIOS: {
                            fontSize: 14,
                            color: value ? "#374151" : "#9CA3AF", // text-gray-700 vs placeholder
                            paddingVertical: 0,
                            paddingHorizontal: 0,
                        },
                        inputAndroid: {
                            fontSize: 14,
                            color: value ? "#374151" : "#9CA3AF",
                            paddingVertical: 0,
                            paddingHorizontal: 0,
                        },
                        iconContainer: {
                            top: 12,
                            right: 10,

                        },
                        placeholder: {
                            color: "#9CA3AF",
                        },
                    }}
                    Icon={() => null
                        //     (
                        //     <Ionicons
                        //         name="chevron-down-outline"
                        //         size={18}
                        //         color="#6B7280"
                        //         style={{ marginLeft: "auto" }}
                        //     />
                        // )
                    }
                />
                {/* Our own icon (absolute to parent container) */}
                <View className="absolute right-3 top-3.5">
                    <Ionicons name="chevron-down-outline" size={18} color="#6B7280" />
                </View>
            </View>

            {/* Error Message */}
            {!!error && (
                <Text className="text-xs text-red-500 mt-1">{error}</Text>
            )}
        </View>
    );
};

export default Dropdown;


// // import React, { useState } from "react";
// // import { View, Text, Pressable, Modal, FlatList } from "react-native";
// // import { Ionicons } from "@expo/vector-icons";

// // interface DropdownItem {
// //     label: string;
// //     value: string;
// // }

// // interface DropdownProps {
// //     label: string;
// //     items: DropdownItem[];
// //     selectedValue?: string;
// //     placeholder?: string;
// //     onValueChange: (val: string) => void;
// //     disabled?: boolean;
// //     error?: string;
// // }

// // const Dropdown: React.FC<DropdownProps> = ({
// //     label,
// //     items,
// //     selectedValue,
// //     placeholder = "Select...",
// //     onValueChange,
// //     disabled = false,
// //     error,
// // }) => {
// //     const [visible, setVisible] = useState(false);

// //     const handleSelect = (val: string) => {
// //         onValueChange(val);
// //         setVisible(false);
// //     };

// //     return (
// //         <View className="w-full mb-3">
// //             {/* Floating Label */}
// //             <Text className="absolute -top-2 left-3 bg-[#181928] px-1 text-xs text-[#919EAB] font-semibold z-10">
// //                 {label}
// //             </Text>

// //             {/* Input Pressable */}
// //             <Pressable
// //                 onPress={() => !disabled && setVisible(true)}
// //                 className={`flex-row items-center justify-between border rounded-lg h-14 px-3 ${error
// //                     ? "border-[#FF5630]"
// //                     : "border-[rgba(145,158,171,0.2)]"
// //                     } ${disabled ? "opacity-50" : ""}`}
// //             >
// //                 <Text
// //                     className={`text-sm ${selectedValue ? "text-white" : "text-[#919EAB]"
// //                         }`}
// //                 >
// //                     {selectedValue
// //                         ? items.find((i) => i.value === selectedValue)?.label
// //                         : placeholder}
// //                 </Text>
// //                 <Ionicons
// //                     name={visible ? "chevron-up-outline" : "chevron-down-outline"}
// //                     size={20}
// //                     color="#919EAB"
// //                 />
// //             </Pressable>

// //             {/* Error */}
// //             {error && (
// //                 <Text className="text-[#FF5630] text-xs mt-1">{error}</Text>
// //             )}

// //             {/* Dropdown Modal */}
// //             <Modal
// //                 visible={visible}
// //                 transparent
// //                 animationType="fade"
// //                 onRequestClose={() => setVisible(false)}
// //             >
// //                 <View className="flex-1 bg-black/60 justify-center items-center px-6">
// //                     <View
// //                         className="bg-[#25273A] w-full rounded-xl shadow-lg shadow-black/80 overflow-hidden max-h-[320px]"
// //                     >
// //                         <FlatList
// //                             data={items}
// //                             keyExtractor={(item) => item.value.toString()}
// //                             renderItem={({ item }) => (
// //                                 <Pressable
// //                                     onPress={() => handleSelect(item.value)}
// //                                     android_ripple={{ color: "rgba(255,255,255,0.05)" }}
// //                                     className="px-4 py-4 border-b border-[rgba(255,255,255,0.08)]"
// //                                 >
// //                                     <Text className="text-white text-[15px] font-medium">
// //                                         {item.label}
// //                                     </Text>
// //                                 </Pressable>
// //                             )}
// //                             ListEmptyComponent={
// //                                 <Text className="text-center text-[#919EAB] py-6">
// //                                     No options available
// //                                 </Text>
// //                             }
// //                         />
// //                     </View>

// //                     {/* Tap outside to close */}
// //                     <Pressable
// //                         className="absolute inset-0"
// //                         onPress={() => setVisible(false)}
// //                     />
// //                 </View>
// //             </Modal>

// //         </View>
// //     );
// // };

// // export default Dropdown;


// import React from "react";
// import { View, Text } from "react-native";
// import RNPickerSelect from "react-native-picker-select";
// import Ionicons from "@expo/vector-icons/Ionicons";

// interface DropdownItem {
//     label: string;
//     value: string | number;
// }

// interface Props {
//     label: string;
//     items: DropdownItem[];
//     value?: string;
//     onValueChange: (val: string) => void;
//     placeholder?: string;
//     error?: string | boolean;
//     disable?: boolean;
// }

// const Dropdown: React.FC<Props> = ({
//     label,
//     items,
//     value,
//     onValueChange,
//     placeholder = "Select...",
//     error,
//     disable = false,
// }) => {
//     return (
//         <View className="mb-4">
//             {/* Label */}
//             <Text className="text-sm font-medium text-gray-700 mb-2">{label}</Text>

//             {/* Dropdown Input */}
//             <View
//                 className={`border rounded-lg px-4 py-3 flex-row items-center ${error
//                     ? "border-red-500"
//                     : "border-blue-400"
//                     } ${disable ? "opacity-50" : "opacity-100"}`}
//             >
//                 <RNPickerSelect
//                     onValueChange={onValueChange}
//                     items={items}
//                     value={value}
//                     disabled={disable}
//                     useNativeAndroidPickerStyle={false}
//                     placeholder={{ label: placeholder, value: "" }}
//                     style={{
//                         inputIOS: {
//                             fontSize: 14,
//                             color: value ? "#111827" : "#9CA3AF", // dark gray vs placeholder gray
//                             paddingVertical: 8,
//                         },
//                         inputAndroid: {
//                             fontSize: 14,
//                             color: value ? "#111827" : "#9CA3AF",
//                             paddingVertical: 8,
//                         },
//                         iconContainer: {
//                             top: 12,
//                             right: 10,
//                         },
//                         placeholder: {
//                             color: "#9CA3AF",
//                         },
//                     }}
//                     Icon={() => (
//                         <Ionicons
//                             name="chevron-down-outline"
//                             size={18}
//                             color="#6B7280"
//                         />
//                     )}
//                 />
//             </View>

//             {/* Error Message */}
//             {!!error && (
//                 <Text className="text-xs text-red-500 mt-1">{error}</Text>
//             )}
//         </View>
//     );
// };

// export default Dropdown;
