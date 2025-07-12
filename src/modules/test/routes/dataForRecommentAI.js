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
router.get("/patient-emotions/:patientId", async (req, res) => {
  const { patientId } = req.params;

  try {
    const { data, error } = await supabase
      .from("DailyEmotions")
      .select(
        `
        EmotionId,
        Emotions (
          Name
        )
      `
      )
      .eq("PatientId", patientId)
      .order("Date", { ascending: false });

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy emotion cho patient này" });
    }

    const emotions = data.map((item) => item.Emotions.Name);
    res.status(200).json(emotions);
  } catch (error) {
    console.error("Lỗi khi lấy emotion:", error.message);
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
});
router.get("/patient-improvement/:patientId", async (req, res) => {
  const { patientId } = req.params;

  try {
    const { data, error } = await supabase
      .from("PatientImprovement")
      .select(
        `
        ImprovementId,
        ImprovementGoals (
          Name
        )
      `
      )
      .eq("PatientId", patientId)
      .order("Date", { ascending: false });

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy mục tiêu cải thiện cho patient này" });
    }

    const improvementGoals = data.map((item) => item.ImprovementGoals.Name);
    res.status(200).json(improvementGoals);
  } catch (error) {
    console.error("Lỗi khi lấy mục tiêu cải thiện:", error.message);
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
});
router.get("/patient-job-info/:patientId", async (req, res) => {
  const { patientId } = req.params;

  try {
    const { data, error } = await supabase
      .from("PatientProfiles")
      .select(
        `
        JobId,
        Jobs (
          JobTitle,
          IndustryId,
          Industries (
            IndustryName
          )
        )
      `
      )
      .eq("Id", patientId)
      .single();

    if (error) {
      throw error;
    }

    if (!data || !data.JobId) {
      return res.status(404).json({
        message: "Không tìm thấy thông tin công việc cho patient này",
      });
    }

    const { JobTitle, Industries } = data.Jobs;
    const IndustryName = Industries ? Industries.IndustryName : null;

    res.status(200).json({
      JobTitle,
      IndustryName,
    });
  } catch (error) {
    console.error("Lỗi khi lấy thông tin công việc:", error.message);
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
});

module.exports = router;
