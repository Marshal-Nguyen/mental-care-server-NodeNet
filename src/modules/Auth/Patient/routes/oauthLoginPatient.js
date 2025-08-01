const express = require("express");
const router = express.Router();
const { createClient } = require("@supabase/supabase-js");
const jwt = require("jsonwebtoken");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

router.post("/auth/login", async (req, res) => {
  const { email: inputEmail, password } = req.body; // Đổi tên biến email thành inputEmail

  // Validate input
  if (!inputEmail?.trim()) {
    return res.status(400).json({ message: "Email không được để trống" });
  }
  if (!password) {
    return res.status(400).json({ message: "Mật khẩu không được để trống" });
  }

  try {
    // Authenticate with Supabase
    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email: inputEmail.trim(), // Sử dụng inputEmail
        password: password,
      });

    if (authError) throw authError;

    const userId = authData.user.id;
    const access_token = authData.session.access_token;
    const refresh_token = authData.session.refresh_token;

    console.log("Authenticated user ID:", userId);

    // Lấy profileId, IsProfileCompleted và Email từ PatientProfiles
    const { data: patientData, error: patientError } = await supabase
      .from("PatientProfiles")
      .select("Id, IsProfileCompleted, Email, FullName, PhoneNumber, BirthDate")
      .eq("UserId", userId)
      .single();

    console.log("Patient profile data:", patientData);
    if (patientError || !patientData) {
      console.error("Patient profile error:", patientError);
      return res.status(404).json({
        message: "Không tìm thấy hồ sơ bệnh nhân",
        debug: { patientError },
      });
    }

    const role = "User";
    const profileId = patientData.Id;
    const isProfileCompleted = patientData.IsProfileCompleted || false;
    const email = patientData.Email; // Bây giờ không còn xung đột
    const fullName = patientData.FullName;
    const phoneNumber = patientData.PhoneNumber;
    const birthDate = patientData.BirthDate;
    return res.json({
      message: "Đăng nhập thành công",
      token: access_token,
      refresh_token,
      role,
      user_id: userId,
      profileId,
      isProfileCompleted,
      email,
      fullName,
      phoneNumber,
      birthDate,
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(401).json({
      success: false,
      message: "Đăng nhập thất bại",
      error: err.message,
    });
  }
});

module.exports = router;
