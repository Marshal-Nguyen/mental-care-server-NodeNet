const avatarService = require('./avatar.service');

exports.uploadProfileImage = async (req, res) => {
    try {
        const { userId } = req.params;
        const file = req.file;
        const result = await avatarService.uploadProfileImage(userId, file);
        res.status(200).json({ message: 'Hình ảnh đã được upload thành công', data: result });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi khi upload hình ảnh', error: error.message });
    }
};

exports.updateProfileImage = async (req, res) => {
    try {
        const { userId } = req.params;
        const file = req.file;
        const result = await avatarService.updateProfileImage(userId, file);
        res.status(200).json({ message: 'Hình ảnh đã được cập nhật thành công', data: result });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi khi cập nhật hình ảnh', error: error.message });
    }
};

exports.deleteProfileImage = async (req, res) => {
    try {
        const { userId } = req.params;
        const result = await avatarService.deleteProfileImage(userId);
        res.status(200).json({ message: 'Hình ảnh đã được xóa thành công', data: result });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi khi xóa hình ảnh', error: error.message });
    }
};

exports.getProfileImage = async (req, res) => {
    try {
        const { userId } = req.params;
        const result = await avatarService.getProfileImage(userId);
        res.status(200).json({ message: 'Lấy hình ảnh thành công', data: result });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi khi lấy hình ảnh', error: error.message });
    }
};