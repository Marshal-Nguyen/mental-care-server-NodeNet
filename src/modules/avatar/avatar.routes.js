const express = require('express');
const router = express.Router();
const avatarController = require('./avatar.controller');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadPath = path.join(__dirname, '..', 'modules', 'temp');
if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadPath),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}-${file.originalname}`),
});

const upload = multer({ storage });

router.post('/profile/:userId/upload', upload.single('image'), avatarController.uploadProfileImage);
router.put('/profile/:userId/update', upload.single('image'), avatarController.updateProfileImage);
router.delete('/profile/:userId/delete', avatarController.deleteProfileImage);
router.get('/profile/:userId/image', avatarController.getProfileImage);

module.exports = router;