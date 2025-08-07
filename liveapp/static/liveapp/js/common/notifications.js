/**
 * 統一的通知系統
 * 支持多種通知類型和自定義持續時間
 */

class NotificationManager {
    constructor() {
        this.notifications = new Set();
        this.defaultDuration = 3000;
    }

    /**
     * 顯示通知
     * @param {string} message - 通知消息
     * @param {string} type - 通知類型 ('success', 'error', 'warning', 'info')
     * @param {number} duration - 顯示持續時間（毫秒）
     */
    show(message, type = 'info', duration = this.defaultDuration) {
        // 嘗試使用現有 DOM 通知元素（date_form.js 風格）
        const existingNotification = document.getElementById('notification');
        const existingText = document.getElementById('notification-text');

        if (existingNotification && existingText) {
            this.showDOMNotification(existingNotification, existingText, message, type, duration);
        } else {
            // 創建動態通知（timeline_view.js 風格）
            this.showDynamicNotification(message, type, duration);
        }
    }

    /**
     * 使用現有 DOM 元素顯示通知
     */
    showDOMNotification(notification, textElement, message, type, duration) {
        textElement.textContent = message;
        notification.className = `notification ${type}`;
        notification.classList.add('show');

        setTimeout(() => {
            notification.classList.remove('show');
        }, duration);
    }

    /**
     * 創建動態通知
     */
    showDynamicNotification(message, type, duration) {
        // 移除相同類型的現有通知
        this.removeByType(type);

        const notification = document.createElement('div');
        notification.className = 'dynamic-notification';
        notification.setAttribute('data-type', type);

        const config = this.getTypeConfig(type);
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 600;
            z-index: 10000;
            max-width: 350px;
            min-width: 250px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            background-color: ${config.backgroundColor};
            transition: all 0.3s ease;
            transform: translateX(100%);
            opacity: 0;
            font-size: 14px;
            line-height: 1.4;
            border-left: 4px solid rgba(255, 255, 255, 0.3);
        `;

        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 16px;">${config.icon}</span>
                <span>${message}</span>
                <button style="
                    background: none; 
                    border: none; 
                    color: white; 
                    font-size: 18px; 
                    cursor: pointer; 
                    margin-left: auto;
                    padding: 0 5px;
                ">×</button>
            </div>
        `;

        // 添加到頁面
        document.body.appendChild(notification);
        this.notifications.add(notification);

        // 動畫進入
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
            notification.style.opacity = '1';
        }, 10);

        // 點擊關閉按鈕
        const closeBtn = notification.querySelector('button');
        closeBtn.addEventListener('click', () => this.remove(notification));

        // 自動移除
        if (duration > 0) {
            setTimeout(() => this.remove(notification), duration);
        }

        return notification;
    }

    /**
     * 獲取類型配置
     */
    getTypeConfig(type) {
        const configs = {
            success: { backgroundColor: '#28a745', icon: '✅' },
            error: { backgroundColor: '#dc3545', icon: '❌' },
            warning: { backgroundColor: '#ffc107', icon: '⚠️' },
            info: { backgroundColor: '#007bff', icon: 'ℹ️' },
            delete: { backgroundColor: '#6c757d', icon: '🗑️' }
        };

        return configs[type] || configs.info;
    }

    /**
     * 移除特定通知
     */
    remove(notification) {
        if (notification.parentNode) {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
                this.notifications.delete(notification);
            }, 300);
        }
    }

    /**
     * 移除指定類型的通知
     */
    removeByType(type) {
        this.notifications.forEach(notification => {
            if (notification.getAttribute('data-type') === type) {
                this.remove(notification);
            }
        });
    }

    /**
     * 移除所有通知
     */
    clearAll() {
        this.notifications.forEach(notification => this.remove(notification));
    }
}

// 創建全局實例
window.notificationManager = new NotificationManager();

// 提供向後兼容的全局函數
window.showNotification = function(message, type = 'info', duration = 3000) {
    return window.notificationManager.show(message, type, duration);
};
