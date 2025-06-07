const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function inviteDoctor({ email, full_name, specialty }) {
  // 1. Tạo user
  const { data: user, error: userError } = await supabase.auth.admin.createUser(
    {
      email,
      email_confirm: false,
    }
  );
  if (userError) throw userError;

  const userId = user.user.id;

  // 2. Lấy role_id từ bảng roles theo name = 'Doctor'
  const { data: roles, error: roleFetchError } = await supabase
    .from("roles")
    .select("id")
    .eq("name", "Doctor")
    .single();
  if (roleFetchError) throw roleFetchError;

  const roleId = roles.id;

  // 3. Gán role Doctor
  const { error: roleError } = await supabase
    .from("user_roles")
    .insert([{ user_id: userId, role_id: roleId }]);
  if (roleError) throw roleError;

  // 4. Tạo doctor profile
  const { error: profileError } = await supabase
    .from("DoctorProfiles")
    .insert([{ UserId: userId, FullName: full_name, Status: "invited" }]);
  if (profileError) throw profileError;

  // 5. Gửi email mời
  const { error: inviteError } =
    await supabase.auth.admin.inviteUserByEmail(email);
  if (inviteError) throw inviteError;

  return { userId };
}

module.exports = {
  inviteDoctor,
};
