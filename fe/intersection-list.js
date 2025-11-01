const INTERSECTION_LIST_SELECTOR = '.intersection-list';
const ACTIVE_CLASS = 'active';

const intersectionData = [
    { label: 'Ngã tư A', details: 'Q.Lộ 1A x P.Quốc Dân', status: 'tracking', area: 'quan1' },
    { label: 'Ngã tư B', details: 'Trần Hưng Đạo x Bạch Đằng', status: 'heavy', area: 'quan1' },
    { label: 'Ngã tư C', details: 'Đoàn Sĩ Phú x Nguyễn Thái Học', status: 'medium', area: 'quan3' },
    { label: 'Ngã tư D', details: 'Phạm Văn Đồng x Võng Đức Thông', status: 'low', area: 'quan3' },
];

function handleIntersectionClick(itemElement, data){
    const list = itemElement.closest(INTERSECTION_LIST_SELECTOR);
    if (list) {
        list.querySelectorAll(`.${ACTIVE_CLASS}`).forEach(item => item.classList.remove(ACTIVE_CLASS));
    }
    itemElement.classList.add(ACTIVE_CLASS);

    const pageTitle = document.querySelector('.page-title');
    if (pageTitle) {
        pageTitle.textContent = `${data.label} - Trạng thái hiện tại`;
    }

    console.log(`Đã chọn ngã tư: ${data.label}. Cập nhật dashboard.`);
}

function setupIntersectionListeners() {
    const listItems = document.querySelectorAll('.intersection-item');
    listItems.forEach(item => {
        const label = item.querySelector('.intersection-label').textContent;
        const data = intersectionData.find(d => d.label === label);

        if (data) {
            item.addEventListener('click', () => handleIntersectionClick(item, data));
        }
    });
}

function applyFilters() {
    const statusFilter = document.querySelector('.filter-controls select:nth-child(1)').value;
    const areaFilter = document.querySelector('.filter-controls select:nth-child(2)').value;
    const searchInput = document.querySelector('.search-box input').value.toLowerCase();

    document.querySelectorAll('.intersection-item').forEach(item => {
        const status = item.dataset.status;
        const details = item.querySelector('.intersection-details').textContent.toLowerCase();
        const label = item.querySelector('.intersection-label').textContent.toLowerCase();

        const matchesStatus = statusFilter === 'all' || statusFilter === status;
        const matchesArea = areaFilter === 'all'

        const matchesSearch = label.includes(searchInput) || details.includes(searchInput);

        if (matchesStatus && matchesSearch) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
}

export function initIntersectionList() {
    setupIntersectionListeners();

    const filterControls = document.querySelector('.filter-controls');
    const searchBox = document.querySelector('.search-box input');

    if (filterControls) {
        filterControls.addEventListener('change', applyFilters);
    }
    if (searchBox) {
        searchBox.addEventListener('input', applyFilters);
    }
}

