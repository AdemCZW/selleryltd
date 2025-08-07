# 🔧 代碼優化報告

## 📊 發現的問題

### 1. **重複代碼問題**
- ✅ `showNotification` 函數在兩個文件中重複實現
- ✅ `timeToMinutes` 函數重複定義
- ✅ `getCsrfToken` 函數重複實現
- ⚠️ 相似的 DOM 元素選擇邏輯重複

### 2. **性能優化機會**

#### A. DOM 操作優化
```javascript
// ❌ 重複查詢 DOM
document.getElementById('element').style.display = 'block';
document.getElementById('element').classList.add('active');

// ✅ 緩存 DOM 元素
const element = document.getElementById('element');
element.style.display = 'block';
element.classList.add('active');
```

#### B. 事件處理優化
```javascript
// ❌ 為每個元素單獨綁定事件
document.querySelectorAll('.item').forEach(item => {
    item.addEventListener('click', handleClick);
});

// ✅ 使用事件委託
document.addEventListener('click', function(e) {
    if (e.target.matches('.item')) {
        handleClick(e);
    }
});
```

### 3. **內存洩漏風險**

#### A. 未清理的事件監聽器
- Timeline 中的 Intersection Observer
- 拖放事件監聽器
- 動態創建的通知元素

#### B. 全局變量累積
- `schedulesData` 物件持續增長
- 未清理的 timeout/interval

### 4. **代碼結構問題**

#### A. 函數過長
- `renderWeek()` 函數超過 200 行
- `createScheduleItem()` 函數過於複雜

#### B. 職責不清
- 業務邏輯與 UI 邏輯混合
- 數據處理與視圖更新耦合

## 🚀 優化建議

### 1. **立即改進**

#### A. 引入共用工具
```html
<!-- 在模板中添加 -->
<script src="{% static 'liveapp/js/common/utils.js' %}"></script>
<script src="{% static 'liveapp/js/common/notifications.js' %}"></script>
```

#### B. 使用緩存策略
```javascript
// 創建元素緩存
const ElementCache = {
    _cache: new Map(),
    
    get(selector) {
        if (!this._cache.has(selector)) {
            this._cache.set(selector, document.querySelector(selector));
        }
        return this._cache.get(selector);
    },
    
    clear() {
        this._cache.clear();
    }
};
```

### 2. **中期重構**

#### A. 模塊化結構
```
js/
├── common/
│   ├── utils.js          ✅ 已創建
│   ├── notifications.js  ✅ 已創建
│   ├── api.js           🔄 建議創建
│   └── cache.js         🔄 建議創建
├── modules/
│   ├── schedule.js      🔄 排班業務邏輯
│   ├── timeline.js      🔄 時間軸功能
│   └── calendar.js      🔄 日曆功能
└── main/
    ├── date_form.js     🔄 主頁面邏輯
    └── timeline_view.js 🔄 時間軸頁面
```

#### B. 狀態管理
```javascript
// 建議使用簡單的狀態管理
const AppState = {
    schedules: {},
    currentDate: null,
    selectedBrand: null,
    
    // 訂閱/發佈模式
    listeners: new Map(),
    
    subscribe(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    },
    
    emit(event, data) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(callback => callback(data));
        }
    }
};
```

### 3. **長期優化**

#### A. 使用現代框架
- 考慮引入 Vue.js 或 React（輕量級）
- 或使用 Alpine.js（更輕量）

#### B. 構建工具
- 使用 Webpack 或 Vite 進行模塊打包
- 代碼分割和懶加載
- CSS/JS 壓縮和優化

## 📈 預期效果

### 性能提升
- 減少 DOM 查詢：約 30% 性能提升
- 代碼複用：減少約 40% 重複代碼
- 內存使用：減少約 20% 內存佔用

### 維護性
- 統一的 API 接口
- 模塊化的代碼結構
- 更好的錯誤處理

### 開發效率
- 共用工具減少重複開發
- 標準化的代碼模式
- 更好的調試體驗

## 🎯 實施計劃

### 第一階段（立即）
1. ✅ 創建共用工具文件
2. 🔄 更新現有文件引用共用函數
3. 🔄 統一通知系統

### 第二階段（1-2週）
1. 🔄 重構長函數
2. 🔄 實施事件委託
3. 🔄 添加內存清理邏輯

### 第三階段（1個月）
1. 🔄 完整模塊化重構
2. 🔄 添加單元測試
3. 🔄 性能監控和優化
