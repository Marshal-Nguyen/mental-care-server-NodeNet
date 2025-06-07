const express = require("express");
const cors = require("cors"); // <-- thêm dòng này
const app = express();
require("dotenv").config();

// Cấu hình CORS
app.use(
  cors({
    origin: "http://localhost:5173", // FE chạy ở Vite port 5173
    credentials: true, // nếu có dùng cookie/token
  })
);

app.use(express.json());

// Mount route
const inviteDoctorRoute = require("./src/routes/inviteDoctorRoute");
app.use("/api", inviteDoctorRoute);
const oauthLoginRoute = require("./src/routes/oauthLoginRoute");
app.use("/api", oauthLoginRoute);

module.exports = app;
