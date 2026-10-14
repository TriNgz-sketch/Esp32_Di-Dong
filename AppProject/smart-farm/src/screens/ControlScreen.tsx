import React, { useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';

import {
  ref,
  onValue,
  get,
  set,
} from 'firebase/database';

import { database } from '../config/firebase';
import { useAuth } from '../auth/AuthContext';

// =======================================================
// TYPES
// =======================================================

type AlertThresholds = {
  temperatureLow: number;
  temperatureHigh: number;
  humidityLow: number;
  soilMoistureLow: number;
  lightLow: number;
  lightHigh: number;
};

// =======================================================
// DEFAULT THRESHOLDS
// =======================================================

const DEFAULT_ALERT_THRESHOLDS: AlertThresholds = {
  temperatureLow: 15,
  temperatureHigh: 35,
  humidityLow: 40,
  soilMoistureLow: 30,
  lightLow: 200,
  lightHigh: 900,
};

// =======================================================
// COMPONENT
// =======================================================

export default function ControlScreen() {
  const { user } = useAuth();

  // =====================================================
  // DEVICE STATES
  // =====================================================

  const [pump, setPump] = useState(false);
  const [fan, setFan] = useState(false);
  const [light, setLight] = useState(false);
  const [auto, setAuto] = useState(false);

  // =====================================================
  // AUTO THRESHOLDS
  // =====================================================

  const [thresholds, setThresholds] =
    useState<AlertThresholds>(DEFAULT_ALERT_THRESHOLDS);

  // =====================================================
  // SENSOR STATES FOR AUTO
  // =====================================================

  const [temperature, setTemperature] = useState(0);
  const [humidity, setHumidity] = useState(0);
  const [soilMoisture, setSoilMoisture] = useState(0);
  const [lightLevel, setLightLevel] = useState(0);

  // =====================================================
  // SYSTEM STATUS
  // =====================================================

  const [systemStatus, setSystemStatus] =
    useState<'online' | 'offline'>('offline');

  // =====================================================
  // OFFLINE / ONLINE REF
  // =====================================================

  const isOnlineRef = useRef(false);

  // =====================================================
  // FIREBASE REALTIME
  // =====================================================

  useEffect(() => {
    // Không có user thì không kết nối Firebase
    if (!user?.uid) {
      isOnlineRef.current = false;
      setSystemStatus('offline');
      return;
    }

    const basePath = `users/${user.uid}/farm`;

    // Reset trạng thái khi đổi tài khoản
    isOnlineRef.current = false;
    setSystemStatus('offline');

    // -----------------------------------------------------
    // REFERENCES
    // -----------------------------------------------------

    const autoRef = ref(
      database,
      `${basePath}/devices/mode/auto`
    );

    const pumpRef = ref(
      database,
      `${basePath}/devices/pump/state`
    );

    const fanRef = ref(
      database,
      `${basePath}/devices/fan/state`
    );

    const lightRef = ref(
      database,
      `${basePath}/devices/light/state`
    );

    const sensorsRef = ref(
      database,
      `${basePath}/sensors`
    );

    const systemRef = ref(
      database,
      `${basePath}/system/status`
    );

    // -----------------------------------------------------
    // AUTO
    // -----------------------------------------------------

    const unsubscribeAuto = onValue(
      autoRef,
      snapshot => {
        if (!isOnlineRef.current) {
          return;
        }

        setAuto(snapshot.val() === true);
      }
    );

    // -----------------------------------------------------
    // PUMP
    // -----------------------------------------------------

    const unsubscribePump = onValue(
      pumpRef,
      snapshot => {
        if (!isOnlineRef.current) {
          return;
        }

        setPump(snapshot.val() === true);
      }
    );

    // -----------------------------------------------------
    // FAN
    // -----------------------------------------------------

    const unsubscribeFan = onValue(
      fanRef,
      snapshot => {
        if (!isOnlineRef.current) {
          return;
        }

        setFan(snapshot.val() === true);
      }
    );

    // -----------------------------------------------------
    // LIGHT
    // -----------------------------------------------------

    const unsubscribeLight = onValue(
      lightRef,
      snapshot => {
        if (!isOnlineRef.current) {
          return;
        }

        setLight(snapshot.val() === true);
      }
    );

    // -----------------------------------------------------
    // SENSOR DATA
    // -----------------------------------------------------

    const applySensorData = (data: any) => {
      if (!data) {
        return;
      }

      const newTemperature =
        Number(data.temperature ?? 0);

      const newHumidity =
        Number(data.humidity ?? 0);

      const newSoilMoisture =
        Number(data.soilMoisture ?? 0);

      const newLight =
        Number(data.light ?? 0);

      if (Number.isFinite(newTemperature)) {
        setTemperature(newTemperature);
      }

      if (Number.isFinite(newHumidity)) {
        setHumidity(newHumidity);
      }

      if (Number.isFinite(newSoilMoisture)) {
        setSoilMoisture(newSoilMoisture);
      }

      if (Number.isFinite(newLight)) {
        setLightLevel(newLight);
      }
    };

    const unsubscribeSensors = onValue(
      sensorsRef,
      snapshot => {
        if (!isOnlineRef.current) {
          return;
        }

        applySensorData(snapshot.val());
      }
    );

    // -----------------------------------------------------
    // SYSTEM STATUS
    // -----------------------------------------------------

    const unsubscribeSystem = onValue(
      systemRef,
      async snapshot => {
        const value = snapshot.val();

        const online = value === 'online';
        const offline = value === 'offline';

        // =================================================
        // ONLINE
        // =================================================

        if (online) {
          isOnlineRef.current = true;
          setSystemStatus('online');

          try {
            const [
              sensorSnapshot,
              pumpSnapshot,
              fanSnapshot,
              lightSnapshot,
              autoSnapshot,
            ] = await Promise.all([
              get(sensorsRef),
              get(pumpRef),
              get(fanRef),
              get(lightRef),
              get(autoRef),
            ]);

            if (!isOnlineRef.current) {
              return;
            }

            // SENSOR

            applySensorData(
              sensorSnapshot.val()
            );

            // DEVICES

            setPump(
              pumpSnapshot.val() === true
            );

            setFan(
              fanSnapshot.val() === true
            );

            setLight(
              lightSnapshot.val() === true
            );

            // AUTO

            setAuto(
              autoSnapshot.val() === true
            );
          } catch (error) {
            console.log(
              '❌ Control - lỗi đồng bộ khi online:',
              error
            );
          }

          return;
        }

        // =================================================
        // OFFLINE
        // =================================================

        if (offline) {
          isOnlineRef.current = false;
          setSystemStatus('offline');

          // Không reset dữ liệu cuối cùng
          return;
        }

        // =================================================
        // UNKNOWN STATUS
        // =================================================

        isOnlineRef.current = false;
        setSystemStatus('offline');
      }
    );

    // -----------------------------------------------------
    // CLEANUP
    // -----------------------------------------------------

    return () => {
      isOnlineRef.current = false;

      unsubscribeAuto();
      unsubscribeSensors();
      unsubscribePump();
      unsubscribeFan();
      unsubscribeLight();
      unsubscribeSystem();
    };
  }, [user?.uid]);

  // =======================================================
  // LOAD AUTO THRESHOLDS
  // =======================================================

  useEffect(() => {
    if (!user?.uid) {
      setThresholds(DEFAULT_ALERT_THRESHOLDS);
      return;
    }

    const storageKey =
      `alertThresholds_${user.uid}`;

    const loadThresholds = async () => {
      try {
        const saved =
          await AsyncStorage.getItem(storageKey);

        if (!saved) {
          setThresholds(
            DEFAULT_ALERT_THRESHOLDS
          );
          return;
        }

        const parsed = JSON.parse(saved);

        const safeNumber = (
          value: any,
          fallback: number
        ) => {
          const number = Number(value);

          return Number.isFinite(number)
            ? number
            : fallback;
        };

        setThresholds({
          temperatureLow:
            safeNumber(
              parsed.temperatureLow,
              DEFAULT_ALERT_THRESHOLDS.temperatureLow
            ),

          temperatureHigh:
            safeNumber(
              parsed.temperatureHigh,
              DEFAULT_ALERT_THRESHOLDS.temperatureHigh
            ),

          humidityLow:
            safeNumber(
              parsed.humidityLow,
              DEFAULT_ALERT_THRESHOLDS.humidityLow
            ),

          soilMoistureLow:
            safeNumber(
              parsed.soilMoistureLow,
              DEFAULT_ALERT_THRESHOLDS.soilMoistureLow
            ),

          lightLow:
            safeNumber(
              parsed.lightLow,
              DEFAULT_ALERT_THRESHOLDS.lightLow
            ),

          lightHigh:
            safeNumber(
              parsed.lightHigh,
              DEFAULT_ALERT_THRESHOLDS.lightHigh
            ),
        });
      } catch (error) {
        console.log(
          '❌ Control - lỗi đọc alertThresholds:',
          error
        );

        setThresholds(
          DEFAULT_ALERT_THRESHOLDS
        );
      }
    };

    loadThresholds();

    const interval = setInterval(
      loadThresholds,
      1000
    );

    return () => {
      clearInterval(interval);
    };
  }, [user?.uid]);

  // =======================================================
  // AUTO CONTROL
  // =======================================================

  useEffect(() => {
    if (
      !auto ||
      systemStatus !== 'online' ||
      !user?.uid
    ) {
      return;
    }

    const basePath =
      `users/${user.uid}/farm`;

    const applyAutoControl = async () => {
      try {
        // -------------------------------------------------
        // PUMP
        // -------------------------------------------------

        const desiredPump =
          soilMoisture > 0 &&
          soilMoisture <
            thresholds.soilMoistureLow;

        // -------------------------------------------------
        // FAN
        // -------------------------------------------------

        const desiredFan =
          temperature >
            thresholds.temperatureHigh ||
          (
            humidity > 0 &&
            humidity <
              thresholds.humidityLow
          );

        // -------------------------------------------------
        // LIGHT
        // -------------------------------------------------

        const desiredLight =
          lightLevel > 0 &&
          lightLevel <
            thresholds.lightLow;

        // -------------------------------------------------
        // FIREBASE UPDATES
        // -------------------------------------------------

        const updates: Promise<void>[] = [];

        if (pump !== desiredPump) {
          updates.push(
            set(
              ref(
                database,
                `${basePath}/devices/pump/state`
              ),
              desiredPump
            )
          );
        }

        if (fan !== desiredFan) {
          updates.push(
            set(
              ref(
                database,
                `${basePath}/devices/fan/state`
              ),
              desiredFan
            )
          );
        }

        if (light !== desiredLight) {
          updates.push(
            set(
              ref(
                database,
                `${basePath}/devices/light/state`
              ),
              desiredLight
            )
          );
        }

        if (updates.length > 0) {
          await Promise.all(updates);

          console.log(
            '🤖 AUTO:',
            {
              temperature,
              humidity,
              soilMoisture,
              lightLevel,
              pump: desiredPump,
              fan: desiredFan,
              light: desiredLight,
            }
          );
        }
      } catch (error) {
        console.error(
          '❌ AUTO control error:',
          error
        );
      }
    };

    applyAutoControl();
  }, [
    auto,
    systemStatus,
    temperature,
    humidity,
    soilMoisture,
    lightLevel,
    thresholds,
    pump,
    fan,
    light,
    user?.uid,
  ]);

  // =======================================================
  // ONLINE CHECK
  // =======================================================

  const isOnline =
    systemStatus === 'online';

  // =======================================================
  // PUMP
  // =======================================================

  const handlePumpChange = async (
    value: boolean
  ) => {
    if (!user?.uid) {
      return;
    }

    if (!isOnline) {
      Alert.alert(
        'Hệ thống offline',
        'Không thể điều khiển máy bơm khi hệ thống đang offline.'
      );
      return;
    }

    if (auto) {
      Alert.alert(
        'Chế độ AUTO',
        'Không thể điều khiển máy bơm thủ công khi AUTO đang bật.'
      );
      return;
    }

    try {
      await set(
        ref(
          database,
          `users/${user.uid}/farm/devices/pump/state`
        ),
        value
      );
    } catch (error) {
      console.error(
        'Pump error:',
        error
      );

      Alert.alert(
        'Lỗi',
        'Không thể cập nhật máy bơm.'
      );
    }
  };

  // =======================================================
  // FAN
  // =======================================================

  const handleFanChange = async (
    value: boolean
  ) => {
    if (!user?.uid) {
      return;
    }

    if (!isOnline) {
      Alert.alert(
        'Hệ thống offline',
        'Không thể điều khiển quạt khi hệ thống đang offline.'
      );
      return;
    }

    if (auto) {
      Alert.alert(
        'Chế độ AUTO',
        'Không thể điều khiển quạt thủ công khi AUTO đang bật.'
      );
      return;
    }

    try {
      await set(
        ref(
          database,
          `users/${user.uid}/farm/devices/fan/state`
        ),
        value
      );
    } catch (error) {
      console.error(
        'Fan error:',
        error
      );

      Alert.alert(
        'Lỗi',
        'Không thể cập nhật quạt.'
      );
    }
  };

  // =======================================================
  // LIGHT
  // =======================================================

  const handleLightChange = async (
    value: boolean
  ) => {
    if (!user?.uid) {
      return;
    }

    if (!isOnline) {
      Alert.alert(
        'Hệ thống offline',
        'Không thể điều khiển đèn khi hệ thống đang offline.'
      );
      return;
    }

    if (auto) {
      Alert.alert(
        'Chế độ AUTO',
        'Không thể điều khiển đèn thủ công khi AUTO đang bật.'
      );
      return;
    }

    try {
      await set(
        ref(
          database,
          `users/${user.uid}/farm/devices/light/state`
        ),
        value
      );
    } catch (error) {
      console.error(
        'Light error:',
        error
      );

      Alert.alert(
        'Lỗi',
        'Không thể cập nhật đèn.'
      );
    }
  };

  // =======================================================
  // AUTO
  // =======================================================

  const handleAutoChange = async (
    value: boolean
  ) => {
    if (!user?.uid) {
      return;
    }

    if (!isOnline) {
      Alert.alert(
        'Hệ thống offline',
        'Không thể thay đổi chế độ khi hệ thống đang offline.'
      );
      return;
    }

    try {
      await set(
        ref(
          database,
          `users/${user.uid}/farm/devices/mode/auto`
        ),
        value
      );
    } catch (error) {
      console.error(
        'Auto error:',
        error
      );

      Alert.alert(
        'Lỗi',
        'Không thể cập nhật chế độ AUTO.'
      );
    }
  };

  // =======================================================
  // DEVICE CARD
  // =======================================================

  const renderDevice = (
    icon: string,
    name: string,
    description: string,
    value: boolean,
    onChange: (value: boolean) => void,
    disabled: boolean,
    accent:
      | 'green'
      | 'blue'
      | 'yellow'
      | 'purple'
  ) => {
    return (
      <View style={styles.deviceCard}>
        <View
          style={[
            styles.deviceIconBox,
            accent === 'green'
              ? styles.iconGreen
              : accent === 'blue'
                ? styles.iconBlue
                : accent === 'yellow'
                  ? styles.iconYellow
                  : styles.iconPurple,
          ]}
        >
          <Text style={styles.deviceIcon}>
            {icon}
          </Text>
        </View>

        <View style={styles.deviceInfo}>
          <Text style={styles.deviceName}>
            {name}
          </Text>

          <Text style={styles.deviceDescription}>
            {description}
          </Text>

          <View style={styles.stateRow}>
            <View
              style={[
                styles.stateDot,
                {
                  backgroundColor:
                    value
                      ? '#22C55E'
                      : '#CBD5E1',
                },
              ]}
            />

            <Text
              style={[
                styles.deviceState,
                value
                  ? styles.stateOn
                  : styles.stateOff,
              ]}
            >
              {value
                ? 'ĐANG BẬT'
                : 'ĐANG TẮT'}
            </Text>
          </View>
        </View>

        <Switch
          value={value}
          onValueChange={onChange}
          disabled={disabled}
          trackColor={{
            false: '#D1D5DB',
            true: '#86EFAC',
          }}
          thumbColor={
            value
              ? '#16A34A'
              : '#F8FAFC'
          }
          ios_backgroundColor="#D1D5DB"
        />
      </View>
    );
  };

  // =======================================================
  // UI
  // =======================================================

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* HEADER */}

      <View style={styles.header}>
        <View>
          <Text style={styles.headerLabel}>
            SMART FARM
          </Text>

          <Text style={styles.title}>
            Điều khiển
          </Text>

          <Text style={styles.subtitle}>
            Quản lý thiết bị trong hệ thống
          </Text>
        </View>

        <View style={styles.headerIconBox}>
          <Text style={styles.headerIcon}>
            ⚙️
          </Text>
        </View>
      </View>

      {/* SYSTEM STATUS */}

      <View
        style={[
          styles.statusCard,
          isOnline
            ? styles.statusOnline
            : styles.statusOffline,
        ]}
      >
        <View
          style={[
            styles.statusIconBox,
            isOnline
              ? styles.statusIconOnline
              : styles.statusIconOffline,
          ]}
        >
          <Text style={styles.statusIcon}>
            {isOnline ? '✓' : '!'}
          </Text>
        </View>

        <View style={styles.statusInfo}>
          <Text style={styles.statusLabel}>
            TRẠNG THÁI HỆ THỐNG
          </Text>

          <Text style={styles.statusTitle}>
            {isOnline
              ? 'Hệ thống đang hoạt động'
              : 'Hệ thống đang offline'}
          </Text>

          <Text style={styles.statusDescription}>
            {isOnline
              ? 'Các thiết bị đã sẵn sàng điều khiển'
              : 'Điều khiển thiết bị hiện đang bị khóa'}
          </Text>
        </View>

        <View
          style={[
            styles.statusBadge,
            isOnline
              ? styles.badgeOnline
              : styles.badgeOffline,
          ]}
        >
          <View
            style={[
              styles.badgeDot,
              {
                backgroundColor:
                  isOnline
                    ? '#16A34A'
                    : '#DC2626',
              },
            ]}
          />

          <Text
            style={[
              styles.badgeText,
              {
                color:
                  isOnline
                    ? '#15803D'
                    : '#B91C1C',
              },
            ]}
          >
            {isOnline
              ? 'ONLINE'
              : 'OFFLINE'}
          </Text>
        </View>
      </View>

      {/* OFFLINE WARNING */}

      {!isOnline && (
        <View style={styles.offlineBanner}>
          <View style={styles.warningCircle}>
            <Text style={styles.warningCircleText}>
              !
            </Text>
          </View>

          <View style={styles.offlineInfo}>
            <Text style={styles.offlineTitle}>
              Điều khiển đã bị khóa
            </Text>

            <Text style={styles.offlineText}>
              Hãy chờ ESP32 kết nối lại để tiếp tục
              điều khiển thiết bị.
            </Text>
          </View>
        </View>
      )}

      {/* MODE SECTION */}

      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>
            Chế độ hoạt động
          </Text>

          <Text style={styles.sectionSubtitle}>
            Chọn cách hệ thống vận hành
          </Text>
        </View>

        <View style={styles.modeLabel}>
          <Text style={styles.modeLabelText}>
            {auto ? 'AUTO' : 'MANUAL'}
          </Text>
        </View>
      </View>

      {/* AUTO CARD */}

      <View
        style={[
          styles.autoCard,
          auto
            ? styles.autoActive
            : styles.autoInactive,
        ]}
      >
        <View
          style={[
            styles.autoIconBox,
            auto
              ? styles.autoIconActive
              : styles.autoIconInactive,
          ]}
        >
          <Text style={styles.autoIcon}>
            🤖
          </Text>
        </View>

        <View style={styles.autoInfo}>
          <View style={styles.autoTitleRow}>
            <Text style={styles.autoTitle}>
              Chế độ AUTO
            </Text>

            {auto && (
              <View style={styles.autoActiveBadge}>
                <Text style={styles.autoActiveBadgeText}>
                  TỰ ĐỘNG
                </Text>
              </View>
            )}
          </View>

          <Text style={styles.autoDescription}>
            {auto
              ? 'Hệ thống tự động điều khiển các thiết bị dựa trên môi trường.'
              : 'Bạn có thể điều khiển từng thiết bị thủ công.'}
          </Text>
        </View>

        <Switch
          value={auto}
          onValueChange={handleAutoChange}
          disabled={!isOnline}
          trackColor={{
            false: '#D1D5DB',
            true: '#86EFAC',
          }}
          thumbColor={
            auto
              ? '#16A34A'
              : '#F8FAFC'
          }
          ios_backgroundColor="#D1D5DB"
        />
      </View>

      {/* DEVICES SECTION */}

      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>
            Thiết bị
          </Text>

          <Text style={styles.sectionSubtitle}>
            {auto
              ? 'Thiết bị đang được hệ thống tự động quản lý'
              : 'Điều khiển thiết bị thủ công'}
          </Text>
        </View>

        <View style={styles.deviceCount}>
          <Text style={styles.deviceCountText}>
            3 thiết bị
          </Text>
        </View>
      </View>

      {/* PUMP */}

      {renderDevice(
        '🚿',
        'Máy bơm tưới',
        'Điều khiển hệ thống tưới cây',
        pump,
        handlePumpChange,
        !isOnline || auto,
        'blue'
      )}

      {/* FAN */}

      {renderDevice(
        '🌀',
        'Quạt thông gió',
        'Điều khiển hệ thống làm mát',
        fan,
        handleFanChange,
        !isOnline || auto,
        'purple'
      )}

      {/* LIGHT */}

      {renderDevice(
        '💡',
        'Đèn chiếu sáng',
        'Điều khiển hệ thống chiếu sáng',
        light,
        handleLightChange,
        !isOnline || auto,
        'yellow'
      )}

      {/* AUTO INFO */}

      {auto && isOnline && (
        <View style={styles.autoInfoBanner}>
          <View style={styles.autoInfoIconBox}>
            <Text style={styles.autoInfoIcon}>
              🤖
            </Text>
          </View>

          <View style={styles.autoInfoContent}>
            <Text style={styles.autoInfoTitle}>
              Đang điều khiển tự động
            </Text>

            <Text style={styles.autoInfoText}>
              Các thiết bị sẽ được hệ thống tự động
              điều khiển theo điều kiện môi trường.
            </Text>
          </View>
        </View>
      )}

      {/* CONTROL INFO */}

      <View style={styles.infoCard}>
        <View style={styles.infoIconBox}>
          <Text style={styles.infoIcon}>
            ℹ️
          </Text>
        </View>

        <View style={styles.infoContent}>
          <Text style={styles.infoTitle}>
            {isOnline
              ? auto
                ? 'Chế độ AUTO đang hoạt động'
                : 'Sẵn sàng điều khiển'
              : 'Hệ thống đang offline'}
          </Text>

          <Text style={styles.infoText}>
            {isOnline
              ? auto
                ? 'Các Switch thiết bị đã được khóa để tránh xung đột với bộ điều khiển tự động.'
                : 'Bạn có thể bật hoặc tắt các thiết bị bằng các công tắc bên trên.'
              : 'Toàn bộ chức năng điều khiển đã được khóa cho đến khi ESP32 kết nối lại.'}
          </Text>
        </View>
      </View>

      {/* FOOTER */}

      <Text style={styles.footerText}>
        Smart Farm • Điều khiển thiết bị realtime
      </Text>
    </ScrollView>
  );
}

