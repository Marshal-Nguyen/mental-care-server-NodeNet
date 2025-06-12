const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function inviteDoctor({ email, full_name }) {
  try {
    // 1. Check required fields
    if (!email || !full_name) {
      throw new Error("Thiếu thông tin email hoặc tên đầy đủ");
    }

    // 2. Send invite via Supabase (will use configured redirect URL)
    const { data: user, error: inviteError } =
      await supabase.auth.admin.inviteUserByEmail(email, {
        data: { full_name }, // Add metadata to the invite
      });

    if (inviteError) {
      console.error("Invite error:", inviteError);
      throw inviteError;
    }

    const userId = user.user.id;
    console.log("New user created with ID:", userId);

    // 3. Get Doctor role_id
    const { data: roles, error: roleFetchError } = await supabase
      .from("roles")
      .select("id")
      .eq("name", "Doctor")
      .single();

    if (roleFetchError) throw roleFetchError;

    const roleId = roles.id;
    if (!roleId) {
      throw new Error("Không tìm thấy role Doctor");
    }

    // 4. Assign Doctor role
    const { error: roleError } = await supabase
      .from("user_roles")
      .insert([{ user_id: userId, role_id: roleId }]);

    if (roleError) throw roleError;
    console.log("Role assigned successfully");

    // 5. Create doctor profile
    const { error: profileError } = await supabase
      .from("DoctorProfiles")
      .insert([
        {
          UserId: userId,
          FullName: full_name,
          Status: "pending_verification", // Set initial status
          // EmailVerified: false,
        },
      ]);

    if (profileError) throw profileError;
    console.log("Doctor profile created successfully");

    return {
      success: true,
      userId,
      message: "Email mời đã được gửi. Vui lòng kiểm tra hộp thư để xác thực.",
    };
  } catch (error) {
    console.error("Invite doctor error:", error);
    throw error;
  }
}

module.exports = {
  inviteDoctor,
};
