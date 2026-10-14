import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';

import {
  ref,
  onValue,
  get,
} from 'firebase/database';

import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  useFocusEffect,
} from '@react-navigation/native';

import { database } from '../config/firebase';
import { useAuth } from '../auth/AuthContext';


// ======================================================
// TYPES
// ======================================================

type TemperatureUnit = 'C' | 'F';

type AlertThresholds = {
  temperatureLow: number;
  temperatureHigh: number;

  humidityLow: number;

  soilMoistureLow: number;

  lightLow: number;
  lightHigh: number;
};


// ======================================================
// DEFAULT THRESHOLDS
// ======================================================

const DEFAULT_ALERT_THRESHOLDS: AlertThresholds = {
  temperatureLow: 15,
  temperatureHigh: 35,

  humidityLow: 40,

  soilMoistureLow: 30,

  lightLow: 200,
  lightHigh: 900,
};


// ======================================================
// DASHBOARD
// ======================================================

export default function DashboardScreen() {

  // ====================================================
  // AUTH
  // ====================================================

  const { user } = useAuth();


  // ====================================================
  // SENSOR STATES
  // ====================================================

  const [temperature, setTemperature] =
    useState<number>(0);

  const [humidity, setHumidity] =
    useState<number>(0);

  const [soilMoisture, setSoilMoisture] =
    useState<number>(0);

  const [light, setLight] =
    useState<number>(0);


  // ====================================================
  // DEVICE STATES
  // ====================================================

  const [pump, setPump] =
    useState<boolean>(false);

  const [fan, setFan] =
    useState<boolean>(false);

  const [lightDevice, setLightDevice] =
    useState<boolean>(false);


  // ====================================================
  // SYSTEM STATUS
  // ====================================================

  const [systemStatus, setSystemStatus] =
    useState<'online' | 'offline'>('offline');

  const systemStatusRef =
    useRef<'online' | 'offline'>('offline');


  // ====================================================
  // ALERT
  // ====================================================

  const [alertEnabled, setAlertEnabled] =
    useState<boolean>(true);


  // ====================================================
  // TEMPERATURE UNIT
  // ====================================================

  const [temperatureUnit, setTemperatureUnit] =
    useState<TemperatureUnit>('C');


  // ====================================================
  // THRESHOLDS
  // ====================================================

  const [thresholds, setThresholds] =
    useState<AlertThresholds>(
      DEFAULT_ALERT_THRESHOLDS
    );


  // ====================================================
  // REFRESH
  // ====================================================

  const [refreshing, setRefreshing] =
    useState<boolean>(false);


  // ====================================================
  // USER-SPECIFIC STORAGE KEYS
  // ====================================================

  const getStorageKey = useCallback(
    (key: string) => {

      if (!user?.uid) {
        return null;
      }

      return `${key}_${user.uid}`;

    },
    [user?.uid]
  );


  // ====================================================
  // LOAD ALERT SETTING
  // ====================================================

  const loadAlertSetting = useCallback(
    async () => {

      if (!user?.uid) {
        return;
      }

      try {

        const key =
          getStorageKey('alertEnabled');

        if (!key) {
          return;
        }

        const savedAlert =
          await AsyncStorage.getItem(key);

        if (savedAlert === null) {

          setAlertEnabled(true);

        } else {

          setAlertEnabled(
            savedAlert === 'true'
          );

        }

      } catch (error) {

        console.log(
          '❌ Dashboard - lỗi đọc alertEnabled:',
          error
        );

        setAlertEnabled(true);

      }

    },
    [user?.uid, getStorageKey]
  );


  // ====================================================
  // LOAD TEMPERATURE UNIT
  // ====================================================

  const loadTemperatureUnit =
    useCallback(
      async () => {

        if (!user?.uid) {
          return;
        }

        try {

          const key =
            getStorageKey('temperatureUnit');

          if (!key) {
            return;
          }

          const savedUnit =
            await AsyncStorage.getItem(key);

          if (
            savedUnit === 'C' ||
            savedUnit === 'F'
          ) {

            setTemperatureUnit(
              savedUnit
            );

          } else {

            setTemperatureUnit('C');

          }

        } catch (error) {

          console.log(
            '❌ Dashboard - lỗi đọc temperatureUnit:',
            error
          );

          setTemperatureUnit('C');

        }

      },
      [user?.uid, getStorageKey]
    );


  // ====================================================
  // LOAD ALERT THRESHOLDS
  // ====================================================

  const loadAlertThresholds =
    useCallback(
      async () => {

        if (!user?.uid) {
          return;
        }

        try {

          const key =
            getStorageKey('alertThresholds');

          if (!key) {
            return;
          }

          const savedThresholds =
            await AsyncStorage.getItem(key);

          if (
            savedThresholds === null
          ) {

            setThresholds(
              DEFAULT_ALERT_THRESHOLDS
            );

            return;

          }

          try {

            const parsed =
              JSON.parse(
                savedThresholds
              );

            const newThresholds:
              AlertThresholds = {

              temperatureLow:
                Number.isFinite(
                  Number(
                    parsed.temperatureLow
                  )
                )
                  ? Number(
                      parsed.temperatureLow
                    )
                  : DEFAULT_ALERT_THRESHOLDS.temperatureLow,

              temperatureHigh:
                Number.isFinite(
                  Number(
                    parsed.temperatureHigh
                  )
                )
                  ? Number(
                      parsed.temperatureHigh
                    )
                  : DEFAULT_ALERT_THRESHOLDS.temperatureHigh,

              humidityLow:
                Number.isFinite(
                  Number(
                    parsed.humidityLow
                  )
                )
                  ? Number(
                      parsed.humidityLow
                    )
                  : DEFAULT_ALERT_THRESHOLDS.humidityLow,

              soilMoistureLow:
                Number.isFinite(
                  Number(
                    parsed.soilMoistureLow
                  )
                )
                  ? Number(
                      parsed.soilMoistureLow
                    )
                  : DEFAULT_ALERT_THRESHOLDS.soilMoistureLow,

              lightLow:
                Number.isFinite(
                  Number(
                    parsed.lightLow
                  )
                )
                  ? Number(
                      parsed.lightLow
                    )
                  : DEFAULT_ALERT_THRESHOLDS.lightLow,

              lightHigh:
                Number.isFinite(
                  Number(
                    parsed.lightHigh
                  )
                )
                  ? Number(
                      parsed.lightHigh
                    )
                  : DEFAULT_ALERT_THRESHOLDS.lightHigh,

            };

            setThresholds(
              newThresholds
            );

          } catch (error) {

            console.log(
              '⚠️ Dashboard - không thể parse alertThresholds:',
              error
            );

            setThresholds(
              DEFAULT_ALERT_THRESHOLDS
            );

          }

        } catch (error) {

          console.log(
            '❌ Dashboard - lỗi đọc alertThresholds:',
            error
          );

          setThresholds(
            DEFAULT_ALERT_THRESHOLDS
          );

        }

      },
      [user?.uid, getStorageKey]
    );


  // ====================================================
  // LOAD ALL SETTINGS
  // ====================================================

  const loadAllSettings =
    useCallback(
      async () => {

        if (!user?.uid) {
          return;
        }

        await Promise.all([
          loadAlertSetting(),
          loadTemperatureUnit(),
          loadAlertThresholds(),
        ]);

      },
      [
        user?.uid,
        loadAlertSetting,
        loadTemperatureUnit,
        loadAlertThresholds,
      ]
    );


  // ====================================================
  // LOAD SETTINGS WHEN FOCUS
  // ====================================================

  useFocusEffect(

    useCallback(() => {

      loadAllSettings();

    }, [loadAllSettings])

  );


  // ====================================================
  // SETTINGS POLLING
  // ====================================================

  useEffect(() => {

    if (!user?.uid) {
      return;
    }

    const interval =
      setInterval(() => {

        loadAlertSetting();
        loadTemperatureUnit();
        loadAlertThresholds();

      }, 500);

    return () => {

      clearInterval(interval);

    };

  }, [
    user?.uid,
    loadAlertSetting,
    loadTemperatureUnit,
    loadAlertThresholds,
  ]);


  // ====================================================
  // FIREBASE REALTIME
  // ====================================================

  useEffect(() => {

    if (!user?.uid) {

      console.log(
        '⚠️ Dashboard: chưa có user'
      );

      return;

    }

    console.log(
      '🌱 Dashboard: Connecting Firebase for UID:',
      user.uid
    );


    // ==================================================
    // USER-SPECIFIC PATH
    // ==================================================

    const basePath =
      `users/${user.uid}/farm`;


    // ==================================================
    // FIREBASE REFERENCES
    // ==================================================

    const sensorsRef =
      ref(
        database,
        `${basePath}/sensors`
      );

    const systemRef =
      ref(
        database,
        `${basePath}/system/status`
      );

    const pumpRef =
      ref(
        database,
        `${basePath}/devices/pump/state`
      );

    const fanRef =
      ref(
        database,
        `${basePath}/devices/fan/state`
      );

    const lightDeviceRef =
      ref(
        database,
        `${basePath}/devices/light/state`
      );


    // ==================================================
    // SYSTEM STATUS
    // ==================================================

    const unsubscribeSystem =
      onValue(

        systemRef,

        async (snapshot) => {

          const value =
            snapshot.val();

          const online =
            value === 'online';


          systemStatusRef.current =
            online
              ? 'online'
              : 'offline';


          setSystemStatus(
            online
              ? 'online'
              : 'offline'
          );


          // ============================================
          // OFFLINE
          // ============================================

          if (!online) {

            console.log(
              '📴 Dashboard: ESP32 OFFLINE'
            );

            return;

          }


          // ============================================
          // ONLINE
          // LẤY SENSOR MỚI NHẤT
          // ============================================

          try {

            const sensorSnapshot =
              await get(
                sensorsRef
              );


            if (
              systemStatusRef.current !==
              'online'
            ) {

              return;

            }


            const data =
              sensorSnapshot.val();


            if (!data) {

              return;

            }


            setTemperature(
              Number(
                data.temperature ?? 0
              )
            );

            setHumidity(
              Number(
                data.humidity ?? 0
              )
            );

            setSoilMoisture(
              Number(
                data.soilMoisture ?? 0
              )
            );

            setLight(
              Number(
                data.light ?? 0
              )
            );

          } catch (error) {

            console.log(
              '❌ Lỗi đọc sensor khi ONLINE:',
              error
            );

          }

        },

        error => {

          console.log(
            '❌ Dashboard system error:',
            error
          );


          systemStatusRef.current =
            'offline';


          setSystemStatus(
            'offline'
          );

        }

      );


    // ==================================================
    // SENSOR
    // ==================================================

    const unsubscribeSensors =
      onValue(

        sensorsRef,

        snapshot => {

          const data =
            snapshot.val();


          if (!data) {

            return;

          }


          // ============================================
          // KHÔNG CẬP NHẬT KHI OFFLINE
          // ============================================

          if (
            systemStatusRef.current !==
            'online'
          ) {

            return;

          }


          setTemperature(
            Number(
              data.temperature ?? 0
            )
          );

          setHumidity(
            Number(
              data.humidity ?? 0
            )
          );

          setSoilMoisture(
            Number(
              data.soilMoisture ?? 0
            )
          );

          setLight(
            Number(
              data.light ?? 0
            )
          );

        },

        error => {

          console.log(
            '❌ Dashboard sensor error:',
            error
          );

        }

      );


    // ==================================================
    // PUMP
    // ==================================================

    const unsubscribePump =
      onValue(

        pumpRef,

        snapshot => {

          if (
            systemStatusRef.current !==
            'online'
          ) {

            return;

          }

          setPump(
            snapshot.val() === true
          );

        },

        error => {

          console.log(
            '❌ Pump Firebase error:',
            error
          );

        }

      );


    // ==================================================
    // FAN
    // ==================================================

    const unsubscribeFan =
      onValue(

        fanRef,

        snapshot => {

          if (
            systemStatusRef.current !==
            'online'
          ) {

            return;

          }

          setFan(
            snapshot.val() === true
          );

        },

        error => {

          console.log(
            '❌ Fan Firebase error:',
            error
          );

        }

      );


    // ==================================================
    // LIGHT
    // ==================================================

    const unsubscribeLight =
      onValue(

        lightDeviceRef,

        snapshot => {

          if (
            systemStatusRef.current !==
            'online'
          ) {

            return;

          }

          setLightDevice(
            snapshot.val() === true
          );

        },

        error => {

          console.log(
            '❌ Light Firebase error:',
            error
          );

        }

      );


    // ==================================================
    // CLEANUP
    // ==================================================

    return () => {

      console.log(
        '🧹 Dashboard: Firebase listeners removed for UID:',
        user.uid
      );

      unsubscribeSystem();
      unsubscribeSensors();
      unsubscribePump();
      unsubscribeFan();
      unsubscribeLight();

    };

  }, [user?.uid]);


  // ====================================================
  // REFRESH
  // ====================================================

  const onRefresh = async () => {

    setRefreshing(true);

    await loadAllSettings();


    // Lấy lại sensor mới nhất nếu đang online

    if (
      user?.uid &&
      systemStatusRef.current === 'online'
    ) {

      try {

        const sensorsRef =
          ref(
            database,
            `users/${user.uid}/farm/sensors`
          );

        const snapshot =
          await get(
            sensorsRef
          );

        const data =
          snapshot.val();

        if (data) {

          setTemperature(
            Number(
              data.temperature ?? 0
            )
          );

          setHumidity(
            Number(
              data.humidity ?? 0
            )
          );

          setSoilMoisture(
            Number(
              data.soilMoisture ?? 0
            )
          );

          setLight(
            Number(
              data.light ?? 0
            )
          );

        }

      } catch (error) {

        console.log(
          '❌ Dashboard refresh sensor error:',
          error
        );

      }

    }


    setTimeout(() => {

      setRefreshing(false);

    }, 500);

  };


  // ====================================================
  // STATUS
  // ====================================================

  const isOnline =
    systemStatus === 'online';


  const warningEnabled =
    isOnline &&
    alertEnabled;


  // ====================================================
  // TEMPERATURE
  // ====================================================

  const getDisplayTemperature = () => {

    if (
      temperatureUnit === 'F'
    ) {

      return (
        temperature * 9 / 5 + 32
      ).toFixed(1);

    }

    return temperature.toFixed(1);

  };


  const getTemperatureUnit = () => {

    return temperatureUnit === 'F'
      ? '°F'
      : '°C';

  };


  // ====================================================
  // SENSOR STATUS
  // ====================================================

  const getTemperatureStatus = () => {

    if (
      temperature >
      thresholds.temperatureHigh
    ) {

      return 'Cao';

    }

    if (
      temperature <
      thresholds.temperatureLow &&
      temperature > 0
    ) {

      return 'Thấp';

    }

    return 'Bình thường';

  };


  const getHumidityStatus = () => {

    if (
      humidity >
      85
    ) {

      return 'Cao';

    }

    if (
      humidity <
      thresholds.humidityLow &&
      humidity > 0
    ) {

      return 'Thấp';

    }

    return 'Bình thường';

  };


  const getSoilStatus = () => {

    if (
      soilMoisture <
      thresholds.soilMoistureLow &&
      soilMoisture > 0
    ) {

      return 'Đất khô';

    }

    if (
      soilMoisture >= 80
    ) {

      return 'Đất ẩm';

    }

    return 'Bình thường';

  };


  const getLightStatus = () => {

    if (
      light <
      thresholds.lightLow &&
      light > 0
    ) {

      return 'Thiếu sáng';

    }

    if (
      light >
      thresholds.lightHigh
    ) {

      return 'Ánh sáng mạnh';

    }

    return 'Bình thường';

  };


  // ====================================================
  // WARNING
  // ====================================================

  const hasEnvironmentWarning = () => {

    if (!warningEnabled) {

      return false;

    }


    if (
      temperature >
      thresholds.temperatureHigh
    ) {

      return true;

    }


    if (
      temperature <
      thresholds.temperatureLow &&
      temperature > 0
    ) {

      return true;

    }


    if (
      humidity <
      thresholds.humidityLow &&
      humidity > 0
    ) {

      return true;

    }


    if (
      humidity > 85
    ) {

      return true;

    }


    if (
      soilMoisture <
      thresholds.soilMoistureLow &&
      soilMoisture > 0
    ) {

      return true;

    }


    if (
      light <
      thresholds.lightLow &&
      light > 0
    ) {

      return true;

    }


    if (
      light >
      thresholds.lightHigh
    ) {

      return true;

    }


    return false;

  };


  const getWarningMessage = () => {

    const messages: string[] = [];


    if (
      temperature >
      thresholds.temperatureHigh
    ) {

      messages.push(
        `Nhiệt độ đang cao (${getDisplayTemperature()}${getTemperatureUnit()}).`
      );

    }


    if (
      temperature <
      thresholds.temperatureLow &&
      temperature > 0
    ) {

      messages.push(
        `Nhiệt độ đang thấp (${getDisplayTemperature()}${getTemperatureUnit()}).`
      );

    }


    if (
      humidity <
      thresholds.humidityLow &&
      humidity > 0
    ) {

      messages.push(
        `Độ ẩm không khí thấp (${humidity}%).`
      );

    }


    if (
      humidity > 85
    ) {

      messages.push(
        `Độ ẩm không khí cao (${humidity}%).`
      );

    }


    if (
      soilMoisture <
      thresholds.soilMoistureLow &&
      soilMoisture > 0
    ) {

      messages.push(
        `Độ ẩm đất thấp (${soilMoisture}%).`
      );

    }


    if (
      light <
      thresholds.lightLow &&
      light > 0
    ) {

      messages.push(
        `Ánh sáng thấp (${light} Lux).`
      );

    }


    if (
      light >
      thresholds.lightHigh
    ) {

      messages.push(
        `Ánh sáng mạnh (${light} Lux).`
      );

    }


    return messages.join(' ');

  };


  const getWarningCount = () => {

    if (!warningEnabled) {

      return 0;

    }


    let count = 0;


    if (
      temperature >
      thresholds.temperatureHigh
    ) {

      count++;

    }


    if (
      temperature <
      thresholds.temperatureLow &&
      temperature > 0
    ) {

      count++;

    }


    if (
      humidity <
      thresholds.humidityLow &&
      humidity > 0
    ) {

      count++;

    }


    if (
      humidity > 85
    ) {

      count++;

    }


    if (
      soilMoisture <
      thresholds.soilMoistureLow &&
      soilMoisture > 0
    ) {

      count++;

    }


    if (
      light <
      thresholds.lightLow &&
      light > 0
    ) {

      count++;

    }


    if (
      light >
      thresholds.lightHigh
    ) {

      count++;

    }


    return count;

  };


  const environmentWarning =
    hasEnvironmentWarning();


  // ====================================================
  // SENSOR CARD
  // ====================================================

  const SensorCard = ({
    icon,
    name,
    value,
    unit,
    status,
    progress,
  }: {
    icon: string;
    name: string;
    value: string | number;
    unit: string;
    status: string;
    progress: number;
  }) => {

    const isWarning =
      status !== 'Bình thường' &&
      status !== 'Đất ẩm';


    return (

      <View style={styles.sensorCard}>

        <View style={styles.sensorTop}>

          <View style={styles.sensorIconBox}>

            <Text style={styles.sensorIcon}>
              {icon}
            </Text>

          </View>

          <View
            style={[
              styles.statusPill,
              isWarning
                ? styles.statusPillWarning
                : styles.statusPillNormal,
            ]}
          >

            <Text
              style={[
                styles.statusPillText,
                isWarning
                  ? styles.statusPillWarningText
                  : styles.statusPillNormalText,
              ]}
            >
              {status}
            </Text>

          </View>

        </View>


        <Text style={styles.sensorName}>
          {name}
        </Text>


        <View style={styles.valueRow}>

          <Text style={styles.sensorValue}>
            {value}
          </Text>

          <Text style={styles.sensorUnit}>
            {unit}
          </Text>

        </View>


        <View style={styles.progressBackground}>

          <View
            style={[
              styles.progressFill,
              {
                width: `${Math.min(
                  Math.max(progress, 0),
                  100
                )}%`,
              },
            ]}
          />

        </View>

      </View>

    );

  };


  // ====================================================
  // RENDER
  // ====================================================

  return (

    <ScrollView

      style={styles.container}

      contentContainerStyle={
        styles.content
      }

      showsVerticalScrollIndicator={
        false
      }

      refreshControl={

        <RefreshControl

          refreshing={refreshing}

          onRefresh={onRefresh}

        />

      }

    >


      {/* ==================================================
          HEADER
      ================================================== */}

      <View style={styles.header}>

        <View>

          <View style={styles.brandRow}>

            <View style={styles.brandIcon}>

              <Text style={styles.brandIconText}>
                🌱
              </Text>

            </View>

            <Text style={styles.brand}>
              SMART FARM
            </Text>

          </View>

          <Text style={styles.subtitle}>
            Giám sát nông nghiệp thông minh
          </Text>

        </View>


        <View style={styles.headerBadge}>

          <Text style={styles.headerBadgeIcon}>
            {environmentWarning
              ? '⚠️'
              : '✓'}
          </Text>

        </View>

      </View>


      {/* ==================================================
          WELCOME CARD
      ================================================== */}

      <View style={styles.heroCard}>

        <View style={styles.heroCircle1} />
        <View style={styles.heroCircle2} />

        <View style={styles.heroContent}>

          <Text style={styles.heroSmall}>
            HỆ THỐNG GIÁM SÁT
          </Text>

          <Text style={styles.heroTitle}>
            Khu vườn thông minh
          </Text>

          <Text style={styles.heroDescription}>
            Theo dõi môi trường và thiết bị
            theo thời gian thực.
          </Text>

        </View>


        <View style={styles.heroPlant}>

          <Text style={styles.heroPlantText}>
            🌿
          </Text>

        </View>

      </View>


      {/* ==================================================
          SYSTEM STATUS
      ================================================== */}

      <View style={styles.systemCard}>

        <View
          style={[
            styles.systemIconBox,
            isOnline
              ? styles.systemOnline
              : styles.systemOffline,
          ]}
        >

          <Text style={styles.systemIcon}>
            {isOnline
              ? '📡'
              : '⚠️'}
          </Text>

        </View>


        <View style={styles.systemInfo}>

          <Text style={styles.systemTitle}>
            ESP32 Gateway
          </Text>

          <Text style={styles.systemDescription}>

            {isOnline
              ? 'Kết nối realtime • Hệ thống đang hoạt động'
              : 'Mất kết nối • Dữ liệu cuối cùng được giữ lại'}

          </Text>

        </View>


        <View
          style={[
            styles.onlineBadge,
            isOnline
              ? styles.onlineBadgeOn
              : styles.onlineBadgeOff,
          ]}
        >

          <View
            style={[
              styles.onlineDot,
              isOnline
                ? styles.onlineDotOn
                : styles.onlineDotOff,
            ]}
          />

          <Text
            style={[
              styles.onlineText,
              isOnline
                ? styles.onlineTextOn
                : styles.onlineTextOff,
            ]}
          >

            {isOnline
              ? 'ONLINE'
              : 'OFFLINE'}

          </Text>

        </View>

      </View>


      {/* ==================================================
          OFFLINE
      ================================================== */}

      {!isOnline && (

        <View style={styles.offlineCard}>

          <View style={styles.offlineIconBox}>

            <Text style={styles.offlineIcon}>
              📡
            </Text>

          </View>

          <View style={styles.offlineInfo}>

            <Text style={styles.offlineTitle}>
              ESP32 đang offline
            </Text>

            <Text style={styles.offlineDescription}>
              Các thông số đang hiển thị là
              dữ liệu cuối cùng nhận được.
            </Text>

          </View>

        </View>

      )}


      {/* ==================================================
          ENVIRONMENT TITLE
      ================================================== */}

      <View style={styles.sectionHeader}>

        <View>

          <Text style={styles.sectionTitle}>
            Môi trường
          </Text>

          <Text style={styles.sectionSubtitle}>
            Theo dõi các thông số quan trọng
          </Text>

        </View>

        <View style={styles.liveBadge}>

          <View style={styles.liveDot} />

          <Text style={styles.liveText}>
            LIVE
          </Text>

        </View>

      </View>


      {/* ==================================================
          SENSOR GRID
      ================================================== */}

      <View style={styles.sensorGrid}>

        <SensorCard
          icon="🌡️"
          name="Nhiệt độ"
          value={getDisplayTemperature()}
          unit={getTemperatureUnit()}
          status={getTemperatureStatus()}
          progress={
            (temperature / 50) * 100
          }
        />


        <SensorCard
          icon="💧"
          name="Độ ẩm không khí"
          value={humidity}
          unit="%"
          status={getHumidityStatus()}
          progress={humidity}
        />


        <SensorCard
          icon="🌱"
          name="Độ ẩm đất"
          value={soilMoisture}
          unit="%"
          status={getSoilStatus()}
          progress={soilMoisture}
        />


        <SensorCard
          icon="☀️"
          name="Ánh sáng"
          value={light}
          unit="Lux"
          status={getLightStatus()}
          progress={
            (light / 1200) * 100
          }
        />

      </View>


      {/* ==================================================
          CURRENT CONDITION
      ================================================== */}

      <View style={styles.conditionCard}>

        <View style={styles.conditionIconBox}>

          <Text style={styles.conditionIcon}>
            ☀️
          </Text>

        </View>


        <View style={styles.conditionInfo}>

          <Text style={styles.conditionLabel}>
            ĐIỀU KIỆN HIỆN TẠI
          </Text>

          <Text style={styles.conditionTitle}>

            {light > 500
              ? 'Môi trường thuận lợi'
              : 'Ánh sáng đang thấp'}

          </Text>

          <Text style={styles.conditionDescription}>

            {soilMoisture <
            thresholds.soilMoistureLow
              ? 'Đất đang khô • Cần chú ý tưới cây'
              : 'Độ ẩm đất phù hợp • Điều kiện tốt cho cây'}

          </Text>

        </View>


        <View style={styles.conditionTempBox}>

          <Text style={styles.conditionTemp}>
            {getDisplayTemperature()}
          </Text>

          <Text style={styles.conditionTempUnit}>
            {getTemperatureUnit()}
          </Text>

        </View>

      </View>


      {/* ==================================================
          DEVICE STATUS
      ================================================== */}

      <View style={styles.sectionHeader}>

        <View>

          <Text style={styles.sectionTitle}>
            Thiết bị
          </Text>

          <Text style={styles.sectionSubtitle}>
            Trạng thái thiết bị trong hệ thống
          </Text>

        </View>

      </View>


      {/* PUMP */}

      <View style={styles.deviceCard}>

        <View
          style={[
            styles.deviceIconBox,
            pump
              ? styles.deviceIconActive
              : styles.deviceIconInactive,
          ]}
        >

          <Text style={styles.deviceIcon}>
            🚿
          </Text>

        </View>


        <View style={styles.deviceInfo}>

          <Text style={styles.deviceName}>
            Máy bơm tưới
          </Text>

          <Text style={styles.deviceDescription}>
            Hệ thống tưới cây
          </Text>

        </View>


        <View style={styles.deviceRight}>

          <View
            style={[
              styles.deviceStatusDot,
              pump
                ? styles.deviceStatusOn
                : styles.deviceStatusOff,
            ]}
          />

          <Text
            style={[
              styles.deviceStatusText,
              pump
                ? styles.deviceStatusOnText
                : styles.deviceStatusOffText,
            ]}
          >

            {pump
              ? 'ĐANG BẬT'
              : 'ĐANG TẮT'}

          </Text>

        </View>

      </View>


      {/* FAN */}

      <View style={styles.deviceCard}>

        <View
          style={[
            styles.deviceIconBox,
            fan
              ? styles.deviceIconActive
              : styles.deviceIconInactive,
          ]}
        >

          <Text style={styles.deviceIcon}>
            🌀
          </Text>

        </View>


        <View style={styles.deviceInfo}>

          <Text style={styles.deviceName}>
            Quạt thông gió
          </Text>

          <Text style={styles.deviceDescription}>
            Hệ thống làm mát
          </Text>

        </View>


        <View style={styles.deviceRight}>

          <View
            style={[
              styles.deviceStatusDot,
              fan
                ? styles.deviceStatusOn
                : styles.deviceStatusOff,
            ]}
          />

          <Text
            style={[
              styles.deviceStatusText,
              fan
                ? styles.deviceStatusOnText
                : styles.deviceStatusOffText,
            ]}
          >

            {fan
              ? 'ĐANG BẬT'
              : 'ĐANG TẮT'}

          </Text>

        </View>

      </View>


      {/* LIGHT */}

      <View style={styles.deviceCard}>

        <View
          style={[
            styles.deviceIconBox,
            lightDevice
              ? styles.deviceIconActive
              : styles.deviceIconInactive,
          ]}
        >

          <Text style={styles.deviceIcon}>
            💡
          </Text>

        </View>


        <View style={styles.deviceInfo}>

          <Text style={styles.deviceName}>
            Đèn chiếu sáng
          </Text>

          <Text style={styles.deviceDescription}>
            Hệ thống chiếu sáng
          </Text>

        </View>


        <View style={styles.deviceRight}>

          <View
            style={[
              styles.deviceStatusDot,
              lightDevice
                ? styles.deviceStatusOn
                : styles.deviceStatusOff,
            ]}
          />

          <Text
            style={[
              styles.deviceStatusText,
              lightDevice
                ? styles.deviceStatusOnText
                : styles.deviceStatusOffText,
            ]}
          >

            {lightDevice
              ? 'ĐANG BẬT'
              : 'ĐANG TẮT'}

          </Text>

        </View>

      </View>


      {/* ==================================================
          WARNING
      ================================================== */}

      {environmentWarning && (

        <View style={styles.warningCard}>

          <View style={styles.warningIconBox}>

            <Text style={styles.warningIcon}>
              ⚠️
            </Text>

          </View>


          <View style={styles.warningInfo}>

            <View style={styles.warningHeader}>

              <Text style={styles.warningTitle}>
                Cảnh báo môi trường
              </Text>

              <View style={styles.warningCountBadge}>

                <Text style={styles.warningCount}>
                  {getWarningCount()}
                </Text>

              </View>

            </View>


            <Text style={styles.warningDescription}>
              {getWarningMessage()}
            </Text>

          </View>

        </View>

      )}


      {/* ==================================================
          NORMAL
      ================================================== */}

      {!environmentWarning && (

        <View style={styles.normalCard}>

          <View style={styles.normalIconBox}>

            <Text style={styles.normalIcon}>
              ✓
            </Text>

          </View>


          <View style={styles.normalInfo}>

            <Text style={styles.normalTitle}>

              {!isOnline
                ? 'Không có cảnh báo khi offline'
                : !alertEnabled
                  ? 'Cảnh báo đang tắt'
                  : 'Môi trường bình thường'}

            </Text>


            <Text style={styles.normalDescription}>

              {!isOnline
                ? 'ESP32 đang offline. Không tạo cảnh báo mới.'
                : !alertEnabled
                  ? 'Bạn đã tắt cảnh báo trong phần Cài đặt.'
                  : 'Các thông số hiện đang trong giới hạn cho phép.'}

            </Text>

          </View>

        </View>

      )}


      {/* ==================================================
          FOOTER
      ================================================== */}

      <View style={styles.footer}>

        <Text style={styles.lastUpdate}>

          {isOnline
            ? '● Dữ liệu đang cập nhật realtime'
            : '● Hiển thị dữ liệu cuối cùng'}

        </Text>


        <TouchableOpacity

          style={styles.refreshButton}

          onPress={onRefresh}

          activeOpacity={0.8}

        >

          <Text style={styles.refreshIcon}>
            ↻
          </Text>

          <Text style={styles.refreshText}>
            Làm mới dữ liệu
          </Text>

        </TouchableOpacity>

      </View>


    </ScrollView>

  );

}


