// Script test kết nối API
const testApiConnection = async () => {
  const API_BASE_URL = "http://localhost:8000";

  console.log("🔍 Đang test kết nối API...");

  try {
    // Test health check
    const healthResponse = await fetch(`${API_BASE_URL}/health`);
    const healthData = await healthResponse.json();
    console.log("✅ Health check:", healthData);

    // Test auth endpoints
    const authEndpoints = ["/auth/login", "/auth/register", "/auth/me"];

    for (const endpoint of authEndpoints) {
      try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });
        console.log(`✅ Endpoint ${endpoint}: ${response.status}`);
      } catch (error) {
        console.log(`❌ Endpoint ${endpoint}: ${error.message}`);
      }
    }

    console.log("🎉 Test hoàn thành!");
  } catch (error) {
    console.error("❌ Lỗi kết nối API:", error);
    console.log("💡 Hãy đảm bảo backend đang chạy tại http://localhost:8000");
  }
};

// Chạy test nếu đang trong browser
if (typeof window !== "undefined") {
  testApiConnection();
}

// Export cho Node.js
if (typeof module !== "undefined" && module.exports) {
  module.exports = testApiConnection;
}
