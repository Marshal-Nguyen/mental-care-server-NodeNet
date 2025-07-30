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

  // Lấy chi tiết lộ trình điều trị theo ID
  async getTreatmentRouteById(id) {
    try {
      const { data, error } = await supabase
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

      if (error) {
        if (error.code === "PGRST116") {
          // No rows returned
          return null;
        }
        throw error;
      }

      return data;
    } catch (error) {
      console.error("Error in getTreatmentRouteById service:", error);
      throw error;
    }
  }

  // Cập nhật lộ trình điều trị
  async updateTreatmentRoute(id, updateData) {
    try {
      // Cập nhật TreatmentSession
      const { data: updatedSession, error: sessionError } = await supabase
        .from("TreatmentSessions")
        .update({
          // DoctorId: updateData.doctorId,
          Date: updateData.date ? new Date(updateData.date) : undefined,
          Status: updateData.status,
          LastModified: new Date(),
        })
        .eq("Id", id)
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
        .single();

      if (sessionError) {
        if (sessionError.code === "PGRST116") {
          return null; // Không tìm thấy
        }
        throw sessionError;
      }

      return updatedSession;
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
}

module.exports = new TreatmentRouteService();
