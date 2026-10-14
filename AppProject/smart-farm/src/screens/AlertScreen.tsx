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

// =====================================================
// TYPES
// =====================================================

type TemperatureUnit = 'C' | 'F';

type AlertType =
  | 'danger'
  | 'warning';

type AlertItem = {
  id: string;
  type: AlertType;
  icon: string;
  title: string;
  message: string;
};

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
// ALERT SCREEN
// =====================================================

export default function AlertScreen() {
  const { user } = useAuth();

  // ===================================================
  // SENSOR
  // ===================================================

  const [temperature, setTemperature] =
    useState(0);

  const [humidity, setHumidity] =
    useState(0);

  const [soilMoisture, setSoilMoisture] =
    useState(0);

  const [light, setLight] =
    useState(0);

  // ===================================================
  // REFS
  // ===================================================

  const temperatureRef =
    useRef(0);

  const humidityRef =
    useRef(0);

  const soilRef =
    useRef(0);

  const lightRef =
    useRef(0);

  // ===================================================
  // SYSTEM
  // ===================================================

  const [systemStatus, setSystemStatus] =
    useState<'online' | 'offline'>(
      'offline'
    );

  const systemStatusRef =
    useRef<
      'online' | 'offline'
    >('offline');

  // ===================================================
  // SETTINGS
  // ===================================================

  const [alertEnabled, setAlertEnabled] =
    useState(true);

  const alertEnabledRef =
    useRef(true);

  const [temperatureUnit, setTemperatureUnit] =
    useState<TemperatureUnit>('C');

  const temperatureUnitRef =
    useRef<TemperatureUnit>('C');

  const [thresholds, setThresholds] =
    useState<AlertThresholds>(
      DEFAULT_THRESHOLDS
    );

  const thresholdsRef =
    useRef<AlertThresholds>(
      DEFAULT_THRESHOLDS
    );

  // ===================================================
  // ALERTS
  // ===================================================

  const [alerts, setAlerts] =
    useState<AlertItem[]>([]);

  // ===================================================
  // OFFLINE / ONLINE FLAG
  // ===================================================

  const wasOfflineRef =
    useRef(true);

  const waitingForFreshSensorRef =
    useRef(false);

  // ===================================================
  // GENERATE ALERTS
  // ===================================================

  const generateAlerts = useCallback(
    (
      tempCelsius: number,
      hum: number,
      soil: number,
      lightValue: number,
      customThresholds?: AlertThresholds,
      customUnit?: TemperatureUnit,
      customEnabled?: boolean,
    ) => {
      const enabled =
        customEnabled ??
        alertEnabledRef.current;

      // -------------------------------------------------
      // ALERT OFF
      // -------------------------------------------------

      if (!enabled) {
        setAlerts([]);
        return;
      }

      // -------------------------------------------------
      // OFFLINE
      // -------------------------------------------------

      if (
        systemStatusRef.current !==
        'online'
      ) {
        setAlerts([]);
        return;
      }

      // -------------------------------------------------
      // THRESHOLDS
      // -------------------------------------------------

      const currentThresholds =
        customThresholds ??
        thresholdsRef.current;

      const currentUnit =
        customUnit ??
        temperatureUnitRef.current;

      const newAlerts: AlertItem[] = [];

      // =================================================
      // TEMPERATURE DISPLAY
      // =================================================

      const displayTemp =
        currentUnit === 'F'
          ? (
              tempCelsius * 9 / 5 + 32
            ).toFixed(1)
          : tempCelsius.toFixed(1);

      const displayUnit =
        currentUnit === 'F'
          ? '°F'
          : '°C';

      // =================================================
      // TEMPERATURE HIGH
      // =================================================

      if (
        Number.isFinite(tempCelsius) &&
        tempCelsius >
          currentThresholds.temperatureHigh
      ) {
        newAlerts.push({
          id: 'temperature-high',
          type: 'danger',
          icon: '🔥',
          title:
            'Nhiệt độ quá cao',
          message:
            `Nhiệt độ hiện tại ${displayTemp}${displayUnit}. ` +
            `Ngưỡng tối đa ${currentThresholds.temperatureHigh}°C.`,
        });
      }

      // =================================================
      // TEMPERATURE LOW
      // =================================================

      if (
        Number.isFinite(tempCelsius) &&
        tempCelsius > 0 &&
        tempCelsius <
          currentThresholds.temperatureLow
      ) {
        newAlerts.push({
          id: 'temperature-low',
          type: 'warning',
          icon: '❄️',
          title:
            'Nhiệt độ thấp',
          message:
            `Nhiệt độ hiện tại ${displayTemp}${displayUnit}. ` +
            `Ngưỡng tối thiểu ${currentThresholds.temperatureLow}°C.`,
        });
      }

      // =================================================
      // HUMIDITY
      // =================================================

      if (
        Number.isFinite(hum) &&
        hum > 0 &&
        hum <
          currentThresholds.humidityLow
      ) {
        newAlerts.push({
          id: 'humidity-low',
          type: 'warning',
          icon: '💧',
          title:
            'Độ ẩm không khí thấp',
          message:
            `Độ ẩm hiện tại ${hum}%. ` +
            `Ngưỡng tối thiểu ${currentThresholds.humidityLow}%.`,
        });
      }

      // =================================================
      // SOIL
      // =================================================

      if (
        Number.isFinite(soil) &&
        soil > 0 &&
        soil <
          currentThresholds.soilMoistureLow
      ) {
        newAlerts.push({
          id: 'soil-low',
          type: 'danger',
          icon: '🌱',
          title:
            'Độ ẩm đất thấp',
          message:
            `Độ ẩm đất hiện tại ${soil}%. ` +
            `Ngưỡng tối thiểu ${currentThresholds.soilMoistureLow}%. ` +
            `Cây có thể cần được tưới.`,
        });
      }

      // =================================================
      // LIGHT LOW
      // =================================================

      if (
        Number.isFinite(lightValue) &&
        lightValue > 0 &&
        lightValue <
          currentThresholds.lightLow
      ) {
        newAlerts.push({
          id: 'light-low',
          type: 'warning',
          icon: '🌙',
          title:
            'Ánh sáng thấp',
          message:
            `Cường độ hiện tại ${lightValue} Lux. ` +
            `Ngưỡng tối thiểu ${currentThresholds.lightLow} Lux.`,
        });
      }

      // =================================================
      // LIGHT HIGH
      // =================================================

      if (
        Number.isFinite(lightValue) &&
        lightValue >
          currentThresholds.lightHigh
      ) {
        newAlerts.push({
          id: 'light-high',
          type: 'warning',
          icon: '☀️',
          title:
            'Ánh sáng mạnh',
          message:
            `Cường độ hiện tại ${lightValue} Lux. ` +
            `Ngưỡng tối đa ${currentThresholds.lightHigh} Lux.`,
        });
      }

      setAlerts(newAlerts);
    },
    []
  );

  // ===================================================
  // LOAD SETTINGS
  // ===================================================

  const loadSettings = useCallback(
    async () => {
      if (!user?.uid) {
        return;
      }

      try {
        // Settings được tách riêng theo UID
        const getKey = (key: string) =>
          `${key}_${user.uid}`;

        const [
          savedAlert,
          savedNotifications,
          savedUnit,
          savedThresholds,
        ] = await Promise.all([
          AsyncStorage.getItem(
            getKey('alertEnabled')
          ),

          AsyncStorage.getItem(
            getKey('notificationsEnabled')
          ),

          AsyncStorage.getItem(
            getKey('temperatureUnit')
          ),

          AsyncStorage.getItem(
            getKey('alertThresholds')
          ),
        ]);

        // =================================================
        // ALERT ENABLED
        // =================================================

        let enabled = true;

        if (
          savedAlert !== null
        ) {
          enabled =
            savedAlert === 'true';
        } else if (
          savedNotifications !== null
        ) {
          enabled =
            savedNotifications === 'true';
        }

        alertEnabledRef.current =
          enabled;

        setAlertEnabled(
          enabled
        );

        // =================================================
        // UNIT
        // =================================================

        let unit: TemperatureUnit =
          'C';

        if (
          savedUnit === 'C' ||
          savedUnit === 'F'
        ) {
          unit = savedUnit;
        }

        temperatureUnitRef.current =
          unit;

        setTemperatureUnit(
          unit
        );

        // =================================================
        // THRESHOLDS
        // =================================================

        let loadedThresholds =
          DEFAULT_THRESHOLDS;

        if (
          savedThresholds
        ) {
          try {
            const parsed =
              JSON.parse(
                savedThresholds
              );

            const safeNumber = (
              value: any,
              fallback: number
            ) => {
              const number =
                Number(value);

              return Number.isFinite(number)
                ? number
                : fallback;
            };

            loadedThresholds = {
              temperatureLow:
                safeNumber(
                  parsed.temperatureLow,
                  DEFAULT_THRESHOLDS.temperatureLow
                ),

              temperatureHigh:
                safeNumber(
                  parsed.temperatureHigh,
                  DEFAULT_THRESHOLDS.temperatureHigh
                ),

              humidityLow:
                safeNumber(
                  parsed.humidityLow,
                  DEFAULT_THRESHOLDS.humidityLow
                ),

              soilMoistureLow:
                safeNumber(
                  parsed.soilMoistureLow,
                  DEFAULT_THRESHOLDS.soilMoistureLow
                ),

              lightLow:
                safeNumber(
                  parsed.lightLow,
                  DEFAULT_THRESHOLDS.lightLow
                ),

              lightHigh:
                safeNumber(
                  parsed.lightHigh,
                  DEFAULT_THRESHOLDS.lightHigh
                ),
            };
          } catch {
            loadedThresholds =
              DEFAULT_THRESHOLDS;
          }
        }

        thresholdsRef.current =
          loadedThresholds;

        setThresholds(
          loadedThresholds
        );

        // =================================================
        // REGENERATE
        // =================================================

        if (
          enabled &&
          systemStatusRef.current ===
            'online' &&
          !waitingForFreshSensorRef.current
        ) {
          generateAlerts(
            temperatureRef.current,
            humidityRef.current,
            soilRef.current,
            lightRef.current,
            loadedThresholds,
            unit,
            enabled
          );
        } else {
          setAlerts([]);
        }
      } catch (error) {
        console.log(
          'Alert settings error:',
          error
        );
      }
    },
    [
      generateAlerts,
      user?.uid,
    ]
  );

  // ===================================================
  // FOCUS -> LOAD SETTINGS
  // ===================================================

  useFocusEffect(
    useCallback(() => {
      loadSettings();
    }, [loadSettings])
  );

  // ===================================================
  // SYSTEM LISTENER
  // ===================================================

  useEffect(() => {
    if (!user?.uid) {
      systemStatusRef.current =
        'offline';

      setSystemStatus('offline');
      setAlerts([]);

      return;
    }

    const basePath =
      `users/${user.uid}/farm`;

    const systemRef =
      ref(
        database,
        `${basePath}/system/status`
      );

    const sensorsRef =
      ref(
        database,
        `${basePath}/sensors`
      );

    const unsubscribe =
      onValue(
        systemRef,
        async snapshot => {
          const online =
            snapshot.val() ===
            'online';

          const status =
            online
              ? 'online'
              : 'offline';

          const previousStatus =
            systemStatusRef.current;

          // =================================================
          // UPDATE STATUS
          // =================================================

          systemStatusRef.current =
            status;

          setSystemStatus(
            status
          );

          // =================================================
          // OFFLINE
          // =================================================

          if (!online) {
            waitingForFreshSensorRef.current =
              true;

            wasOfflineRef.current =
              true;

            setAlerts([]);

            return;
          }

          // =================================================
          // OFFLINE -> ONLINE
          // =================================================

          if (
            previousStatus === 'offline' ||
            wasOfflineRef.current
          ) {
            wasOfflineRef.current =
              false;

            waitingForFreshSensorRef.current =
              true;

            setAlerts([]);

            try {
              const sensorSnapshot =
                await get(
                  sensorsRef
                );

              if (
                systemStatusRef.current !==
                'online'
              ) {
                waitingForFreshSensorRef.current =
                  true;

                setAlerts([]);

                return;
              }

              const data =
                sensorSnapshot.val();

              if (!data) {
                waitingForFreshSensorRef.current =
                  false;

                setAlerts([]);

                return;
              }

              // =================================================
              // READ FRESH SENSOR DATA
              // =================================================

              const rawTemp =
                Number(
                  data.temperature
                );

              const rawHum =
                Number(
                  data.humidity
                );

              const rawSoil =
                Number(
                  data.soilMoisture
                );

              const rawLight =
                Number(
                  data.light
                );

              // =================================================
              // UPDATE REFS
              // =================================================

              if (
                Number.isFinite(rawTemp)
              ) {
                temperatureRef.current =
                  rawTemp;

                setTemperature(
                  rawTemp
                );
              }

              if (
                Number.isFinite(rawHum)
              ) {
                humidityRef.current =
                  rawHum;

                setHumidity(
                  rawHum
                );
              }

              if (
                Number.isFinite(rawSoil)
              ) {
                soilRef.current =
                  rawSoil;

                setSoilMoisture(
                  rawSoil
                );
              }

              if (
                Number.isFinite(rawLight)
              ) {
                lightRef.current =
                  rawLight;

                setLight(
                  rawLight
                );
              }

              // =================================================
              // FRESH DATA READY
              // =================================================

              waitingForFreshSensorRef.current =
                false;

              // =================================================
              // GENERATE ALERT
              // =================================================

              if (
                alertEnabledRef.current
              ) {
                generateAlerts(
                  Number.isFinite(rawTemp)
                    ? rawTemp
                    : temperatureRef.current,

                  Number.isFinite(rawHum)
                    ? rawHum
                    : humidityRef.current,

                  Number.isFinite(rawSoil)
                    ? rawSoil
                    : soilRef.current,

                  Number.isFinite(rawLight)
                    ? rawLight
                    : lightRef.current
                );
              } else {
                setAlerts([]);
              }
            } catch (error) {
              console.log(
                'Fresh sensor read error:',
                error
              );

              waitingForFreshSensorRef.current =
                true;

              setAlerts([]);
            }

            return;
          }

          // =================================================
          // ONLINE BÌNH THƯỜNG
          // =================================================

          wasOfflineRef.current =
            false;

          if (
            waitingForFreshSensorRef.current
          ) {
            return;
          }

          if (
            alertEnabledRef.current
          ) {
            generateAlerts(
              temperatureRef.current,
              humidityRef.current,
              soilRef.current,
              lightRef.current
            );
          } else {
            setAlerts([]);
          }
        },

        error => {
          console.log(
            'Alert system error:',
            error
          );

          systemStatusRef.current =
            'offline';

          setSystemStatus(
            'offline'
          );

          waitingForFreshSensorRef.current =
            true;

          wasOfflineRef.current =
            true;

          setAlerts([]);
        }
      );

    return () => {
      unsubscribe();
    };
  }, [
    generateAlerts,
    user?.uid,
  ]);

  // ===================================================
  // SENSOR LISTENER
  // ===================================================

  useEffect(() => {
    if (!user?.uid) {
      return;
    }

    const sensorsRef =
      ref(
        database,
        `users/${user.uid}/farm/sensors`
      );

    const unsubscribe =
      onValue(
        sensorsRef,
        snapshot => {
          const data =
            snapshot.val();

          if (!data) {
            return;
          }

          // =================================================
          // OFFLINE
          // =================================================

          if (
            systemStatusRef.current !==
            'online'
          ) {
            return;
          }

          // =================================================
          // WAITING FOR FRESH SNAPSHOT
          // =================================================

          if (
            waitingForFreshSensorRef.current
          ) {
            return;
          }

          // =================================================
          // READ SENSOR
          // =================================================

          const rawTemp =
            Number(
              data.temperature
            );

          const rawHum =
            Number(
              data.humidity
            );

          const rawSoil =
            Number(
              data.soilMoisture
            );

          const rawLight =
            Number(
              data.light
            );

          // =================================================
          // UPDATE TEMPERATURE
          // =================================================

          if (
            Number.isFinite(rawTemp)
          ) {
            temperatureRef.current =
              rawTemp;

            setTemperature(
              rawTemp
            );
          }

          // =================================================
          // UPDATE HUMIDITY
          // =================================================

          if (
            Number.isFinite(rawHum)
          ) {
            humidityRef.current =
              rawHum;

            setHumidity(
              rawHum
            );
          }

          // =================================================
          // UPDATE SOIL
          // =================================================

          if (
            Number.isFinite(rawSoil)
          ) {
            soilRef.current =
              rawSoil;

            setSoilMoisture(
              rawSoil
            );
          }

          // =================================================
          // UPDATE LIGHT
          // =================================================

          if (
            Number.isFinite(rawLight)
          ) {
            lightRef.current =
              rawLight;

            setLight(
              rawLight
            );
          }

          // =================================================
          // GENERATE ALERT
          // =================================================

          if (
            alertEnabledRef.current
          ) {
            generateAlerts(
              Number.isFinite(rawTemp)
                ? rawTemp
                : temperatureRef.current,

              Number.isFinite(rawHum)
                ? rawHum
                : humidityRef.current,

              Number.isFinite(rawSoil)
                ? rawSoil
                : soilRef.current,

              Number.isFinite(rawLight)
                ? rawLight
                : lightRef.current
            );
          } else {
            setAlerts([]);
          }
        },

        error => {
          console.log(
            'Alert sensor error:',
            error
          );
        }
      );

    return () => {
      unsubscribe();
    };
  }, [
    generateAlerts,
    user?.uid,
  ]);

  // ===================================================
  // DISPLAY
  // ===================================================

  const displayTemperature =
    temperatureUnit === 'F'
      ? (
          temperature * 9 / 5 + 32
        ).toFixed(1)
      : temperature.toFixed(1);

  const displayUnit =
    temperatureUnit === 'F'
      ? '°F'
      : '°C';

  const isOffline =
    systemStatus !== 'online';

  // ===================================================
  // CLEAR
  // ===================================================

  const clearAlert = (
    id: string
  ) => {
    setAlerts(
      current =>
        current.filter(
          item =>
            item.id !== id
        )
    );
  };

  // ===================================================
  // SENSOR ROW
  // ===================================================

  const SensorRow = ({
    icon,
    name,
    value,
  }: {
    icon: string;
    name: string;
    value: string;
  }) => (
    <View style={styles.sensorRow}>
      <Text style={styles.sensorIcon}>
        {icon}
      </Text>

      <Text style={styles.sensorName}>
        {name}
      </Text>

      <Text style={styles.sensorValue}>
        {value}
      </Text>
    </View>
  );

  // ===================================================
  // UI
  // ===================================================

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* HEADER */}

      <View style={styles.header}>
        <View>
          <Text style={styles.title}>
            🔔 Cảnh báo
          </Text>

          <Text style={styles.subtitle}>
            Theo dõi các điều kiện bất thường
          </Text>
        </View>

        <View style={styles.alertBadge}>
          <Text style={styles.alertBadgeText}>
            {alerts.length}
          </Text>
        </View>
      </View>

      {/* SYSTEM */}

      <View
        style={[
          styles.statusCard,
          isOffline
            ? styles.statusOffline
            : styles.statusOnline,
        ]}
      >
        <Text style={styles.statusIcon}>
          {isOffline
            ? '🔴'
            : '🟢'}
        </Text>

        <View style={styles.statusInfo}>
          <Text style={styles.statusTitle}>
            {isOffline
              ? 'Hệ thống đang offline'
              : 'Hệ thống đang hoạt động'}
          </Text>

          <Text style={styles.statusText}>
            {isOffline
              ? 'Không tạo cảnh báo mới khi hệ thống offline.'
              : alerts.length === 0
                ? 'Các cảm biến hiện đang trong giới hạn.'
                : `Có ${alerts.length} vấn đề cần chú ý.`}
          </Text>
        </View>
      </View>

      {/* DISABLED */}

      {!alertEnabled && (
        <View style={styles.disabledCard}>
          <View style={styles.disabledIconBox}>
            <Text style={styles.disabledIcon}>
              🔕
            </Text>
          </View>

          <Text style={styles.disabledTitle}>
            Cảnh báo đang tắt
          </Text>

          <Text style={styles.disabledText}>
            Bạn có thể bật lại tính năng này
            trong phần Cài đặt.
          </Text>
        </View>
      )}

      {/* ALERTS */}

      {alertEnabled &&
        alerts.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>
              Cảnh báo hiện tại
            </Text>

            {alerts.map(
              alert => (
                <View
                  key={alert.id}
                  style={[
                    styles.alertCard,
                    alert.type === 'danger'
                      ? styles.dangerCard
                      : styles.warningCard,
                  ]}
                >
                  <View style={styles.alertIconBox}>
                    <Text style={styles.alertIcon}>
                      {alert.icon}
                    </Text>
                  </View>

                  <View style={styles.alertInfo}>
                    <Text style={styles.alertTitle}>
                      {alert.title}
                    </Text>

                    <Text style={styles.alertMessage}>
                      {alert.message}
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={() =>
                      clearAlert(alert.id)
                    }
                    style={styles.closeButton}
                  >
                    <Text style={styles.close}>
                      ✕
                    </Text>
                  </TouchableOpacity>
                </View>
              )
            )}
          </>
        )}

      {/* EMPTY */}

      {alertEnabled &&
        alerts.length === 0 && (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconBox}>
              <Text style={styles.emptyIcon}>
                {isOffline
                  ? '📡'
                  : '✅'}
              </Text>
            </View>

            <Text style={styles.emptyTitle}>
              {isOffline
                ? 'Đang chờ hệ thống online'
                : 'Không có cảnh báo'}
            </Text>

            <Text style={styles.emptyText}>
              {isOffline
                ? 'Dữ liệu cảm biến mới sẽ được xử lý khi hệ thống kết nối lại.'
                : 'Các thông số môi trường hiện đang ổn định.'}
            </Text>
          </View>
        )}

      {/* CURRENT VALUES */}

      <Text style={styles.sectionTitle}>
        Giá trị hiện tại
      </Text>

      <View style={styles.valuesCard}>
        <SensorRow
          icon="🌡️"
          name="Nhiệt độ"
          value={`${displayTemperature}${displayUnit}`}
        />

        <View style={styles.divider} />

        <SensorRow
          icon="💧"
          name="Độ ẩm không khí"
          value={`${humidity}%`}
        />

        <View style={styles.divider} />

        <SensorRow
          icon="🌱"
          name="Độ ẩm đất"
          value={`${soilMoisture}%`}
        />

        <View style={styles.divider} />

        <SensorRow
          icon="☀️"
          name="Ánh sáng"
          value={`${light} Lux`}
        />
      </View>

      {/* THRESHOLD */}

      <Text style={styles.sectionTitle}>
        Ngưỡng đang áp dụng
      </Text>

      <View style={styles.thresholdCard}>
        <Text style={styles.thresholdText}>
          🌡️ Nhiệt độ: {thresholds.temperatureLow} – {thresholds.temperatureHigh}°C
        </Text>

        <Text style={styles.thresholdText}>
          💧 Độ ẩm không khí: ≥ {thresholds.humidityLow}%
        </Text>

        <Text style={styles.thresholdText}>
          🌱 Độ ẩm đất: ≥ {thresholds.soilMoistureLow}%
        </Text>

        <Text style={styles.thresholdText}>
          ☀️ Ánh sáng: {thresholds.lightLow} – {thresholds.lightHigh} Lux
        </Text>
      </View>

      <Text style={styles.footer}>
        Ngưỡng được đồng bộ từ Settings
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

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 18,
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

  alertBadge: {
    width: 43,
    height: 43,
    borderRadius: 15,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },

  alertBadgeText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#DC2626',
  },

  statusCard: {
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },

  statusOnline: {
    backgroundColor: '#ECFDF5',
  },

  statusOffline: {
    backgroundColor: '#FEF2F2',
  },

  statusIcon: {
    fontSize: 25,
    marginRight: 11,
  },

  statusInfo: {
    flex: 1,
  },

  statusTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
  },

  statusText: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 4,
    lineHeight: 15,
  },

  disabledCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 21,
    padding: 28,
    alignItems: 'center',
    marginBottom: 22,
  },

  disabledIconBox: {
    width: 62,
    height: 62,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },

  disabledIcon: {
    fontSize: 32,
  },

  disabledTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#374151',
    marginTop: 12,
  },

  disabledText: {
    fontSize: 10,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 16,
    marginTop: 5,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#111827',
    marginTop: 7,
    marginBottom: 11,
  },

  alertCard: {
    borderRadius: 20,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 11,
  },

  dangerCard: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },

  warningCard: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },

  alertIconBox: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 11,
  },

  alertIcon: {
    fontSize: 23,
  },

  alertInfo: {
    flex: 1,
  },

  alertTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#111827',
  },

  alertMessage: {
    fontSize: 9,
    color: '#6B7280',
    marginTop: 4,
    lineHeight: 15,
  },

  closeButton: {
    paddingLeft: 8,
    paddingVertical: 8,
  },

  close: {
    fontSize: 17,
    color: '#9CA3AF',
  },

  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 21,
    padding: 28,
    alignItems: 'center',
    marginBottom: 22,
  },

  emptyIconBox: {
    width: 62,
    height: 62,
    borderRadius: 20,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
  },

  emptyIcon: {
    fontSize: 31,
  },

  emptyTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#374151',
    marginTop: 12,
  },

  emptyText: {
    fontSize: 10,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 16,
    marginTop: 5,
  },

  valuesCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 21,
    paddingHorizontal: 17,
    marginBottom: 20,
  },

  sensorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
  },

  sensorIcon: {
    fontSize: 22,
    width: 34,
  },

  sensorName: {
    flex: 1,
    fontSize: 12,
    color: '#4B5563',
  },

  sensorValue: {
    fontSize: 13,
    fontWeight: '900',
    color: '#111827',
  },

  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
  },

  thresholdCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 21,
    padding: 17,
  },

  thresholdText: {
    fontSize: 10,
    color: '#6B7280',
    lineHeight: 22,
  },

  footer: {
    textAlign: 'center',
    fontSize: 9,
    color: '#9CA3AF',
    marginTop: 18,
  },
});