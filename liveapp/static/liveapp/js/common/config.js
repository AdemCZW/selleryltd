/**
 * 應用程序配置和常量
 */

const AppConfig = {
    // 時間相關配置
    TIME: {
        SLOT_HEIGHT: 25,           // 半小時時段高度 (px)
        MINUTES_PER_SLOT: 30,      // 每個時段的分鐘數
        WORK_HOURS_PER_DAY: 12,    // 每天工作小時數
        DEFAULT_DURATION: 8,       // 默認排班時長 (小時)
        DEFAULT_START_TIME: '09:00',
        DEFAULT_END_TIME: '18:00'
    },

    // 通知配置
    NOTIFICATION: {
        SUCCESS_DURATION: 2500,    // 成功通知持續時間
        ERROR_DURATION: 5000,      // 錯誤通知持續時間
        WARNING_DURATION: 3000,    // 警告通知持續時間
        INFO_DURATION: 3000        // 信息通知持續時間
    },

    // 拖拽配置
    DRAG_DROP: {
        ANIMATION_DURATION: 300,   // 動畫持續時間
        DROP_ZONE_COLOR: '#007bff', // 拖拽區域顏色
        DRAG_OPACITY: 0.7          // 拖拽時透明度
    },

    // API 端點
    API: {
        UPDATE_SCHEDULE: '/api/update-schedule/',
        CANCEL_SCHEDULE: '/cancel-schedule/',
        EMPLOYEE_SCHEDULE: '/api/employee-schedule/',
        TIMELINE_DATA: '/timeline/',
        DELETE_SCHEDULE: '/date-form/delete/'
    },

    // UI 相關配置
    UI: {
        MAX_VISIBLE_DAYS: 7,       // 最大可見天數
        SCROLL_DEBOUNCE_TIME: 500, // 滾動防抖時間
        RESIZE_THROTTLE_TIME: 250, // 調整大小節流時間
        ANIMATION_EASING: 'ease',   // 動畫緩動函數
        Z_INDEX: {
            MODAL: 1000,
            NOTIFICATION: 10000,
            TOOLTIP: 20000,
            DRAG_ITEM: 1000
        }
    },

    // 顏色主題
    COLORS: {
        PRIMARY: '#007bff',
        SUCCESS: '#28a745',
        ERROR: '#dc3545',
        WARNING: '#ffc107',
        INFO: '#17a2b8',
        LIGHT: '#f8f9fa',
        DARK: '#343a40',
        
        // 品牌顏色變體
        BRAND_VARIANTS: [
            'linear-gradient(135deg, #4a90e2, #357abd)', // Blue
            'linear-gradient(135deg, #5cb85c, #449d44)', // Green
            'linear-gradient(135deg, #f0ad4e, #ec971f)', // Orange
            'linear-gradient(135deg, #d9534f, #c9302c)', // Red
            'linear-gradient(135deg, #5bc0de, #46b8da)', // Light Blue
            'linear-gradient(135deg, #9b59b6, #8e44ad)', // Purple
            'linear-gradient(135deg, #1abc9c, #16a085)', // Teal
            'linear-gradient(135deg, #e67e22, #d35400)'  // Dark Orange
        ],

        // 衝突和狀態顏色
        CONFLICT: 'linear-gradient(135deg, #e74c3c, #c0392b)',
        LATE: 'linear-gradient(135deg, #f39c12, #d68910)',
        CANCELLED: 'linear-gradient(135deg, #95a5a6, #7f8c8d)',
        LATE_CANCELLATION: 'linear-gradient(135deg, #e67e22, #d35400)'
    },

    // 角色配置
    ROLES: {
        STREAMER: ['主播', 'Streamer', 'anchor'],
        OPERATOR: ['運營', 'Operations', 'operator'],
        
        // 角色樣式類
        CLASSES: {
            STREAMER: 'anchor-role',
            OPERATOR: 'operator-role'
        }
    },

    // 狀態配置
    STATUS: {
        NORMAL: 'normal',
        LATE: 'late',
        CANCELLED: 'cancelled',
        OTHER: 'other',
        LATE_CANCELLATION: 'late_cancellation'
    },

    // 本地化文字
    TEXTS: {
        ZH_TW: {
            SCHEDULE_ADDED: '✅ 排班新增成功！',
            SCHEDULE_DELETED: '🗑️ 排班刪除成功！',
            SCHEDULE_UPDATED: '✅ 排班更新成功！',
            OPERATION_FAILED: '❌ 操作失敗，請重試',
            NETWORK_ERROR: '❌ 網路錯誤，請檢查連接',
            NO_SCHEDULE: '無排班資料',
            CONFIRM_DELETE: '確定要刪除此排班嗎？',
            CONFIRM_MOVE: '確認移動排班？',
            TIME_CONFLICT: '⚠️ 時間衝突！',
            LATE_CANCELLATION: '⚠️ 延遲取消',
            LOADING: '載入中...',
            
            ROLES: {
                STREAMER: '主播',
                OPERATOR: '運營'
            },
            
            STATUS: {
                COMPLETED: '已完成',
                IN_PROGRESS: '進行中',
                SCHEDULED: '已排班',
                CANCELLED: '已取消',
                LATE: '遲到'
            }
        }
    },

    // 驗證規則
    VALIDATION: {
        MIN_DURATION: 0.5,         // 最小排班時長（小時）
        MAX_DURATION: 24,          // 最大排班時長（小時）
        MAX_ROOM_NUMBER: 999,      // 最大房間號
        MIN_ROOM_NUMBER: 1         // 最小房間號
    }
};

// 工具函數
AppConfig.utils = {
    /**
     * 獲取角色的樣式類
     */
    getRoleClass(role) {
        if (AppConfig.ROLES.STREAMER.includes(role)) {
            return AppConfig.ROLES.CLASSES.STREAMER;
        } else if (AppConfig.ROLES.OPERATOR.includes(role)) {
            return AppConfig.ROLES.CLASSES.OPERATOR;
        }
        return '';
    },

    /**
     * 檢查是否為主播角色
     */
    isStreamerRole(role) {
        return AppConfig.ROLES.STREAMER.includes(role);
    },

    /**
     * 檢查是否為運營角色
     */
    isOperatorRole(role) {
        return AppConfig.ROLES.OPERATOR.includes(role);
    },

    /**
     * 獲取品牌顏色變體
     */
    getBrandColor(index, brandColor = null) {
        if (brandColor && brandColor !== '#6c757d') {
            return ColorUtils.getGradient(brandColor);
        }
        const colorIndex = index % AppConfig.COLORS.BRAND_VARIANTS.length;
        return AppConfig.COLORS.BRAND_VARIANTS[colorIndex];
    },

    /**
     * 獲取狀態顏色
     */
    getStatusColor(status) {
        switch (status) {
            case AppConfig.STATUS.LATE:
                return AppConfig.COLORS.LATE;
            case AppConfig.STATUS.CANCELLED:
                return AppConfig.COLORS.CANCELLED;
            case 'conflict':
                return AppConfig.COLORS.CONFLICT;
            case 'late_cancellation':
                return AppConfig.COLORS.LATE_CANCELLATION;
            default:
                return null;
        }
    },

    /**
     * 獲取文本
     */
    getText(key, locale = 'ZH_TW') {
        const keys = key.split('.');
        let text = AppConfig.TEXTS[locale];
        
        for (const k of keys) {
            text = text?.[k];
        }
        
        return text || key;
    }
};

// 導出到全局
window.AppConfig = AppConfig;

// 向後兼容
window.CONFIG = AppConfig;
