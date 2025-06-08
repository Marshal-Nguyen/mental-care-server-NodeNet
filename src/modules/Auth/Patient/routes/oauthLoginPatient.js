const express = require("express");
const router = express.Router();
const { createClient } = require("@supabase/supabase-js");
const jwt = require("jsonwebtoken");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

router.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;

  // Validate input
  if (!email?.trim()) {
    return res.status(400).json({ message: "Email không được để trống" });
  }
  if (!password) {
    return res.status(400).json({ message: "Mật khẩu không được để trống" });
  }

  try {
    // Authenticate with Supabase
    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

    if (authError) throw authError;

    const userId = authData.user.id;
    console.log("Authenticated user ID:", userId);

    // Lấy profileId từ PatientProfiles
    const { data: patientData, error: patientError } = await supabase
      .from("PatientProfiles")
      .select("Id")
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

    const role = "Patient"; // Gán trực tiếp role
    const profileId = patientData.Id;

    // Tạo JWT
    const token = jwt.sign(
      {
        user_id: userId,
        email: authData.user.email,
        role,
        profileId,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      message: "Đăng nhập thành công",
      token,
      role,
      user_id: userId,
      profileId,
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
