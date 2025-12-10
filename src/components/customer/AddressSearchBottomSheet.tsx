// src/components/customer/AddressSearchBottomSheet.tsx
/**
 * Bottom Sheet for address search with Mapbox autocomplete
 * Uses React Native Modal for reliable visibility control
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Text from '@/components/common/Text';
import { useAddressSearch } from '@/hooks/useAddressSearch';
import type { Address } from '@/types/mapbox';
import { COLORS } from '@/constants/colors';
import { moderateScale, scale, verticalScale } from 'react-native-size-matters';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface AddressSearchBottomSheetProps {
  isVisible: boolean;
  onClose: () => void;
  onSelectAddress: (address: Address) => void;
  proximity?: { latitude: number; longitude: number };
  initialValue?: string;
}

export const AddressSearchBottomSheet: React.FC<
  AddressSearchBottomSheetProps
> = ({ isVisible, onClose, onSelectAddress, proximity, initialValue = '' }) => {
  const [query, setQuery] = useState(initialValue);
  const insets = useSafeAreaInsets();

  const { suggestions, loading, error, search, clearSuggestions } =
    useAddressSearch({
      debounceMs: 500,
      minQueryLength: 3,
      limit: 5, // Reduced from 7 to prevent too many API calls
      proximity,
      country: 'pk',
    });

  // Reset state when modal closes (component stays mounted now)
  useEffect(() => {
    if (!isVisible) {
      // Clear search state when modal hides
      clearSuggestions();
      setQuery('');
    }
  }, [isVisible, clearSuggestions]);

  // Handle search input change
  const handleQueryChange = useCallback(
    (text: string) => {
      setQuery(text);
      search(text);
    },
    [search]
  );

  // Handle address selection
  // Note: Parent component handles closing via onSelectAddress callback
  // We only clear local state here to avoid double-close race condition
  const handleSelectAddress = useCallback(
    (address: Address) => {
      // Clear local state first
      clearSuggestions();
      setQuery('');
      // Then notify parent - parent will close the modal
      onSelectAddress(address);
    },
    [onSelectAddress, clearSuggestions]
  );

  // Handle close
  const handleClose = useCallback(() => {
    Keyboard.dismiss();
    clearSuggestions();
    setQuery('');
    onClose();
  }, [clearSuggestions, onClose]);

  // Render suggestion item
  const renderSuggestionItem = useCallback(
    ({ item }: { item: Address }) => (
      <TouchableOpacity
        style={styles.suggestionItem}
        onPress={() => handleSelectAddress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.suggestionIcon}>
          <Ionicons name="location" size={20} color={COLORS.primary} />
        </View>
        <View style={styles.suggestionContent}>
          <Text type="bodySemiBold" style={styles.suggestionMain} numberOfLines={1}>
            {item.city}
          </Text>
          <Text type="body2" style={styles.suggestionSecondary} numberOfLines={2}>
            {item.formatted}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={COLORS.gray400} />
      </TouchableOpacity>
    ),
    [handleSelectAddress]
  );

  // Render empty state
  const renderEmptyState = () => {
    if (loading) {
      return (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text type="body2" style={styles.emptyText}>
            Searching...
          </Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="alert-circle" size={48} color={COLORS.error} />
          <Text type="bodySemiBold" style={styles.emptyText}>
            {error}
          </Text>
          <TouchableOpacity
            onPress={() => search(query)}
            style={styles.retryButton}
          >
            <Text type="bodySemiBold" style={styles.retryText}>
              Try Again
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (query.length < 3) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="search" size={48} color={COLORS.gray400} />
          <Text type="body2" style={styles.emptyText}>
            Type at least 3 characters to search
          </Text>
        </View>
      );
    }

    if (suggestions.length === 0 && query.length >= 3) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="location-outline" size={48} color={COLORS.gray400} />
          <Text type="bodySemiBold" style={styles.emptyText}>
            No addresses found
          </Text>
          <Text type="body2" style={styles.emptySubtext}>
            Try different keywords
          </Text>
        </View>
      );
    }

    return null;
  };

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.overlay} />
      </TouchableWithoutFeedback>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <View style={[styles.container, { paddingBottom: insets.bottom || 20 }]}>
          {/* Handle bar */}
          <View style={styles.handleContainer}>
            <View style={styles.handle} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <Text type="title" style={styles.title}>
              Search Address
            </Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={COLORS.gray700} />
            </TouchableOpacity>
          </View>

          {/* Search Input */}
          <View style={styles.searchContainer}>
            <Ionicons
              name="search"
              size={20}
              color={COLORS.gray400}
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Enter street, area, or city..."
              placeholderTextColor={COLORS.gray400}
              value={query}
              onChangeText={handleQueryChange}
              autoFocus
              autoCorrect={false}
              autoCapitalize="words"
            />
            {query.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  setQuery('');
                  clearSuggestions();
                }}
                style={styles.clearButton}
              >
                <Ionicons name="close-circle" size={20} color={COLORS.gray400} />
              </TouchableOpacity>
            )}
          </View>

          {/* Suggestions List */}
          <FlatList
            data={suggestions}
            renderItem={renderSuggestionItem}
            keyExtractor={(item, index) => `${item.coordinates.latitude}-${index}`}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={renderEmptyState}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  keyboardView: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: moderateScale(24),
    borderTopRightRadius: moderateScale(24),
    maxHeight: '80%',
    minHeight: '60%',
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: verticalScale(12),
  },
  handle: {
    width: scale(40),
    height: verticalScale(4),
    backgroundColor: COLORS.gray300,
    borderRadius: moderateScale(2),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(20),
    paddingBottom: verticalScale(16),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  title: {
    fontSize: moderateScale(20),
    color: COLORS.gray900,
  },
  closeButton: {
    padding: scale(4),
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: scale(20),
    marginTop: verticalScale(16),
    marginBottom: verticalScale(12),
    paddingHorizontal: scale(16),
    height: moderateScale(50),
    backgroundColor: COLORS.gray100,
    borderRadius: moderateScale(12),
    borderWidth: 1,
    borderColor: COLORS.gray300,
  },
  searchIcon: {
    marginRight: scale(12),
  },
  searchInput: {
    flex: 1,
    fontSize: moderateScale(15),
    color: COLORS.gray900,
  },
  clearButton: {
    padding: scale(4),
  },
  listContent: {
    paddingHorizontal: scale(20),
    paddingBottom: verticalScale(20),
    flexGrow: 1,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: verticalScale(14),
    paddingHorizontal: scale(12),
    backgroundColor: COLORS.white,
    borderRadius: moderateScale(12),
    marginBottom: verticalScale(8),
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  suggestionIcon: {
    width: moderateScale(40),
    height: moderateScale(40),
    borderRadius: moderateScale(20),
    backgroundColor: COLORS.primary + '10',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scale(12),
  },
  suggestionContent: {
    flex: 1,
  },
  suggestionMain: {
    fontSize: moderateScale(15),
    color: COLORS.gray900,
    marginBottom: verticalScale(2),
  },
  suggestionSecondary: {
    fontSize: moderateScale(13),
    color: COLORS.gray600,
    lineHeight: moderateScale(18),
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: verticalScale(60),
    paddingHorizontal: scale(40),
  },
  emptyText: {
    fontSize: moderateScale(16),
    color: COLORS.gray700,
    marginTop: verticalScale(16),
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: moderateScale(14),
    color: COLORS.gray500,
    marginTop: verticalScale(8),
    textAlign: 'center',
  },
  retryButton: {
    marginTop: verticalScale(16),
    paddingHorizontal: scale(24),
    paddingVertical: verticalScale(10),
    backgroundColor: COLORS.primary,
    borderRadius: moderateScale(8),
  },
  retryText: {
    fontSize: moderateScale(14),
    color: COLORS.white,
  },
});
