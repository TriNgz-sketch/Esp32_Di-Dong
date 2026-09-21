#include <WiFi.h>
#include <HTTPClient.h>
#include "DHT.h" // Thư viện DHT22

// --- Cấu hình WiFi ---
#define WIFI_SSID "vivo X200 Pro mini" 
#define WIFI_PASSWORD "cothituxai"

// --- Cấu hình Firebase ---
#define FIREBASE_HOST "https://mobile-260c9-default-rtdb.firebaseio.com"
#define FIREBASE_AUTH "MZuKH9Bmca8wVMmazqQQD7YsOmPy4L24CnhTtrJA"

// --- Cấu hình Người dùng (Lấy UID từ Firebase Authentication của App) ---
#define USER_ID "6UrH65W6TdNxJRaEavMf3NKpVkX2"

// --- Định nghĩa chân Cảm biến ---
#define DHTPIN 2       // Chân DATA của DHT22 cắm vào D2
#define DHTTYPE DHT22  // Loại cảm biến là DHT22
DHT dht(DHTPIN, DHTTYPE);

#define LDR_PIN 34           // Chân AO của LDR cắm vào D34
#define SOIL_MOISTURE_PIN 35 // Chân AOUT của Cảm biến độ ẩm đất cắm vào D35

// --- Định nghĩa chân Điều khiển Thiết bị (Cho Relay) ---
#define PUMP_PIN 4   // Chân điều khiển Bơm nước
#define FAN_PIN 5    // Chân điều khiển Quạt
#define LIGHT_PIN 18 // Chân điều khiển Đèn LED

// 1. Hàm GỬI dữ liệu lên Firebase (Lưu định dạng SỐ)
void sendFirebase(String path, String value) {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    String url = String(FIREBASE_HOST) + path + ".json?auth=" + FIREBASE_AUTH;
    http.begin(url);
    http.addHeader("Content-Type", "application/json");
    
    // Bỏ dấu ngoặc kép để Firebase lưu dạng Number (Số)
    int httpResponseCode = http.PUT(value);
    http.end();
  }
}

// 2. Hàm LẤY dữ liệu từ Firebase về
String getFirebase(String path) {
  String payload = "";
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    String url = String(FIREBASE_HOST) + path + ".json?auth=" + FIREBASE_AUTH;
    http.begin(url);
    
    int httpResponseCode = http.GET();
    if (httpResponseCode > 0) {
      payload = http.getString(); 
    }
    http.end();
  }
  return payload;
}

