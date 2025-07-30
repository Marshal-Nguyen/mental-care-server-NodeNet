const express = require("express");
const router = express.Router();
const treatmentRouteService = require("./treatmentRoute.service");

// Lấy danh sách time periods
router.get("/time-periods/allTime", async (req, res) => {
  try {
    const timePeriods = await treatmentRouteService.getTimePeriods();

    return res.status(200).json({
      success: true,
      message: "Lấy danh sách time periods thành công",
      data: timePeriods,
    });
  } catch (error) {
    console.error("Error getting time periods:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi lấy danh sách time periods",
      error: error.message,
    });
  }
});

module.exports = router;
