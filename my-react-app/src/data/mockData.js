export const initialIntersectionData = [
    {
        id: 'A', label: 'Ngã tư A', details: 'Q.Lộ 1A x P.Quốc Dân', status: 'tracking', area: 'quan1',
        segments: [
            { id: 'A1', title: 'Hướng Bắc → Nam', density: 0.45, status: 'medium' },
            { id: 'A2', title: 'Hướng Nam → Bắc', density: 0.20, status: 'low' },
            { id: 'A3', title: 'Hướng Đông → Tây', density: 0.80, status: 'heavy' },
            { id: 'A4', title: 'Hướng Tây → Đông', density: 0.00, status: 'no-connection' }
        ]
    },
    {
        id: 'B', label: 'Ngã tư B', details: 'Trần Hưng Đạo x Bạch Đằng', status: 'heavy', area: 'quan1',
        segments: [
            { id: 'B1', title: 'Hướng Bắc → Nam', density: 0.90, status: 'heavy' },
            { id: 'B2', title: 'Hướng Nam → Bắc', density: 0.85, status: 'heavy' },
            { id: 'B3', title: 'Hướng Đông → Tây', density: 0.50, status: 'medium' },
            { id: 'B4', title: 'Hướng Tây → Đông', density: 0.35, status: 'low' }
        ]
    },
    {
        id: 'C', label: 'Ngã tư C', details: 'Đoàn Sĩ Phú x Nguyễn Thái Học', status: 'medium', area: 'quan3',
        segments: [
            { id: 'C1', title: 'Hướng Bắc → Nam', density: 0.65, status: 'medium' },
            { id: 'C2', title: 'Hướng Nam → Bắc', density: 0.55, status: 'medium' },
            { id: 'C3', title: 'Hướng Đông → Tây', density: 0.15, status: 'low' },
            { id: 'C4', title: 'Hướng Tây → Đông', density: 0.40, status: 'medium' }
        ]
    },
    {
        id: 'D', label: 'Ngã tư D', details: 'Phạm Văn Đồng x Võng Đức Thông', status: 'low', area: 'quan3',
        segments: [
            { id: 'D1', title: 'Hướng Bắc → Nam', density: 0.10, status: 'low' },
            { id: 'D2', title: 'Hướng Nam → Bắc', density: 0.12, status: 'low' },
            { id: 'D3', title: 'Hướng Đông → Tây', density: 0.25, status: 'low' },
            { id: 'D4', title: 'Hướng Tây → Đông', density: 0.05, status: 'low' }
        ]
    },
];

export const STATUS_MAP = {
    'low': { label: 'Ít đông', colorClass: 'low-traffic', gradientClass: 'low-gradient', densityMax: 0.3 },
    'medium': { label: 'Trung bình', colorClass: 'medium-traffic', gradientClass: 'medium-gradient', densityMax: 0.6 },
    'heavy': { label: 'Ùn tắc', colorClass: 'heavy-traffic', gradientClass: 'heavy-gradient', densityMax: 1.0 },
    'no-connection': { label: 'Mất kết nối', colorClass: 'no-connection', gradientClass: '', densityMax: 0 },
    'tracking': { label: 'Đang theo dõi', colorClass: 'medium-traffic', gradientClass: '', densityMax: 1.0 },
};

const getStatusByDensity = (density) => {
    if (density === 0) return 'no-connection';
    if (density <= STATUS_MAP.low.densityMax) return 'low';
    if (density <= STATUS_MAP.medium.densityMax) return 'medium';
    return 'heavy';
};

export const api = {
    fetchRealtimeData: async (intersectionId) => {
        const intersection = initialIntersectionData.find(d => d.id === intersectionId);
        if (intersection) {
            console.log(`API: Đang gọi /api/traffic/realtime/${intersectionId}`);
            await new Promise(resolve => setTimeout(resolve, 300));

            const newSegments = intersection.segments.map(seg => {
                // Giả lập mật độ ngẫu nhiên thay đổi nhẹ
                let newDensity = seg.density;
                if (seg.status !== 'no-connection') {
                    newDensity = Math.min(1.0, Math.max(0.0, seg.density + (Math.random() * 0.1 - 0.05)));
                }

                return {
                    ...seg,
                    density: newDensity,
                    status: getStatusByDensity(newDensity),
                };
            });

            return { success: true, data: { ...intersection, segments: newSegments } };
        }
        return { success: false, error: 'Intersection not found' };
    }
};

export const initialAlerts = [
    { id: 1, intersection: 'Ngã tư B', segment: 'Hướng Bắc → Nam', message: 'Mật độ vượt ngưỡng 0.9. Cần điều chỉnh đèn.', timestamp: Date.now() - 600000, read: false },
    { id: 2, intersection: 'Ngã tư C', segment: 'Hướng Đông → Tây', message: 'Tốc độ trung bình giảm 20% trong 5 phút.', timestamp: Date.now() - 1200000, read: true },
    { id: 3, intersection: 'Ngã tư A', segment: 'Hướng Đông → Tây', message: 'Cảm biến lỗi kết nối trong 10 phút.', timestamp: Date.now() - 1800000, read: false },
];

export const MOCK_USER = {
    role: 'admin',
    username: 'admin_traffic',
};