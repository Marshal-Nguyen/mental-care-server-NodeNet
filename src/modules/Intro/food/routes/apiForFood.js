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
router.post("/habits-food", async (req, res) => {
  try {
    const { PatientId, FoodId } = req.body;
    const { data: PatientIds, error: patientError } = await supabase
      .from("PatientProfiles")
      .select("Id")
      .eq("Id", PatientId)
      .single();
    if (patientError || !PatientIds) {
      return res.status(404).json({ error: "Patient not found" });
    }
    const { data: existed, error: existError } = await supabase
      .from("PatientFood")
      .select("Id")
      .eq("PatientId", PatientId);

    if (existError) {
      console.error("Error checking PatientFood:", existError);
      return res.status(500).json({ error: "Failed to check PatientFood" });
    }
    if (existed && existed.length > 0) {
      return res
        .status(409)
        .json({ error: "Patient đã ghi nhận hoạt động ăn uống hôm nay" });
    }
    const { data: Foods, error: foodError } = await supabase
      .from("FoodActivities")
      .select("Id")
      .in("Id", FoodId); // Sửa lại từ .eq thành .in

    if (foodError || !Foods) {
      console.error("Error checking Foods:", foodError);
      return res.status(500).json({ error: "Failed to check Foods" });
    }

    const insertData = Foods.map((e) => ({
      PatientId: PatientIds.Id,
      FoodId: e.Id,
      Date: new Date().toISOString(),
    }));

    const { data, error: insertError } = await supabase
      .from("PatientFood")
      .insert(insertData)
      .select();

    if (insertError) {
      console.error("Error inserting PatientFood:", insertError);
      return res.status(500).json({ error: "Failed to insert PatientFood" });
    }

    console.log("PatientFood inserted successfully:", data);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Error in /habits-food:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});
module.exports = router;
