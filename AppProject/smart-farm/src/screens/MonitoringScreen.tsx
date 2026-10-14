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
  Dimensions,
} from 'react-native';

import {
  LineChart,
} from 'react-native-chart-kit';

import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  ref,
  onValue,
  get,
  push,
  set,
  query,
  orderByChild,
  limitToLast,
} from 'firebase/database';

import {
  database,
} from '../config/firebase';

import {
  useFocusEffect,
} from '@react-navigation/native';

import {
  useAuth,
} from '../auth/AuthContext';


// =====================================================
// SCREEN WIDTH
// =====================================================

const screenWidth =
  Dimensions.get('window').width;


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

type HistoryPoint = {
  timestamp: number;
  value: number;
};


// =====================================================
// DEFAULT THRESHOLDS
// =====================================================

const DEFAULT_ALERT_THRESHOLDS: AlertThresholds = {
  temperatureLow: 15,
  temperatureHigh: 35,
  humidityLow: 40,
  soilMoistureLow: 30,
  lightLow: 200,
  lightHigh: 900,
};


// =====================================================
// HISTORY LIMIT
// =====================================================

const MAX_HISTORY_POINTS = 30;


// =====================================================
// MONITORING SCREEN
// =====================================================

export default function MonitoringScreen() {

  // ===================================================
  // AUTH
  // ===================================================

  const { user } = useAuth();


  // ===================================================
  // SENSOR DATA
  // ===================================================

  const [temperature, setTemperature] =
    useState<number>(0);

  const [humidity, setHumidity] =
    useState<number>(0);

  const [soilMoisture, setSoilMoisture] =
    useState<number>(0);

  const [light, setLight] =
    useState<number>(0);


  // ===================================================
  // HISTORY
  // ===================================================

  const [temperatureHistory, setTemperatureHistory] =
    useState<number[]>([]);

  const [humidityHistory, setHumidityHistory] =
    useState<number[]>([]);

  const [soilHistory, setSoilHistory] =
    useState<number[]>([]);

  const [lightHistory, setLightHistory] =
    useState<number[]>([]);


  // ===================================================
  // SYSTEM STATUS
  // ===================================================

  const [systemStatus, setSystemStatus] =
    useState<string>('offline');


  // ===================================================
  // ONLINE REF
  // ===================================================

  const isOnlineRef =
    useRef<boolean>(false);


  // ===================================================
  // LAST SAVED SENSOR VALUE
  // DÙNG ĐỂ KHÔNG GHI TRÙNG DỮ LIỆU
  // ===================================================

  const lastSavedSensorRef =
    useRef<{
      temperature: number | null;
      humidity: number | null;
      soilMoisture: number | null;
      light: number | null;
    }>({
      temperature: null,
      humidity: null,
      soilMoisture: null,
      light: null,
    });


  // ===================================================
  // SETTINGS
  // ===================================================

  const [alertEnabled, setAlertEnabled] =
    useState<boolean>(true);

  const [temperatureUnit, setTemperatureUnit] =
    useState<TemperatureUnit>('C');

  const [thresholds, setThresholds] =
    useState<AlertThresholds>(
      DEFAULT_ALERT_THRESHOLDS
    );


  // ===================================================
  // UPDATE SENSOR UI
  // KHÔNG TỰ ĐỘNG GHI FIREBASE
  // ===================================================

  const updateSensorUI = useCallback(
    (data: any) => {

      if (!data) {
        console.log(
          'Không có dữ liệu sensor'
        );

        return null;
      }


      // -----------------------------------------------
      // SENSOR VALUES
      // -----------------------------------------------

      const rawTemperature =
        Number(
          data.temperature
        );

      const rawHumidity =
        Number(
          data.humidity
        );

      const rawSoilMoisture =
        Number(
          data.soilMoisture
        );

      const rawLight =
        Number(
          data.light
        );


      const newTemperature =
        Number.isFinite(rawTemperature)
          ? rawTemperature
          : 0;

      const newHumidity =
        Number.isFinite(rawHumidity)
          ? rawHumidity
          : 0;

      const newSoilMoisture =
        Number.isFinite(rawSoilMoisture)
          ? rawSoilMoisture
          : 0;

      const newLight =
        Number.isFinite(rawLight)
          ? rawLight
          : 0;


      // -----------------------------------------------
      // CURRENT VALUES
      // -----------------------------------------------

      setTemperature(
        newTemperature
      );

      setHumidity(
        newHumidity
      );

      setSoilMoisture(
        newSoilMoisture
      );

      setLight(
        newLight
      );


      return {
        temperature: newTemperature,
        humidity: newHumidity,
        soilMoisture: newSoilMoisture,
        light: newLight,
      };

    },
    []
  );


  // ===================================================
  // ADD HISTORY TO UI
  // ===================================================

  const addHistoryToUI = useCallback(
    (
      data: {
        temperature: number;
        humidity: number;
        soilMoisture: number;
        light: number;
      }
    ) => {

      setTemperatureHistory(
        previous => [
          ...previous,
          data.temperature,
        ].slice(-MAX_HISTORY_POINTS)
      );

      setHumidityHistory(
        previous => [
          ...previous,
          data.humidity,
        ].slice(-MAX_HISTORY_POINTS)
      );

      setSoilHistory(
        previous => [
          ...previous,
          data.soilMoisture,
        ].slice(-MAX_HISTORY_POINTS)
      );

      setLightHistory(
        previous => [
          ...previous,
          data.light,
        ].slice(-MAX_HISTORY_POINTS)
      );

    },
    []
  );


  // ===================================================
  // LOAD HISTORY FROM FIREBASE
  // ===================================================

  const loadHistory = useCallback(
    async () => {

      if (!user?.uid) {
        return;
      }


      try {

        const basePath =
          `users/${user.uid}/farm/history`;


        // ---------------------------------------------
        // REFERENCES
        // ---------------------------------------------

        const temperatureHistoryRef =
          query(
            ref(
              database,
              `${basePath}/temperature`
            ),
            orderByChild('timestamp'),
            limitToLast(MAX_HISTORY_POINTS)
          );

        const humidityHistoryRef =
          query(
            ref(
              database,
              `${basePath}/humidity`
            ),
            orderByChild('timestamp'),
            limitToLast(MAX_HISTORY_POINTS)
          );

        const soilHistoryRef =
          query(
            ref(
              database,
              `${basePath}/soilMoisture`
            ),
            orderByChild('timestamp'),
            limitToLast(MAX_HISTORY_POINTS)
          );

        const lightHistoryRef =
          query(
            ref(
              database,
              `${basePath}/light`
            ),
            orderByChild('timestamp'),
            limitToLast(MAX_HISTORY_POINTS)
          );


        // ---------------------------------------------
        // GET
        // ---------------------------------------------

        const [
          temperatureSnapshot,
          humiditySnapshot,
          soilSnapshot,
          lightSnapshot,
        ] = await Promise.all([

          get(
            temperatureHistoryRef
          ),

          get(
            humidityHistoryRef
          ),

          get(
            soilHistoryRef
          ),

          get(
            lightHistoryRef
          ),

        ]);


        // ---------------------------------------------
        // PARSE FUNCTION
        // ---------------------------------------------

        const parseHistory =
          (
            snapshot: any
          ): HistoryPoint[] => {

            if (
              !snapshot.exists()
            ) {
              return [];
            }


            const data =
              snapshot.val();


            return Object.values(
              data
            )
              .map(
                (item: any) => ({
                  timestamp:
                    Number(
                      item?.timestamp
                    ),

                  value:
                    Number(
                      item?.value
                    ),
                })
              )
              .filter(
                item =>
                  Number.isFinite(
                    item.timestamp
                  ) &&
                  Number.isFinite(
                    item.value
                  )
              )
              .sort(
                (a, b) =>
                  a.timestamp -
                  b.timestamp
              );

          };


        const temperatureData =
          parseHistory(
            temperatureSnapshot
          );

        const humidityData =
          parseHistory(
            humiditySnapshot
          );

        const soilData =
          parseHistory(
            soilSnapshot
          );

        const lightData =
          parseHistory(
            lightSnapshot
          );


        // ---------------------------------------------
        // UPDATE UI
        // ---------------------------------------------

        setTemperatureHistory(
          temperatureData.map(
            item => item.value
          )
        );

        setHumidityHistory(
          humidityData.map(
            item => item.value
          )
        );

        setSoilHistory(
          soilData.map(
            item => item.value
          )
        );

        setLightHistory(
          lightData.map(
            item => item.value
          )
        );


        // ---------------------------------------------
        // SET LAST VALUE
        // ĐỂ TRÁNH GHI TRÙNG KHI SENSOR LISTENER CHẠY
        // ---------------------------------------------

        lastSavedSensorRef.current = {

          temperature:
            temperatureData.length
              ? temperatureData[
                  temperatureData.length - 1
                ].value
              : null,

          humidity:
            humidityData.length
              ? humidityData[
                  humidityData.length - 1
                ].value
              : null,

          soilMoisture:
            soilData.length
              ? soilData[
                  soilData.length - 1
                ].value
              : null,

          light:
            lightData.length
              ? lightData[
                  lightData.length - 1
                ].value
              : null,

        };


        console.log(
          'History loaded:',
          {
            temperature:
              temperatureData.length,

            humidity:
              humidityData.length,

            soilMoisture:
              soilData.length,

            light:
              lightData.length,
          }
        );

      } catch (error) {

        console.log(
          'Load history error:',
          error
        );

      }

    },
    [
      user?.uid,
    ]
  );


  // ===================================================
  // SAVE SENSOR HISTORY TO FIREBASE
  // ===================================================

  const saveSensorHistory = useCallback(
    async (
      data: {
        temperature: number;
        humidity: number;
        soilMoisture: number;
        light: number;
      }
    ) => {

      if (!user?.uid) {
        return;
      }


      if (!isOnlineRef.current) {
        return;
      }


      try {

        const basePath =
          `users/${user.uid}/farm/history`;

        const timestamp =
          Date.now();


        // ---------------------------------------------
        // CHECK CÓ THAY ĐỔI KHÔNG
        // ---------------------------------------------

        const previous =
          lastSavedSensorRef.current;


        const changed =
          previous.temperature !==
            data.temperature ||

          previous.humidity !==
            data.humidity ||

          previous.soilMoisture !==
            data.soilMoisture ||

          previous.light !==
            data.light;


        /*
         * Nếu ESP32 gửi lại đúng cùng một giá trị
         * thì không tạo thêm điểm trùng.
         */

        if (!changed) {

          console.log(
            'Sensor không thay đổi - không lưu history'
          );

          return;

        }


        // ---------------------------------------------
        // TẠO CÁC NODE HISTORY
        // ---------------------------------------------

        const temperatureKey =
          push(
            ref(
              database,
              `${basePath}/temperature`
            )
          ).key;

        const humidityKey =
          push(
            ref(
              database,
              `${basePath}/humidity`
            )
          ).key;

        const soilKey =
          push(
            ref(
              database,
              `${basePath}/soilMoisture`
            )
          ).key;

        const lightKey =
          push(
            ref(
              database,
              `${basePath}/light`
            )
          ).key;


        if (
          !temperatureKey ||
          !humidityKey ||
          !soilKey ||
          !lightKey
        ) {

          console.log(
            'Không tạo được history key'
          );

          return;

        }


        // ---------------------------------------------
        // GHI FIREBASE
        // ---------------------------------------------

        await Promise.all([

          set(
            ref(
              database,
              `${basePath}/temperature/${temperatureKey}`
            ),
            {
              timestamp,
              value: data.temperature,
            }
          ),

          set(
            ref(
              database,
              `${basePath}/humidity/${humidityKey}`
            ),
            {
              timestamp,
              value: data.humidity,
            }
          ),

          set(
            ref(
              database,
              `${basePath}/soilMoisture/${soilKey}`
            ),
            {
              timestamp,
              value: data.soilMoisture,
            }
          ),

          set(
            ref(
              database,
              `${basePath}/light/${lightKey}`
            ),
            {
              timestamp,
              value: data.light,
            }
          ),

        ]);


        // ---------------------------------------------
        // UPDATE LAST VALUE
        // ---------------------------------------------

        lastSavedSensorRef.current = {
          temperature:
            data.temperature,

          humidity:
            data.humidity,

          soilMoisture:
            data.soilMoisture,

          light:
            data.light,
        };


        // ---------------------------------------------
        // UPDATE CHART UI
        // ---------------------------------------------

        addHistoryToUI(
          data
        );


        console.log(
          'Đã lưu history:',
          data
        );

      } catch (error) {

        console.log(
          'Save sensor history error:',
          error
        );

      }

    },
    [
      addHistoryToUI,
      user?.uid,
    ]
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

        const getStorageKey =
          (key: string) =>
            `${key}_${user.uid}`;


        // ---------------------------------------------
        // ALERT
        // ---------------------------------------------

        const savedAlert =
          await AsyncStorage.getItem(
            getStorageKey(
              'alertEnabled'
            )
          );

        if (
          savedAlert !== null
        ) {

          setAlertEnabled(
            savedAlert === 'true'
          );

        } else {

          setAlertEnabled(
            true
          );

        }


        // ---------------------------------------------
        // TEMPERATURE UNIT
        // ---------------------------------------------

        const savedUnit =
          await AsyncStorage.getItem(
            getStorageKey(
              'temperatureUnit'
            )
          );

        if (
          savedUnit === 'C' ||
          savedUnit === 'F'
        ) {

          setTemperatureUnit(
            savedUnit
          );

        } else {

          setTemperatureUnit(
            'C'
          );

        }


        // ---------------------------------------------
        // THRESHOLDS
        // ---------------------------------------------

        const savedThresholds =
          await AsyncStorage.getItem(
            getStorageKey(
              'alertThresholds'
            )
          );

        if (
          savedThresholds
        ) {

          try {

            const parsed =
              JSON.parse(
                savedThresholds
              );


            const temperatureLow =
              Number(
                parsed.temperatureLow
              );

            const temperatureHigh =
              Number(
                parsed.temperatureHigh
              );

            const humidityLow =
              Number(
                parsed.humidityLow
              );

            const soilMoistureLow =
              Number(
                parsed.soilMoistureLow
              );

            const lightLow =
              Number(
                parsed.lightLow
              );

            const lightHigh =
              Number(
                parsed.lightHigh
              );


            setThresholds({

              temperatureLow:
                Number.isFinite(
                  temperatureLow
                )
                  ? temperatureLow
                  : DEFAULT_ALERT_THRESHOLDS.temperatureLow,

              temperatureHigh:
                Number.isFinite(
                  temperatureHigh
                )
                  ? temperatureHigh
                  : DEFAULT_ALERT_THRESHOLDS.temperatureHigh,

              humidityLow:
                Number.isFinite(
                  humidityLow
                )
                  ? humidityLow
                  : DEFAULT_ALERT_THRESHOLDS.humidityLow,

              soilMoistureLow:
                Number.isFinite(
                  soilMoistureLow
                )
                  ? soilMoistureLow
                  : DEFAULT_ALERT_THRESHOLDS.soilMoistureLow,

              lightLow:
                Number.isFinite(
                  lightLow
                )
                  ? lightLow
                  : DEFAULT_ALERT_THRESHOLDS.lightLow,

              lightHigh:
                Number.isFinite(
                  lightHigh
                )
                  ? lightHigh
                  : DEFAULT_ALERT_THRESHOLDS.lightHigh,

            });

          } catch {

            setThresholds(
              DEFAULT_ALERT_THRESHOLDS
            );

          }

        } else {

          setThresholds(
            DEFAULT_ALERT_THRESHOLDS
          );

        }

      } catch (error) {

        console.log(
          'Load settings error:',
          error
        );

      }

    },
    [
      user?.uid,
    ]
  );


  // ===================================================
  // LOAD SETTINGS WHEN SCREEN FOCUS
  // ===================================================

  useFocusEffect(

    useCallback(() => {

      loadSettings();

    }, [
      loadSettings,
    ])

  );


  // ===================================================
  // LOAD HISTORY WHEN USER CHANGES
  // ===================================================

  useEffect(() => {

    if (!user?.uid) {

      setTemperatureHistory([]);
      setHumidityHistory([]);
      setSoilHistory([]);
      setLightHistory([]);

      lastSavedSensorRef.current = {
        temperature: null,
        humidity: null,
        soilMoisture: null,
        light: null,
      };

      return;

    }


    loadHistory();

  }, [
    user?.uid,
    loadHistory,
  ]);


  // ===================================================
  // FIREBASE
  // ===================================================

  useEffect(() => {

    if (!user?.uid) {

      console.log(
        'Monitoring: chưa có user.uid'
      );

      isOnlineRef.current = false;

      setSystemStatus(
        'offline'
      );

      return;

    }


    console.log(
      'Firebase Monitoring connecting for UID:',
      user.uid
    );


    // =================================================
    // BASE PATH
    // =================================================

    const basePath =
      `users/${user.uid}/farm`;


    // =================================================
    // REFERENCES
    // =================================================

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


    // =================================================
    // SENSOR LISTENER
    // =================================================

    const unsubscribeSensors =
      onValue(

        sensorsRef,

        async snapshot => {

          /*
           * Không xử lý cache khi offline.
           */

          if (!isOnlineRef.current) {

            console.log(
              'Bỏ qua sensor vì hệ thống đang offline'
            );

            return;

          }


          const data =
            snapshot.val();


          if (!data) {

            console.log(
              'Không có dữ liệu sensor'
            );

            return;

          }


          console.log(
            'Sensor realtime:',
            data
          );


          const parsedData =
            updateSensorUI(
              data
            );


          if (!parsedData) {
            return;
          }


          /*
           * Sensor thay đổi realtime:
           * lưu vào Firebase history.
           */

          await saveSensorHistory(
            parsedData
          );

        },

        error => {

          console.log(
            'Sensor Firebase error:',
            error
          );

        }

      );


    // =================================================
    // SYSTEM STATUS LISTENER
    // =================================================

    const unsubscribeSystem =
      onValue(

        systemRef,

        async snapshot => {

          const value =
            snapshot.val();


          const online =
            value === 'online';


          // -------------------------------------------
          // UPDATE REF TRƯỚC
          // -------------------------------------------

          isOnlineRef.current =
            online;


          // -------------------------------------------
          // UPDATE UI
          // -------------------------------------------

          setSystemStatus(
            online
              ? 'online'
              : 'offline'
          );


          // -------------------------------------------
          // OFFLINE
          // -------------------------------------------

          if (!online) {

            console.log(
              'ESP32 OFFLINE - giữ nguyên dữ liệu cuối cùng'
            );

            return;

          }


          // -------------------------------------------
          // ONLINE
          // -------------------------------------------

          console.log(
            'ESP32 ONLINE - lấy dữ liệu sensor hiện tại'
          );


          try {

            const sensorSnapshot =
              await get(
                sensorsRef
              );


            /*
             * Kiểm tra lại trạng thái.
             */

            if (!isOnlineRef.current) {

              console.log(
                'Đã offline trong lúc lấy sensor - bỏ qua'
              );

              return;

            }


            if (
              sensorSnapshot.exists()
            ) {

              const data =
                sensorSnapshot.val();


              console.log(
                'Sensor sau khi ONLINE:',
                data
              );


              const parsedData =
                updateSensorUI(
                  data
                );


              if (!parsedData) {
                return;
              }


              /*
               * Không tự động ghi history ở đây.
               *
               * Sensor listener sẽ xử lý việc lưu.
               *
               * Nếu history đang rỗng thì sensor listener
               * vẫn sẽ nhận dữ liệu và lưu điểm đầu tiên.
               */

            } else {

              console.log(
                'Firebase không có sensor data'
              );

            }

          } catch (error) {

            console.log(
              'Get sensor after online error:',
              error
            );

          }

        },

        error => {

          console.log(
            'System status error:',
            error
          );


          isOnlineRef.current =
            false;


          setSystemStatus(
            'offline'
          );

        }

      );


    // =================================================
    // CLEANUP
    // =================================================

    return () => {

      isOnlineRef.current =
        false;

      unsubscribeSensors();

      unsubscribeSystem();

    };

  }, [
    user?.uid,
    updateSensorUI,
    saveSensorHistory,
  ]);


  // ===================================================
  // ONLINE
  // ===================================================

  const isOnline =
    systemStatus === 'online';


  // ===================================================
  // TEMPERATURE CONVERSION
  // ===================================================

  const convertTemperature =
    (
      value: number
    ) => {

      if (
        temperatureUnit === 'F'
      ) {

        return (
          value * 9 / 5 + 32
        );

      }

      return value;

    };


  const displayTemperature =
    convertTemperature(
      temperature
    );


  const displayTemperatureHistory =
    temperatureHistory.map(
      value =>
        convertTemperature(value)
    );


  // ===================================================
  // ALERT LOGIC
  // ===================================================

  const isTemperatureLow =
    alertEnabled &&
    isOnline &&
    temperature <
      thresholds.temperatureLow;


  const isTemperatureHigh =
    alertEnabled &&
    isOnline &&
    temperature >
      thresholds.temperatureHigh;


  const isHumidityLow =
    alertEnabled &&
    isOnline &&
    humidity <
      thresholds.humidityLow;


  const isSoilMoistureLow =
    alertEnabled &&
    isOnline &&
    soilMoisture <
      thresholds.soilMoistureLow;


  const isLightLow =
    alertEnabled &&
    isOnline &&
    light <
      thresholds.lightLow;


  const isLightHigh =
    alertEnabled &&
    isOnline &&
    light >
      thresholds.lightHigh;


  // ===================================================
  // TEMPERATURE STATUS
  // ===================================================

  const temperatureStatusText =
    !alertEnabled
      ? 'Cảnh báo đã tắt'
      : !isOnline
        ? 'Hệ thống offline'
        : isTemperatureLow
          ? `Nhiệt độ thấp hơn ${thresholds.temperatureLow}°C`
          : isTemperatureHigh
            ? `Nhiệt độ cao hơn ${thresholds.temperatureHigh}°C`
            : 'Nhiệt độ đang ở mức bình thường';


  const temperatureStatusColor =
    !alertEnabled
      ? '#6B7280'
      : !isOnline
        ? '#DC2626'
        : isTemperatureLow ||
          isTemperatureHigh
          ? '#DC2626'
          : '#16A34A';


  // ===================================================
  // CHART CONFIG
  // ===================================================

  const chartConfig = {

    backgroundGradientFrom:
      '#FFFFFF',

    backgroundGradientTo:
      '#FFFFFF',

    decimalPlaces: 1,

    color: (
      opacity = 1
    ) =>
      `rgba(22, 163, 74, ${opacity})`,

    labelColor: (
      opacity = 1
    ) =>
      `rgba(0, 0, 0, ${opacity})`,

    propsForDots: {

      r: '4',

      strokeWidth: '2',

      stroke: '#16A34A',

    },

    propsForBackgroundLines: {

      strokeDasharray: '',

    },

  };


  // ===================================================
  // CHART LABELS
  // ===================================================

  const getLabels =
    (
      length: number
    ) => {

      if (
        length === 0
      ) {

        return [''];

      }


      return Array.from(
        {
          length,
        },
        (_, index) =>
          `${index + 1}`
      );

    };


  // ===================================================
  // CHART DATA
  // ===================================================

  const temperatureChartData = {

    labels:
      getLabels(
        displayTemperatureHistory.length
      ),

    datasets: [

      {

        data:
          displayTemperatureHistory.length
            ? displayTemperatureHistory
            : [0],

      },

    ],

  };


  const humidityChartData = {

    labels:
      getLabels(
        humidityHistory.length
      ),

    datasets: [

      {

        data:
          humidityHistory.length
            ? humidityHistory
            : [0],

      },

    ],

  };


  const soilChartData = {

    labels:
      getLabels(
        soilHistory.length
      ),

    datasets: [

      {

        data:
          soilHistory.length
            ? soilHistory
            : [0],

      },

    ],

  };


  const lightChartData = {

    labels:
      getLabels(
        lightHistory.length
      ),

    datasets: [

      {

        data:
          lightHistory.length
            ? lightHistory
            : [0],

      },

    ],

  };


  // ===================================================
  // RENDER
  // ===================================================

  return (

    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >

      <Text style={styles.title}>
        📊 Dữ liệu môi trường
      </Text>

      <Text style={styles.subtitle}>
        Theo dõi dữ liệu cảm biến theo thời gian thực
      </Text>


      <View style={styles.statusCard}>

        <View
          style={[
            styles.statusDot,
            {
              backgroundColor:
                isOnline
                  ? '#22C55E'
                  : '#EF4444',
            },
          ]}
        />

        <View style={styles.statusInfo}>

          <Text style={styles.statusTitle}>
            ESP32 Gateway
          </Text>

          <Text style={styles.statusDescription}>
            {isOnline
              ? 'Hệ thống đang hoạt động'
              : 'Hệ thống đang offline'}
          </Text>

        </View>

        <Text
          style={[
            styles.statusText,
            {
              color:
                isOnline
                  ? '#16A34A'
                  : '#DC2626',
            },
          ]}
        >
          {isOnline
            ? 'ONLINE'
            : 'OFFLINE'}
        </Text>

      </View>


      <View style={styles.currentCard}>

        <View style={styles.currentIconBox}>

          <Text style={styles.currentIcon}>
            🌡️
          </Text>

        </View>

        <View style={styles.currentInfo}>

          <Text style={styles.currentLabel}>
            Nhiệt độ hiện tại
          </Text>

          <View style={styles.temperatureRow}>

            <Text style={styles.currentValue}>
              {displayTemperature.toFixed(1)}
            </Text>

            <Text style={styles.currentUnit}>
              °{temperatureUnit}
            </Text>

          </View>

          <Text
            style={[
              styles.currentDescription,
              {
                color:
                  temperatureStatusColor,
              },
            ]}
          >
            {temperatureStatusText}
          </Text>

          {alertEnabled && isOnline && (

            <Text style={styles.thresholdInfo}>
              Ngưỡng: {thresholds.temperatureLow}°C
              {' – '}
              {thresholds.temperatureHigh}°C
            </Text>

          )}

        </View>

      </View>


      <View style={styles.chartCard}>

        <View style={styles.chartHeader}>

          <View>

            <Text style={styles.chartTitle}>
              🌡️ Nhiệt độ
            </Text>

            <Text style={styles.chartSubtitle}>
              Đơn vị: °{temperatureUnit}
            </Text>

          </View>

          <Text
            style={[
              styles.chartCurrent,
              {
                color:
                  temperatureStatusColor,
              },
            ]}
          >
            {displayTemperature.toFixed(1)}
            °{temperatureUnit}
          </Text>

        </View>

        <LineChart
          data={temperatureChartData}
          width={screenWidth - 70}
          height={220}
          chartConfig={chartConfig}
          bezier
          fromZero={false}
          yAxisSuffix={`°${temperatureUnit}`}
          yAxisInterval={1}
          style={styles.chart}
        />

      </View>


      <View style={styles.chartCard}>

        <View style={styles.chartHeader}>

          <View>

            <Text style={styles.chartTitle}>
              💧 Độ ẩm không khí
            </Text>

            <Text style={styles.chartSubtitle}>
              Theo dõi độ ẩm môi trường
            </Text>

          </View>

          <Text
            style={[
              styles.chartCurrent,
              {
                color:
                  alertEnabled &&
                  isHumidityLow
                    ? '#DC2626'
                    : '#16A34A',
              },
            ]}
          >
            {humidity.toFixed(0)}%
          </Text>

        </View>

        <LineChart
          data={humidityChartData}
          width={screenWidth - 70}
          height={220}
          chartConfig={chartConfig}
          bezier
          fromZero
          yAxisSuffix="%"
          yAxisInterval={1}
          style={styles.chart}
        />

        {alertEnabled && isOnline && (

          <Text
            style={[
              styles.alertText,
              {
                color:
                  isHumidityLow
                    ? '#DC2626'
                    : '#16A34A',
              },
            ]}
          >
            {isHumidityLow
              ? `⚠️ Độ ẩm thấp hơn ${thresholds.humidityLow}%`
              : `✓ Độ ẩm ≥ ${thresholds.humidityLow}%`}
          </Text>

        )}

      </View>


      <View style={styles.chartCard}>

        <View style={styles.chartHeader}>

          <View>

            <Text style={styles.chartTitle}>
              🌱 Độ ẩm đất
            </Text>

            <Text style={styles.chartSubtitle}>
              Theo dõi độ ẩm đất
            </Text>

          </View>

          <Text
            style={[
              styles.chartCurrent,
              {
                color:
                  alertEnabled &&
                  isSoilMoistureLow
                    ? '#DC2626'
                    : '#16A34A',
              },
            ]}
          >
            {soilMoisture.toFixed(0)}%
          </Text>

        </View>

        <LineChart
          data={soilChartData}
          width={screenWidth - 70}
          height={220}
          chartConfig={chartConfig}
          bezier
          fromZero
          yAxisSuffix="%"
          yAxisInterval={1}
          style={styles.chart}
        />

        {alertEnabled && isOnline && (

          <Text
            style={[
              styles.alertText,
              {
                color:
                  isSoilMoistureLow
                    ? '#DC2626'
                    : '#16A34A',
              },
            ]}
          >
            {isSoilMoistureLow
              ? `⚠️ Độ ẩm đất thấp hơn ${thresholds.soilMoistureLow}%`
              : `✓ Độ ẩm đất ≥ ${thresholds.soilMoistureLow}%`}
          </Text>

        )}

      </View>


      <View style={styles.chartCard}>

        <View style={styles.chartHeader}>

          <View>

            <Text style={styles.chartTitle}>
              ☀️ Ánh sáng
            </Text>

            <Text style={styles.chartSubtitle}>
              Cường độ ánh sáng
            </Text>

          </View>

          <Text
            style={[
              styles.chartCurrent,
              {
                color:
                  alertEnabled &&
                  (
                    isLightLow ||
                    isLightHigh
                  )
                    ? '#DC2626'
                    : '#16A34A',
              },
            ]}
          >
            {light.toFixed(0)} Lux
          </Text>

        </View>

        <LineChart
          data={lightChartData}
          width={screenWidth - 70}
          height={220}
          chartConfig={chartConfig}
          bezier
          fromZero
          yAxisInterval={1}
          style={styles.chart}
        />

        {alertEnabled && isOnline && (

          <Text
            style={[
              styles.alertText,
              {
                color:
                  isLightLow ||
                  isLightHigh
                    ? '#DC2626'
                    : '#16A34A',
              },
            ]}
          >

            {isLightLow
              ? `⚠️ Ánh sáng thấp hơn ${thresholds.lightLow} Lux`
              : isLightHigh
                ? `⚠️ Ánh sáng cao hơn ${thresholds.lightHigh} Lux`
                : `✓ Ánh sáng ${thresholds.lightLow}–${thresholds.lightHigh} Lux`}

          </Text>

        )}

      </View>


      <View
        style={[
          styles.infoCard,
          {
            backgroundColor:
              isOnline
                ? '#F0FDF4'
                : '#FEF2F2',
          },
        ]}
      >

        <Text style={styles.infoIcon}>
          {isOnline
            ? '🔥'
            : '⚠️'}
        </Text>

        <View style={styles.infoContent}>

          <Text
            style={[
              styles.infoTitle,
              {
                color:
                  isOnline
                    ? '#166534'
                    : '#991B1B',
              },
            ]}
          >
            {isOnline
              ? 'Kết nối realtime'
              : 'Hệ thống offline'}
          </Text>

          <Text style={styles.infoText}>

            {isOnline
              ? 'Các cảm biến đang được đồng bộ trực tiếp với Firebase Realtime Database.'
              : 'Không thể xác nhận dữ liệu realtime từ hệ thống. Kiểm tra trạng thái ESP32 và kết nối mạng.'}

          </Text>

          <Text
            style={[
              styles.alertSettingText,
              {
                color:
                  alertEnabled
                    ? '#166534'
                    : '#6B7280',
              },
            ]}
          >
            🔔 Cảnh báo:
            {' '}
            {alertEnabled
              ? 'Đang bật'
              : 'Đang tắt'}
          </Text>

        </View>

      </View>

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
    paddingBottom: 40,
  },

  title: {
    fontSize: 27,
    fontWeight: '800',
    marginTop: 10,
    color: '#111827',
  },

  subtitle: {
    fontSize: 13,
    marginTop: 5,
    marginBottom: 20,
    color: '#6B7280',
  },

  statusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },

  statusDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: 14,
  },

  statusInfo: {
    flex: 1,
  },

  statusTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },

  statusDescription: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 4,
  },

  statusText: {
    fontSize: 13,
    fontWeight: '900',
  },

  currentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },

  currentIconBox: {
    width: 65,
    height: 65,
    borderRadius: 18,
    backgroundColor: '#F0FDF4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },

  currentIcon: {
    fontSize: 34,
  },

  currentInfo: {
    flex: 1,
  },

  currentLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 3,
  },

  temperatureRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },

  currentValue: {
    fontSize: 36,
    fontWeight: '800',
    color: '#111827',
  },

  currentUnit: {
    fontSize: 18,
    marginLeft: 5,
    marginBottom: 5,
    color: '#374151',
  },

  currentDescription: {
    fontSize: 10,
    marginTop: 3,
    fontWeight: '600',
  },

  thresholdInfo: {
    fontSize: 9,
    color: '#9CA3AF',
    marginTop: 4,
  },

  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 15,
    marginBottom: 18,
  },

  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
    paddingHorizontal: 5,
  },

  chartTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
  },

  chartSubtitle: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 3,
  },

  chartCurrent: {
    fontSize: 17,
    fontWeight: '800',
  },

  chart: {
    marginTop: 5,
    marginLeft: -15,
    borderRadius: 15,
  },

  alertText: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 4,
    marginLeft: 5,
  },

  infoCard: {
    borderRadius: 20,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },

  infoIcon: {
    fontSize: 28,
    marginRight: 13,
  },

  infoContent: {
    flex: 1,
  },

  infoTitle: {
    fontSize: 15,
    fontWeight: '800',
  },

  infoText: {
    fontSize: 11,
    lineHeight: 17,
    color: '#6B7280',
    marginTop: 4,
  },

  alertSettingText: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 7,
  },

});