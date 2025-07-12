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
router.post("/daily-emotions", async (req, res) => {
  try {
    const { PatientId, EmotionId } = req.body;

    // Kiểm tra EmotionId là mảng và tối đa 2 phần tử
    if (
      !PatientId ||
      !EmotionId ||
      !Array.isArray(EmotionId) ||
      EmotionId.length === 0 ||
      EmotionId.length > 2
    ) {
      return res
        .status(400)
        .json({ error: "EmotionId phải là mảng, tối đa 2 phần tử" });
    }

    // Kiểm tra PatientId tồn tại
    const { data: PatientIds, error } = await supabase
      .from("PatientProfiles")
      .select("Id")
      .eq("Id", PatientId)
      .single();
    if (error || !PatientIds) {
      return res.status(404).json({ error: "Patient not found" });
    }

    // Kiểm tra PatientId đã có trong DailyEmotions chưa
    const { data: existed, error: existError } = await supabase
      .from("DailyEmotions")
      .select("Id")
      .eq("PatientId", PatientId);

    if (existError) {
      console.error("Error checking DailyEmotions:", existError);
      return res.status(500).json({ error: "Failed to check DailyEmotions" });
    }

    if (existed && existed.length > 0) {
      return res
        .status(409)
        .json({ error: "Patient đã ghi nhận cảm xúc hôm nay" });
    }

    // Lấy thông tin các EmotionId
    const { data: Emotions, error: emotionError } = await supabase
      .from("Emotions")
      .select("Id")
      .in("Id", EmotionId);

    if (emotionError || !Emotions || Emotions.length !== EmotionId.length) {
      return res.status(404).json({ error: "Emotion(s) not found" });
    }

    // Tạo mảng dữ liệu để insert
    const insertData = Emotions.map((e) => ({
      PatientId: PatientIds.Id,
      EmotionId: e.Id,
      Date: new Date().toISOString(),
    }));

    const { data, error: insertError } = await supabase
      .from("DailyEmotions")
      .insert(insertData)
      .select();

    if (insertError) {
      console.error("Error inserting daily emotion:", insertError);
      return res.status(500).json({ error: "Failed to insert daily emotion" });
    }

    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error("Internal Server Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
module.exports = router; // Đúng: export router để sử dụng trong app.js
