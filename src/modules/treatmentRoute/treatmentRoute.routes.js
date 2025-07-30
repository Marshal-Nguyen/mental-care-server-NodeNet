const express = require("express");
const router = express.Router();
const treatmentRouteController = require("./treatmentRoute.controller");

router.get(
  "/treatment-routes/all",
  treatmentRouteController.getTreatmentRoutes
);

// Tự động xóa các treatment quá 5 ngày (đặt trước các route có :id)
router.delete(
  "/treatment-routes/auto-delete",
  treatmentRouteController.autoDeleteTreatment
);

// Cập nhật trạng thái action (đặt trước các route có :id)
router.put(
  "/treatment-routes/actions/:actionId/status",
  treatmentRouteController.updateActionStatus
);

// Tạo lộ trình điều trị mới
router.post("/treatment-routes", treatmentRouteController.createTreatmentRoute);

// Lấy chi tiết lộ trình điều trị theo ID
router.get(
  "/treatment-routes/:id",
  treatmentRouteController.getTreatmentRouteById
);

// Cập nhật lộ trình điều trị
router.put(
  "/treatment-routes/:id",
  treatmentRouteController.updateTreatmentRoute
);

// Xóa lộ trình điều trị
router.delete(
  "/treatment-routes/:id",
  treatmentRouteController.deleteTreatmentRoute
);

module.exports = router;
