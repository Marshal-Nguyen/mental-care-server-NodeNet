const express = require('express');
const router = express.Router();
const avatarController = require('./avatar.controller');
const multer = require('multer');
const upload = multer({ dest: 'C:\\Users\\LENOVO\\OneDrive\\Máy tính\\wdp\\mental-care-server-NodeNet\\src\\modules\\temp\\' });

router.post('/profile/:userId/upload', upload.single('image'), avatarController.uploadProfileImage);
router.put('/profile/:userId/update', upload.single('image'), avatarController.updateProfileImage);
router.delete('/profile/:userId/delete', avatarController.deleteProfileImage);
router.get('/profile/:userId/image', avatarController.getProfileImage);

module.exports = router;