import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '@/contexts/AuthContext';
import { RootStackParamList } from './types';
import { navigationRef } from './navigation';

import LoginScreen from '@/screens/LoginScreen';
import SignUpScreen from '@/screens/SignUpScreen';
import MapScreen from '@/screens/MapScreen';
import ProfileScreen from '@/screens/ProfileScreen';
import QRScannerScreen from '@/screens/QRScannerScreen';
import RideHistoryScreen from '@/screens/RideHistoryScreen';
import ForgotPasswordScreen from '@/screens/ForgotPasswordScreen';
import AdminStationDetailScreen from '@/screens/AdminStationDetailScreen';
import StationListScreen from '@/screens/StationListScreen';
import EditProfileScreen from '@/screens/EditProfileScreen';
import FaqScreen from '@/screens/FaqScreen';
import ResetPasswordScreen from '@/screens/ResetPasswordScreen';
import PendingApprovalScreen from '@/screens/PendingApprovalScreen';
import AddCardScreen from '@/screens/AddCardScreen';
import WalletScreen from '@/screens/WalletScreen';
import AdminReviewScreen from '@/screens/AdminReviewScreen';
import AdminRidesDashboardScreen from '@/screens/AdminRidesDashboardScreen';
import { View, ActivityIndicator } from 'react-native';
import Colors from '@/constants/Colors';
import IdentityVerificationScreen from '@/screens/IdentityVerificationScreen';
import AdminBikesDashboardScreen from '@/screens/AdminBikesDashboardScreen';
import StationBikesScreen from '@/screens/StationBikesScreen';


const Stack = createNativeStackNavigator<RootStackParamList>();

const RootNavigator = () => {
    const { session, loading, profileStatus } = useAuth();

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    return (
        <NavigationContainer ref={navigationRef}>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
                {session && session.user ? (
                    //profileStatus === 'approved' ? (
                    <>
                        <Stack.Screen name="App" component={MapScreen} />
                        <Stack.Screen name="Profile" component={ProfileScreen} />
                        <Stack.Screen name="QRScanner" component={QRScannerScreen} />
                        <Stack.Screen name="RideHistory" component={RideHistoryScreen} />
                        <Stack.Screen name="AdminStationDetail" component={AdminStationDetailScreen} />
                        <Stack.Screen name="StationList" component={StationListScreen} />
                        <Stack.Screen name="EditProfile" component={EditProfileScreen} />
                        <Stack.Screen name="Faq" component={FaqScreen} />
                        <Stack.Screen name="AddCard" component={AddCardScreen} />
                        <Stack.Screen name="Wallet" component={WalletScreen} />
                        <Stack.Screen name="AdminReview" component={AdminReviewScreen} />
                        <Stack.Screen name="AdminRidesDashboard" component={AdminRidesDashboardScreen} />
                        <Stack.Screen name="AdminBikesDashboard" component={AdminBikesDashboardScreen} />
                        <Stack.Screen name="IdentityVerification" component={IdentityVerificationScreen} />
                        <Stack.Screen name="StationBikes" component={StationBikesScreen} options={{ headerShown: false }}
                        />
                    </>
                    //) : (
                    //    <>
                    //        <Stack.Screen name="IdentityVerification" component={IdentityVerificationScreen} />
                    //        <Stack.Screen name="PendingApproval" component={PendingApprovalScreen} />
                    //    </>
                    //)
                ) : (
                    <>
                        <Stack.Screen name="Login" component={LoginScreen} />
                        <Stack.Screen name="SignUp" component={SignUpScreen} />
                        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
                        <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
                    </>
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
};

export default RootNavigator;