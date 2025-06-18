const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Controller để tải ảnh avatar lên Supabase
exports.uploadAvatar = async (req, res) => {
    try {
        const { id, profileId } = req.body; // Lấy profileId từ body
        const file = req.file; // Sử dụng middleware như multer để xử lý file upload

        if (!file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        if (file.size > 5 * 1024 * 1024) {
            return res.status(400).json({ error: 'File size exceeds 5MB' });
        }

        // Tạo tên file duy nhất với profileId
        const fileName = `${profileId}-${Date.now()}-${file.originalname}`;
        const { error: uploadError } = await supabase.storage
            .from('image.doctor')
            .upload(fileName, file.buffer, {
                contentType: file.mimetype,
                cacheControl: '3600',
                upsert: false,
            });

        if (uploadError) throw uploadError;

        // Lấy URL công khai
        const { data: urlData } = supabase.storage
            .from('image.doctor')
            .getPublicUrl(fileName);

        // Cập nhật URL và profileId vào bảng doctor-profiles
        const { error: updateError } = await supabase
            .from('doctor-profiles')
            .update({ AvatarUrl: urlData.publicUrl, profileId })
            .eq('id', id);

        if (updateError) throw updateError;

        res.status(200).json({ url: urlData.publicUrl, message: 'Avatar uploaded successfully' });
    } catch (error) {
        console.error('Error uploading avatar:', error);
        res.status(500).json({ error: 'Failed to upload avatar' });
    }
};

// Controller để lấy URL ảnh avatar bằng ID
exports.getAvatarUrl = async (req, res) => {
    try {
        const { id } = req.params;

        const { data: profile, error: profileError } = await supabase
            .from('doctor-profiles')
            .select('AvatarUrl, profileId')
            .eq('id', id)
            .single();

        if (profileError || !profile) {
            return res.status(404).json({ error: 'Doctor profile not found' });
        }

        res.status(200).json({ url: profile.AvatarUrl, profileId: profile.profileId });
    } catch (error) {
        console.error('Error fetching avatar URL:', error);
        res.status(500).json({ error: 'Failed to fetch avatar URL' });
    }
};

// Controller để lấy tất cả hình ảnh từ bucket
exports.getAllAvatars = async (req, res) => {
    try {
        const { data: files, error } = await supabase.storage
            .from('image.doctor')
            .list();

        if (error) throw error;

        // Lấy thông tin profileId từ doctor-profiles dựa trên tên file
        const avatars = await Promise.all(files.map(async (file) => {
            const fileNameParts = file.name.split('-');
            const profileId = fileNameParts[0]; // Giả sử profileId là phần đầu của tên file
            const { data: profile } = await supabase
                .from('doctor-profiles')
                .select('AvatarUrl')
                .eq('profileId', profileId)
                .single();
            return {
                name: file.name,
                url: supabase.storage
                    .from('image.doctor')
                    .getPublicUrl(file.name).data.publicUrl,
                profileId: profile ? profile.profileId : null,
            };
        }));

        res.status(200).json({ avatars });
    } catch (error) {
        console.error('Error fetching all avatars:', error);
        res.status(500).json({ error: 'Failed to fetch all avatars' });
    }
};