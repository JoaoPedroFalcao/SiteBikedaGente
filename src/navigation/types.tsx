import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Station, Card } from '@/types'; 

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}

export type RootStackParamList = {
  Login: undefined;
  SignUp: undefined;
  ForgotPassword: undefined;
  ResetPassword: undefined;
  PendingApproval: undefined;
  App: undefined;
  Profile: undefined;
  IdentityVerification: { readOnly?: boolean };
  QRScanner: { 
    action: 'rent' | 'return'; 
    returnMethod?: 'scan_and_wait' | 'already_returned'; };
  RideHistory: undefined;
  AdminStationDetail: { station: Station };
  StationList: undefined;
  EditProfile: undefined;
  Faq: undefined;
  AddCard: undefined;
  Wallet: { newCard?: Card } | undefined;
  AdminReview: undefined;
  AdminRidesDashboard: undefined;
  AdminBikesDashboard: undefined;
  AuthRedirect: undefined;
  Loading: undefined;
  StationBikes: { station: Station };
};

export type RootStackScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<RootStackParamList, T>;