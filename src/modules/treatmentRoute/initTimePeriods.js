const { createClient } = require("@supabase/supabase-js");
const { v4: uuidv4 } = require("uuid");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function initializeTimePeriods() {
  try {
    // Kiểm tra xem đã có time periods chưa
    const { data: existingPeriods, error } = await supabase
      .from("TimePeriods")
      .select("*", { count: "exact" });

    if (error) {
      throw error;
    }

    if (!existingPeriods || existingPeriods.length === 0) {
      // Tạo time periods mặc định
      const timePeriods = [
        "Sáng (6:00 - 12:00)",
        "Chiều (12:00 - 18:00)",
        "Tối (18:00 - 22:00)",
        "Đêm (22:00 - 6:00)",
      ];

      for (const period of timePeriods) {
        const { error: insertError } = await supabase
          .from("TimePeriods")
          .insert({
            Id: uuidv4(),
            PeriodName: period,
          });

        if (insertError) {
          throw insertError;
        }
      }

      console.log("✅ Đã khởi tạo time periods mặc định");
    } else {
      console.log("✅ Time periods đã tồn tại");
    }
  } catch (error) {
    console.error("❌ Lỗi khởi tạo time periods:", error);
  }
}

module.exports = {
  initializeTimePeriods,
};
