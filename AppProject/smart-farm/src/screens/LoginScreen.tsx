import React, {
  useState,
} from 'react';

import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
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
    'Login'
  >;


// =====================================================
// LOGIN SCREEN
// =====================================================

export default function LoginScreen({
  navigation,
}: Props) {

  const {
    login,
  } = useAuth();


  const [email, setEmail] =
    useState('');

  const [password, setPassword] =
    useState('');

  const [loading, setLoading] =
    useState(false);


  // ===================================================
  // LOGIN
  // ===================================================

  const handleLogin = async () => {

    // Kiểm tra email
    if (!email.trim()) {

      Alert.alert(
        'Thông báo',
        'Vui lòng nhập email.'
      );

      return;

    }


    // Kiểm tra password
    if (!password) {

      Alert.alert(
        'Thông báo',
        'Vui lòng nhập mật khẩu.'
      );

      return;

    }


    try {

      setLoading(true);


      await login(
        email,
        password
      );


      // Firebase Auth listener
      // sẽ cập nhật user.
      //
      // Không cần navigation thủ công ở đây.


    } catch (error: any) {

      console.log(
        'Login error:',
        error
      );


      let message =
        'Đăng nhập thất bại.';


      switch (
        error?.code
      ) {

        case 'auth/invalid-email':

          message =
            'Email không hợp lệ.';

          break;


        case 'auth/user-not-found':

          message =
            'Tài khoản không tồn tại.';

          break;


        case 'auth/wrong-password':

          message =
            'Mật khẩu không chính xác.';

          break;


        case 'auth/invalid-credential':

          message =
            'Email hoặc mật khẩu không chính xác.';

          break;


        case 'auth/too-many-requests':

          message =
            'Có quá nhiều lần đăng nhập. Vui lòng thử lại sau.';

          break;

      }


      Alert.alert(
        'Đăng nhập',
        message
      );


    } finally {

      setLoading(false);

    }

  };


  // ===================================================
  // REGISTER
  // ===================================================

  const goToRegister = () => {

    navigation.navigate('Register');

  };


  // ===================================================
  // UI
  // ===================================================

  return (

    <KeyboardAvoidingView

      style={styles.container}

      behavior={
        Platform.OS === 'ios'
          ? 'padding'
          : undefined
      }

    >

      <ScrollView

        contentContainerStyle={
          styles.content
        }

        keyboardShouldPersistTaps="handled"

        showsVerticalScrollIndicator={
          false
        }

      >

        {/* LOGO */}

        <View style={styles.logoBox}>

          <Text style={styles.logo}>
            🌱
          </Text>

        </View>


        {/* TITLE */}

        <Text style={styles.title}>
          Smart Farm
        </Text>


        <Text style={styles.subtitle}>
          Đăng nhập vào hệ thống
        </Text>


        {/* CARD */}

        <View style={styles.card}>

          {/* EMAIL */}

          <Text style={styles.label}>
            Email
          </Text>


          <TextInput

            style={styles.input}

            placeholder="Nhập email"

            placeholderTextColor="#9CA3AF"

            value={email}

            onChangeText={
              setEmail
            }

            keyboardType="email-address"

            autoCapitalize="none"

            autoCorrect={false}

          />


          {/* PASSWORD */}

          <Text style={[
            styles.label,
            styles.passwordLabel,
          ]}>

            Mật khẩu

          </Text>


          <TextInput

            style={styles.input}

            placeholder="Nhập mật khẩu"

            placeholderTextColor="#9CA3AF"

            value={password}

            onChangeText={
              setPassword
            }

            secureTextEntry

            autoCapitalize="none"

          />


          {/* LOGIN BUTTON */}

          <TouchableOpacity

            style={[

              styles.loginButton,

              loading &&
                styles.loginButtonDisabled,

            ]}

            onPress={
              handleLogin
            }

            disabled={loading}

            activeOpacity={0.8}

          >

            <Text style={styles.loginText}>

              {loading
                ? 'Đang đăng nhập...'
                : 'Đăng nhập'}

            </Text>

          </TouchableOpacity>


          {/* REGISTER BUTTON */}

          <TouchableOpacity

            style={styles.registerButton}

            onPress={
              goToRegister
            }

            activeOpacity={0.8}

          >

            <Text style={styles.registerText}>
              Đăng ký tài khoản
            </Text>

          </TouchableOpacity>

        </View>


        {/* INFO */}

        <Text style={styles.infoText}>
          Sử dụng tài khoản Smart Farm để truy cập hệ thống.
        </Text>


        <Text style={styles.version}>
          Smart Farm v1.0.0
        </Text>

      </ScrollView>

    </KeyboardAvoidingView>

  );

}


// =====================================================
// STYLE
// =====================================================

const styles = StyleSheet.create({

  container: {

    flex: 1,

    backgroundColor: '#F4F7F2',

  },


  content: {

    flexGrow: 1,

    justifyContent: 'center',

    padding: 25,

  },


  logoBox: {

    width: 82,

    height: 82,

    borderRadius: 27,

    backgroundColor: '#DCFCE7',

    justifyContent: 'center',

    alignItems: 'center',

    alignSelf: 'center',

    marginBottom: 18,

  },


  logo: {

    fontSize: 45,

  },


  title: {

    textAlign: 'center',

    fontSize: 29,

    fontWeight: '900',

    color: '#111827',

  },


  subtitle: {

    textAlign: 'center',

    fontSize: 12,

    color: '#6B7280',

    marginTop: 5,

    marginBottom: 28,

  },


  card: {

    backgroundColor: '#FFFFFF',

    borderRadius: 23,

    padding: 20,

  },


  label: {

    fontSize: 12,

    fontWeight: '800',

    color: '#374151',

    marginBottom: 7,

  },


  passwordLabel: {

    marginTop: 16,

  },


  input: {

    height: 48,

    borderWidth: 1,

    borderColor: '#E5E7EB',

    borderRadius: 13,

    paddingHorizontal: 14,

    fontSize: 12,

    color: '#111827',

    backgroundColor: '#F9FAFB',

  },


  loginButton: {

    height: 49,

    borderRadius: 13,

    backgroundColor: '#16A34A',

    justifyContent: 'center',

    alignItems: 'center',

    marginTop: 22,

  },


  loginButtonDisabled: {

    opacity: 0.6,

  },


  loginText: {

    color: '#FFFFFF',

    fontSize: 13,

    fontWeight: '900',

  },


  // ===================================================
  // REGISTER
  // ===================================================

  registerButton: {

    height: 45,

    borderRadius: 13,

    backgroundColor: '#F0FDF4',

    justifyContent: 'center',

    alignItems: 'center',

    marginTop: 10,

    borderWidth: 1,

    borderColor: '#BBF7D0',

  },


  registerText: {

    color: '#15803D',

    fontSize: 12,

    fontWeight: '900',

  },


  infoText: {

    textAlign: 'center',

    fontSize: 10,

    color: '#9CA3AF',

    lineHeight: 16,

    marginTop: 18,

    paddingHorizontal: 20,

  },


  version: {

    textAlign: 'center',

    fontSize: 9,

    color: '#9CA3AF',

    marginTop: 25,

  },

});