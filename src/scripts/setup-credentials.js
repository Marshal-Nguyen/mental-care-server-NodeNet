// filepath: scripts/setup-credentials.js
const fs = require("fs");
const path = require("path");
require("dotenv").config();

function setupCredentials() {
  console.log("🔧 Setting up credentials...");

  // Kiểm tra các biến môi trường
  console.log(
    "GOOGLE_CLOUD_PROJECT_ID:",
    process.env.GOOGLE_CLOUD_PROJECT_ID ? "✅ Found" : "❌ Missing"
  );
  console.log(
    "GOOGLE_CLOUD_PRIVATE_KEY:",
    process.env.GOOGLE_CLOUD_PRIVATE_KEY ? "✅ Found" : "❌ Missing"
  );
  console.log(
    "GOOGLE_CLOUD_CLIENT_EMAIL:",
    process.env.GOOGLE_CLOUD_CLIENT_EMAIL ? "✅ Found" : "❌ Missing"
  );

  // Nếu đã có file credentials, bỏ qua
  if (fs.existsSync("credentials/vigilant-shift-470904-k5-4754ff8eb73a.json")) {
    console.log("✅ Credentials file already exists");
    return;
  }

  console.log("📂 Creating credentials directory...");
  // Tạo thư mục credentials nếu chưa có
  if (!fs.existsSync("credentials")) {
    fs.mkdirSync("credentials");
    console.log("✅ Created credentials directory");
  }

  // Tạo credentials object từ biến môi trường
  const credentials = {
    type: process.env.GOOGLE_CLOUD_TYPE || "service_account",
    project_id: process.env.GOOGLE_CLOUD_PROJECT_ID,
    private_key_id: process.env.GOOGLE_CLOUD_PRIVATE_KEY_ID,
    private_key: process.env.GOOGLE_CLOUD_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    client_email: process.env.GOOGLE_CLOUD_CLIENT_EMAIL,
    client_id: process.env.GOOGLE_CLOUD_CLIENT_ID,
    auth_uri:
      process.env.GOOGLE_CLOUD_AUTH_URI ||
      "https://accounts.google.com/o/oauth2/auth",
    token_uri:
      process.env.GOOGLE_CLOUD_TOKEN_URI ||
      "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url:
      process.env.GOOGLE_CLOUD_AUTH_PROVIDER_CERT_URL ||
      "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url: process.env.GOOGLE_CLOUD_CLIENT_CERT_URL,
    universe_domain:
      process.env.GOOGLE_CLOUD_UNIVERSE_DOMAIN || "googleapis.com",
  };

  // Kiểm tra xem tất cả các trường cần thiết có tồn tại không
  if (
    !credentials.project_id ||
    !credentials.private_key ||
    !credentials.client_email
  ) {
    console.error(
      "❌ Missing required Google Cloud credentials in environment variables"
    );
    console.log("Required fields:");
    console.log("- project_id:", credentials.project_id ? "✅" : "❌");
    console.log("- private_key:", credentials.private_key ? "✅" : "❌");
    console.log("- client_email:", credentials.client_email ? "✅" : "❌");
    return;
  }

  // Viết file credentials
  try {
    const credentialsPath = "credentials/vigilant-shift-470904-k5-4754ff8eb73a.json";
    fs.writeFileSync(credentialsPath, JSON.stringify(credentials, null, 2));
    console.log(
      "✅ Credentials file created successfully at:",
      credentialsPath
    );

    // Verify file exists
    if (fs.existsSync(credentialsPath)) {
      console.log("✅ File verification passed");
    } else {
      console.error("❌ File verification failed");
    }
  } catch (error) {
    console.error("❌ Failed to create credentials file:", error.message);
  }
}

module.exports = setupCredentials;