// =======================================================
// STYLES
// =======================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F7F2',
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 45,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 22,
  },

  headerLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: '#16A34A',
    letterSpacing: 1.8,
    marginBottom: 4,
  },

  title: {
    fontSize: 30,
    fontWeight: '900',
    color: '#111827',
  },

  subtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 5,
  },

  headerIconBox: {
    width: 50,
    height: 50,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },

  headerIcon: {
    fontSize: 25,
  },

  statusCard: {
    borderRadius: 22,
    padding: 17,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    borderWidth: 1,
  },

  statusOnline: {
    backgroundColor: '#ECFDF5',
    borderColor: '#BBF7D0',
  },

  statusOffline: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },

  statusIconBox: {
    width: 48,
    height: 48,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 13,
  },

  statusIconOnline: {
    backgroundColor: '#DCFCE7',
  },

  statusIconOffline: {
    backgroundColor: '#FEE2E2',
  },

  statusIcon: {
    fontSize: 22,
    fontWeight: '900',
    color: '#111827',
  },

  statusInfo: {
    flex: 1,
  },

  statusLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#6B7280',
    letterSpacing: 0.8,
    marginBottom: 3,
  },

  statusTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#111827',
  },

  statusDescription: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 4,
    lineHeight: 15,
  },

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 10,
    marginLeft: 6,
  },

  badgeOnline: {
    backgroundColor: '#DCFCE7',
  },

  badgeOffline: {
    backgroundColor: '#FEE2E2',
  },

  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },

  badgeText: {
    fontSize: 9,
    fontWeight: '900',
  },

  offlineBanner: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: 19,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 22,
  },

  warningCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFEDD5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  warningCircleText: {
    fontSize: 19,
    fontWeight: '900',
    color: '#EA580C',
  },

  offlineInfo: {
    flex: 1,
  },

  offlineTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#C2410C',
  },

  offlineText: {
    fontSize: 10,
    color: '#9A3412',
    lineHeight: 15,
    marginTop: 3,
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 5,
    marginBottom: 13,
  },

  sectionTitle: {
    fontSize: 21,
    fontWeight: '900',
    color: '#111827',
  },

  sectionSubtitle: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 3,
  },

  modeLabel: {
    backgroundColor: '#F0FDF4',
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },

  modeLabelText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#15803D',
  },

  deviceCount: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },

  deviceCountText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#6B7280',
  },

  autoCard: {
    borderRadius: 22,
    padding: 17,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 27,
    borderWidth: 1,
  },

  autoActive: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },

  autoInactive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
  },

  autoIconBox: {
    width: 53,
    height: 53,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 13,
  },

  autoIconActive: {
    backgroundColor: '#DCFCE7',
  },

  autoIconInactive: {
    backgroundColor: '#F3F4F6',
  },

  autoIcon: {
    fontSize: 27,
  },

  autoInfo: {
    flex: 1,
  },

  autoTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },

  autoTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#111827',
  },

  autoActiveBadge: {
    backgroundColor: '#16A34A',
    borderRadius: 7,
    paddingHorizontal: 6,
    paddingVertical: 3,
    marginLeft: 7,
  },

  autoActiveBadgeText: {
    fontSize: 7,
    fontWeight: '900',
    color: '#FFFFFF',
  },

  autoDescription: {
    fontSize: 10,
    color: '#6B7280',
    lineHeight: 15,
    marginTop: 5,
    paddingRight: 5,
  },

  deviceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 21,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 13,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.035,
    shadowRadius: 7,
    elevation: 1,
  },

  deviceIconBox: {
    width: 55,
    height: 55,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 13,
  },

  iconGreen: {
    backgroundColor: '#F0FDF4',
  },

  iconBlue: {
    backgroundColor: '#EFF6FF',
  },

  iconYellow: {
    backgroundColor: '#FEFCE8',
  },

  iconPurple: {
    backgroundColor: '#FAF5FF',
  },

  deviceIcon: {
    fontSize: 28,
  },

  deviceInfo: {
    flex: 1,
  },

  deviceName: {
    fontSize: 15,
    fontWeight: '900',
    color: '#111827',
  },

  deviceDescription: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 3,
  },

  stateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 7,
  },

  stateDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },

  deviceState: {
    fontSize: 9,
    fontWeight: '900',
  },

  stateOn: {
    color: '#16A34A',
  },

  stateOff: {
    color: '#9CA3AF',
  },

  autoInfoBanner: {
    backgroundColor: '#EFF6FF',
    borderRadius: 19,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginTop: 4,
    marginBottom: 14,
  },

  autoInfoIconBox: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 11,
  },

  autoInfoIcon: {
    fontSize: 22,
  },

  autoInfoContent: {
    flex: 1,
  },

  autoInfoTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#1D4ED8',
  },

  autoInfoText: {
    fontSize: 10,
    lineHeight: 15,
    color: '#1E40AF',
    marginTop: 3,
  },

  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    marginTop: 5,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  infoIconBox: {
    width: 39,
    height: 39,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 11,
  },

  infoIcon: {
    fontSize: 18,
  },

  infoContent: {
    flex: 1,
  },

  infoTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#374151',
  },

  infoText: {
    fontSize: 10,
    color: '#6B7280',
    lineHeight: 16,
    marginTop: 4,
  },

  footerText: {
    textAlign: 'center',
    fontSize: 9,
    color: '#9CA3AF',
    marginTop: 22,
  },
});