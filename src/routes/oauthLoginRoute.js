const express = require("express");
const router = express.Router();
const { createClient } = require("@supabase/supabase-js");
const jwt = require("jsonwebtoken");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Route: xử lý login từ Google (sau khi client lấy access_token gửi lên)
router.post("/auth/google/callback", async (req, res) => {
  const { access_token } = req.body;

  if (!access_token) {
    return res.status(400).json({ message: "Thiếu access_token" });
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(access_token);

  if (error || !user) {
    return res.status(401).json({ message: "Token không hợp lệ", error });
  }

  const userId = user.id;

  // Lấy role
  const { data: userRoleData, error: roleError } = await supabase
    .from("user_roles")
    .select("role_id, roles(name)")
    .eq("user_id", userId)
    .single();

  if (roleError || !userRoleData) {
    return res.status(403).json({ message: "User chưa được gán role" });
  }

  const role = userRoleData.roles.name;

  let doctorProfileId = null;

  // Nếu role là Doctor thì truy bảng DoctorProfiles để lấy Id
  if (role === "Doctor") {
    const { data: doctorData, error: doctorError } = await supabase
      .from("DoctorProfiles")
      .select("Id")
      .eq("UserId", userId)
      .single();

    if (doctorError || !doctorData) {
      return res.status(404).json({ message: "Không tìm thấy hồ sơ bác sĩ" });
    }

    doctorProfileId = doctorData.Id;
  }

  // Tạo JWT
  const token = jwt.sign(
    {
      user_id: userId,
      email: user.email,
      role,
      profileId: doctorProfileId, // thêm vào đây
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  return res.json({
    message: "Đăng nhập thành công",
    token,
    role,
    user_id: userId,
    profileId: doctorProfileId,
  });
});

module.exports = router;
