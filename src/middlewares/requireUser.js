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
  try {
    const authHeader = req.headers.authorization;

    // Add detailed logging
    // console.log("Auth Header:", authHeader);

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("Missing or invalid auth header format");
      return res.status(401).json({
        error: "Invalid authentication header",
      });
    }

    const token = authHeader.split(" ")[1];
    // console.log("Token:", token?.substring(0, 20) + "..."); // Log partial token for debugging

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error) {
      console.error("Auth Error Details:", {
        status: error.status,
        message: error.message,
        code: error.code,
      });
      throw error;
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Full Auth Error:", error);
    return res.status(403).json({
      error: "Authentication failed",
      details: error.message,
    });
  }
};

module.exports = requireUser;
