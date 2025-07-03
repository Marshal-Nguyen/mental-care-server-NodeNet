const axios = require("axios");
const fs = require("fs");
const path = require("path");

// Lấy URL ngrok hiện tại từ API localhost
async function getNgrokUrl() {
  try {
    const res = await axios.get("http://127.0.0.1:4040/api/tunnels");
    const url = res.data.tunnels[0].public_url;

    console.log("✅ Ngrok public URL:", url);

    // ✅ Khai báo envPath trước khi sử dụng
    const envPath = path.join(__dirname, "../../.env");

    // ✅ Đọc file cũ nếu tồn tại
    let oldEnv = "";
    if (fs.existsSync(envPath)) {
      oldEnv = fs.readFileSync(envPath, "utf-8");
      oldEnv = oldEnv
        .split("\n")
        .filter((line) => !line.startsWith("NGROK_URL="))
        .join("\n");
    }

    // ✅ Ghi đè NGROK_URL mới, giữ các dòng cũ
    const newEnv = `${oldEnv}\nNGROK_URL=${url}\n`;
    fs.writeFileSync(envPath, newEnv.trim());

    console.log("✅ Đã ghi NGROK_URL vào file .env");
  } catch (err) {
    console.error("❌ Không lấy được URL ngrok:", err.message);
  }
}

module.exports = getNgrokUrl;
