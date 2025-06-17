const requireUser = require("../../../middlewares/requireUser");
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

// Add helper function for shuffling array
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// ✅ API lấy test questions theo TestId
router.get("/tests/:testId/questions", requireUser, async (req, res) => {
  // Lấy TestId từ params và các tham số phân trang từ query
  const { testId } = req.params;
  const pageIndex = parseInt(req.query.pageIndex) || 1;
  const pageSize = parseInt(req.query.pageSize) || 21;

  try {
    // ⚡ Truy vấn từ bảng TestQuestions và lấy kèm QuestionOptions
    const { data: questions, error } = await supabase
      .from("TestQuestions")
      .select(
        `
        Id,
        Order,
        Content,
        options:QuestionOptions (
          Id,
          Content,
          OptionValue
        )
      `
      )
      .eq("TestId", testId)
      .order("Order", { ascending: true });

    if (error) {
      console.error("Lỗi khi truy vấn Supabase:", error);
      throw error;
    }

    // Shuffle options for each question
    const questionsWithShuffledOptions = questions.map((question) => ({
      ...question,
      options: shuffleArray([...question.options]), // Create new array and shuffle
    }));

    const totalCount = questionsWithShuffledOptions.length;
    const paginated = questionsWithShuffledOptions.slice(
      (pageIndex - 1) * pageSize,
      pageIndex * pageSize
    );

    return res.json({
      testQuestions: {
        pageIndex,
        pageSize,
        totalCount,
        data: paginated,
      },
    });
  } catch (err) {
    console.error("Lỗi server:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});
// ✅ API để submit kết quả test
router.post("/tests/test-results", async (req, res) => {
  const { patientId, testId, selectedOptionIds } = req.body;

  try {
    // Lấy thông tin tất cả các option đã chọn
    const { data: options, error: optionError } = await supabase
      .from("QuestionOptions")
      .select("Id, OptionValue, TestQuestionId")
      .in("Id", selectedOptionIds);

    if (optionError) throw optionError;

    // Dựa trên TestId để truy vấn loại câu hỏi
    const { data: questions, error: questionError } = await supabase
      .from("TestQuestions")
      .select("Id, Content, TestId, Order")
      .eq("TestId", testId);

    if (questionError) throw questionError;

    // Gắn loại điểm cho từng câu dựa vào thứ tự câu hỏi
    const scoringMap = {};
    questions.forEach((q, index) => {
      const order = q.Order;
      if (order >= 1 && order <= 7) scoringMap[q.Id] = "Depression";
      else if (order >= 8 && order <= 14) scoringMap[q.Id] = "Anxiety";
      else if (order >= 15 && order <= 21) scoringMap[q.Id] = "Stress";
    });

    // Tính điểm theo loại
    const score = { Depression: 0, Anxiety: 0, Stress: 0 };

    options.forEach((opt) => {
      const type = scoringMap[opt.TestQuestionId];
      if (type && score[type] !== undefined) {
        score[type] += opt.OptionValue;
      }
    });

    // Tạo bản ghi TestResult trước
    const { data: testResult, error: insertError } = await supabase
      .from("TestResults")
      .insert([
        {
          PatientId: patientId,
          TestId: testId,
          TakenAt: new Date().toISOString(),
          DepressionScore: score.Depression,
          AnxietyScore: score.Anxiety,
          StressScore: score.Stress,
          // CreatedBy: req.user.email, // Assuming you have user info in request
          CreatedAt: new Date().toISOString(), // Current timestamp in ISO format
        },
      ])
      .select()
      .single();

    if (insertError) throw insertError;

    const testResultId = testResult.Id;

    // Tạo bản ghi trong QuestionOptionTestResult
    const inserts = selectedOptionIds.map((optionId) => ({
      SelectedOptionsId: optionId,
      TestResultsId: testResultId,
    }));

    const { error: linkError } = await supabase
      .from("QuestionOptionTestResult")
      .insert(inserts);

    if (linkError) throw linkError;

    console.log("Test result submitted successfully:", testResultId);
    return res.json({ testResultId });
  } catch (err) {
    console.error("Submit error:", err);
    return res.status(500).json({ error: "Submit failed" });
  }
});
// ✅ API để lấy kết quả test của bệnh nhân
router.get("/tests/test-result/:testResultId", async (req, res) => {
  const { testResultId } = req.params;

  try {
    const { data, error } = await supabase
      .from("TestResults")
      .select("DepressionScore, AnxietyScore, StressScore")
      .eq("Id", testResultId)
      .single();

    if (error) throw error;

    return res.json({
      testResult: {
        depressionScore: { value: data.DepressionScore },
        anxietyScore: { value: data.AnxietyScore },
        stressScore: { value: data.StressScore },
      },
    });
  } catch (err) {
    console.error("Get result error:", err);
    return res.status(500).json({ error: "Failed to get test result" });
  }
});

// Export module để sử dụng trong server.js
module.exports = router;
