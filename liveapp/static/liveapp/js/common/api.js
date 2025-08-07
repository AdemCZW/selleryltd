/**
 * API 管理器
 * 統一處理所有 API 調用，提供錯誤處理和重試機制
 */

class ApiManager {
    constructor() {
        this.baseHeaders = {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
        };
        this.retryAttempts = 3;
        this.retryDelay = 1000;
    }

    /**
     * 基礎請求方法
     */
    async request(url, options = {}) {
        const finalOptions = {
            ...options,
            headers: {
                ...this.baseHeaders,
                'X-CSRFToken': ApiUtils.getCsrfToken(),
                ...options.headers
            }
        };

        let lastError;
        
        // 重試機制
        for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
            try {
                const response = await fetch(url, finalOptions);
                
                if (!response.ok) {
                    if (response.status >= 400 && response.status < 500) {
                        // 客戶端錯誤，不重試
                        const errorData = await response.json().catch(() => ({}));
                        throw new ApiError(`HTTP ${response.status}`, response.status, errorData);
                    } else {
                        // 服務器錯誤，可能重試
                        throw new ApiError(`HTTP ${response.status}: ${response.statusText}`, response.status);
                    }
                }
                
                const data = await response.json();
                return data;
                
            } catch (error) {
                lastError = error;
                
                // 如果是最後一次嘗試或客戶端錯誤，直接拋出
                if (attempt === this.retryAttempts || error.status < 500) {
                    throw error;
                }
                
                // 等待後重試
                await this.delay(this.retryDelay * attempt);
            }
        }
        
        throw lastError;
    }

    /**
     * GET 請求
     */
    async get(url, params = {}) {
        const urlObj = new URL(url, window.location.origin);
        Object.entries(params).forEach(([key, value]) => {
            urlObj.searchParams.set(key, value);
        });

        return this.request(urlObj.toString(), { method: 'GET' });
    }

    /**
     * POST 請求
     */
    async post(url, data = {}) {
        return this.request(url, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    /**
     * PUT 請求
     */
    async put(url, data = {}) {
        return this.request(url, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    /**
     * DELETE 請求
     */
    async delete(url) {
        return this.request(url, { method: 'DELETE' });
    }

    /**
     * 延遲函數
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // =================
    // 業務 API 方法
    // =================

    /**
     * 更新排班
     */
    async updateSchedule(scheduleData) {
        try {
            const result = await this.post(AppConfig.API.UPDATE_SCHEDULE, scheduleData);
            
            if (result.success) {
                showNotification(AppConfig.utils.getText('SCHEDULE_UPDATED'), 'success');
                return result.data;
            } else {
                throw new ApiError(result.error || 'Update failed');
            }
        } catch (error) {
            console.error('Failed to update schedule:', error);
            showNotification(
                AppConfig.utils.getText('OPERATION_FAILED') + ': ' + error.message, 
                'error'
            );
            throw error;
        }
    }

    /**
     * 取消排班
     */
    async cancelSchedule(cancelData) {
        try {
            const result = await this.post(AppConfig.API.CANCEL_SCHEDULE, cancelData);
            
            if (result.success) {
                showNotification('✅ 操作成功！', 'success');
                return result;
            } else {
                throw new ApiError(result.error || 'Cancel failed');
            }
        } catch (error) {
            console.error('Failed to cancel schedule:', error);
            showNotification(
                '❌ ' + (error.message || AppConfig.utils.getText('OPERATION_FAILED')), 
                'error'
            );
            throw error;
        }
    }

    /**
     * 刪除排班
     */
    async deleteSchedule(scheduleId) {
        try {
            const url = `${AppConfig.API.DELETE_SCHEDULE}${scheduleId}/`;
            const result = await this.post(url);
            
            if (result.success) {
                showNotification(AppConfig.utils.getText('SCHEDULE_DELETED'), 'delete');
                return result;
            } else {
                throw new ApiError(result.error || 'Delete failed');
            }
        } catch (error) {
            console.error('Failed to delete schedule:', error);
            showNotification(
                '❌ ' + (error.message || '刪除失敗，請重試'), 
                'error'
            );
            throw error;
        }
    }

    /**
     * 獲取員工排班
     */
    async getEmployeeSchedule(employeeId = null) {
        try {
            const params = employeeId ? { employee_id: employeeId } : {};
            const result = await this.get(AppConfig.API.EMPLOYEE_SCHEDULE, params);
            
            if (result.success) {
                return result.data;
            } else {
                throw new ApiError(result.error || 'Failed to load employee schedule');
            }
        } catch (error) {
            console.error('Failed to get employee schedule:', error);
            showNotification(
                '❌ 載入員工排班失敗: ' + error.message, 
                'error'
            );
            throw error;
        }
    }

    /**
     * 獲取時間軸數據
     */
    async getTimelineData(date) {
        try {
            const result = await this.get(AppConfig.API.TIMELINE_DATA, { date });
            return result;
        } catch (error) {
            console.error('Failed to fetch timeline data:', error);
            showNotification(
                '❌ 載入排班數據失敗: ' + error.message, 
                'error'
            );
            return [];
        }
    }

    /**
     * 批量更新排班（用於合併排班的拖拽）
     */
    async batchUpdateSchedule(scheduleUpdates) {
        try {
            const promises = scheduleUpdates.map(update => 
                this.updateSchedule(update).catch(error => ({ error, update }))
            );
            
            const results = await Promise.all(promises);
            
            const successful = results.filter(r => !r.error);
            const failed = results.filter(r => r.error);
            
            if (failed.length > 0) {
                console.warn('Some updates failed:', failed);
                showNotification(
                    `⚠️ ${successful.length} 成功, ${failed.length} 失敗`, 
                    'warning'
                );
            }
            
            return { successful, failed };
            
        } catch (error) {
            console.error('Batch update failed:', error);
            showNotification('❌ 批量更新失敗', 'error');
            throw error;
        }
    }
}

/**
 * API 錯誤類
 */
class ApiError extends Error {
    constructor(message, status = null, data = null) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.data = data;
    }
}

// 創建全局實例
window.apiManager = new ApiManager();
window.ApiError = ApiError;

// 向後兼容的快捷方法
window.updateScheduleOnServer = (schedule) => apiManager.updateSchedule(schedule);
window.fetchScheduleData = (date) => apiManager.getTimelineData(date);