void setup() {
  Serial.begin(115200);

  // Thiết lập chân đọc Analog cho cảm biến
  pinMode(LDR_PIN, INPUT);
  pinMode(SOIL_MOISTURE_PIN, INPUT);

  // Thiết lập chân Output cho thiết bị
  pinMode(PUMP_PIN, OUTPUT);
  pinMode(FAN_PIN, OUTPUT);
  pinMode(LIGHT_PIN, OUTPUT);
  
  // Tắt tất cả thiết bị lúc khởi động
  digitalWrite(PUMP_PIN, LOW);
  digitalWrite(FAN_PIN, LOW);
  digitalWrite(LIGHT_PIN, LOW);

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
  String sensorPath = "/users/" + String(USER_ID) + "/farm/sensors";
  String devicePath = "/users/" + String(USER_ID) + "/farm/devices";

  // ==========================================
  // PHẦN 1: ĐỌC VÀ ĐẨY DỮ LIỆU LÊN APP EXPO
  // ==========================================
  
  // 1. Cảm biến DHT22
  float temp = dht.readTemperature();
  float airHum = dht.readHumidity();
  
  if (!isnan(temp) && !isnan(airHum)) {
    Serial.printf("Air Temp: %.1f C, Air Hum: %.1f %%\n", temp, airHum);
    sendFirebase(sensorPath + "/temperature", String(temp, 1));
    sendFirebase(sensorPath + "/humidity", String(airHum, 1));
  } else {
    Serial.println("Lỗi: Không đọc được DHT22!");
  }

  // 2. Cảm biến quang LDR
  int ldrRaw = analogRead(LDR_PIN);
  int ldrValue = 0;

  if (ldrRaw >= 1000) { 
    ldrValue = map(ldrRaw, 1000, 4095, 500, 0); 
  } 
  else if (ldrRaw >= 500 && ldrRaw < 1000) {
    ldrValue = map(ldrRaw, 500, 1000, 1000, 500); 
  } 
  else {
    ldrValue = map(ldrRaw, 500, 0, 1000, 4095);
  }
  ldrValue = constrain(ldrValue, 0, 4095);
  
  Serial.printf("Raw: %d -> Chuan hoa (Light): %d\n", ldrRaw, ldrValue);
  sendFirebase(sensorPath + "/light", String(ldrValue));

  // 3. Cảm biến độ ẩm đất
  int soilRaw = analogRead(SOIL_MOISTURE_PIN);
  int soilPercent = map(soilRaw, 4095, 1500, 0, 100); 
  soilPercent = constrain(soilPercent, 0, 100); 
  
  Serial.printf("Soil Moisture: %d%%\n", soilPercent);
  sendFirebase(sensorPath + "/soilMoisture", String(soilPercent));


  // ==========================================
  // PHẦN 2: XỬ LÝ ĐIỀU KHIỂN (TỰ ĐỘNG & THỦ CÔNG)
  // ==========================================
  
  String autoMode = getFirebase(devicePath + "/mode/auto");

  if (autoMode == "true") {
    Serial.println("⚙️ Đang chạy chế độ: TỰ ĐỘNG");
    
    // --- Kịch bản Tự động cho Đèn ---
    if (ldrValue <= 50) { 
      digitalWrite(LIGHT_PIN, HIGH);
      sendFirebase(devicePath + "/light/state", "true");
      Serial.println("🟢 AUTO: Trời tối -> Đã TỰ ĐỘNG BẬT ĐÈN");
    } else {
      digitalWrite(LIGHT_PIN, LOW);
      sendFirebase(devicePath + "/light/state", "false");
    }

    // --- Kịch bản Tự động cho Máy bơm ---
    if (soilPercent < 30) { 
      digitalWrite(PUMP_PIN, HIGH);
      sendFirebase(devicePath + "/pump/state", "true");
      Serial.println("🟢 AUTO: Đất khô -> Đã TỰ ĐỘNG BẬT BƠM");
    } else {
      digitalWrite(PUMP_PIN, LOW);
      sendFirebase(devicePath + "/pump/state", "false");
    }
    
  } else {
    Serial.println("🖐 Đang chạy chế độ: THỦ CÔNG");
    
    // Đọc lệnh từ App
    String pumpState = getFirebase(devicePath + "/pump/state");
    if (pumpState == "true") {
      digitalWrite(PUMP_PIN, HIGH);
      Serial.println("🟢 PHẢN HỒI: App vừa BẬT Bơm nước");
    } else if (pumpState == "false") {
      digitalWrite(PUMP_PIN, LOW);
      Serial.println("🔴 PHẢN HỒI: App vừa TẮT Bơm nước");
    }

    String fanState = getFirebase(devicePath + "/fan/state");
    if (fanState == "true") {
      digitalWrite(FAN_PIN, HIGH);
      Serial.println("🟢 PHẢN HỒI: App vừa BẬT Quạt");
    } else if (fanState == "false") {
      digitalWrite(FAN_PIN, LOW);
      Serial.println("🔴 PHẢN HỒI: App vừa TẮT Quạt");
    }

    String lightState = getFirebase(devicePath + "/light/state");
    if (lightState == "true") {
      digitalWrite(LIGHT_PIN, HIGH);
      Serial.println("🟢 PHẢN HỒI: App vừa BẬT Đèn");
    } else if (lightState == "false") {
      digitalWrite(LIGHT_PIN, LOW);
      Serial.println("🔴 PHẢN HỒI: App vừa TẮT Đèn");
    }
  }

  Serial.println("-----------------------");
  delay(3000); // Tốc độ cập nhật 3 giây/lần
}