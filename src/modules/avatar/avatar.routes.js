const express = require('express');
const router = express.Router();
const avatarController = require('./avatar.controller');
const multer = require('multer');

// Cấu hình multer để xử lý file upload
const storage = multer.memoryStorage(); // Lưu file vào bộ nhớ để upload lên Supabase
const upload = multer({ storage: storage });

router.post('/upload/:id', upload.single('avatar'), avatarController.uploadAvatar);
router.get('/url/:id', avatarController.getAvatarUrl);
router.get('/all', avatarController.getAllAvatars); // Endpoint mới

module.exports = router;

