// app/(customer)/_layout.tsx
import { Tabs, useRouter, useSegments } from "expo-router";
import GradientIcon from "@/components/common/GradientIcon";
import ErrorBoundary from "@/components/common/ErrorBoundary";
import { moderateScale, verticalScale } from "react-native-size-matters";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/store";
import {
    selectCompletedService,
    clearCompletedService,
} from "@/store/slices/dispatchSlice";
import { clearReviewState } from "@/store/slices/reviewSlice";
import RatingModal from "@/components/common/RatingModal";
import { resetArrivalNotification } from "@/utils/notifications";

/**
 * Global Rating Modal Component
 * Shows rating modal on any customer screen when vendor completes service
 */
function GlobalRatingModal() {
    const dispatch = useDispatch<AppDispatch>();
    const router = useRouter();
    const segments = useSegments();
    const completedService = useSelector(selectCompletedService);
    const [showModal, setShowModal] = useState(false);

    // Check if user is on live-offers screen (which has its own rating modal)
    const isOnLiveOffers = useMemo(() => {
        return segments.includes('live-offers');
    }, [segments]);

    // Show modal when service is completed and NOT on live-offers
    // (live-offers has its own local modal to avoid duplicate)
    useEffect(() => {
        if (completedService && !isOnLiveOffers) {
            setShowModal(true);
            if (__DEV__) {
                console.log('[GlobalRatingModal] Service completed, showing rating modal:', {
                    requestId: completedService.requestId,
                    vendorName: completedService.vendorName,
                    currentScreen: segments.join('/'),
                });
            }
        }
    }, [completedService, isOnLiveOffers, segments]);

    const handleClose = useCallback(() => {
        setShowModal(false);
        if (completedService) {
            resetArrivalNotification(completedService.requestId);
        }
        dispatch(clearCompletedService());
        dispatch(clearReviewState());
        // Navigate to home after rating
        router.replace('/(customer)/(home)/');
    }, [completedService, dispatch, router]);

    if (!completedService || !showModal) {
        return null;
    }

    return (
        <RatingModal
            visible={showModal}
            onClose={handleClose}
            onSuccess={handleClose}
            serviceRequestId={completedService.requestId}
            vendorName={completedService.vendorName}
        />
    );
}

export default function CustomerTabsLayout() {
    const segments = useSegments();

    // Hide tab bar on live-offers screen
    const hideTabBar = useMemo(() => {
        return segments.includes('live-offers');
    }, [segments]);

    return (
        <ErrorBoundary>
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: "#2563EB",
                tabBarInactiveTintColor: "#9CA3AF",
                tabBarStyle: hideTabBar ? { display: 'none' } : {
                    borderTopLeftRadius: moderateScale(20),
                    borderTopRightRadius: moderateScale(20),
                    height: verticalScale(70),
                    paddingBottom: verticalScale(8),
                    paddingTop: verticalScale(8),
                    backgroundColor: '#fff',
                    borderTopWidth: 0,
                    // Shadow for iOS
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: -3 },
                    shadowOpacity: 0.1,
                    shadowRadius: 6,
                    // Shadow for Android
                    elevation: 10,
                },
                tabBarLabelStyle: {
                    fontSize: moderateScale(11),
                    fontWeight: '500',
                },
                // Set background color behind the tab bar (for rounded corners)
                sceneStyle: { backgroundColor: '#fff' },
            }}
        >
            <Tabs.Screen
                name="(home)"
                options={{
                    title: "Home",
                    // tabBarIcon: ({ size }) => <GradientIcon name="home" size={size} />,
                    tabBarIcon: ({ focused, size }) => (
                        <GradientIcon
                            name="home"
                            size={size}
                            colors={focused ? ["#2563EB", "#F97316"] : ["#ccc", "#ccc"]}
                        />
                    )
                }}
            />
            <Tabs.Screen
                name="(favorites)"
                options={{
                    title: "Favorites",
                    // tabBarIcon: ({ size }) => <GradientIcon name="heart" size={size} />,
                    tabBarIcon: ({ focused, size }) => (
                        <GradientIcon
                            name="heart"
                            size={size}
                            colors={focused ? ["#2563EB", "#F97316"] : ["#ccc", "#ccc"]}
                        />
                    )
                }}

            />
            <Tabs.Screen
                name="(history)"
                options={{
                    title: "History",
                    // tabBarIcon: ({ color, size }) => <Ionicons name="time" size={size} color={color} />,
                    tabBarIcon: ({ focused, size }) => (
                        <GradientIcon
                            name="time"
                            size={size}
                            colors={focused ? ["#2563EB", "#F97316"] : ["#ccc", "#ccc"]}
                        />
                    )
                }}
            />
            <Tabs.Screen
                name="(profile)"
                options={{
                    title: "Profile",
                    // tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
                    tabBarIcon: ({ focused, size }) => (
                        <GradientIcon
                            name="person"
                            size={size}
                            colors={focused ? ["#2563EB", "#F97316"] : ["#ccc", "#ccc"]}
                        />
                    )
                }}
            />
        </Tabs>
            {/* Global Rating Modal - shows on any customer screen when vendor completes service */}
            <GlobalRatingModal />
        </ErrorBoundary>
    );
}
