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
router.post("/habits-therapeutic", async (req, res) => {
  try {
    const { PatientId, TherapeuticId } = req.body;
    const { data: PatientIds, error: patientError } = await supabase
      .from("PatientProfiles")
      .select("Id")
      .eq("Id", PatientId)
      .single();
    if (patientError || !PatientIds) {
      return res.status(404).json({ error: "Patient not found" });
    }
    const { data: existed, error: existError } = await supabase
      .from("PatientTherapeutic")
      .select("Id")
      .eq("PatientId", PatientId);

    if (existError) {
      console.error("Error checking PatientTherapeutic:", existError);
      return res
        .status(500)
        .json({ error: "Failed to check PatientTherapeutic" });
    }
    if (existed && existed.length > 0) {
      return res
        .status(409)
        .json({ error: "Patient đã ghi nhận hoạt động trị liệu hôm nay" });
    }
    const { data: Therapeutics, error: therapeuticError } = await supabase
      .from("TherapeuticActivities")
      .select("Id")
      .in("Id", TherapeuticId);

    if (therapeuticError || !Therapeutics) {
      console.error("Error checking Therapeutics:", therapeuticError);
      return res.status(500).json({ error: "Failed to check Therapeutics" });
    }

    const insertData = Therapeutics.map((e) => ({
      PatientId: PatientIds.Id,
      TherapeuticId: e.Id,
      Date: new Date().toISOString(),
    }));

    const { data, error: insertError } = await supabase
      .from("PatientTherapeutic")
      .insert(insertData)
      .select();

    if (insertError) {
      console.error("Error inserting PatientTherapeutic:", insertError);
      return res
        .status(500)
        .json({ error: "Failed to insert PatientTherapeutic" });
    }

    console.log("PatientTherapeutic inserted successfully:", data);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Error in /habits-therapeutic:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});
module.exports = router;
