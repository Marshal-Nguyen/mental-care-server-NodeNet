const express = require("express");
const cors = require("cors");
const listEndpoints = require("express-list-endpoints"); // <--- thêm dòng này

const app = express();
require("dotenv").config();

// Cấu hình CORS
app.use(
  cors({
    origin: ["http://localhost:5173", "https://emoeaseai-ruby.vercel.app"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());

// Mount route
const inviteDoctorRoute = require("./src/modules/Auth/Doctor/routes/inviteDoctorRoute");
app.use("/api", inviteDoctorRoute);

const oauthLoginRoute = require("./src/modules/Auth/Doctor/routes/oauthLoginRoute");
app.use("/api", oauthLoginRoute);

const signUpPatientRoute = require("./src/modules/Auth/Patient/routes/signUpPatientRoute");
app.use("/api", signUpPatientRoute);

const oauthLoginPatientRoute = require("./src/modules/Auth/Patient/routes/oauthLoginPatient");
app.use("/api", oauthLoginPatientRoute);
// Test route
const testRoutes = require("./src/modules/test/routes/getQuestionTest");
app.use("/api", testRoutes);
// Doctor profile
const doctorProfileRoutes = require("./src/modules/doctorProfile/doctorProfile.routes");
app.use("/api", doctorProfileRoutes);
// doctor schedule
const doctorScheduleRoutes = require("./src/modules/doctorSchedule/doctorSchedule.route");
app.use("/api", doctorScheduleRoutes);
// Patient profile
const patientProfileRoutes = require("./src/modules/patientProfile/patientProfile.routes");
app.use("/api", patientProfileRoutes);
//avatar
const avatarRoutes = require("./src/modules/avatar/avatar.routes");
app.use("/api", avatarRoutes);
// Chat user
const getChatUser = require("./src/modules/chat/routes/getChatUsesr");
app.use("/api", getChatUser);
//booking
const booking = require("./src/modules/booking/booking.routes");
app.use("/api", booking);
//payment
const pay = require("./src/modules/payment/payment");
app.use("/api", pay);

// In ra danh sách route để test
console.log("📚 Danh sách các API đã khai báo:");
console.table(listEndpoints(app)); // <-- dòng in ra đẹp

module.exports = app;
