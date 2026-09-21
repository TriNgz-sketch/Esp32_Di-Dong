#include <WiFi.h>
#include <HTTPClient.h>
#include "DHT.h" // Thư viện DHT22

// --- Cấu hình WiFi ---
#define WIFI_SSID "vivo X200 Pro mini" 
#define WIFI_PASSWORD "cothituxai"

// --- Cấu hình Firebase ---
#define FIREBASE_HOST "https://mobile-260c9-default-rtdb.firebaseio.com"
#define FIREBASE_AUTH "MZuKH9Bmca8wVMmazqQQD7YsOmPy4L24CnhTtrJA"

// --- Định nghĩa chân Cảm biến ---
#define DHTPIN 2       // Chân DATA của DHT22 cắm vào D2
#define DHTTYPE DHT22  // Loại cảm biến là DHT22
DHT dht(DHTPIN, DHTTYPE);

#define LDR_PIN 34           // Chân AO của LDR cắm vào D34
#define SOIL_MOISTURE_PIN 35 // Chân AOUT của Cảm biến độ ẩm đất cắm vào D35

// Hàm gửi dữ liệu lên Firebase bằng HTTPClient
void sendFirebase(String path, String value) {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    String url = String(FIREBASE_HOST) + path + ".json?auth=" + FIREBASE_AUTH;
    http.begin(url);
    http.addHeader("Content-Type", "application/json");
    // Đẩy dữ liệu lên Firebase
    int httpResponseCode = http.PUT("\"" + value + "\"");
    http.end();
  }
}

void setup() {
  Serial.begin(115200);

  // Thiết lập chân đọc Analog
  pinMode(LDR_PIN, INPUT);
  pinMode(SOIL_MOISTURE_PIN, INPUT);

  // Khởi động cảm biến DHT
  dht.begin();
  
  // Kết nối WiFi
  Serial.print("Connecting to WiFi");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi Connected!");
}

void loop() {
  // 1. ĐỌC DHT22 (Nhiệt độ không khí & Độ ẩm không khí)
  float temp = dht.readTemperature();
  float airHum = dht.readHumidity();
  
  if (!isnan(temp) && !isnan(airHum)) {
    Serial.printf("Air Temp: %.1f C, Air Humidity: %.1f %%\n", temp, airHum);
    sendFirebase("/smartFarm/sensors/temperature", String(temp, 1));
    sendFirebase("/smartFarm/sensors/humidity", String(airHum, 1));
  } else {
    Serial.println("Lỗi: Không đọc được DHT22!");
  }

  // 2. ĐỌC CẢM BIẾN QUANG (LDR)

  int ldrRaw = analogRead(LDR_PIN);
  int ldrValue = 0;

  if (ldrRaw >= 1000) { 
    // TRƯỜNG HỢP THIẾU SÁNG: Raw từ 1000 -> 4095
    // Đã đảo lại chiều tính toán: Raw 1000 -> 500, Raw 4095 -> 0
    ldrValue = map(ldrRaw, 1000, 4095, 500, 0); 
  } 
  else if (ldrRaw >= 500 && ldrRaw < 1000) {
    // TRƯỜNG HỢP BÌNH THƯỜNG: Raw từ 500 -> 1000
    // Giữ nguyên mốc chuyển tiếp để nối mượt với 2 khoảng còn lại
    ldrValue = map(ldrRaw, 500, 1000, 1000, 500); 
  } 
  else {
    // TRƯỜNG HỢP SÁNG MẠNH: Raw từ 0 -> 500 
    // Đã đảo lại chiều tính toán: Raw 500 -> 1000, Raw 0 -> 4095
    ldrValue = map(ldrRaw, 500, 0, 1000, 4095);
  }

  // Đảm bảo giá trị luôn nằm trong giới hạn an toàn
  ldrValue = constrain(ldrValue, 0, 4095);

  Serial.printf("Raw: %d -> Chuan hoa: %d\n", ldrRaw, ldrValue);
  sendFirebase("/smartFarm/sensors/light", String(ldrValue));

  // 3. ĐỌC CẢM BIẾN ĐỘ ẨM ĐẤT
  int soilRaw = analogRead(SOIL_MOISTURE_PIN);
  
  // Cân chỉnh lại 2 giá trị (4095 và 1500) tùy theo thực tế đo được lúc Khô và lúc Ướt
  int soilPercent = map(soilRaw, 4095, 1500, 0, 100); 
  soilPercent = constrain(soilPercent, 0, 100); 
  
  Serial.printf("Soil Moisture: %d%%\n", soilPercent);
  sendFirebase("/smartFarm/sensors/soilMoisture", String(soilPercent));

  Serial.println("-----------------------");
  delay(3000); // Đợi 3 giây trước khi đọc lại vòng lặp
}
