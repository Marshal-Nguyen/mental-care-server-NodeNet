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
router.post("/habits-physical", async (req, res) => {
  try {
    const { PatientId, PhysicalId } = req.body;
    const { data: PatientIds, error: patientError } = await supabase
      .from("PatientProfiles")
      .select("Id")
      .eq("Id", PatientId)
      .single();
    if (patientError || !PatientIds) {
      return res.status(404).json({ error: "Patient not found" });
    }
    const { data: existed, error: existError } = await supabase
      .from("PatientPhysical")
      .select("Id")
      .eq("PatientId", PatientId);

    if (existError) {
      console.error("Error checking PatientPhysical:", existError);
      return res
        .status(500)
        .json({ error: "Failed to check PatientTherapeutic" });
    }
    if (existed && existed.length > 0) {
      return res
        .status(409)
        .json({ error: "Patient đã ghi nhận hoạt động trị liệu hôm nay" });
    }
    const { data: Physicals, error: physicalError } = await supabase
      .from("PhysicalActivities")
      .select("Id")
      .in("Id", PhysicalId);

    if (physicalError || !Physicals) {
      console.error("Error checking Physicals:", physicalError);
      return res.status(500).json({ error: "Failed to check Physicals" });
    }

    const insertData = Physicals.map((e) => ({
      PatientId: PatientIds.Id,
      PhysicalId: e.Id,
      Date: new Date().toISOString(),
    }));

    const { data, error: insertError } = await supabase
      .from("PatientPhysical")
      .insert(insertData)
      .select();

    if (insertError) {
      console.error("Error inserting PatientPhysical:", insertError);
      return res
        .status(500)
        .json({ error: "Failed to insert PatientPhysical" });
    }

    console.log("PatientPhysical inserted successfully:", data);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Error in /habits-physical:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});
module.exports = router;
