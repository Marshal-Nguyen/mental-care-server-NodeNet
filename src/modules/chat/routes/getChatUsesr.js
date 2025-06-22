const express = require("express");
const router = express.Router();
const { createClient } = require("@supabase/supabase-js");
const requireUser = require("../../../middlewares/requireUser");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

router.get("/chat-users/:role/:userId", async (req, res) => {
  const { role, userId } = req.params;

  try {
    if (role === "Doctor") {
      const { data, error } = await supabase
        .from("Bookings")
        .select("PatientProfiles(UserId, FullName)")
        .eq("DoctorId", userId); // dùng userId từ request

      if (error) throw error;

      const uniquePatients = Object.values(
        data.reduce((acc, b) => {
          const p = b.PatientProfiles;
          if (p && !acc[p.UserId]) {
            acc[p.UserId] = {
              Id: p.UserId, // 👈 Dùng UserId
              fullName: p.FullName,
            };
          }
          return acc;
        }, {})
      );

      return res.json(uniquePatients);
    }

    if (role === "User") {
      const { data, error } = await supabase
        .from("Bookings")
        .select("DoctorProfiles(UserId, FullName)")
        .eq("PatientId", userId); // dùng userId từ request

      if (error) throw error;

      const uniqueDoctors = Object.values(
        data.reduce((acc, b) => {
          const p = b.DoctorProfiles;
          if (p && !acc[p.UserId]) {
            acc[p.UserId] = {
              Id: p.UserId, // 👈 Dùng UserId
              fullName: p.FullName,
            };
          }
          return acc;
        }, {})
      );

      return res.json(uniqueDoctors);
    }

    res.status(400).json({ message: "Invalid role" });
  } catch (err) {
    console.error("Fetch chat users error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/me", async (req, res) => {
  try {
    const user = req.user; // Giả sử middleware đã gán user vào req

    if (!user || !user.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userId = user.id;

    const { data, error } = await supabase
      .from("PatientProfiles")
      .select("*")
      .eq("UserId", userId)
      .single();

    if (error) throw error;

    return res.status(200).json(data);
  } catch (error) {
    console.error("Error fetching patient profile:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;
