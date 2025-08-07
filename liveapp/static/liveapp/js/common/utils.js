/**
 * 共用工具函數
 * 避免在多個文件中重複相同的功能
 */

/**
 * 時間工具類
 */
class TimeUtils {
    /**
     * 將時間字符串轉換為分鐘數
     * @param {string} timeString - 時間字符串 (格式: "HH:MM")
     * @returns {number} 分鐘數
     */
    static timeToMinutes(timeString) {
        if (!timeString || typeof timeString !== 'string') {
            return 0;
        }
        const parts = timeString.split(':').map(Number);
        return (parts[0] || 0) * 60 + (parts[1] || 0);
    }

    /**
     * 將分鐘數轉換為時間字符串
     * @param {number} minutes - 分鐘數
     * @returns {string} 時間字符串 (格式: "HH:MM")
     */
    static minutesToTime(minutes) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    }

    /**
     * 檢查兩個時間段是否重疊
     * @param {Object} timeSlot1 - 時間段1 {start_time, end_time}
     * @param {Object} timeSlot2 - 時間段2 {start_time, end_time}
     * @returns {boolean} 是否重疊
     */
    static hasTimeOverlap(timeSlot1, timeSlot2) {
        const start1 = this.timeToMinutes(timeSlot1.start_time || '00:00');
        const end1 = this.timeToMinutes(timeSlot1.end_time || '00:00');
        const start2 = this.timeToMinutes(timeSlot2.start_time || '00:00');
        const end2 = this.timeToMinutes(timeSlot2.end_time || '00:00');

        return (start1 < end2 && start2 < end1);
    }

    /**
     * 計算時間段持續時間（小時）
     * @param {string} startTime - 開始時間
     * @param {string} endTime - 結束時間
     * @returns {number} 持續時間（小時）
     */
    static calculateDuration(startTime, endTime) {
        const startMinutes = this.timeToMinutes(startTime);
        const endMinutes = this.timeToMinutes(endTime);
        return (endMinutes - startMinutes) / 60;
    }

    /**
     * 格式化日期顯示
     * @param {string|Date} date - 日期
     * @param {string} locale - 地區設置
     * @returns {string} 格式化的日期字符串
     */
    static formatDateDisplay(date, locale = 'zh-TW') {
        const dateObj = typeof date === 'string' ? new Date(date) : date;
        const options = {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        };
        return dateObj.toLocaleDateString(locale, options);
    }
}

/**
 * API 工具類
 */
class ApiUtils {
    /**
     * 獲取 CSRF Token
     * @returns {string} CSRF Token
     */
    static getCsrfToken() {
        // 方法1: 查找隱藏輸入欄位
        const tokenInput = document.querySelector('[name=csrfmiddlewaretoken]');
        if (tokenInput) {
            return tokenInput.value;
        }

        // 方法2: 查找 meta 標籤
        const tokenMeta = document.querySelector('meta[name="csrf-token"]');
        if (tokenMeta) {
            return tokenMeta.getAttribute('content');
        }

        // 方法3: 從 cookie 獲取
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name === 'csrftoken') {
                return value;
            }
        }

        console.warn('CSRF token not found - API calls may fail');
        return '';
    }

    /**
     * 標準化的 fetch 請求
     * @param {string} url - 請求 URL
     * @param {Object} options - 請求選項
     * @returns {Promise} fetch promise
     */
    static async request(url, options = {}) {
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                'X-CSRFToken': this.getCsrfToken(),
                ...options.headers
            }
        };

        const finalOptions = { ...defaultOptions, ...options };
        
        try {
            const response = await fetch(url, finalOptions);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }
}

/**
 * DOM 工具類
 */
class DomUtils {
    /**
     * 安全的元素選擇器
     * @param {string} selector - CSS 選擇器
     * @param {Document|Element} context - 搜索上下文
     * @returns {Element|null} DOM 元素或 null
     */
    static $(selector, context = document) {
        try {
            return context.querySelector(selector);
        } catch (error) {
            console.error('Invalid selector:', selector);
            return null;
        }
    }

    /**
     * 安全的多元素選擇器
     * @param {string} selector - CSS 選擇器
     * @param {Document|Element} context - 搜索上下文
     * @returns {NodeList} DOM 元素列表
     */
    static $$(selector, context = document) {
        try {
            return context.querySelectorAll(selector);
        } catch (error) {
            console.error('Invalid selector:', selector);
            return [];
        }
    }

    /**
     * 防抖函數
     * @param {Function} func - 要防抖的函數
     * @param {number} wait - 等待時間（毫秒）
     * @returns {Function} 防抖後的函數
     */
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func.apply(this, args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * 節流函數
     * @param {Function} func - 要節流的函數
     * @param {number} limit - 限制間隔（毫秒）
     * @returns {Function} 節流後的函數
     */
    static throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    /**
     * 添加 CSS 樣式到元素
     * @param {Element} element - DOM 元素
     * @param {Object} styles - 樣式對象
     */
    static addStyles(element, styles) {
        Object.assign(element.style, styles);
    }

    /**
     * 創建元素並設置屬性
     * @param {string} tagName - 標籤名
     * @param {Object} attributes - 屬性對象
     * @param {string} textContent - 文本內容
     * @returns {Element} 創建的元素
     */
    static createElement(tagName, attributes = {}, textContent = '') {
        const element = document.createElement(tagName);
        
        Object.entries(attributes).forEach(([key, value]) => {
            if (key === 'style' && typeof value === 'object') {
                this.addStyles(element, value);
            } else if (key === 'class') {
                element.className = value;
            } else {
                element.setAttribute(key, value);
            }
        });

        if (textContent) {
            element.textContent = textContent;
        }

        return element;
    }
}

/**
 * 顏色工具類
 */
class ColorUtils {
    /**
     * 調整顏色亮度
     * @param {string} color - 十六進制顏色值
     * @param {number} amount - 調整量 (-100 到 100)
     * @returns {string} 調整後的顏色
     */
    static adjustBrightness(color, amount) {
        const usePound = color[0] === '#';
        color = color.slice(usePound ? 1 : 0);
        
        const num = parseInt(color, 16);
        let r = (num >> 16) + amount;
        let g = (num >> 8 & 0x00FF) + amount;
        let b = (num & 0x0000FF) + amount;
        
        r = r > 255 ? 255 : r < 0 ? 0 : r;
        g = g > 255 ? 255 : g < 0 ? 0 : g;
        b = b > 255 ? 255 : b < 0 ? 0 : b;
        
        return (usePound ? '#' : '') + (r << 16 | g << 8 | b).toString(16).padStart(6, '0');
    }

    /**
     * 獲取漸變背景色
     * @param {string} baseColor - 基礎顏色
     * @param {number} angle - 漸變角度
     * @returns {string} CSS 漸變字符串
     */
    static getGradient(baseColor, angle = 135) {
        const darkerColor = this.adjustBrightness(baseColor, -20);
        return `linear-gradient(${angle}deg, ${baseColor}, ${darkerColor})`;
    }
}

// 導出到全局作用域
window.TimeUtils = TimeUtils;
window.ApiUtils = ApiUtils;
window.DomUtils = DomUtils;
window.ColorUtils = ColorUtils;

// 向後兼容的全局函數
window.timeToMinutes = TimeUtils.timeToMinutes.bind(TimeUtils);
window.getCsrfToken = ApiUtils.getCsrfToken.bind(ApiUtils);
window.adjustBrightness = ColorUtils.adjustBrightness.bind(ColorUtils);
