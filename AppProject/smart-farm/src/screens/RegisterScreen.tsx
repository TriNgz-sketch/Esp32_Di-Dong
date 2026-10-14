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
  useAuth,
} from '../auth/AuthContext';

import {
  NativeStackScreenProps,
} from '@react-navigation/native-stack';

import {
  RootStackParamList,
} from '../navigation/AppNavigator';


// =====================================================
// TYPE
// =====================================================

type Props = NativeStackScreenProps<
  RootStackParamList,
  'Register'
>;


// =====================================================
// REGISTER SCREEN
// =====================================================

export default function RegisterScreen({
  navigation,
}: Props) {

  // ===================================================
  // AUTH
  // ===================================================

  const {
    register,
  } = useAuth();


  // ===================================================
  // STATES
  // ===================================================

  const [email, setEmail] =
    useState('');

  const [password, setPassword] =
    useState('');

  const [confirmPassword, setConfirmPassword] =
    useState('');

  const [loading, setLoading] =
    useState(false);


  // ===================================================
  // REGISTER
  // ===================================================

  const handleRegister = async () => {

    // -------------------------------------------------
    // CHECK EMAIL
    // -------------------------------------------------

    const cleanEmail =
      email.trim();

    if (!cleanEmail) {

      Alert.alert(
        'Thông báo',
        'Vui lòng nhập email.'
      );

      return;
    }


    // -------------------------------------------------
    // CHECK PASSWORD
    // -------------------------------------------------

    if (!password) {

      Alert.alert(
        'Thông báo',
        'Vui lòng nhập mật khẩu.'
      );

      return;
    }


    if (password.length < 6) {

      Alert.alert(
        'Mật khẩu không hợp lệ',
        'Mật khẩu phải có ít nhất 6 ký tự.'
      );

      return;
    }


    // -------------------------------------------------
    // CHECK CONFIRM PASSWORD
    // -------------------------------------------------

    if (!confirmPassword) {

      Alert.alert(
        'Thông báo',
        'Vui lòng nhập lại mật khẩu.'
      );

      return;
    }


    if (password !== confirmPassword) {

      Alert.alert(
        'Mật khẩu không khớp',
        'Mật khẩu nhập lại không giống nhau.'
      );

      return;
    }


    // -------------------------------------------------
    // FIREBASE REGISTER
    // -------------------------------------------------

    try {

      setLoading(true);

      await register(
        cleanEmail,
        password
      );


      // ------------------------------------------------
      // SUCCESS
      // ------------------------------------------------

      Alert.alert(
        'Đăng ký thành công',
        'Tài khoản của bạn đã được tạo.'
      );

      /*
       * Không cần navigation.navigate('Main').
       *
       * AuthContext sẽ cập nhật:
       *
       * user = Firebase User
       *
       * AppNavigator sẽ tự động chuyển
       * sang MainTabNavigator.
       */

    } catch (error: any) {

      console.log(
        'Register screen error:',
        error
      );


      // ------------------------------------------------
      // FIREBASE ERROR
      // ------------------------------------------------

      let message =
        'Không thể đăng ký tài khoản. Vui lòng thử lại.';


      switch (error?.code) {

        case 'auth/email-already-in-use':

          message =
            'Email này đã được sử dụng. Vui lòng sử dụng email khác.';

          break;


        case 'auth/invalid-email':

          message =
            'Email không hợp lệ.';

          break;


        case 'auth/weak-password':

          message =
            'Mật khẩu quá yếu. Vui lòng sử dụng mật khẩu mạnh hơn.';

          break;


        case 'auth/network-request-failed':

          message =
            'Không thể kết nối mạng. Vui lòng kiểm tra Internet.';

          break;


        case 'auth/operation-not-allowed':

          message =
            'Phương thức đăng ký bằng Email/Password chưa được bật trong Firebase.';

          break;


        default:

          if (error?.message) {

            console.log(
              'Firebase message:',
              error.message
            );

          }

          break;

      }


      Alert.alert(
        'Đăng ký thất bại',
        message
      );

    } finally {

      setLoading(false);

    }

  };


  // ===================================================
  // GO LOGIN
  // ===================================================

  const goToLogin = () => {

    navigation.navigate(
      'Login'
    );

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
          styles.scrollContent
        }

        keyboardShouldPersistTaps="handled"

        showsVerticalScrollIndicator={false}

      >

        {/* ============================================
            HEADER
        ============================================ */}

        <View style={styles.header}>

          <View style={styles.logo}>

            <Text style={styles.logoText}>
              🌱
            </Text>

          </View>


          <Text style={styles.title}>
            Tạo tài khoản
          </Text>


          <Text style={styles.subtitle}>
            Tham gia hệ thống Smart Farm
          </Text>

        </View>


        {/* ============================================
            REGISTER CARD
        ============================================ */}

        <View style={styles.card}>

          {/* EMAIL */}

          <Text style={styles.label}>
            Email
          </Text>

          <TextInput

            style={styles.input}

            placeholder="Nhập email của bạn"

            placeholderTextColor="#9CA3AF"

            value={email}

            onChangeText={setEmail}

            keyboardType="email-address"

            autoCapitalize="none"

            autoCorrect={false}

            editable={!loading}

          />


          {/* PASSWORD */}

          <Text style={styles.label}>
            Mật khẩu
          </Text>

          <TextInput

            style={styles.input}

            placeholder="Nhập mật khẩu"

            placeholderTextColor="#9CA3AF"

            value={password}

            onChangeText={setPassword}

            secureTextEntry

            autoCapitalize="none"

            editable={!loading}

          />


          {/* CONFIRM PASSWORD */}

          <Text style={styles.label}>
            Xác nhận mật khẩu
          </Text>

          <TextInput

            style={styles.input}

            placeholder="Nhập lại mật khẩu"

            placeholderTextColor="#9CA3AF"

            value={confirmPassword}

            onChangeText={setConfirmPassword}

            secureTextEntry

            autoCapitalize="none"

            editable={!loading}

          />


          {/* PASSWORD NOTE */}

          <Text style={styles.passwordNote}>
            Mật khẩu phải có ít nhất 6 ký tự.
          </Text>


          {/* REGISTER BUTTON */}

          <TouchableOpacity

            style={[
              styles.registerButton,

              loading &&
                styles.registerButtonDisabled,
            ]}

            onPress={handleRegister}

            activeOpacity={0.8}

            disabled={loading}

          >

            <Text style={styles.registerButtonText}>

              {loading
                ? 'Đang tạo tài khoản...'
                : 'Đăng ký'}

            </Text>

          </TouchableOpacity>


          {/* LOGIN */}

          <View style={styles.loginRow}>

            <Text style={styles.loginText}>
              Đã có tài khoản?
            </Text>


            <TouchableOpacity

              onPress={goToLogin}

              disabled={loading}

            >

              <Text style={styles.loginLink}>
                Đăng nhập
              </Text>

            </TouchableOpacity>

          </View>

        </View>


        {/* ============================================
            FOOTER
        ============================================ */}

        <Text style={styles.footer}>
          Smart Farm
        </Text>

        <Text style={styles.footerSub}>
          ESP32 • Firebase
        </Text>

      </ScrollView>

    </KeyboardAvoidingView>

  );

}