// ======================================================
// STYLES
// ======================================================

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: '#F3F7F2',
  },

  content: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 45,
  },


  // ====================================================
  // HEADER
  // ====================================================

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },

  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  brandIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 9,
  },

  brandIconText: {
    fontSize: 21,
  },

  brand: {
    fontSize: 22,
    fontWeight: '900',
    color: '#102018',
    letterSpacing: 0.5,
  },

  subtitle: {
    fontSize: 11,
    color: '#718078',
    marginTop: 5,
    marginLeft: 47,
  },

  headerBadge: {
    width: 43,
    height: 43,
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 3,
    },
  },

  headerBadgeIcon: {
    fontSize: 19,
  },


  // ====================================================
  // HERO
  // ====================================================

  heroCard: {
    height: 145,
    borderRadius: 25,
    backgroundColor: '#14532D',
    overflow: 'hidden',
    marginBottom: 15,
    position: 'relative',
  },

  heroCircle1: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    right: -55,
    top: -65,
    backgroundColor: '#166534',
    opacity: 0.7,
  },

  heroCircle2: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    right: 45,
    bottom: -75,
    backgroundColor: '#15803D',
    opacity: 0.5,
  },

  heroContent: {
    padding: 21,
    width: '72%',
    zIndex: 2,
  },

  heroSmall: {
    fontSize: 9,
    fontWeight: '800',
    color: '#BBF7D0',
    letterSpacing: 1.3,
  },

  heroTitle: {
    fontSize: 23,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 7,
  },

  heroDescription: {
    fontSize: 11,
    color: '#DCFCE7',
    lineHeight: 17,
    marginTop: 6,
  },

  heroPlant: {
    position: 'absolute',
    right: 20,
    bottom: 15,
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  heroPlantText: {
    fontSize: 43,
  },


  // ====================================================
  // SYSTEM
  // ====================================================

  systemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 21,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 3,
    },
  },

  systemIconBox: {
    width: 48,
    height: 48,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  systemOnline: {
    backgroundColor: '#DCFCE7',
  },

  systemOffline: {
    backgroundColor: '#FEE2E2',
  },

  systemIcon: {
    fontSize: 23,
  },

  systemInfo: {
    flex: 1,
  },

  systemTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#17211B',
  },

  systemDescription: {
    fontSize: 10,
    color: '#7A857E',
    marginTop: 4,
    lineHeight: 14,
  },

  onlineBadge: {
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },

  onlineBadgeOn: {
    backgroundColor: '#ECFDF5',
  },

  onlineBadgeOff: {
    backgroundColor: '#FEF2F2',
  },

  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 5,
  },

  onlineDotOn: {
    backgroundColor: '#22C55E',
  },

  onlineDotOff: {
    backgroundColor: '#EF4444',
  },

  onlineText: {
    fontSize: 9,
    fontWeight: '900',
  },

  onlineTextOn: {
    color: '#15803D',
  },

  onlineTextOff: {
    color: '#B91C1C',
  },


  // ====================================================
  // OFFLINE
  // ====================================================

  offlineCard: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: 19,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 23,
  },

  offlineIconBox: {
    width: 43,
    height: 43,
    borderRadius: 13,
    backgroundColor: '#FFEDD5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 11,
  },

  offlineIcon: {
    fontSize: 21,
  },

  offlineInfo: {
    flex: 1,
  },

  offlineTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#C2410C',
  },

  offlineDescription: {
    fontSize: 10,
    color: '#9A3412',
    marginTop: 3,
    lineHeight: 15,
  },


  // ====================================================
  // SECTION
  // ====================================================

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 13,
    marginTop: 5,
  },

  sectionTitle: {
    fontSize: 21,
    fontWeight: '900',
    color: '#17211B',
  },

  sectionSubtitle: {
    fontSize: 10,
    color: '#8A948D',
    marginTop: 3,
  },

  liveBadge: {
    backgroundColor: '#ECFDF5',
    borderRadius: 9,
    paddingHorizontal: 8,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
  },

  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22C55E',
    marginRight: 5,
  },

  liveText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#15803D',
  },


  // ====================================================
  // SENSOR
  // ====================================================

  sensorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 13,
  },

  sensorCard: {
    width: '48.3%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 15,
    marginBottom: 13,
    minHeight: 174,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.035,
    shadowRadius: 7,
    shadowOffset: {
      width: 0,
      height: 3,
    },
  },

  sensorTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },

  sensorIconBox: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: '#F0FDF4',
    justifyContent: 'center',
    alignItems: 'center',
  },

  sensorIcon: {
    fontSize: 22,
  },

  statusPill: {
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 5,
  },

  statusPillNormal: {
    backgroundColor: '#ECFDF5',
  },

  statusPillWarning: {
    backgroundColor: '#FEF2F2',
  },

  statusPillText: {
    fontSize: 8,
    fontWeight: '800',
  },

  statusPillNormalText: {
    color: '#15803D',
  },

  statusPillWarningText: {
    color: '#DC2626',
  },

  sensorName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#66716A',
  },

  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 3,
  },

  sensorValue: {
    fontSize: 31,
    fontWeight: '900',
    color: '#17211B',
  },

  sensorUnit: {
    fontSize: 10,
    fontWeight: '700',
    color: '#89928C',
    marginLeft: 4,
  },

  progressBackground: {
    height: 5,
    borderRadius: 5,
    backgroundColor: '#EDF1ED',
    overflow: 'hidden',
    marginTop: 14,
  },

  progressFill: {
    height: '100%',
    borderRadius: 5,
    backgroundColor: '#22C55E',
  },


  // ====================================================
  // CONDITION
  // ====================================================

  conditionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 21,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 25,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 3,
    },
  },

  conditionIconBox: {
    width: 52,
    height: 52,
    borderRadius: 17,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  conditionIcon: {
    fontSize: 27,
  },

  conditionInfo: {
    flex: 1,
  },

  conditionLabel: {
    fontSize: 8,
    fontWeight: '900',
    color: '#9CA3AF',
    letterSpacing: 0.8,
  },

  conditionTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#17211B',
    marginTop: 4,
  },

  conditionDescription: {
    fontSize: 9,
    color: '#7A857E',
    marginTop: 4,
    lineHeight: 13,
  },

  conditionTempBox: {
    alignItems: 'center',
    marginLeft: 7,
  },

  conditionTemp: {
    fontSize: 25,
    fontWeight: '900',
    color: '#17211B',
  },

  conditionTempUnit: {
    fontSize: 8,
    color: '#8A948D',
    fontWeight: '700',
  },


  // ====================================================
  // DEVICE
  // ====================================================

  deviceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 19,
    padding: 13,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 11,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    shadowOffset: {
      width: 0,
      height: 2,
    },
  },

  deviceIconBox: {
    width: 49,
    height: 49,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  deviceIconActive: {
    backgroundColor: '#DCFCE7',
  },

  deviceIconInactive: {
    backgroundColor: '#F3F4F6',
  },

  deviceIcon: {
    fontSize: 24,
  },

  deviceInfo: {
    flex: 1,
  },

  deviceName: {
    fontSize: 13,
    fontWeight: '900',
    color: '#17211B',
  },

  deviceDescription: {
    fontSize: 9,
    color: '#8A948D',
    marginTop: 3,
  },

  deviceRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  deviceStatusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 5,
  },

  deviceStatusOn: {
    backgroundColor: '#22C55E',
  },

  deviceStatusOff: {
    backgroundColor: '#D1D5DB',
  },

  deviceStatusText: {
    fontSize: 8,
    fontWeight: '900',
  },

  deviceStatusOnText: {
    color: '#16A34A',
  },

  deviceStatusOffText: {
    color: '#9CA3AF',
  },


  // ====================================================
  // WARNING
  // ====================================================

  warningCard: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: 20,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 14,
    marginBottom: 11,
  },

  warningIconBox: {
    width: 43,
    height: 43,
    borderRadius: 14,
    backgroundColor: '#FFEDD5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 11,
  },

  warningIcon: {
    fontSize: 21,
  },

  warningInfo: {
    flex: 1,
  },

  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  warningTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#C2410C',
    flex: 1,
  },

  warningCountBadge: {
    width: 23,
    height: 23,
    borderRadius: 12,
    backgroundColor: '#EA580C',
    justifyContent: 'center',
    alignItems: 'center',
  },

  warningCount: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },

  warningDescription: {
    fontSize: 10,
    color: '#9A3412',
    lineHeight: 16,
    marginTop: 5,
  },


  // ====================================================
  // NORMAL
  // ====================================================

  normalCard: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 20,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    marginBottom: 11,
  },

  normalIconBox: {
    width: 43,
    height: 43,
    borderRadius: 14,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 11,
  },

  normalIcon: {
    fontSize: 23,
    fontWeight: '900',
    color: '#16A34A',
  },

  normalInfo: {
    flex: 1,
  },

  normalTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#15803D',
  },

  normalDescription: {
    fontSize: 10,
    color: '#166534',
    lineHeight: 15,
    marginTop: 4,
  },


  // ====================================================
  // FOOTER
  // ====================================================

  footer: {
    marginTop: 13,
  },

  lastUpdate: {
    textAlign: 'center',
    fontSize: 9,
    color: '#9CA3AF',
    marginBottom: 12,
  },

  refreshButton: {
    height: 49,
    borderRadius: 16,
    backgroundColor: '#15803D',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    elevation: 2,
    shadowColor: '#15803D',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 4,
    },
  },

  refreshIcon: {
    color: '#FFFFFF',
    fontSize: 21,
    fontWeight: '700',
    marginRight: 7,
  },

  refreshText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },

});