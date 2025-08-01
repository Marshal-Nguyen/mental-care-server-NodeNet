const express = require("express");
const { createClient } = require("@supabase/supabase-js");
const { GoogleGenAI } = require("@google/genai");
const router = express.Router();

require("dotenv").config();

// Khởi tạo Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Khởi tạo GoogleGenAI
const ai = new GoogleGenAI({
  vertexai: true,
  project: process.env.GOOGLE_CLOUD_PROJECT || "379308644495",
  location: "us-central1",
});
const model =
  "projects/379308644495/locations/us-central1/endpoints/7375379963098169344";

// Cấu hình generation
const generationConfig = {
  maxOutputTokens: 8192,
  temperature: 1,
  topP: 0.95,
  safetySettings: [
    { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "OFF" },
    { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "OFF" },
    { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "OFF" },
    { category: "HARM_CATEGORY_HARASSMENT", threshold: "OFF" },
  ],
};

// Middleware xác thực
const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);
  if (error || !user) {
    console.error("Auth error:", error);
    return res.status(401).json({ error: "Invalid token" });
  }
  console.log("User from token:", user);

  const { data: patient } = await supabase
    .from("PatientProfiles")
    .select("Id")
    .eq("UserId", user.id) // Sử dụng user.id thay vì user.email
    .single();
  if (!patient) {
    console.log("No patient found for UserId:", user.id);
    return res.status(404).json({ error: "Patient not found" });
  }

  req.patientId = patient.Id;
  next();
};

// Hàm xử lý chat với Emo
async function chatWithEmo(prompt) {
  const req = {
    model: model,
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }],
      },
    ],
    config: generationConfig,
  };

  const streamingResp = await ai.models.generateContentStream(req);
  let fullResponse = "";

  for await (const chunk of streamingResp) {
    if (chunk.text) {
      fullResponse += chunk.text;
    }
  }

  return fullResponse;
}

// API: Lấy tin nhắn của phiên
router.get("/sessions/:sessionId/messages", authenticate, async (req, res) => {
  const { sessionId } = req.params;
  const pageIndex = parseInt(req.query.PageIndex) || 1;
  const pageSize = parseInt(req.query.PageSize) || 20;
  const start = (pageIndex - 1) * pageSize;
  const end = start + pageSize - 1;

  const { data, error } = await supabase
    .from("ChatMessages")
    .select("*")
    .eq("SessionId", sessionId)
    .order("CreatedDate", { ascending: true })
    .range(start, end);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ data, pageIndex, pageSize, totalCount: data.length });
});

// API: Đánh dấu tin nhắn đã đọc
router.put(
  "/sessions/:sessionId/messages/read",
  authenticate,
  async (req, res) => {
    const { sessionId } = req.params;
    const { error } = await supabase
      .from("ChatMessages")
      .update({ IsRead: true })
      .eq("SessionId", sessionId)
      .eq("IsRead", false)
      .eq("SessionId", sessionId, { foreignTable: "ChatSessions" })
      .eq("PatientId", req.patientId, { foreignTable: "ChatSessions" });
    if (error) return res.status(500).json({ error: error.message });
    res.status(204).send();
  }
);

