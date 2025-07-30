const { createClient } = require("@supabase/supabase-js");
const { v4: uuidv4 } = require("uuid");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

class TreatmentRouteService {
  // Tạo lộ trình điều trị mới
  async createTreatmentRoute(data) {
    const { patientId, doctorId, date, actions } = data;

    try {
      // Tạo treatment session trước
      const sessionId = uuidv4();
      const { data: treatmentSession, error: sessionError } = await supabase
        .from("TreatmentSessions")
        .insert({
          Id: sessionId,
          PatientId: patientId,
          DoctorId: doctorId,
          Date: new Date(date),
          Status: "pending",
          CreatedAt: new Date(),
          LastModified: new Date(),
        })
        .select()
        .single();

      if (sessionError) {
        throw sessionError;
      }

      // Tạo actions nếu có
      let createdActions = [];
      if (actions && actions.length > 0) {
        for (const action of actions) {
          const { data: createdAction, error: actionError } = await supabase
            .from("Actions")
            .insert({
              Id: uuidv4(),
              TreatmentSessionId: sessionId,
              TimePeriodsId: action.timePeriodsId,
              ActionName: action.actionName,
              Status: "not_started",
              CreatedAt: new Date(),
              LastModified: new Date(),
            })
            .select()
            .single();

          if (actionError) {
            throw actionError;
          }

          createdActions.push(createdAction);
        }
      }

      return {
        treatmentSession: treatmentSession,
        actions: createdActions,
      };
    } catch (error) {
      console.error("Error in createTreatmentRoute service:", error);
      throw error;
    }
  }

