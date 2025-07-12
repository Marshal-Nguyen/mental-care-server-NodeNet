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
router.post("/habits-lifestyle", async (req, res) => {
  try {
    const {
      PatientId,
      LogDate,
      SleepHours,
      ExerciseFrequency,
      AvailableTimePerDay,
    } = req.body;

    // Kiểm tra dữ liệu đầu vào
    if (
      !PatientId ||
      !LogDate ||
      !SleepHours ||
      !ExerciseFrequency ||
      !AvailableTimePerDay
    ) {
      return res.status(400).json({
        error:
          "Tất cả các trường (PatientId, LogDate, SleepHours, ExerciseFrequency, AvailableTimePerDay) là bắt buộc",
      });
    }

    // Kiểm tra xem PatientId có tồn tại không
    const { data: patient, error: patientError } = await supabase
      .from("PatientProfiles")
      .select("Id")
      .eq("Id", PatientId)
      .single();

    if (patientError || !patient) {
      return res.status(404).json({ error: "PatientProfile không tồn tại" });
    }

    // Chèn dữ liệu vào LifestyleLogs
    const { data, error } = await supabase
      .from("LifestyleLogs")
      .insert([
        {
          PatientId,
          LogDate: LogDate,
          SleepHours: SleepHours,
          ExerciseFrequency: ExerciseFrequency,
          AvailableTimePerDay: AvailableTimePerDay,
        },
      ])
      .select();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(201).json({ message: "Đã thêm thành công", data });
  } catch (error) {
    console.error("Lỗi:", error);
    return res.status(500).json({ error: "Lỗi máy chủ nội bộ" });
  }
});
module.exports = router;
