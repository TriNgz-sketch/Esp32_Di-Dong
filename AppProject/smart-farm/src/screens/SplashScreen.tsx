import React, {
  useEffect,
} from 'react';

import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';

import {
  NativeStackScreenProps,
} from '@react-navigation/native-stack';

import {
  useAuth,
} from '../auth/AuthContext';

import {
  RootStackParamList,
} from '../navigation/AppNavigator';


// =====================================================
// TYPE
// =====================================================

type Props =
  NativeStackScreenProps<
    RootStackParamList,
    'Splash'
  >;


// =====================================================
// SPLASH SCREEN
// =====================================================

export default function SplashScreen({
  navigation,
}: Props) {

  const {
    user,
    loading,
  } = useAuth();


  // ===================================================
  // CHECK AUTH
  // ===================================================

  useEffect(() => {

    // Firebase vẫn đang kiểm tra
    if (loading) {

      return;

    }


    // Có tài khoản đăng nhập
    if (user) {

      navigation.replace('Main');

    }

    // Chưa đăng nhập
    else {

      navigation.replace('Login');

    }

  }, [
    loading,
    user,
    navigation,
  ]);


  // ===================================================
  // UI
  // ===================================================

  return (

    <View style={styles.container}>

      <View style={styles.logoBox}>

        <Text style={styles.logo}>
          🌱
        </Text>

      </View>


      <Text style={styles.title}>
        Smart Farm
      </Text>


      <Text style={styles.subtitle}>
        Hệ thống nông nghiệp thông minh
      </Text>


      <View style={styles.loadingBox}>

        <ActivityIndicator
          size="large"
        />

        <Text style={styles.loadingText}>
          Đang kiểm tra hệ thống...
        </Text>

      </View>


      <Text style={styles.version}>
        Version 1.0.0
      </Text>

    </View>

  );

}


// =====================================================
// STYLE
// =====================================================

const styles = StyleSheet.create({

  container: {

    flex: 1,

    backgroundColor: '#F4F7F2',

    justifyContent: 'center',

    alignItems: 'center',

    paddingHorizontal: 30,

  },


  logoBox: {

    width: 100,

    height: 100,

    borderRadius: 32,

    backgroundColor: '#DCFCE7',

    justifyContent: 'center',

    alignItems: 'center',

    marginBottom: 22,

  },


  logo: {

    fontSize: 55,

  },


  title: {

    fontSize: 32,

    fontWeight: '900',

    color: '#111827',

  },


  subtitle: {

    fontSize: 12,

    color: '#6B7280',

    marginTop: 7,

  },


  loadingBox: {

    alignItems: 'center',

    marginTop: 35,

  },


  loadingText: {

    fontSize: 11,

    color: '#9CA3AF',

    marginTop: 10,

  },


  version: {

    position: 'absolute',

    bottom: 35,

    fontSize: 9,

    color: '#9CA3AF',

  },

});