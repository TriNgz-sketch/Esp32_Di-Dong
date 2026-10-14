import React, {
  useEffect,
  useState,
} from 'react';

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
  TextInput,
} from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';

import { useAuth } from '../auth/AuthContext';


// =====================================================
// TYPES
// =====================================================

type TemperatureUnit = 'C' | 'F';

type AlertThresholds = {
  temperatureLow: number;
  temperatureHigh: number;
  humidityLow: number;
  soilMoistureLow: number;
  lightLow: number;
  lightHigh: number;
};


// =====================================================
// DEFAULT
// =====================================================

const DEFAULT_THRESHOLDS: AlertThresholds = {

  temperatureLow: 15,
  temperatureHigh: 35,

  humidityLow: 40,

  soilMoistureLow: 30,

  lightLow: 200,
  lightHigh: 900,

};


// =====================================================
// SETTINGS
// =====================================================

export default function SettingsScreen() {

  // ===================================================
  // AUTH
  // ===================================================

  const {
    user,
    logout: authLogout,
  } = useAuth();


  // ===================================================
  // USER INFORMATION
  // ===================================================

  /*
   * Lấy thông tin tài khoản hiện tại từ Firebase Auth.
   *
   * user.displayName:
   * - Có thể có nếu tài khoản Firebase có tên.
   *
   * user.email:
   * - Email tài khoản đang đăng nhập.
   *
   * Nếu displayName chưa có thì lấy phần trước @
   * của email để làm tên hiển thị.
   */

  const userEmail =
    user?.email || 'Chưa có email';

  const userName =
    user?.displayName ||
    (user?.email
      ? user.email.split('@')[0]
      : 'Người dùng');


  // ===================================================
  // STATES
  // ===================================================

  const [notifications, setNotifications] =
    useState(true);

  const [temperatureUnit, setTemperatureUnit] =
    useState<TemperatureUnit>('C');

  const [alertEnabled, setAlertEnabled] =
    useState(true);

  const [thresholds, setThresholds] =
    useState<AlertThresholds>(
      DEFAULT_THRESHOLDS
    );


  // ===================================================
  // LOAD
  // ===================================================

  const loadSettings = async () => {

    try {

      const [
        savedNotifications,
        savedAlert,
        savedUnit,
        savedThresholds,
      ] = await Promise.all([

        AsyncStorage.getItem(
          'notificationsEnabled'
        ),

        AsyncStorage.getItem(
          'alertEnabled'
        ),

        AsyncStorage.getItem(
          'temperatureUnit'
        ),

        AsyncStorage.getItem(
          'alertThresholds'
        ),

      ]);


      // =================================================
      // NOTIFICATIONS
      // =================================================

      if (
        savedNotifications !== null
      ) {

        setNotifications(
          savedNotifications === 'true'
        );

      }


      // =================================================
      // ALERT
      // =================================================

      if (
        savedAlert !== null
      ) {

        setAlertEnabled(
          savedAlert === 'true'
        );

      } else if (
        savedNotifications !== null
      ) {

        // Tương thích setting cũ

        setAlertEnabled(
          savedNotifications === 'true'
        );

      }


      // =================================================
      // UNIT
      // =================================================

      if (
        savedUnit === 'C' ||
        savedUnit === 'F'
      ) {

        setTemperatureUnit(
          savedUnit
        );

      }


      // =================================================
      // THRESHOLDS
      // =================================================

      if (savedThresholds) {

        try {

          const parsed =
            JSON.parse(
              savedThresholds
            );

          setThresholds({
            ...DEFAULT_THRESHOLDS,
            ...parsed,
          });

        } catch {

          setThresholds(
            DEFAULT_THRESHOLDS
          );

        }

      }

    } catch (error) {

      console.log(
        'Settings load error:',
        error
      );

    }

  };


  // ===================================================
  // INITIAL
  // ===================================================

  useEffect(() => {

    loadSettings();

  }, []);


  // ===================================================
  // ALERT / NOTIFICATIONS
  // ===================================================

  /*
   * Chỉ còn 1 công tắc:
   *
   * 🔔 Cảnh báo môi trường
   *
   * Công tắc này điều khiển cả:
   * - alertEnabled
   * - notificationsEnabled
   *
   * Như vậy vẫn giữ nguyên logic cũ
   * nhưng UI chỉ còn 1 mục.
   */

  const toggleAlert = async (
    value: boolean
  ) => {

    setAlertEnabled(value);

    setNotifications(value);

    try {

      await AsyncStorage.multiSet([

        [
          'alertEnabled',
          String(value),
        ],

        [
          'notificationsEnabled',
          String(value),
        ],

      ]);

    } catch (error) {

      console.log(
        'Alert save error:',
        error
      );

    }

  };


  // ===================================================
  // UNIT
  // ===================================================

  const changeTemperatureUnit = async (
    unit: TemperatureUnit
  ) => {

    setTemperatureUnit(unit);

    try {

      await AsyncStorage.setItem(
        'temperatureUnit',
        unit
      );

    } catch (error) {

      console.log(
        'Temperature unit error:',
        error
      );

    }

  };


  // ===================================================
  // THRESHOLD
  // ===================================================

  const updateThreshold = (
    key: keyof AlertThresholds,
    value: string
  ) => {

    const numeric =
      Number(
        value.replace(',', '.')
      );

    if (
      value === '' ||
      Number.isFinite(numeric)
    ) {

      setThresholds(
        current => ({
          ...current,

          [key]:
            value === ''
              ? 0
              : numeric,

        })
      );

    }

  };


  // ===================================================
  // SAVE THRESHOLDS
  // ===================================================

  const saveThresholds = async () => {

    try {

      await AsyncStorage.setItem(
        'alertThresholds',
        JSON.stringify(thresholds)
      );

      Alert.alert(
        'Đã lưu',
        'Ngưỡng cảnh báo đã được cập nhật.'
      );

    } catch (error) {

      console.log(
        'Threshold save error:',
        error
      );

      Alert.alert(
        'Lỗi',
        'Không thể lưu ngưỡng cảnh báo.'
      );

    }

  };


  // ===================================================
  // RESET
  // ===================================================

  const resetThresholds = () => {

    Alert.alert(
      'Khôi phục mặc định',
      'Bạn có muốn khôi phục các ngưỡng cảnh báo mặc định không?',

      [

        {
          text: 'Hủy',
          style: 'cancel',
        },

        {
          text: 'Khôi phục',

          onPress: async () => {

            setThresholds(
              DEFAULT_THRESHOLDS
            );

            try {

              await AsyncStorage.setItem(
                'alertThresholds',
                JSON.stringify(
                  DEFAULT_THRESHOLDS
                )
              );

            } catch (error) {

              console.log(
                'Reset threshold error:',
                error
              );

            }

          },

        },

      ]

    );

  };


  // ===================================================
  // ABOUT
  // ===================================================

  const showAbout = () => {

    Alert.alert(
      'Smart Farm',

      'Ứng dụng giám sát và điều khiển nông nghiệp thông minh.\n\n' +
      'ESP32 Gateway\n' +
      'Firebase Realtime Database\n\n' +
      'Version 1.0.0'
    );

  };


  // ===================================================
  // REFRESH
  // ===================================================

  const refreshData = () => {

    loadSettings();

    Alert.alert(
      'Đã làm mới',
      'Cài đặt đã được tải lại.'
    );

  };


  // ===================================================
  // LOGOUT
  // ===================================================

  const logout = () => {

    Alert.alert(
      'Đăng xuất',
      'Bạn có muốn đăng xuất không?',

      [

        {
          text: 'Hủy',
          style: 'cancel',
        },

        {
          text: 'Đăng xuất',
          style: 'destructive',

          onPress: async () => {

            try {

              /*
               * Gọi Firebase signOut thông qua
               * AuthContext.
               *
               * Sau khi Firebase trả user = null,
               * AppNavigator sẽ tự động chuyển
               * về LoginScreen.
               */

              await authLogout();

              console.log(
                'User logout successfully'
              );

            } catch (error) {

              console.log(
                'Logout error:',
                error
              );

              Alert.alert(
                'Lỗi',
                'Không thể đăng xuất. Vui lòng thử lại.'
              );

            }

          },

        },

      ]

    );

  };


  // ===================================================
  // INPUT
  // ===================================================

  const ThresholdInput = ({
    label,
    value,
    unit,
    setting,
  }: {
    label: string;
    value: number;
    unit: string;
    setting: keyof AlertThresholds;
  }) => (

    <View style={styles.thresholdRow}>

      <View style={styles.thresholdInfo}>

        <Text style={styles.thresholdLabel}>
          {label}
        </Text>

        <Text style={styles.thresholdUnit}>
          {unit}
        </Text>

      </View>

      <TextInput

        style={styles.thresholdInput}

        value={String(value)}

        keyboardType="numeric"

        onChangeText={text =>
          updateThreshold(
            setting,
            text
          )
        }

      />

    </View>

  );


  // ===================================================
  // UI
  // ===================================================

  return (

    <ScrollView

      style={styles.container}

      contentContainerStyle={
        styles.content
      }

      showsVerticalScrollIndicator={
        false
      }

    >

      {/* =================================================
          HEADER
      ================================================= */}

      <View style={styles.header}>

        <View>

          <Text style={styles.title}>
            ⚙️ Cài đặt
          </Text>

          <Text style={styles.subtitle}>
            Quản lý hệ thống Smart Farm
          </Text>

        </View>

        <View style={styles.headerIcon}>

          <Text style={styles.headerEmoji}>
            🌱
          </Text>

        </View>

      </View>


      {/* =================================================
          ACCOUNT
      ================================================= */}

      <Text style={styles.sectionTitle}>
        Tài khoản
      </Text>

      <View style={styles.accountCard}>

        <View style={styles.accountIcon}>

          <Text style={styles.accountEmoji}>
            👤
          </Text>

        </View>

        <View style={styles.accountInfo}>

          {/* HIỂN THỊ USER ĐANG ĐĂNG NHẬP */}

          <Text style={styles.accountName}>
            {userName}
          </Text>

          <Text style={styles.accountEmail}>
            {userEmail}
          </Text>

          <View style={styles.accountBadge}>

            <Text style={styles.accountBadgeText}>
              SMART FARM USER
            </Text>

          </View>

        </View>

      </View>


      {/* =================================================
          GENERAL
      ================================================= */}

      <Text style={styles.sectionTitle}>
        Tùy chọn chung
      </Text>


      {/* =================================================
          ALERT
      ================================================= */}

      <View style={styles.optionCard}>

        <View style={styles.optionIcon}>

          <Text style={styles.optionEmoji}>
            🔔
          </Text>

        </View>

        <View style={styles.optionInfo}>

          <Text style={styles.optionTitle}>
            Cảnh báo môi trường
          </Text>

          <Text style={styles.optionDescription}>
            Cho phép hệ thống tạo cảnh báo khi cảm biến vượt ngưỡng
          </Text>

        </View>

        <Switch
          value={alertEnabled}
          onValueChange={toggleAlert}
        />

      </View>


      {/* =================================================
          UNIT
      ================================================= */}

      <View style={styles.optionCard}>

        <View style={styles.optionIcon}>

          <Text style={styles.optionEmoji}>
            🌡️
          </Text>

        </View>

        <View style={styles.optionInfo}>

          <Text style={styles.optionTitle}>
            Đơn vị nhiệt độ
          </Text>

          <Text style={styles.optionDescription}>
            Chọn đơn vị hiển thị nhiệt độ
          </Text>

        </View>

        <View style={styles.unitSelector}>

          <TouchableOpacity

            style={[
              styles.unitButton,

              temperatureUnit === 'C' &&
                styles.unitActive,

            ]}

            onPress={() =>
              changeTemperatureUnit('C')
            }

          >

            <Text
              style={[
                styles.unitText,

                temperatureUnit === 'C' &&
                  styles.unitTextActive,

              ]}
            >
              °C
            </Text>

          </TouchableOpacity>


          <TouchableOpacity

            style={[
              styles.unitButton,

              temperatureUnit === 'F' &&
                styles.unitActive,

            ]}

            onPress={() =>
              changeTemperatureUnit('F')
            }

          >

            <Text
              style={[
                styles.unitText,

                temperatureUnit === 'F' &&
                  styles.unitTextActive,

              ]}
            >
              °F
            </Text>

          </TouchableOpacity>

        </View>

      </View>


      {/* =================================================
          ALERT THRESHOLDS
      ================================================= */}

      <View style={styles.thresholdHeader}>

        <View>

          <Text style={styles.sectionTitle}>
            Ngưỡng cảnh báo
          </Text>

          <Text style={styles.thresholdDescription}>
            Các giá trị được lưu trên thiết bị
          </Text>

        </View>

        <Text style={styles.thresholdIcon}>
          🎯
        </Text>

      </View>


      <View style={styles.thresholdCard}>


        {/* TEMPERATURE */}

        <Text style={styles.groupTitle}>
          🌡️ Nhiệt độ
        </Text>

        <ThresholdInput
          label="Nhiệt độ tối thiểu"
          value={thresholds.temperatureLow}
          unit="°C"
          setting="temperatureLow"
        />

        <ThresholdInput
          label="Nhiệt độ tối đa"
          value={thresholds.temperatureHigh}
          unit="°C"
          setting="temperatureHigh"
        />


        <View style={styles.innerDivider} />


        {/* HUMIDITY */}

        <Text style={styles.groupTitle}>
          💧 Độ ẩm không khí
        </Text>

        <ThresholdInput
          label="Độ ẩm tối thiểu"
          value={thresholds.humidityLow}
          unit="%"
          setting="humidityLow"
        />


        <View style={styles.innerDivider} />


        {/* SOIL */}

        <Text style={styles.groupTitle}>
          🌱 Độ ẩm đất
        </Text>

        <ThresholdInput
          label="Độ ẩm đất tối thiểu"
          value={thresholds.soilMoistureLow}
          unit="%"
          setting="soilMoistureLow"
        />


        <View style={styles.innerDivider} />


        {/* LIGHT */}

        <Text style={styles.groupTitle}>
          ☀️ Ánh sáng
        </Text>

        <ThresholdInput
          label="Ánh sáng tối thiểu"
          value={thresholds.lightLow}
          unit="Lux"
          setting="lightLow"
        />

        <ThresholdInput
          label="Ánh sáng tối đa"
          value={thresholds.lightHigh}
          unit="Lux"
          setting="lightHigh"
        />


        {/* SAVE */}

        <TouchableOpacity
          style={styles.saveButton}
          onPress={saveThresholds}
          activeOpacity={0.8}
        >

          <Text style={styles.saveButtonText}>
            💾 Lưu ngưỡng cảnh báo
          </Text>

        </TouchableOpacity>


        {/* RESET */}

        <TouchableOpacity
          style={styles.resetButton}
          onPress={resetThresholds}
          activeOpacity={0.8}
        >

          <Text style={styles.resetButtonText}>
            Khôi phục mặc định
          </Text>

        </TouchableOpacity>

      </View>


      {/* =================================================
          SYSTEM
      ================================================= */}

      <Text style={styles.sectionTitle}>
        Hệ thống
      </Text>


      {/* REFRESH */}

      <TouchableOpacity
        style={styles.systemCard}
        onPress={refreshData}
        activeOpacity={0.7}
      >

        <View style={styles.systemIcon}>

          <Text style={styles.systemEmoji}>
            🔄
          </Text>

        </View>

        <View style={styles.systemInfo}>

          <Text style={styles.systemTitle}>
            Làm mới cài đặt
          </Text>

          <Text style={styles.systemDescription}>
            Tải lại các thiết lập hiện tại
          </Text>

        </View>

        <Text style={styles.arrow}>
          ›
        </Text>

      </TouchableOpacity>


      {/* ABOUT */}

      <TouchableOpacity
        style={styles.systemCard}
        onPress={showAbout}
        activeOpacity={0.7}
      >

        <View style={styles.systemIcon}>

          <Text style={styles.systemEmoji}>
            ℹ️
          </Text>

        </View>

        <View style={styles.systemInfo}>

          <Text style={styles.systemTitle}>
            Về ứng dụng
          </Text>

          <Text style={styles.systemDescription}>
            Thông tin Smart Farm
          </Text>

        </View>

        <Text style={styles.arrow}>
          ›
        </Text>

      </TouchableOpacity>


      {/* =================================================
          LOGOUT
      ================================================= */}

      <TouchableOpacity
        style={styles.logoutCard}
        onPress={logout}
        activeOpacity={0.7}
      >

        <Text style={styles.logoutIcon}>
          🚪
        </Text>

        <Text style={styles.logoutText}>
          Đăng xuất
        </Text>

      </TouchableOpacity>


      <Text style={styles.version}>
        Smart Farm v1.0.0
      </Text>

    </ScrollView>

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

  content: {
    padding: 20,
    paddingBottom: 45,
  },


  // ===================================================
  // HEADER
  // ===================================================

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 23,
  },

  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#111827',
  },

  subtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },

  headerIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
  },

  headerEmoji: {
    fontSize: 28,
  },


  // ===================================================
  // SECTION
  // ===================================================

  sectionTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 11,
    marginTop: 5,
  },


  // ===================================================
  // ACCOUNT
  // ===================================================

  accountCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },

  accountIcon: {
    width: 59,
    height: 59,
    borderRadius: 18,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },

  accountEmoji: {
    fontSize: 30,
  },

  accountInfo: {
    flex: 1,
  },

  accountName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
  },

  accountEmail: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 4,
  },

  accountBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 7,
    marginTop: 6,
  },

  accountBadgeText: {
    fontSize: 7,
    fontWeight: '900',
    color: '#15803D',
  },


  // ===================================================
  // OPTIONS
  // ===================================================

  optionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },

  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: '#F0FDF4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  optionEmoji: {
    fontSize: 24,
  },

  optionInfo: {
    flex: 1,
  },

  optionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
  },

  optionDescription: {
    fontSize: 9,
    color: '#9CA3AF',
    marginTop: 4,
    lineHeight: 14,
    paddingRight: 8,
  },


  // ===================================================
  // UNIT
  // ===================================================

  unitSelector: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 11,
    padding: 3,
  },

  unitButton: {
    width: 36,
    height: 31,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },

  unitActive: {
    backgroundColor: '#16A34A',
  },

  unitText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#6B7280',
  },

  unitTextActive: {
    color: '#FFFFFF',
  },


  // ===================================================
  // THRESHOLD HEADER
  // ===================================================

  thresholdHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },

  thresholdDescription: {
    fontSize: 9,
    color: '#9CA3AF',
    marginTop: -7,
    marginBottom: 12,
  },

  thresholdIcon: {
    fontSize: 27,
    marginBottom: 13,
  },


  // ===================================================
  // THRESHOLD
  // ===================================================

  thresholdCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 17,
    marginBottom: 24,
  },

  groupTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#374151',
    marginBottom: 9,
  },

  thresholdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 9,
  },

  thresholdInfo: {
    flex: 1,
  },

  thresholdLabel: {
    fontSize: 11,
    color: '#4B5563',
  },

  thresholdUnit: {
    fontSize: 8,
    color: '#9CA3AF',
    marginTop: 2,
  },

  thresholdInput: {
    width: 72,
    height: 38,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '800',
    color: '#111827',
    backgroundColor: '#F9FAFB',
  },

  innerDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 12,
  },


  // ===================================================
  // SAVE
  // ===================================================

  saveButton: {
    height: 45,
    borderRadius: 13,
    backgroundColor: '#16A34A',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },

  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },

  resetButton: {
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 9,
  },

  resetButtonText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#6B7280',
  },


  // ===================================================
  // SYSTEM
  // ===================================================

  systemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 19,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 11,
  },

  systemIcon: {
    width: 45,
    height: 45,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  systemEmoji: {
    fontSize: 22,
  },

  systemInfo: {
    flex: 1,
  },

  systemTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#111827',
  },

  systemDescription: {
    fontSize: 9,
    color: '#9CA3AF',
    marginTop: 3,
  },

  arrow: {
    fontSize: 25,
    color: '#9CA3AF',
  },


  // ===================================================
  // LOGOUT
  // ===================================================

  logoutCard: {
    height: 52,
    borderRadius: 17,
    backgroundColor: '#FEF2F2',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },

  logoutIcon: {
    fontSize: 19,
    marginRight: 8,
  },

  logoutText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#DC2626',
  },


  // ===================================================
  // VERSION
  // ===================================================

  version: {
    textAlign: 'center',
    fontSize: 9,
    color: '#9CA3AF',
    marginTop: 18,
  },

});