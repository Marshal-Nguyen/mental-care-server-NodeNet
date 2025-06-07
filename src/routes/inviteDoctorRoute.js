const express = require("express");
const router = express.Router();
const requireManager = require("../middlewares/requireManager");
const { inviteDoctor } = require("../modules/therapy/inviteDoctorService");

router.post("/invite-doctor", requireManager, async (req, res) => {
  const { email, full_name, specialty } = req.body;

  if (!email || !full_name) {
    return res.status(400).json({ error: "Thiếu thông tin" });
  }

  try {
    const result = await inviteDoctor({ email });
    return res.status(200).json({ message: "Đã mời thành công", ...result });
  } catch (err) {
    console.error("Invite Doctor Error:", err);
    return res
      .status(500)
      .json({ error: "Không thể mời", detail: err.message });
  }
});

module.exports = router;