  // Lấy danh sách lộ trình điều trị
  async getTreatmentRoutes(filters = {}, pagination = { page: 1, limit: 10 }) {
    try {
      const { page, limit } = pagination;
      const offset = (page - 1) * limit;

      // Build query
      let query = supabase
        .from("TreatmentSessions")
        .select(
          `
          *,
          Patient:PatientProfiles(Id, FullName, Email),
          Doctor:DoctorProfiles(Id, FullName, Email),
          Actions(
            Id,
            ActionName,
            Status,
            TimePeriods:TimePeriodsId(Id, PeriodName)
          )
        `
        )
        .order("CreatedAt", { ascending: false });

      // Apply filters
      if (filters.patientId) {
        query = query.eq("PatientId", filters.patientId);
      }
      if (filters.doctorId) {
        query = query.eq("DoctorId", filters.doctorId);
      }
      if (filters.status) {
        query = query.eq("Status", filters.status);
      }
      if (filters.dateFrom) {
        query = query.gte("Date", filters.dateFrom);
      }
      if (filters.dateTo) {
        query = query.lte("Date", filters.dateTo);
      }

      // Apply pagination
      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) {
        throw error;
      }

      // Get total count for pagination
      const { count: totalCount, error: countError } = await supabase
        .from("TreatmentSessions")
        .select("*", { count: "exact", head: true });

      if (countError) {
        throw countError;
      }

      return {
        data: data || [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalCount || 0,
          totalPages: Math.ceil((totalCount || 0) / limit),
        },
      };
    } catch (error) {
      console.error("Error in getTreatmentRoutes service:", error);
      throw error;
    }
  }

  // Lấy chi tiết lộ trình điều trị theo ID hoặc patientId
  async getTreatmentRouteById(id, patientId = null) {
    try {
      let query = supabase.from("TreatmentSessions").select(`
          *,
          Patient:PatientProfiles(Id, FullName, Email),
          Doctor:DoctorProfiles(Id, FullName, Email),
          Actions(
            Id,
            ActionName,
            Status,
            TimePeriods:TimePeriodsId(Id, PeriodName)
          )
        `);

      // Nếu có patientId thì lấy theo patientId, ngược lại lấy theo id
      if (patientId) {
        query = query.eq("PatientId", patientId);

        // Lấy multiple records và sort theo thời gian mới nhất
        const { data, error } = await query.order("CreatedAt", {
          ascending: false,
        });

        if (error) {
          throw error;
        }

        return data || []; // Trả về array
      } else {
        // Lấy theo ID (single record)
        const { data, error } = await query.eq("Id", id).single();

        if (error) {
          if (error.code === "PGRST116") {
            return null;
          }
          throw error;
        }

        return data; // Trả về object
      }
    } catch (error) {
      console.error("Error in getTreatmentRouteById service:", error);
      throw error;
    }
  }

  // Cập nhật lộ trình điều trị (đè lên hoàn toàn)
  async updateTreatmentRoute(id, updateData) {
    try {
      // Validate UUID format
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

      if (!uuidRegex.test(id)) {
        throw new Error(`Invalid UUID format for id: ${id}`);
      }

      console.log("Updating treatment route with ID:", id);
      console.log("Update data:", JSON.stringify(updateData, null, 2));

      // Kiểm tra TreatmentSession có tồn tại không
      const { data: existingSession, error: checkError } = await supabase
        .from("TreatmentSessions")
        .select("Id")
        .eq("Id", id)
        .single();

      if (checkError) {
        if (checkError.code === "PGRST116") {
          return null; // Không tìm thấy
        }
        throw checkError;
      }

      // XÓA TẤT CẢ ACTIONS CŨ TRƯỚC
      const { error: deleteActionsError } = await supabase
        .from("Actions")
        .delete()
        .eq("TreatmentSessionId", id);

      if (deleteActionsError) {
        throw deleteActionsError;
      }

      // CẬP NHẬT TREATMENT SESSION (đè lên hoàn toàn)
      const updateFields = {
        PatientId: updateData.patientId, // Có thể thay đổi patient
        DoctorId: updateData.doctorId,
        Date: updateData.date ? new Date(updateData.date) : new Date(),
        Status: updateData.status || "pending",
        LastModified: new Date(),
      };

      const { data: updatedSession, error: sessionError } = await supabase
        .from("TreatmentSessions")
        .update(updateFields)
        .eq("Id", id)
        .select("Id")
        .single();

      if (sessionError) {
        throw sessionError;
      }

      // TẠO LẠI TẤT CẢ ACTIONS MỚI
      let newActions = [];
      if (updateData.actions && updateData.actions.length > 0) {
        for (const action of updateData.actions) {
          // Validate action UUIDs
          if (action.timePeriodsId && !uuidRegex.test(action.timePeriodsId)) {
            throw new Error(
              `Invalid UUID format for action.timePeriodsId: ${action.timePeriodsId}`
            );
          }

          const { data: created, error: createError } = await supabase
            .from("Actions")
            .insert({
              Id: uuidv4(),
              TreatmentSessionId: id,
              TimePeriodsId: action.timePeriodsId,
              ActionName: action.actionName,
              Status: action.status || "not_started",
              CreatedAt: new Date(),
              LastModified: new Date(),
            })
            .select()
            .single();

          if (createError) {
            throw createError;
          }
          newActions.push(created);
        }
      }

      // Lấy dữ liệu đầy đủ sau khi cập nhật
      const { data: finalData, error: finalError } = await supabase
        .from("TreatmentSessions")
        .select(
          `
          *,
          Patient:PatientProfiles(Id, FullName, Email),
          Doctor:DoctorProfiles(Id, FullName, Email),
          Actions(
            Id,
            ActionName,
            Status,
            TimePeriods:TimePeriodsId(Id, PeriodName)
          )
        `
        )
        .eq("Id", id)
        .single();

      if (finalError) {
        throw finalError;
      }

      return finalData;
    } catch (error) {
      console.error("Error in updateTreatmentRoute service:", error);
      throw error;
    }
  }

  // Xóa lộ trình điều trị
  async deleteTreatmentRoute(id) {
    try {
      // Kiểm tra xem treatment session có tồn tại không
      const { data: existingSession, error: checkError } = await supabase
        .from("TreatmentSessions")
        .select("Id")
        .eq("Id", id)
        .single();

      if (checkError) {
        if (checkError.code === "PGRST116") {
          return null; // Không tìm thấy
        }
        throw checkError;
      }

      // Xóa các Actions liên quan trước
      const { error: actionsError } = await supabase
        .from("Actions")
        .delete()
        .eq("TreatmentSessionId", id);

      if (actionsError) {
        throw actionsError;
      }

      // Xóa TreatmentSession
      const { data, error: sessionError } = await supabase
        .from("TreatmentSessions")
        .delete()
        .eq("Id", id)
        .select();

      if (sessionError) {
        throw sessionError;
      }

      return data && data.length > 0;
    } catch (error) {
      console.error("Error in deleteTreatmentRoute service:", error);
      throw error;
    }
  }

  // Cập nhật trạng thái action
  async updateActionStatus(actionId, status) {
    try {
      // Cập nhật trạng thái action
      const { data: updatedAction, error } = await supabase
        .from("Actions")
        .update({
          Status: status,
          LastModified: new Date(),
        })
        .eq("Id", actionId)
        .select(
          `
          *,
          TimePeriods:TimePeriodsId(Id, PeriodName),
          TreatmentSession:TreatmentSessionId(
            Id,
            Date,
            Status,
            Patient:PatientProfiles(Id, FullName),
            Doctor:DoctorProfiles(Id, FullName)
          )
        `
        )
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          return null; // Không tìm thấy
        }
        throw error;
      }

      return updatedAction;
    } catch (error) {
      console.error("Error in updateActionStatus service:", error);
      throw error;
    }
  }

  // Lấy danh sách time periods
  async getTimePeriods() {
    try {
      const { data, error } = await supabase
        .from("TimePeriods")
        .select("*")
        .order("PeriodName", { ascending: true });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error("Error in getTimePeriods service:", error);
      throw error;
    }
  }

  // Tự động xóa các treatment đã quá 5 ngày
  async autoDeleteTreatment() {
    try {
      // Tính ngày 5 ngày trước
      const fiveDaysAgo = new Date();
      fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

      console.log("Checking treatments older than:", fiveDaysAgo);

      // Tìm các TreatmentSessions quá 5 ngày
      const { data: oldSessions, error: findError } = await supabase
        .from("TreatmentSessions")
        .select("Id, Date, PatientId, DoctorId")
        .lt("Date", fiveDaysAgo.toISOString());

      if (findError) {
        throw findError;
      }

      if (!oldSessions || oldSessions.length === 0) {
        return {
          message: "Không có treatment nào cần xóa",
          deletedCount: 0,
          deletedSessions: [],
        };
      }

      console.log(`Found ${oldSessions.length} old sessions to delete`);

      const deletedSessions = [];
      let deletedCount = 0;

      // Xóa từng session và các actions liên quan
      for (const session of oldSessions) {
        try {
          // Xóa actions trước
          const { error: actionsError } = await supabase
            .from("Actions")
            .delete()
            .eq("TreatmentSessionId", session.Id);

          if (actionsError) {
            console.error(
              `Error deleting actions for session ${session.Id}:`,
              actionsError
            );
            continue;
          }

          // Xóa treatment session
          const { error: sessionError } = await supabase
            .from("TreatmentSessions")
            .delete()
            .eq("Id", session.Id);

          if (sessionError) {
            console.error(
              `Error deleting session ${session.Id}:`,
              sessionError
            );
            continue;
          }

          deletedSessions.push(session);
          deletedCount++;
          console.log(`Deleted session: ${session.Id}`);
        } catch (sessionDeleteError) {
          console.error(
            `Error processing session ${session.Id}:`,
            sessionDeleteError
          );
        }
      }

      return {
        message: `Đã xóa ${deletedCount} treatment sessions quá 5 ngày`,
        deletedCount,
        deletedSessions,
        totalFound: oldSessions.length,
      };
    } catch (error) {
      console.error("Error in autoDeleteTreatment service:", error);
      throw error;
    }
  }

  // Tính phần trăm action hoàn thành theo ngày
  async getActionCompletionStats(patientId = null, startDate = null, endDate = null) {
    try {
      // Thiết lập khoảng thời gian mặc định (7 ngày gần đây)
      const end = endDate ? new Date(endDate) : new Date();
      const start = startDate ? new Date(startDate) : new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);

      console.log("Getting stats from:", start, "to:", end);

      // Query để lấy treatment sessions trong khoảng thời gian
      let query = supabase
        .from("TreatmentSessions")
        .select(`
          Id,
          Date,
          PatientId,
          Actions(Id, Status)
        `)
        .gte("Date", start.toISOString())
        .lte("Date", end.toISOString())
        .order("Date", { ascending: true });

      // Filter theo patientId nếu có
      if (patientId) {
        query = query.eq("PatientId", patientId);
      }

      const { data: sessions, error } = await query;

      if (error) {
        throw error;
      }

      // Xử lý dữ liệu để tính phần trăm
      const statsMap = new Map();

      sessions.forEach(session => {
        const sessionDate = new Date(session.Date);
        const dateKey = sessionDate.toISOString().split('T')[0]; // YYYY-MM-DD format
        
        // Tính phần trăm hoàn thành cho session này
        const totalActions = session.Actions.length;
        const completedActions = session.Actions.filter(action => 
          action.Status === 'completed' || action.Status === 'complete'
        ).length;
        
        const percentage = totalActions > 0 ? Math.round((completedActions / totalActions) * 100) : 0;

        // Lấy tên ngày (Mon, Tue, Wed, ...)
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const dayName = dayNames[sessionDate.getDay()];

        // Lưu vào map (nếu có nhiều session cùng ngày thì lấy trung bình)
        if (statsMap.has(dateKey)) {
          const existing = statsMap.get(dateKey);
          existing.sessions.push({
            sessionId: session.Id,
            percentage: percentage
          });
          // Tính lại phần trăm trung bình
          const avgPercentage = Math.round(
            existing.sessions.reduce((sum, s) => sum + s.percentage, 0) / existing.sessions.length
          );
          existing.percentage = avgPercentage;
        } else {
          statsMap.set(dateKey, {
            day: dayName,
            fullDate: dateKey,
            percentage: percentage,
            sessionId: session.Id,
            sessions: [{
              sessionId: session.Id,
              percentage: percentage
            }]
          });
        }
      });

      // Chuyển Map thành Array và sắp xếp theo ngày
      const bars = Array.from(statsMap.values())
        .map(item => ({
          day: item.day,
          fullDate: item.fullDate,
          percentage: item.percentage,
          sessionId: item.sessionId
        }))
        .sort((a, b) => new Date(a.fullDate) - new Date(b.fullDate));

      return {
        bars: bars,
        period: {
          startDate: start.toISOString().split('T')[0],
          endDate: end.toISOString().split('T')[0]
        },
        totalDays: bars.length
      };

    } catch (error) {
      console.error("Error in getActionCompletionStats service:", error);
      throw error;
    }
  }
}

module.exports = new TreatmentRouteService();
