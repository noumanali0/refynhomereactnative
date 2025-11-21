import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ScrollView,
} from 'react-native';
import Text from '@/components/common/Text';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import { loginSuccess } from '@/store/slices/authSlice';
import { moderateScale } from 'react-native-size-matters';

type Role = 'customer' | 'vendor' | null;

export default function RoleSelection() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [selectedRole, setSelectedRole] = useState<Role>(null);
  const [scaleAnim] = useState(new Animated.Value(0));

  React.useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleRoleSelect = (role: 'customer' | 'vendor') => {
    setSelectedRole(role);
  };

  const handleContinue = () => {
    if (!selectedRole) {
      alert('Please select a role');
      return;
    }

    // Dispatch login success with selected role
    // dispatch(
    //   loginSuccess({
    //     name: 'Test User',
    //     role: selectedRole,
    //     id: '123456',
    //     phoneNumber: '+923022977298',
    //     profilePhoto: '',
    //     city: 'Lahore',
    //     address: 'R111 Roman City Shah Town',
    //     favoriteVendors: [],
    //   })
    // );

    // Navigate to appropriate screen based on role
    if (selectedRole === 'customer') {
      router.replace('/(auth)/customer-setup');
    } else {
      // router.replace('/(vendor)/(dashboard)');
      router.replace('/(auth)/vendor-setup');
    }
  };

  return (
    <View style={styles.container}>
      {/* Gradient Header Background */}
      <LinearGradient
        colors={['#2563EB', '#F97316']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.headerContent}>
          <View style={styles.logoContainer}>
            <LinearGradient
              colors={['rgba(255,255,255,0.3)', 'rgba(255,255,255,0.1)']}
              style={styles.logoCircle}
            >
              <Ionicons name="people" size={40} color="#fff" />
            </LinearGradient>
          </View>
          <Text type="title" style={styles.appName}>Choose Your Role</Text>
          <Text type="body2" style={styles.tagline}>How would you like to use RefynHome?</Text>
        </View>
      </LinearGradient>
      <ScrollView>
        <Animated.View
          style={[styles.content, { transform: [{ scale: scaleAnim }] }]}
        >
          {/* Customer Role Card */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => handleRoleSelect('customer')}
            style={styles.roleCardContainer}
          >
            <View
              style={[
                styles.roleCard,
                selectedRole === 'customer' && styles.roleCardSelected,
              ]}
            >
              {selectedRole === 'customer' && (
                <View style={styles.selectedBadge}>
                  <Ionicons name="checkmark-circle" size={24} color="#2563EB" />
                </View>
              )}

              <LinearGradient
                colors={
                  selectedRole === 'customer'
                    ? ['#2563EB', '#3b82f6']
                    : ['#dbeafe', '#bfdbfe']
                }
                style={styles.roleIconContainer}
              >
                <Ionicons
                  name="person"
                  size={40}
                  color={selectedRole === 'customer' ? '#fff' : '#2563EB'}
                />
              </LinearGradient>

              <Text
                type="title"
                style={[
                  styles.roleTitle,
                  selectedRole === 'customer' && styles.roleTitleSelected,
                ]}
              >
                I'm a Customer
              </Text>
              <Text type="body2" style={styles.roleDescription}>
                Find and hire service providers for your home needs
              </Text>

              <View style={styles.featuresList}>
                <View style={styles.featureItem}>
                  <Ionicons name="checkmark-circle" size={18} color="#10b981" />
                  <Text type="body" style={styles.featureText}>Request services</Text>
                </View>
                <View style={styles.featureItem}>
                  <Ionicons name="checkmark-circle" size={18} color="#10b981" />
                  <Text type="body" style={styles.featureText}>Track vendors</Text>
                </View>
                <View style={styles.featureItem}>
                  <Ionicons name="checkmark-circle" size={18} color="#10b981" />
                  <Text type="body" style={styles.featureText}>Manage favorites</Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>

          {/* Vendor Role Card */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => handleRoleSelect('vendor')}
            style={styles.roleCardContainer}
          >
            <View
              style={[
                styles.roleCard,
                selectedRole === 'vendor' && styles.roleCardSelected,
              ]}
            >
              {selectedRole === 'vendor' && (
                <View style={styles.selectedBadge}>
                  <Ionicons name="checkmark-circle" size={24} color="#F97316" />
                </View>
              )}

              <LinearGradient
                colors={
                  selectedRole === 'vendor'
                    ? ['#F97316', '#fb923c']
                    : ['#fed7aa', '#fdba74']
                }
                style={styles.roleIconContainer}
              >
                <Ionicons
                  name="construct"
                  size={40}
                  color={selectedRole === 'vendor' ? '#fff' : '#F97316'}
                />
              </LinearGradient>

              <Text
                type="title"
                style={[
                  styles.roleTitle,
                  selectedRole === 'vendor' && styles.roleTitleSelected,
                ]}
              >
                I'm a Vendor
              </Text>
              <Text type="body2" style={styles.roleDescription}>
                Provide home services and grow your business
              </Text>

              <View style={styles.featuresList}>
                <View style={styles.featureItem}>
                  <Ionicons name="checkmark-circle" size={18} color="#10b981" />
                  <Text type="body" style={styles.featureText}>Receive requests</Text>
                </View>
                <View style={styles.featureItem}>
                  <Ionicons name="checkmark-circle" size={18} color="#10b981" />
                  <Text type="body" style={styles.featureText}>Send proposals</Text>
                </View>
                <View style={styles.featureItem}>
                  <Ionicons name="checkmark-circle" size={18} color="#10b981" />
                  <Text type="body" style={styles.featureText}>Earn money</Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>

          {/* Continue Button */}
          <TouchableOpacity
            onPress={handleContinue}
            disabled={!selectedRole}
            activeOpacity={0.8}
            style={styles.continueButton}
          >
            <LinearGradient
              colors={
                selectedRole
                  ? ['#2563EB', '#F97316']
                  : ['#94a3b8', '#94a3b8']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.continueButtonInner}
            >
              <Text type="button" style={styles.continueButtonText}>Continue</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    // marginBottom: moderateScale(22)
  },
  headerGradient: {
    paddingBottom: moderateScale(16),
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    marginBottom: moderateScale(5),
  },
  headerContent: {
    alignItems: 'center',
    paddingTop: moderateScale(20),
  },
  logoContainer: {
    marginBottom: moderateScale(16),
  },
  logoCircle: {
    width: moderateScale(80),
    height: moderateScale(80),
    borderRadius: moderateScale(40),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  appName: {
    fontSize: moderateScale(28),
    color: '#fff',
    marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.1)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  tagline: {
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  content: {
    flex: 1,
    padding: moderateScale(20),
    marginTop: moderateScale(-20),
  },
  roleCardContainer: {
    marginBottom: moderateScale(16),
  },
  roleCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: moderateScale(24),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  roleCardSelected: {
    borderColor: '#2563EB',
    shadowColor: '#2563EB',
    shadowOpacity: 0.2,
    elevation: 8,
  },
  selectedBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
  },
  roleIconContainer: {
    width: moderateScale(80),
    height: moderateScale(80),
    borderRadius: moderateScale(40),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: moderateScale(16),
    alignSelf: 'center',
  },
  roleTitle: {
    fontSize: moderateScale(22),
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 8,
  },
  roleTitleSelected: {
    color: '#2563EB',
  },
  roleDescription: {
    color: '#64748b',
    textAlign: 'center',
    marginBottom: moderateScale(16),
    lineHeight: 20,
  },
  featuresList: {
    gap: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    color: '#475569',
  },
  continueButton: {
    marginTop: moderateScale(16),
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  continueButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: moderateScale(54),
    gap: 8,
  },
  continueButtonText: {
    color: '#fff',
  },
});


