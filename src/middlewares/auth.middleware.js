const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Middleware xác thực và phân quyền
const authMiddleware = async (req, res, next) => {
    try {
        // Lấy token từ header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'Thiếu hoặc sai định dạng token' });
        }

        const token = authHeader.split(' ')[1];

        // Xác thực token với Supabase
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (error || !user) {
            return res.status(401).json({ message: 'Token không hợp lệ', error });
        }

        // Lấy vai trò từ bảng user_roles
        const { data: userRoleData, error: roleError } = await supabase
            .from('user_roles')
            .select('role_id')
            .eq('user_id', user.id)
            .single();

        if (roleError && roleError.code !== 'PGRST116') {
            return res.status(500).json({ message: 'Lỗi khi kiểm tra vai trò', error: roleError });
        }

        let role = 'Patient'; // Default role
        let roleId;

        if (!userRoleData) {
            // Nếu không có vai trò, gán mặc định là Patient
            const { data: patientRole, error: patientRoleError } = await supabase
                .from('roles')
                .select('id, name')
                .eq('name', 'Patient')
                .single();

            if (patientRoleError || !patientRole) {
                return res.status(500).json({ message: 'Lỗi khi lấy role Patient', error: patientRoleError });
            }

            roleId = patientRole.id;
            role = patientRole.name;

            // Tạo bản ghi trong user_roles
            const { error: insertRoleError } = await supabase
                .from('user_roles')
                .insert({ user_id: user.id, role_id: roleId });

            if (insertRoleError) {
                return res.status(500).json({ message: 'Lỗi khi gán role Patient', error: insertRoleError });
            }
        } else {
            // Lấy thông tin vai trò
            const { data: roleData, error: roleFetchError } = await supabase
                .from('roles')
                .select('name')
                .eq('id', userRoleData.role_id)
                .single();

            if (roleFetchError || !roleData) {
                return res.status(500).json({ message: 'Lỗi khi lấy thông tin vai trò', error: roleFetchError });
            }

            role = roleData.name;
            roleId = userRoleData.role_id;
        }

        // Gắn thông tin user vào req
        req.user = {
            id: user.id,
            email: user.email,
            role: role === 'Patient' ? 'User' : role, // Điều chỉnh role Patient thành User
            roleId,
        };

        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};

// Middleware kiểm tra role cụ thể
const restrictTo = (...allowedRoles) => {
    return (req, res, next) => {
        const userRole = req.user.role;
        if (!allowedRoles.includes(userRole)) {
            return res.status(403).json({ message: `Forbidden: Chỉ ${allowedRoles.join(' hoặc ')} mới có quyền truy cập` });
        }
        next();
    };
};

module.exports = { authMiddleware, restrictTo };