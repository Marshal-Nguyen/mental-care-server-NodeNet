const express = require("express");
const router = express.Router();
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// router.get("/chat-users/:role/:userId", async (req, res) => {
//   const { role, userId } = req.params;

//   try {
//     if (role === "Doctor") {
//       const { data, error } = await supabase
//         .from("Bookings")
//         .select("PatientProfiles(Id, FullName)")
//         .eq("DoctorId", userId);

//       if (error) throw error;

//       const uniquePatients = Object.values(
//         data.reduce((acc, b) => {
//           const p = b.PatientProfiles;
//           if (p && !acc[p.Id]) {
//             acc[p.Id] = {
//               id: p.Id,
//               fullName: p.FullName,
//             };
//           }
//           return acc;
//         }, {})
//       );

//       return res.json(uniquePatients);
//     }

//     if (role === "User") {
//       const { data, error } = await supabase
//         .from("Bookings")
//         .select("DoctorProfiles(Id, FullName)")
//         .eq("PatientId", userId);

//       if (error) throw error;

//       const uniqueDoctors = Object.values(
//         data.reduce((acc, b) => {
//           const p = b.DoctorProfiles;
//           if (p && !acc[p.Id]) {
//             acc[p.Id] = {
//               id: p.Id,
//               fullName: p.FullName,
//             };
//           }
//           return acc;
//         }, {})
//       );

//       return res.json(uniqueDoctors);
//     }

//     res.status(400).json({ message: "Invalid role" });
//   } catch (err) {
//     console.error("Fetch chat users error:", err);
//     res.status(500).json({ error: "Internal server error" });
//   }
// });

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

module.exports = router;
