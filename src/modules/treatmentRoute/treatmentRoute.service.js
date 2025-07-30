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

  // Cập nhật lộ trình điều trị
  async updateTreatmentRoute(id, updateData) {
    try {
      // Cập nhật TreatmentSession
      const updateFields = {
        LastModified: new Date(),
      };

      if (updateData.doctorId) {
        updateFields.DoctorId = updateData.doctorId;
      }
      if (updateData.date) {
        updateFields.Date = new Date(updateData.date);
      }
      if (updateData.status) {
        updateFields.Status = updateData.status;
      }

      const { data: updatedSession, error: sessionError } = await supabase
        .from("TreatmentSessions")
        .update(updateFields)
        .eq("Id", id)
        .select("Id")
        .single();

      if (sessionError) {
        if (sessionError.code === "PGRST116") {
          return null; // Không tìm thấy
        }
        throw sessionError;
      }

      // Xử lý actions nếu có
      let updatedActions = [];
      if (updateData.actions && updateData.actions.length > 0) {
        for (const action of updateData.actions) {
          if (action.id) {
            // Cập nhật action đã tồn tại
            const { data: updated, error: updateError } = await supabase
              .from("Actions")
              .update({
                ActionName: action.actionName,
                TimePeriodsId: action.timePeriodsId,
                Status: action.status || "not_started",
                LastModified: new Date(),
              })
              .eq("Id", action.id)
              .eq("TreatmentSessionId", id)
              .select()
              .single();

            if (updateError) {
              throw updateError;
            }
            updatedActions.push(updated);
          } else {
            // Tạo action mới
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
            updatedActions.push(created);
          }
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
}

module.exports = new TreatmentRouteService();