router.post("/messages", authenticate, async (req, res) => {
  const { userMessage, sessionId } = req.body;
  if (!userMessage || !sessionId)
    return res
      .status(400)
      .json({ error: "userMessage and sessionId are required" });

  function calculateAge(birthDate) {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birth.getDate())
    ) {
      age--;
    }
    return age <= 0 ? "Không rõ hoặc dưới 1 tuổi" : age;
  }

  try {
    // 1. Lưu tin nhắn người dùng
    const { error: insertUserError } = await supabase
      .from("ChatMessages")
      .insert({
        SessionId: sessionId,
        SenderIsEmo: false,
        Content: userMessage,
      });
    if (insertUserError) throw insertUserError;
    console.log("[LOG] ✅ Tin nhắn người dùng đã được lưu.");

    // 2. Lấy lịch sử chat
    const { data: chatHistoryData } = await supabase
      .from("ChatMessages")
      .select("Content, SenderIsEmo")
      .eq("SessionId", sessionId)
      .order("CreatedDate", { ascending: true })
      .limit(5);
    const chatHistory = chatHistoryData || [];
    console.log("[LOG] ✅ Lịch sử chat:", chatHistory);

    const isFirstMessage = chatHistory.length === 0;

    // 3. Hồ sơ bệnh nhân
    const { data: patientProfile } = await supabase
      .from("PatientProfiles")
      .select("FullName, Gender, BirthDate, PersonalityTraits, JobId")
      .eq("Id", req.patientId)
      .single();
    console.log("[LOG] ✅ Thông tin hồ sơ bệnh nhân:", patientProfile);

    const age = patientProfile.BirthDate
      ? calculateAge(patientProfile.BirthDate)
      : "Không rõ";

    // 4. Nghề nghiệp
    const { data: jobData } = await supabase
      .from("Jobs")
      .select("JobTitle, Industries (IndustryName)")
      .eq("Id", patientProfile.JobId)
      .single();
    console.log("[LOG] ✅ Nghề nghiệp:", jobData);

    const jobTitle = jobData?.JobTitle || "Không rõ";
    const industryName = jobData?.Industries?.IndustryName || "Không rõ";
    const personalityTraits = patientProfile.PersonalityTraits || "Không rõ";

    // 5. Kết quả DASS
    const { data: latestTestResult } = await supabase
      .from("TestResults")
      .select("DepressionScore, AnxietyScore, StressScore, SeverityLevel")
      .eq("PatientId", req.patientId)
      .order("TakenAt", { ascending: false })
      .limit(1)
      .single();
    console.log("[LOG] ✅ Kết quả test gần đây:", latestTestResult);

    // 6. Cảm xúc gần đây
    const { data: emotionData } = await supabase
      .from("DailyEmotions")
      .select("Emotions (Name)")
      .eq("PatientId", req.patientId)
      .order("Date", { ascending: false })
      .limit(5);
    const emotionSelections =
      emotionData?.map((e) => e.Emotions?.Name).filter(Boolean) || [];
    console.log("[LOG] ✅ Cảm xúc gần đây:", emotionSelections);

    // 7. Nhận diện user đang hỏi về bản thân?
    const selfInfoPatterns = [
      "biết gì về tớ",
      "tôi tên gì",
      "tớ tên là gì",
      "tớ là ai",
      "tớ làm nghề gì",
      "tính cách của tôi",
      "tôi là người thế nào",
      "cậu có thông tin gì của tớ",
      "cậu có biết gì về tôi",
    ];

    const isAskingAboutSelf = selfInfoPatterns.some((pattern) =>
      userMessage.toLowerCase().includes(pattern)
    );

    // 8. Tạo prompt
    let fullPrompt = `
# SYSTEM
Bạn là Emo – người bạn đồng hành, nhẹ nhàng và tinh tế.
Phản hồi theo phong cách chữa lành (healing).
Hướng dẫn:
- Ưu tiên phản hồi theo ngữ cảnh userMessage và chatHistory.
- Cá nhân hóa nếu có thể bằng thông tin người dùng: họ tên, tuổi, nghề nghiệp, tính cách, cảm xúc gần đây.
- Nếu là tin nhắn đầu tiên, gửi lời chào nhẹ nhàng kèm tên người dùng.
- Tránh lặp lại các câu mẫu như "Tớ luôn ở đây lắng nghe".
- Nếu người dùng hỏi trực tiếp hoặc gián tiếp về bản thân họ, ví dụ: "tớ tên là gì", "tớ làm nghề gì", "cậu có biết gì về tớ không", "cậu có thông tin gì về tớ không", v.v... thì hãy phản hồi bằng cách trích dẫn lại các thông tin đã có trong USER INFO như: họ tên, tuổi, nghề nghiệp, tính cách, cảm xúc gần đây, điểm test gần nhất.
- Không được trả lời vòng vo, không hỏi lại.
- Văn phong tự nhiên, không máy móc, không lặp lại những câu mẫu nếu không cần thiết.


# HISTORY
${JSON.stringify(chatHistory)}

# USER INFO
- Họ tên: ${patientProfile.FullName || "Không rõ"}
- Tuổi: ${age}
- Nghề nghiệp: ${jobTitle}
- Ngành nghề: ${industryName}
- Tính cách: ${personalityTraits}
- Cảm xúc gần đây: ${emotionSelections.join(", ") || "Không rõ"}
- DASS-21 (gần nhất): ${latestTestResult?.SeverityLevel || "Không rõ"}

# MESSAGE
"${userMessage.trim()}"
`;

    // 9. Gợi ý hành động nếu có
    if (isFirstMessage) {
      fullPrompt += `
# ACTION
Gửi lời chào thân thiện đến ${patientProfile.FullName || "bạn"}.
Ví dụ: "Chào ${patientProfile.FullName || "bạn"}, tớ là Emo, rất vui được gặp cậu hôm nay!"`;
    }

    if (isAskingAboutSelf) {
      fullPrompt += `
# ACTION
Người dùng đang hỏi về bản thân. Hãy phản hồi bằng cách trích dẫn cụ thể các thông tin đã biết ở phần USER INFO.
Không hỏi lại. Không né tránh.`;
    }

    console.log("[LOG] ✅ Prompt gửi cho AI:", fullPrompt);

    // 10. Gửi tới AI
    const aiResponse = await chatWithEmo(fullPrompt);
    console.log("[LOG] ✅ Phản hồi từ AI:", aiResponse);

    // 11. Lưu phản hồi AI
    const { data: emoMessageData, error: emoError } = await supabase
      .from("ChatMessages")
      .insert({
        SessionId: sessionId,
        SenderIsEmo: true,
        Content: aiResponse,
      })
      .select()
      .single();
    if (emoError) throw emoError;

    console.log("[LOG] ✅ Tin nhắn của AI đã được lưu.");
    res.json([emoMessageData]);
  } catch (error) {
    console.error("[❌ ERROR] Trong quá trình xử lý chat:", error);
    res
      .status(500)
      .json({ error: "Failed to process message", details: error.message });
  }
});



module.exports = router;
