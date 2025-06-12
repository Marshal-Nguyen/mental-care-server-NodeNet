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

// ✅ API lấy test questions theo TestId
router.get("/tests/:testId/questions", async (req, res) => {
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
      return res.status(500).json({ error: "Supabase query failed" });
    }

    const totalCount = questions.length;
    const paginated = questions.slice(
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

// Export module để sử dụng trong server.js
module.exports = router;
