const { createClient } = require('@supabase/supabase-js');
const fs = require('fs').promises;

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const uploadProfileImage = async (userId, file) => {
    try {
        const fileBuffer = await fs.readFile(file.path); // Dùng file.path từ multer
        const fileName = `${userId}_profile.jpg`;
        const { data, error } = await supabase.storage
            .from('image.doctor')
            .upload(fileName, fileBuffer, { contentType: 'image/jpeg' });
        await fs.unlink(file.path); // Xóa file tạm
        if (error) throw error;
        return { path: data.path };
    } catch (error) {
        throw new Error('Lỗi khi upload hình ảnh: ' + error.message);
    }
};

const updateProfileImage = async (userId, file) => {
    try {
        const fileBuffer = await fs.readFile(file.path); // Dùng file.path từ multer
        const fileName = `${userId}_profile.jpg`;
        await supabase.storage.from('image.doctor').remove([fileName]);
        const { data, error } = await supabase.storage
            .from('image.doctor')
            .upload(fileName, fileBuffer, { contentType: 'image/jpeg' });
        await fs.unlink(file.path); // Xóa file tạm
        if (error) throw error;
        return { path: data.path };
    } catch (error) {
        throw new Error('Lỗi khi cập nhật hình ảnh: ' + error.message);
    }
};

const deleteProfileImage = async (userId) => {
    try {
        const fileName = `${userId}_profile.jpg`;
        const { error } = await supabase.storage.from('image.doctor').remove([fileName]);
        if (error) throw error;
        return { message: 'Hình ảnh đã được xóa' };
    } catch (error) {
        throw new Error('Lỗi khi xóa hình ảnh: ' + error.message);
    }
};

const getProfileImage = async (userId) => {
    try {
        const fileName = `${userId}_profile.jpg`;
        const { data: fileList, error: listError } = await supabase.storage
            .from('image.doctor')
            .list('', { limit: 1, search: fileName });
        if (listError) throw listError;
        if (!fileList || fileList.length === 0) {
            return { publicUrl: null, message: 'Không tìm thấy hình ảnh' };
        }
        const { data, error } = await supabase.storage
            .from('image.doctor')
            .createSignedUrl(fileName, 3600);
        if (error) throw error;
        return { publicUrl: data.signedUrl };
    } catch (error) {
        return { publicUrl: null, message: 'Lỗi khi lấy hình ảnh: ' + error.message };
    }
};

module.exports = { uploadProfileImage, updateProfileImage, deleteProfileImage, getProfileImage };