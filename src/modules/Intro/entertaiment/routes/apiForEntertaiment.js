const { createClient } = require("@supabase/supabase-js");
const express = require("express");
const router = express.Router();

// 🔐 Supabase credentials (lấy từ Supabase project của mày)

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
router.post("/habits-entertainment", async (req, res) => {
  try {
    const { PatientId, EntertainmentId } = req.body;
    const { data: PatientIds, error: patientError } = await supabase
      .from("PatientProfiles")
      .select("Id")
      .eq("Id", PatientId)
      .single();
    if (patientError || !PatientIds) {
      return res.status(404).json({ error: "Patient not found" });
    }
    const { data: existed, error: existError } = await supabase
      .from("PatientEntertainment")
      .select("Id")
      .eq("PatientId", PatientId);

    if (existError) {
      console.error("Error checking PatientEntertainment:", existError);
      return res
        .status(500)
        .json({ error: "Failed to check PatientEntertainment" });
    }
    if (existed && existed.length > 0) {
      return res
        .status(409)
        .json({ error: "Patient đã ghi nhận hoạt động giải trí hôm nay" });
    }
    const { data: Entertainments, error: entertainmentError } = await supabase
      .from("EntertainmentActivities")
      .select("Id")
      .in("Id", EntertainmentId); // Sửa lại từ .eq thành .in

    if (entertainmentError || !Entertainments) {
      console.error("Error checking Entertainments:", entertainmentError);
      return res.status(500).json({ error: "Failed to check Entertainments" });
    }

    const insertData = Entertainments.map((e) => ({
      PatientId: PatientIds.Id,
      EntertainmentId: e.Id,
      Date: new Date().toISOString(),
    }));

    const { data, error: insertError } = await supabase
      .from("PatientEntertainment")
      .insert(insertData)
      .select();

    if (insertError) {
      console.error("Error inserting PatientEntertainment:", insertError);
      return res
        .status(500)
        .json({ error: "Failed to insert PatientEntertainment" });
    }

    console.log("PatientEntertainment inserted successfully:", data);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Error in /habits-entertainment:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});
module.exports = router;
