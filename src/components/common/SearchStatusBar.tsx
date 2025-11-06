import React from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface SearchStatusBarProps {
  isSearching: boolean; // true => loader + blue bg, false => ended + orange bg
  remainingTime?: string; // e.g. "30 min"
}

const SearchStatusBar: React.FC<SearchStatusBarProps> = ({
  isSearching,
  remainingTime = "30 min",
}) => {
  return (
    <View
      className={`flex-row items-center px-5 py-3 rounded-2xl border mb-4 ${isSearching
        ? "bg-gray-100 border-gray-200"
        : "bg-orange-50 border-orange-200"
        }`}
    >
      {isSearching ? (
        <ActivityIndicator size="small" color="#0EA5E9" />
      ) : (
        <Ionicons name="time-outline" size={20} color="#EA580C" />
      )}

      <Text
        className={`text-sm ml-3 ${isSearching ? "text-gray-700" : "text-orange-800"
          }`}
      >
        {isSearching ? (
          <>
            Finding a technician near you (up to 30 minutes)...{" "}
            <Text className="font-semibold text-gray-800">
              {remainingTime} remaining
            </Text>
          </>
        ) : (
          <>
            <Text className="font-semibold text-orange-800">
              30-minute search window has ended.
            </Text>{" "}
            Review proposals below or search again.
          </>
        )}
      </Text>
    </View>
  );
};

export default SearchStatusBar;
