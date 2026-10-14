export type TemperatureUnit = 'C' | 'F';

/**
 * Firebase luôn lưu nhiệt độ theo °C.
 *
 * Hàm này chỉ chuyển đổi để HIỂN THỊ trên app.
 */
export const convertTemperature = (
  celsius: number,
  unit: TemperatureUnit
): number => {

  if (unit === 'F') {
    return (celsius * 9) / 5 + 32;
  }

  return celsius;
};


/**
 * Format nhiệt độ để hiển thị.
 */
export const formatTemperature = (
  celsius: number,
  unit: TemperatureUnit
): string => {

  const value = convertTemperature(
    celsius,
    unit
  );

  return value.toFixed(1);
};


/**
 * Lấy ký hiệu đơn vị.
 */
export const getTemperatureSymbol = (
  unit: TemperatureUnit
): string => {

  return unit === 'F' ? '°F' : '°C';

};