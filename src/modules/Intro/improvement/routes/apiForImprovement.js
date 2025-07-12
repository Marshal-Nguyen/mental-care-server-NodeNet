const { createClient } = require("@supabase/supabase-js");
const express = require("express");
const router = express.Router();

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
router.post("/habits-improvement", async (req, res) => {
  try {
    const { PatientId, ImprovementId } = req.body;
    const { data: PatientIds, error: patientError } = await supabase
      .from("PatientProfiles")
      .select("Id")
      .eq("Id", PatientId)
      .single();
    if (patientError || !PatientIds) {
      return res.status(404).json({ error: "Patient not found" });
    }
    const { data: existed, error: existError } = await supabase
      .from("PatientImprovement")
      .select("Id")
      .eq("PatientId", PatientId);

    if (existError) {
      console.error("Error checking PatientImprovement:", existError);
      return res
        .status(500)
        .json({ error: "Failed to check PatientImprovement" });
    }
    if (existed && existed.length > 0) {
      return res
        .status(409)
        .json({ error: "Patient đã ghi nhận hoạt động cải thiện hôm nay" });
    }
    const { data: Improvements, error: improvementError } = await supabase
      .from("ImprovementGoals")
      .select("Id")
      .in("Id", ImprovementId);

    if (improvementError || !Improvements) {
      console.error("Error checking Improvements:", improvementError);
      return res.status(500).json({ error: "Failed to check Improvements" });
    }

    const insertData = Improvements.map((e) => ({
      PatientId: PatientIds.Id,
      ImprovementId: e.Id,
      Date: new Date().toISOString(),
    }));

    const { data, error: insertError } = await supabase
      .from("PatientImprovement")
      .insert(insertData)
      .select();

    if (insertError) {
      console.error("Error inserting PatientImprovement:", insertError);
      return res
        .status(500)
        .json({ error: "Failed to insert PatientImprovement" });
    }

    console.log("PatientImprovement inserted successfully:", data);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Error in /habits-improvement:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});
module.exports = router;