// import React from 'react';
// import { View, Text, SafeAreaView, TouchableOpacity } from 'react-native';
// import { useRouter } from 'expo-router';

// export default function RoleSelection() {
//   const router = useRouter();

//   const handleRoleSelect = (role: 'customer' | 'vendor') => {
//     if (role === 'customer') {
//       router.push('/(auth)/customer-setup' as any);
//     } else {
//       router.push('/(auth)/vendor-setup' as any);
//     }
//   };

//   return (
//     <SafeAreaView className="flex-1 bg-white">
//       <View className="flex-1 px-6 justify-center">
//         <Text className="text-3xl font-bold text-gray-900 mb-2 text-center">
//           Choose Your Role
//         </Text>
//         <Text className="text-gray-600 text-center mb-12">
//           How do you want to use RefynHome?
//         </Text>

//         <TouchableOpacity
//           className="bg-primary rounded-2xl p-8 mb-6 items-center shadow-lg"
//           onPress={() => handleRoleSelect('customer')}
//           activeOpacity={0.8}
//         >
//           <Text className="text-6xl mb-4">👤</Text>
//           <Text className="text-white text-2xl font-bold mb-2">Customer</Text>
//           <Text className="text-white text-center opacity-90">
//             Find and book verified technicians for home repairs
//           </Text>
//         </TouchableOpacity>

//         <TouchableOpacity
//           className="bg-accent rounded-2xl p-8 items-center shadow-lg"
//           onPress={() => handleRoleSelect('vendor')}
//           activeOpacity={0.8}
//         >
//           <Text className="text-6xl mb-4">🔧</Text>
//           <Text className="text-white text-2xl font-bold mb-2">Vendor</Text>
//           <Text className="text-white text-center opacity-90">
//             Offer your services and grow your business
//           </Text>
//         </TouchableOpacity>
//       </View>
//     </SafeAreaView>
//   );
// }