// =====================================================
// STYLES
// =====================================================

const styles = StyleSheet.create({

  container: {

    flex: 1,

    backgroundColor: '#F4F7F2',

  },


  scrollContent: {

    flexGrow: 1,

    justifyContent: 'center',

    padding: 24,

  },


  // ===================================================
  // HEADER
  // ===================================================

  header: {

    alignItems: 'center',

    marginBottom: 28,

  },


  logo: {

    width: 72,

    height: 72,

    borderRadius: 24,

    backgroundColor: '#DCFCE7',

    justifyContent: 'center',

    alignItems: 'center',

    marginBottom: 16,

  },


  logoText: {

    fontSize: 38,

  },


  title: {

    fontSize: 27,

    fontWeight: '900',

    color: '#111827',

  },


  subtitle: {

    fontSize: 12,

    color: '#6B7280',

    marginTop: 6,

  },


  // ===================================================
  // CARD
  // ===================================================

  card: {

    backgroundColor: '#FFFFFF',

    borderRadius: 24,

    padding: 20,

  },


  // ===================================================
  // INPUT
  // ===================================================

  label: {

    fontSize: 12,

    fontWeight: '800',

    color: '#374151',

    marginBottom: 7,

    marginTop: 5,

  },


  input: {

    height: 48,

    borderWidth: 1,

    borderColor: '#E5E7EB',

    borderRadius: 13,

    paddingHorizontal: 14,

    fontSize: 13,

    color: '#111827',

    backgroundColor: '#F9FAFB',

    marginBottom: 12,

  },


  passwordNote: {

    fontSize: 9,

    color: '#9CA3AF',

    marginTop: -3,

    marginBottom: 16,

  },


  // ===================================================
  // BUTTON
  // ===================================================

  registerButton: {

    height: 49,

    borderRadius: 14,

    backgroundColor: '#16A34A',

    justifyContent: 'center',

    alignItems: 'center',

  },


  registerButtonDisabled: {

    opacity: 0.6,

  },


  registerButtonText: {

    color: '#FFFFFF',

    fontSize: 13,

    fontWeight: '900',

  },


  // ===================================================
  // LOGIN
  // ===================================================

  loginRow: {

    flexDirection: 'row',

    justifyContent: 'center',

    alignItems: 'center',

    marginTop: 20,

  },


  loginText: {

    fontSize: 11,

    color: '#6B7280',

  },


  loginLink: {

    fontSize: 11,

    fontWeight: '900',

    color: '#16A34A',

    marginLeft: 5,

  },


  // ===================================================
  // FOOTER
  // ===================================================

  footer: {

    textAlign: 'center',

    fontSize: 11,

    fontWeight: '800',

    color: '#9CA3AF',

    marginTop: 25,

  },


  footerSub: {

    textAlign: 'center',

    fontSize: 9,

    color: '#D1D5DB',

    marginTop: 3,

  },

});