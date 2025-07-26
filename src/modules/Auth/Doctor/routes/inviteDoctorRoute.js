const express = require("express");
const router = express.Router();
const requireManager = require("../../../../middlewares/requireManager");
const {
  inviteDoctor,
  updateDoctorStatus,
} = require("../services/inviteDoctorService");

router.post("/invite-doctor", requireManager, async (req, res) => {
  const { email, full_name } = req.body;

  if (!email || !full_name) {
    return res.status(400).json({ error: "Thiếu thông tin" });
  }
  console.log("Invite Doctor Request:", {
    email,
    full_name,
  });
  try {
    const result = await inviteDoctor({ email, full_name });
    return res.status(200).json({ message: "Đã mời thành công", ...result });
  } catch (err) {
    console.error("Invite Doctor Error:", err);
    return res
      .status(500)
      .json({ error: "Không thể mời", detail: err.message });
  }
});

router.post("/verify-doctor-email", async (req, res) => {
  const { userId, email } = req.body;

  if (!userId) {
    return res.status(400).json({ error: "Thiếu thông tin userId" });
  }
  if (!email) {
    return res.status(400).json({ error: "Thiếu thông tin email" });
  }
  try {
    const result = await updateDoctorStatus(userId, email);
    return res
      .status(200)
      .json({ message: "Cập nhật trạng thái thành công", ...result });
  } catch (err) {
    console.error("Update Doctor Status Error:", err);
    return res
      .status(500)
      .json({ error: "Không thể cập nhật trạng thái", detail: err.message });
  }
});

module.exports = router;
