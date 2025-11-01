import { initThemeToggle } from './theme-toggle.js';
import { initIntersectionList } from './intersection-list.js';

function initializeApp() {
    initThemeToggle();

    initIntersectionList();

    const reloadBtn = document.querySelector('.main-header .action-btn:nth-child(2)');
    if(reloadBtn) {
        reloadBtn.addEventListener('click', () => {
            alert('Tải lại dữ liệu dashboard...');
        });
    }

    const reportBtn = document.querySelector('.report-btn');
    if(reportBtn) {
        reportBtn.addEventListener('click', () => {
            alert('Chuyển đến trang Lịch sử & Phân tích chuyên sâu...');
        });
    }
}

document.addEventListener('DOMContentLoaded', initializeApp);