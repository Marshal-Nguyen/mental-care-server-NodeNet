const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

const requireUser = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Thiếu access token" });
  }

  const token = authHeader.split(" ")[1];

  try {
    // 1. Lấy thông tin user từ access token
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      console.error("Lỗi xác thực user:", userError);
      return res.status(401).json({ error: "Token không hợp lệ" });
    }
    // 2. Kiểm tra role
    const { data: roles, error: roleError } = await supabase
      .from("user_roles")
      .select("role_id, roles(name)")
      .eq("user_id", user.id)
      .single();
    if (roleError) {
      console.error("Lỗi khi truy vấn role:", roleError);
      return res
        .status(500)
        .json({ error: "Không xác định được quyền truy cập" });
    }
    if (roleError || !roles || roles.roles.name !== "Patient") {
      return res.status(403).json({ error: "Bạn không có quyền Patient" });
    }
    // Gán user info vào request
    req.user = {
      id: user.id,
      email: user.email,
      role: roles.roles.name,
    };
    next();
  } catch (err) {
    console.error("Auth lỗi:", err.message || err);
    return res.status(401).json({ error: "Xác thực thất bại" });
  }
};

module.exports = requireUser;
