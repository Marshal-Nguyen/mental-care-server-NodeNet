const requireUser = require("../../../middlewares/requireUser");
const { createClient } = require("@supabase/supabase-js");
const express = require("express");
const router = express.Router();
const axios = require("axios");

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

// Helper: shuffle array
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// Helper: calculate age
function calculateAge(birthDate) {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

// Helper: severity level
function determineSeverity(totalScore) {
  if (totalScore >= 30) return "Severe";
  if (totalScore >= 15) return "Moderate";
  return "Mild";
}

// Helper: Gemini prompt builder
function buildGeminiPrompt(
  depressionScore,
  anxietyScore,
  stressScore,
  profile,
  lifestyle
) {
  const improvementGoalsSection =
    lifestyle.ImprovementGoals.length > 0
      ? `- **Mục tiêu hiện tại**: ${lifestyle.ImprovementGoals.join(", ")}`
      : "";

  const recentEmotionsSection =
    lifestyle.EmotionSelections.length > 0
      ? `- **Cảm xúc gần đây**: ${lifestyle.EmotionSelections.join(", ")}`
      : "";

  return `
    ## 🌿 Gợi ý cải thiện tâm lý cho ${profile.FullName}

    ### 👤 Thông tin người dùng
    - **Họ tên**: ${profile.FullName}  
    - **Giới tính**: ${profile.Gender}  
    - **Ngày sinh**: ${profile.BirthDate}  
    - **Nghề nghiệp**: ${profile.JobTitle}  
    - **Ngành nghề**: ${profile.IndustryName}  
    - **Tính cách nổi bật**: ${profile.PersonalityTraits}  
    - **Tiền sử dị ứng**: ${profile.Allergies || "Không rõ"}

    ### 📊 Kết quả DASS-21
    - **Trầm cảm**: ${depressionScore}  
    - **Lo âu**: ${anxietyScore}  
    - **Căng thẳng**: ${stressScore}

    ### 📖 Đánh giá nhanh
    Viết một đoạn chào hỏi thân thiện, ngắn gọn. Sau đó, diễn giải kết quả DASS-21 một cách đơn giản, tập trung vào việc đây là trạng thái **tạm thời** và có thể cải thiện.  
    Giọng văn **nhẹ nhàng, truyền cảm hứng, không phán xét, không chẩn đoán.**
    Hãy cá nhân hóa lời khuyên dựa trên thông tin người dùng, đặc biệt chú ý đến nghề nghiệp, tính cách, tuổi, ngày tháng năm sinh và mục tiêu cải thiện của người dùng.

    ---

    ### 🧠 Cảm xúc của bạn
    Mô tả rất ngắn gọn rằng người đọc có thể đang trải qua các cảm xúc như **mệt mỏi, nhạy cảm hoặc không rõ ràng**, và nhấn mạnh rằng đây là điều **hoàn toàn bình thường**.  
    Tránh phân tích sâu hay suy đoán cụ thể. Giọng văn **trung lập, gợi mở.**  

    ${improvementGoalsSection}
    ${recentEmotionsSection}

    ---

    ### 🎯 Gợi ý cho bạn
    Đưa ra **3 hoạt động nhẹ nhàng, cá nhân hóa theo kết quả DASS-21 và đặc điểm người dùng**, mỗi hoạt động gồm:
    - **Tiêu đề gợi cảm xúc tích cực**.
    - **Mô tả sâu hơn** (3–4 câu) về lợi ích của hoạt động, lý giải vì sao nó phù hợp với người có mức độ trầm cảm/lo âu/căng thẳng như vậy. Có thể tham chiếu đến nghề nghiệp, tính cách hoặc độ tuổi nếu phù hợp.
    - **Danh sách 2 hành động cụ thể, dễ thử** mà người đọc có thể bắt đầu ngay từ hôm nay, liên quan tới profile người dùng.
    - **Một trích dẫn hoặc dẫn chứng khoa học** có thật, trình bày ngắn gọn, gợi sự tin cậy và dễ hiểu. Ví dụ: “Theo nghiên cứu của Đại học Stanford năm 2019, người dành 30 phút mỗi ngày trong thiên nhiên có mức độ lo âu thấp hơn 21%”.

    Lưu ý:
    - Văn phong **ấm áp – gần gũi – mang tính nâng đỡ**, không mang giọng giảng giải.
    - **Kết nối gợi ý với kết quả DASS-21 và persona** (ví dụ: người hướng nội, công việc áp lực cao, học vấn cao sẽ thích hợp với thiền, âm nhạc, ghi chép...).

    ---

    ### 💌 Lời chúc
    Kết thúc bằng một lời nhắn **tích cực và mạnh mẽ**, nhấn mạnh rằng người đọc **xứng đáng được chữa lành và hạnh phúc**, và **không hề đơn độc**.  
    Luôn kết bằng chữ ký:  
    **— Emo 🌿**
  `;
}

// GET: lấy test questions theo TestId (option được xáo trộn)
router.get("/tests/:testId/questions", requireUser, async (req, res) => {
  const { testId } = req.params;
  const pageIndex = parseInt(req.query.pageIndex) || 1;
  const pageSize = parseInt(req.query.pageSize) || 21;

  try {
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
      return res.status(500).json({ error: "Lỗi khi lấy câu hỏi" });
    }

    // Shuffle options for each question
    const questionsWithShuffledOptions = questions.map((question, idx) => ({
      ...question,
      questionNumber: idx + 1,
      options: shuffleArray([...question.options]),
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

// POST: submit kết quả test
// POST: submit kết quả test
router.post("/tests/test-results", requireUser, async (req, res) => {
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

    // Gắn loại điểm cho từng câu dựa vào thứ tự câu hỏi (giống DASS-21)
    const scoringMap = {};
    questions.forEach((q) => {
      const order = q.Order;
      if ([3, 5, 10, 13, 16, 17, 21].includes(order))
        scoringMap[q.Id] = "Depression";
      else if ([2, 4, 7, 9, 15, 19, 20].includes(order))
        scoringMap[q.Id] = "Anxiety";
      else if ([1, 6, 8, 11, 12, 14, 18].includes(order))
        scoringMap[q.Id] = "Stress";
    });

    // Tính điểm theo loại
    const score = { Depression: 0, Anxiety: 0, Stress: 0 };
    options.forEach((opt) => {
      const type = scoringMap[opt.TestQuestionId];
      if (type && score[type] !== undefined) {
        score[type] += opt.OptionValue;
      }
    });

    // Lấy thông tin bệnh nhân với xử lý lỗi
    let profile = {};
    let patientName = "Unknown";
    let birthDate = null;
    let patientAge = 0;

    try {
      const profileResponse = await axios.get(
        `https://mental-care-server-nodenet.onrender.com/api/patient-profiles/${patientId}`
      );
      profile = profileResponse.data || {};
      patientName = profile.FullName || "Unknown";
      birthDate = profile.BirthDate || null;
      patientAge = birthDate ? calculateAge(birthDate) : 0;
    } catch (error) {
      console.warn("Failed to fetch patient profile:", error.message);
    }

    // Lấy JobTitle và IndustryName với xử lý lỗi
    let jobTitle = "Unknown";
    let industryName = "Unknown";

    try {
      const jobResponse = await axios.get(
        `https://mental-care-server-nodenet.onrender.com/api/patient-job-info/${patientId}`
      );
      const jobInfo = jobResponse.data || {};
      jobTitle = jobInfo.JobTitle || "Unknown";
      industryName = jobInfo.IndustryName || "Unknown";
    } catch (error) {
      console.warn("Failed to fetch patient job info:", error.message);
    }

    // Lấy ImprovementGoals với xử lý lỗi
    let improvementGoals = [];

    try {
      const improvementResponse = await axios.get(
        `https://mental-care-server-nodenet.onrender.com/api/patient-improvement/${patientId}`
      );
      improvementGoals = Array.isArray(improvementResponse.data)
        ? improvementResponse.data
        : [];
    } catch (error) {
      console.warn("Failed to fetch patient improvement goals:", error.message);
    }

    // Lấy EmotionSelections với xử lý lỗi
    let emotionSelections = [];

    try {
      const emotionResponse = await axios.get(
        `https://mental-care-server-nodenet.onrender.com/api/patient-emotions/${patientId}`
      );
      emotionSelections = Array.isArray(emotionResponse.data)
        ? emotionResponse.data
        : [];
    } catch (error) {
      console.warn("Failed to fetch patient emotions:", error.message);
    }

    // Tính tổng điểm để xác định SeverityLevel
    const totalScore = score.Depression + score.Anxiety + score.Stress;
    const severityLevel = determineSeverity(totalScore);

    // Xây dựng payload cho API Gemini với dữ liệu an toàn
    const geminiPayload = {
      contents: [
        {
          role: "user",
          parts: [
            {
              text: buildGeminiPrompt(
                score.Depression,
                score.Anxiety,
                score.Stress,
                {
                  FullName: patientName,
                  Gender: profile.Gender || "Unknown",
                  BirthDate: birthDate || "Unknown",
                  JobTitle: jobTitle,
                  EducationLevel: profile.EducationLevel || "Unknown",
                  IndustryName: industryName,
                  PersonalityTraits: profile.PersonalityTraits || "Unknown",
                  Allergies: profile.Allergies || "Không rõ",
                },
                {
                  ImprovementGoals: improvementGoals,
                  EmotionSelections: emotionSelections,
                }
              ),
            },
          ],
        },
      ],
      generationConfig: {
        responseSchema: {
          type: "object",
          properties: {
            overview: { type: "string" },
            emotionAnalysis: { type: "string" },
            personalizedSuggestions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  tips: { type: "array", items: { type: "string" } },
                  reference: { type: "string" },
                },
                required: ["title", "description", "tips", "reference"],
              },
            },
            closing: { type: "string" },
          },
          required: [
            "overview",
            "emotionAnalysis",
            "personalizedSuggestions",
            "closing",
          ],
          propertyOrdering: [
            "overview",
            "emotionAnalysis",
            "personalizedSuggestions",
            "closing",
          ],
        },
      },
    };

    // Gọi API Gemini với xử lý lỗi
    let recommendation = { raw: "Không thể tạo gợi ý do lỗi hệ thống" };

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite-preview-06-17:generateContent?key=${apiKey}`;

      const geminiResponse = await axios.post(url, geminiPayload, {
        headers: { "Content-Type": "application/json" },
        timeout: 30000, // 30 seconds timeout
      });

      const responseText =
        geminiResponse.data.candidates[0].content.parts[0].text;

      try {
        recommendation = JSON.parse(responseText);
      } catch (parseError) {
        console.warn("Gemini response is not valid JSON, saving as raw text.");
        recommendation = { raw: responseText };
      }
    } catch (geminiError) {
      console.error("Failed to call Gemini API:", geminiError.message);
      recommendation = {
        raw: "Tạm thời không thể tạo gợi ý cá nhân hóa. Vui lòng thử lại sau.",
      };
    }

    // Tạo bản ghi TestResult
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
          SeverityLevel: severityLevel,
          RecommendationJson: JSON.stringify(recommendation),
          CreatedAt: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (insertError || !testResult || !testResult.Id) {
      console.error("Insert TestResult error:", insertError);
      return res.status(500).json({ error: "Không lấy được testResultId" });
    }

    const testResultId = testResult.Id;

    // Tạo bản ghi trong QuestionOptionTestResult
    const inserts = selectedOptionIds.map((optionId) => ({
      SelectedOptionsId: optionId,
      TestResultsId: testResultId,
    }));

    const { error: linkError } = await supabase
      .from("QuestionOptionTestResult")
      .insert(inserts);

    if (linkError) {
      console.error("Insert QuestionOptionTestResult error:", linkError);
      return res.status(500).json({ error: "Lỗi khi lưu lựa chọn câu hỏi" });
    }

    // Trả về response theo định dạng yêu cầu
    return res.json({
      testResult: {
        id: testResultId,
        testId: testResult.TestId,
        patientId: testResult.PatientId,
        takenAt: testResult.TakenAt,
        severityLevel: testResult.SeverityLevel,
        depressionScore: { value: testResult.DepressionScore },
        anxietyScore: { value: testResult.AnxietyScore },
        stressScore: { value: testResult.StressScore },
        recommendation: recommendation,
        patientName: patientName,
        patientAge: patientAge,
      },
    });
  } catch (err) {
    console.error("Submit error:", err);
    return res.status(500).json({ error: "Submit failed" });
  }
});

// GET: lấy kết quả test của bệnh nhân
router.get(
  "/tests/test-result/:testResultId",
  requireUser,
  async (req, res) => {
    const { testResultId } = req.params;

    try {
      const { data, error } = await supabase
        .from("TestResults")
        .select(
          "Id, TestId, PatientId, TakenAt, DepressionScore, AnxietyScore, StressScore, SeverityLevel, RecommendationJson"
        )
        .eq("Id", testResultId)
        .single();

      if (error || !data) {
        console.error("Get TestResult error:", error);
        return res.status(404).json({ error: "Không tìm thấy kết quả test" });
      }

      // Lấy thông tin bệnh nhân
      const profileResponse = await axios.get(
        `https://mental-care-server-nodenet.onrender.com/api/patient-profiles/${data.PatientId}`
      );
      const profile = profileResponse.data;
      const patientName = profile.FullName;
      const birthDate = profile.BirthDate;
      const patientAge = calculateAge(birthDate);

      let recommendation;
      try {
        recommendation = JSON.parse(data.RecommendationJson);
      } catch (e) {
        recommendation = { raw: data.RecommendationJson };
      }

      return res.json({
        testResult: {
          id: data.Id,
          testId: data.TestId,
          patientId: data.PatientId,
          takenAt: data.TakenAt,
          severityLevel: data.SeverityLevel,
          depressionScore: { value: data.DepressionScore },
          anxietyScore: { value: data.AnxietyScore },
          stressScore: { value: data.StressScore },
          recommendation: recommendation,
          patientName: patientName,
          patientAge: patientAge,
        },
      });
    } catch (err) {
      console.error("Get result error:", err);
      return res.status(500).json({ error: "Failed to get test result" });
    }
  }
);

// Export module
module.exports = router;