const { getPatientRoleId } = require("../services/signUpPatientService");
const express = require("express");
const router = express.Router();
const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
// Phone number validation helper
const validatePhone = (phone) => /^[0-9]{9,11}$/.test(phone.trim());

router.post("/auth/signup/patient", async (req, res) => {
  const { user_id, full_name, gender, phone_number, email } = req.body;

  // Input validation
  if (!user_id) {
    return res.status(400).json({ message: "Thiếu user_id" });
  }
  if (!full_name?.trim()) {
    return res.status(400).json({ message: "Thiếu họ tên" });
  }
  if (!gender) {
    return res.status(400).json({ message: "Thiếu giới tính" });
  }
  if (!phone_number || !validatePhone(phone_number)) {
    return res.status(400).json({ message: "Số điện thoại không hợp lệ" });
  }
  if (!email) {
    return res.status(400).json({ message: "Thiếu email" });
  }

  try {
    const role_id = await getPatientRoleId();

    // Assign role
    const { error: roleErr } = await supabase.from("user_roles").insert({
      user_id,
      role_id,
    });

    if (roleErr) throw roleErr;

    // Create PatientProfile
    const { error: profileErr } = await supabase
      .from("PatientProfiles")
      .insert({
        UserId: user_id,
        FullName: full_name.trim(),
        Gender: gender,
        PhoneNumber: phone_number.trim(),
        Email: email.trim(), // Thêm trường Email
      });

    if (profileErr) throw profileErr;

    res.json({
      success: true,
      message: "Tạo tài khoản bệnh nhân thành công!",
    });
  } catch (err) {
    console.error("Patient signup error:", err);
    res.status(500).json({
      success: false,
      message: "Lỗi khi tạo tài khoản bệnh nhân",
      error: err.message,
    });
  }
});

module.exports = router;
