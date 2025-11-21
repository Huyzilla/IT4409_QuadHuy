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
    'low': { label: 'Ít đông', colorClass: 'low-traffic', gradientClass: 'low-gradient' },
    'medium': { label: 'Trung bình', colorClass: 'medium-traffic', gradientClass: 'medium-gradient' },
    'heavy': { label: 'Ùn tắc', colorClass: 'heavy-traffic', gradientClass: 'heavy-gradient' },
    'no-connection': { label: 'Mất kết nối', colorClass: 'no-connection', gradientClass: '' },
    'tracking': { label: 'Đang theo dõi', colorClass: 'medium-traffic', gradientClass: '' },
};

export const api = {
    fetchRealtimeData: async (intersectionId) => {
        const intersection = initialIntersectionData.find(d => d.id === intersectionId);
        if (intersection) {
            console.log(`API: Đang gọi /api/traffic/realtime/${intersectionId}`);
            await new Promise(resolve => setTimeout(resolve, 300));

            const newSegments = intersection.segments.map(seg => ({
                ...seg,
                density: Math.min(1.0, Math.max(0.0, seg.density + (Math.random() * 0.1 - 0.05))),
            }));

            return { success: true, data: { ...intersection, segments: newSegments } };
        }
        return { success: false, error: 'Intersection not found' };
    }
};