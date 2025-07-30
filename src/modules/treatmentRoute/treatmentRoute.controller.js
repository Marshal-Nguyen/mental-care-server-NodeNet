const treatmentRouteService = require("./treatmentRoute.service");
const { v4: uuidv4 } = require("uuid");

class TreatmentRouteController {
  // Tạo lộ trình điều trị mới
  async createTreatmentRoute(req, res) {
    try {
      const { patientId, doctorId, date, actions } = req.body;

      if (!patientId || !doctorId || !date) {
        return res.status(400).json({
          success: false,
          message: "Thiếu thông tin bắt buộc: patientId, doctorId, date",
        });
      }

      const treatmentRoute = await treatmentRouteService.createTreatmentRoute({
        patientId,
        doctorId,
        date,
        actions: actions || [],
      });

      return res.status(201).json({
        success: true,
        message: "Tạo lộ trình điều trị thành công",
        data: treatmentRoute,
      });
    } catch (error) {
      console.error("Error creating treatment route:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi tạo lộ trình điều trị",
        error: error.message,
      });
    }
  }

  // Lấy danh sách lộ trình điều trị
  async getTreatmentRoutes(req, res) {
    try {
      const { patientId, doctorId, status, page = 1, limit = 10 } = req.query;

      const filters = {};
      if (patientId) filters.patientId = patientId;
      if (doctorId) filters.doctorId = doctorId;
      if (status) filters.status = status;

      const result = await treatmentRouteService.getTreatmentRoutes(filters, {
        page: parseInt(page),
        limit: parseInt(limit),
      });

      return res.status(200).json({
        success: true,
        message: "Lấy danh sách lộ trình điều trị thành công",
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      console.error("Error getting treatment routes:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi lấy danh sách lộ trình điều trị",
        error: error.message,
      });
    }
  }

  // Lấy chi tiết lộ trình điều trị
  async getTreatmentRouteById(req, res) {
    try {
      const { id } = req.params;
      const { patientId } = req.query; // Lấy từ query parameter

      if (!id && !patientId) {
        return res.status(400).json({
          success: false,
          message: "Thiếu ID lộ trình điều trị hoặc patientId",
        });
      }

      const treatmentRoute = await treatmentRouteService.getTreatmentRouteById(
        id,
        patientId
      );

      if (
        !treatmentRoute ||
        (Array.isArray(treatmentRoute) && treatmentRoute.length === 0)
      ) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy lộ trình điều trị",
        });
      }

      return res.status(200).json({
        success: true,
        message: patientId
          ? "Lấy danh sách lộ trình điều trị theo bệnh nhân thành công"
          : "Lấy chi tiết lộ trình điều trị thành công",
        data: treatmentRoute,
      });
    } catch (error) {
      console.error("Error getting treatment route by id:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi lấy chi tiết lộ trình điều trị",
        error: error.message,
      });
    }
  }

  // Cập nhật lộ trình điều trị
  async updateTreatmentRoute(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: "Thiếu ID lộ trình điều trị",
        });
      }

      const updatedTreatmentRoute =
        await treatmentRouteService.updateTreatmentRoute(id, updateData);

      if (!updatedTreatmentRoute) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy lộ trình điều trị để cập nhật",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Cập nhật lộ trình điều trị thành công",
        data: updatedTreatmentRoute,
      });
    } catch (error) {
      console.error("Error updating treatment route:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi cập nhật lộ trình điều trị",
        error: error.message,
      });
    }
  }

  // Xóa lộ trình điều trị
  async deleteTreatmentRoute(req, res) {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: "Thiếu ID lộ trình điều trị",
        });
      }

      const deleted = await treatmentRouteService.deleteTreatmentRoute(id);

      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy lộ trình điều trị để xóa",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Xóa lộ trình điều trị thành công",
      });
    } catch (error) {
      console.error("Error deleting treatment route:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi xóa lộ trình điều trị",
        error: error.message,
      });
    }
  }

  // Cập nhật trạng thái action
  async updateActionStatus(req, res) {
    try {
      const { actionId } = req.params;
      const { status } = req.body;

      if (!actionId || !status) {
        return res.status(400).json({
          success: false,
          message: "Thiếu thông tin: actionId hoặc status",
        });
      }

      const updatedAction = await treatmentRouteService.updateActionStatus(
        actionId,
        status
      );

      if (!updatedAction) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy action để cập nhật",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Cập nhật trạng thái action thành công",
        data: updatedAction,
      });
    } catch (error) {
      console.error("Error updating action status:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi cập nhật trạng thái action",
        error: error.message,
      });
    }
  }
}

module.exports = new TreatmentRouteController();
