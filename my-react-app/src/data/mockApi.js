import mockData from './mockData.json';

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const api = {
    fetchIntersections: async () => {
        await delay(600);
        return { success: true, data: mockData.intersections };
    },

    fetchRealtimeData: async (intersectionId) => {
        await delay(400);
        const intersection = mockData.intersections.find(i => i.id === intersectionId);
        if (!intersection) return { success: false, error: 'Not found' };

        const updatedSegments = intersection.segments.map(seg => {
            if (seg.status === 'no-connection') return seg;

            const change = (Math.random() - 0.5) * 0.1;
            const newDensity = Math.max(0, Math.min(1, seg.density + change));

            const getStatus = (d) => {
                if (d === 0) return 'no-connection';
                if (d <= 0.3) return 'low';
                if (d <= 0.6) return 'medium';
                return 'heavy';
            };

            return {
                ...seg,
                density: newDensity,
                status: getStatus(newDensity),
                camera: { ...seg.camera }
            };
        });

        return {
            success: true,
            data: { ...intersection, segments: updatedSegments }
        };
    },

    fetchAlerts: async () => {
        await delay(300);
        return { success: true, data: mockData.alerts || [] };
    }
};