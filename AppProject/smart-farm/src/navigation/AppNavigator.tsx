import React from 'react';

import {
  View,
  Text,
  Pressable,
  StyleSheet,
} from 'react-native';

import {
  createBottomTabNavigator,
} from '@react-navigation/bottom-tabs';

import {
  createNativeStackNavigator,
} from '@react-navigation/native-stack';

import DashboardScreen from '../screens/DashboardScreen';
import MonitoringScreen from '../screens/MonitoringScreen';
import ControlScreen from '../screens/ControlScreen';
import AlertScreen from '../screens/AlertScreen';
import SettingsScreen from '../screens/SettingsScreen';

import SplashScreen from '../screens/SplashScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import { useAuth } from '../auth/AuthContext';


// =====================================================
// TAB TYPE
// =====================================================

export type RootTabParamList = {
  Dashboard: undefined;
  Monitoring: undefined;
  Control: undefined;
  Alert: undefined;
  Settings: undefined;
};


// =====================================================
// STACK TYPE
// =====================================================

export type RootStackParamList = {
  Splash: undefined;
  Login: undefined;
  Main: undefined;
  Register: undefined;
};


// =====================================================
// TAB NAVIGATOR
// =====================================================

const Tab =
  createBottomTabNavigator<RootTabParamList>();


// =====================================================
// STACK NAVIGATOR
// =====================================================

const Stack =
  createNativeStackNavigator<RootStackParamList>();


// =====================================================
// CUSTOM TAB BAR
// =====================================================

function CustomTabBar({
  state,
  navigation,
}: any) {

  const tabs = [
    {
      name: 'Dashboard',
      label: 'Trang chủ',
      icon: '🏠',
    },

    {
      name: 'Monitoring',
      label: 'Dữ liệu',
      icon: '📊',
    },

    {
      name: 'Control',
      label: 'Điều khiển',
      icon: '🚿',
    },

    {
      name: 'Alert',
      label: 'Cảnh báo',
      icon: '🔔',
    },

    {
      name: 'Settings',
      label: 'Cài đặt',
      icon: '⚙️',
    },
  ];


  return (
    <View style={styles.tabBar}>

      {tabs.map((tab, index) => {

        const focused =
          state.index === index;


        return (
          <Pressable
            key={tab.name}

            style={[
              styles.tabButton,

              focused &&
                styles.tabButtonActive,
            ]}

            onPress={() => {

              console.log(
                'CLICK TAB:',
                tab.name
              );

              navigation.navigate(
                tab.name
              );

            }}

          >

            <Text style={styles.icon}>
              {tab.icon}
            </Text>


            <Text
              style={[
                styles.label,

                focused &&
                  styles.labelActive,
              ]}
            >
              {tab.label}
            </Text>

          </Pressable>
        );

      })}

    </View>
  );
}


// =====================================================
// MAIN TAB NAVIGATOR
// =====================================================

function MainTabNavigator() {

  return (
    <Tab.Navigator

      initialRouteName="Dashboard"

      tabBar={(props) => (
        <CustomTabBar
          {...props}
        />
      )}

      screenOptions={{
        headerShown: false,
      }}

    >

      {/* ============================== */}
      {/* DASHBOARD */}
      {/* ============================== */}

      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
      />


      {/* ============================== */}
      {/* MONITORING */}
      {/* ============================== */}

      <Tab.Screen
        name="Monitoring"
        component={MonitoringScreen}

        options={{
          title: 'Dữ liệu',
        }}
      />


      {/* ============================== */}
      {/* CONTROL */}
      {/* ============================== */}

      <Tab.Screen
        name="Control"
        component={ControlScreen}
      />


      {/* ============================== */}
      {/* ALERT */}
      {/* ============================== */}

      <Tab.Screen
        name="Alert"
        component={AlertScreen}
      />


      {/* ============================== */}
      {/* SETTINGS */}
      {/* ============================== */}

      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
      />

    </Tab.Navigator>
  );
}


// =====================================================
// ROOT NAVIGATOR
// =====================================================

export default function AppNavigator() {

  // ===================================================
  // FIREBASE AUTH
  // ===================================================

  const {
    user,
    loading,
  } = useAuth();


  // ===================================================
  // AUTH LOADING
  // ===================================================

  /*
   * Firebase đang kiểm tra xem người dùng
   * đã đăng nhập trước đó hay chưa.
   *
   * Không hiển thị Login/Main lúc này
   * để tránh màn hình bị nhấp nháy.
   */

  if (loading) {

    return (
      <Stack.Navigator

        screenOptions={{
          headerShown: false,
        }}

      >

        <Stack.Screen
          name="Splash"
          component={SplashScreen}
        />

      </Stack.Navigator>
    );

  }


  // ===================================================
  // CHƯA ĐĂNG NHẬP
  // ===================================================
   
  /*
   * user === null
   *
   * → Chỉ có Login
   *
   * Khi login thành công:
   *
   * Firebase
   * ↓
   * onAuthStateChanged()
   * ↓
   * user != null
   * ↓
   * AppNavigator render Main
   */

  if (!user) {

    return (
      <Stack.Navigator

        screenOptions={{
          headerShown: false,
        }}

      >

        <Stack.Screen
          name="Login"
          component={LoginScreen}
        />
        <Stack.Screen 
         name="Register" 
         component={RegisterScreen} 
        />

      </Stack.Navigator>
    );

  }


  // ===================================================
  // ĐÃ ĐĂNG NHẬP
  // ===================================================

  /*
   * user != null
   *
   * → MainTabNavigator
   *
   * Khi logout:
   *
   * signOut(auth)
   * ↓
   * onAuthStateChanged()
   * ↓
   * user = null
   * ↓
   * AppNavigator render Login
   */

  return (
    <Stack.Navigator

      screenOptions={{
        headerShown: false,
      }}

    >

      <Stack.Screen
        name="Main"
        component={MainTabNavigator}
      />

    </Stack.Navigator>
  );
}


// =====================================================
// STYLE
// =====================================================

const styles = StyleSheet.create({

  tabBar: {

    height: 75,

    backgroundColor: '#FFFFFF',

    flexDirection: 'row',

    borderTopWidth: 1,

    borderTopColor: '#E5E7EB',

    paddingHorizontal: 5,

    paddingTop: 5,

    paddingBottom: 5,

  },


  tabButton: {

    flex: 1,

    justifyContent: 'center',

    alignItems: 'center',

    borderRadius: 12,

  },


  tabButtonActive: {

    backgroundColor: '#F0FDF4',

  },


  icon: {

    fontSize: 23,

    marginBottom: 3,

  },


  label: {

    fontSize: 10,

    color: '#6B7280',

  },


  labelActive: {

    color: '#16A34A',

    fontWeight: '800',

  },

});