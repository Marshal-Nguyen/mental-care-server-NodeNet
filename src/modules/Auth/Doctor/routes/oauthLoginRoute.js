const express = require("express");
const router = express.Router();
const { createClient } = require("@supabase/supabase-js");
const jwt = require("jsonwebtoken");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

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
  const userEmail = user.email;

  // Kiểm tra vai trò trong user_roles
  const { data: userRoleData, error: roleError } = await supabase
    .from("user_roles")
    .select("role_id")
    .eq("user_id", userId)
    .single();

  let role, roleId;

  if (roleError && roleError.code === "PGRST116") {
    // Không tìm thấy vai trò, mặc định gán vai trò Patient
    const { data: patientRole, error: patientRoleError } = await supabase
      .from("roles")
      .select("id, name")
      .eq("name", "Patient")
      .single();

    if (patientRoleError || !patientRole) {
      return res
        .status(500)
        .json({ message: "Lỗi khi lấy role Patient", error: patientRoleError });
    }

    role = patientRole.name;
    roleId = patientRole.id;

    // Tạo bản ghi trong user_roles cho Patient
    const { error: insertRoleError } = await supabase
      .from("user_roles")
      .insert({ user_id: userId, role_id: roleId });

    if (insertRoleError) {
      return res
        .status(500)
        .json({ message: "Lỗi khi gán role Patient", error: insertRoleError });
    }
  } else if (roleError) {
    return res
      .status(500)
      .json({ message: "Lỗi khi kiểm tra vai trò", error: roleError });
  } else {
    // Có vai trò, lấy thông tin từ roles
    const { data: roleData, error: roleFetchError } = await supabase
      .from("roles")
      .select("name")
      .eq("id", userRoleData.role_id)
      .single();

    if (roleFetchError || !roleData) {
      return res.status(500).json({
        message: "Lỗi khi lấy thông tin vai trò",
        error: roleFetchError,
      });
    }

    role = roleData.name;
    roleId = userRoleData.role_id;
  }

  // Truy vấn hoặc tạo bản ghi trong bảng hồ sơ tương ứng dựa trên role
  let profileId = null;

  if (role === "Doctor") {
    const { data: profileData, error: profileError } = await supabase
      .from("DoctorProfiles")
      .select("Id")
      .eq("UserId", userId)
      .single();

    if (profileError && profileError.code !== "PGRST116") {
      return res.status(500).json({
        message: "Lỗi khi truy vấn DoctorProfiles",
        error: profileError,
      });
    }

    if (!profileData) {
      const { data: newProfileData, error: insertError } = await supabase
        .from("DoctorProfiles")
        .insert({
          UserId: userId,
          Email: userEmail,
          FullName: user.email.split("@")[0],
          CreatedAt: new Date().toISOString(),
        })
        .select("Id")
        .single();

      if (insertError) {
        return res.status(500).json({
          message: "Lỗi khi tạo hồ sơ trong DoctorProfiles",
          error: insertError,
        });
      }

      profileId = newProfileData.Id;
    } else {
      profileId = profileData.Id;
    }
  } else if (role === "Patient") {
    const { data: profileData, error: profileError } = await supabase
      .from("PatientProfiles")
      .select("Id")
      .eq("UserId", userId)
      .single();

    if (profileError && profileError.code !== "PGRST116") {
      return res.status(500).json({
        message: "Lỗi khi truy vấn PatientProfiles",
        error: profileError,
      });
    }

    if (!profileData) {
      const { data: newProfileData, error: insertError } = await supabase
        .from("PatientProfiles")
        .insert({
          UserId: userId,
          Email: userEmail,
          FullName: user.email.split("@")[0],
          CreatedAt: new Date().toISOString(),
        })
        .select("Id")
        .single();

      if (insertError) {
        return res.status(500).json({
          message: "Lỗi khi tạo hồ sơ trong PatientProfiles",
          error: insertError,
        });
      }

      profileId = newProfileData.Id;
    } else {
      profileId = profileData.Id;
    }
  } else if (role === "Manager") {
    const { data: profileData, error: profileError } = await supabase
      .from("ManagerProfiles")
      .select("Id")
      .eq("UserId", userId)
      .single();

    if (profileError && profileError.code !== "PGRST116") {
      return res.status(500).json({
        message: "Lỗi khi truy vấn ManagerProfiles",
        error: profileError,
      });
    }

    if (!profileData) {
      const { data: newProfileData, error: insertError } = await supabase
        .from("ManagerProfiles")
        .insert({
          UserId: userId,
          Email: userEmail,
          FullName: user.email.split("@")[0],
          CreatedAt: new Date().toISOString(),
        })
        .select("Id")
        .single();

      if (insertError) {
        return res.status(500).json({
          message: "Lỗi khi tạo hồ sơ trong ManagerProfiles",
          error: insertError,
        });
      }

      profileId = newProfileData.Id;
    } else {
      profileId = profileData.Id;
    }
  } else {
    return res.status(403).json({ message: "Vai trò không được hỗ trợ" });
  }

  // Điều chỉnh role trước khi trả về JSON
  const responseRole = role === "Patient" ? "User" : role;

  return res.json({
    message: "Đăng nhập thành công",
    token: access_token,
    role: responseRole,
    user_id: userId,
    profileId,
  });
});

module.exports = router;
