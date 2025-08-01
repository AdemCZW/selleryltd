// Timeline View JavaScript - Simple Infinite Scroll

document.addEventListener('DOMContentLoaded', function() {
    const timelineDate = document.getElementById('timeline-date');
    const loadingIndicator = document.getElementById('timeline-loading');

    // Current state
    let currentDate = new Date(timelineDate.value);
    let isLoading = false;
    let schedulesData = {};
    let visibleDays = []; // Track visible days for sliding window
    const MAX_DAYS = 7; // Maximum 7 days visible at once
    const LOAD_THRESHOLD = 3; // Load more when reaching middle day

    // Get initial schedule data from the template
    const schedulesDataElement = document.getElementById('timeline-schedules-data');
    if (schedulesDataElement) {
        try {
            // 清除所有快取數據，強制使用新的定位計算
            schedulesData = {};
            visibleDays = [];

            // 不載入舊的數據，改為使用隨機數據進行測試
            console.log('Reset schedule data for new positioning calculation');
        } catch (e) {
            console.error('Error parsing initial schedules data:', e);
        }
    }

    // Generate random test data for demonstration
    function generateRandomScheduleData() {
        const rooms = ['Room A', 'Room B', 'Room C', 'Room D', 'Studio 1', 'Studio 2', '直播間1', '直播間2', '化妝間A', '化妝間B'];
        const persons = ['張小美', '李主播', '王直播', '陳藝人', '林模特', '吳網紅', '蔡主持', '劉演員', '黃明星', '周主播', 'Emma', 'Sophia', 'Jessica', 'Ashley'];
        const brands = ['時尚品牌A', '美妝品牌B', '服飾品牌C', '珠寶品牌D', '電商平台E', '生活用品F'];
        const roles = ['主播', '助理', '化妝師', '攝影師', '導播', '客服', '模特', '主持人'];

        // Generate data for 14 days (7 before, 7 after current date)
        for (let dayOffset = -7; dayOffset <= 7; dayOffset++) {
            const date = new Date(currentDate);
            date.setDate(date.getDate() + dayOffset);
            const dateString = date.toISOString().split('T')[0];

            if (!schedulesData[dateString]) {
                schedulesData[dateString] = [];

                // Generate 8-15 random schedules per day
                const scheduleCount = Math.floor(Math.random() * 8) + 8;

                for (let i = 0; i < scheduleCount; i++) {
                    const startHour = Math.floor(Math.random() * 24); // 0:00 - 23:00 (覆蓋整個24小時)
                    const startMinutes = Math.floor(Math.random() * 2) * 30; // 0 or 30 for half-hour alignment
                    const duration = Math.floor(Math.random() * 4) + 1; // 1-4 hours

                    // 正確計算結束時間
                    const startTotalMinutes = startHour * 60 + startMinutes;
                    const endTotalMinutes = Math.min(startTotalMinutes + (duration * 60), 23 * 60 + 45);
                    const endHour = Math.floor(endTotalMinutes / 60);
                    const endMinutes = endTotalMinutes % 60;

                    const schedule = {
                        person_name: persons[Math.floor(Math.random() * persons.length)],
                        room: rooms[Math.floor(Math.random() * rooms.length)],
                        brand_name: brands[Math.floor(Math.random() * brands.length)],
                        role: roles[Math.floor(Math.random() * roles.length)],
                        start_time: `${startHour.toString().padStart(2, '0')}:${startMinutes.toString().padStart(2, '0')}`,
                        end_time: `${endHour.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`,
                        duration: duration
                    };

                    schedulesData[dateString].push(schedule);
                }

                // 確保凌晨時段也有班表（00:00-05:59）
                const earlyMorningSchedules = Math.floor(Math.random() * 3) + 1; // 1-3個凌晨班表
                for (let i = 0; i < earlyMorningSchedules; i++) {
                    const startHour = Math.floor(Math.random() * 6); // 00:00 - 05:00
                    const startMinutes = Math.floor(Math.random() * 2) * 30; // align to half-hour
                    const duration = Math.floor(Math.random() * 3) + 2; // 2-4 小時，適合夜班

                    const startTotalMinutes = startHour * 60 + startMinutes;
                    const endTotalMinutes = Math.min(startTotalMinutes + (duration * 60), 23 * 60 + 45);
                    const endHour = Math.floor(endTotalMinutes / 60);
                    const endMinutes = endTotalMinutes % 60;

                    const nightSchedule = {
                        person_name: persons[Math.floor(Math.random() * persons.length)],
                        room: rooms[Math.floor(Math.random() * rooms.length)],
                        brand_name: brands[Math.floor(Math.random() * brands.length)],
                        role: '夜班' + roles[Math.floor(Math.random() * roles.length)], // 標示為夜班
                        start_time: `${startHour.toString().padStart(2, '0')}:${startMinutes.toString().padStart(2, '0')}`,
                        end_time: `${endHour.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`,
                        duration: duration
                    };

                    schedulesData[dateString].push(nightSchedule);
                }
            }
        }

        console.log('Generated random schedule data for dates:', Object.keys(schedulesData));
    }

    // Generate random schedule data for a specific date
    function generateRandomScheduleForDate(dateString) {
        if (schedulesData[dateString]) {
            return schedulesData[dateString]; // Return existing data
        }

        const rooms = ['Room A', 'Room B', 'Room C', 'Room D', 'Studio 1', 'Studio 2', '直播間1', '直播間2', '化妝間A', '化妝間B'];
        const persons = ['張小美', '李主播', '王直播', '陳藝人', '林模特', '吳網紅', '蔡主持', '劉演員', '黃明星', '周主播', 'Emma', 'Sophia', 'Jessica', 'Ashley'];
        const brands = ['時尚品牌A', '美妝品牌B', '服飾品牌C', '珠寶品牌D', '電商平台E', '生活用品F'];
        const roles = ['主播', '助理', '化妝師', '攝影師', '導播', '客服', '模特', '主持人'];

        const schedules = [];
        const scheduleCount = Math.floor(Math.random() * 8) + 6; // 6-13 schedules per day

        for (let i = 0; i < scheduleCount; i++) {
            const startHour = Math.floor(Math.random() * 24); // 0:00 - 23:00 (覆蓋整個24小時)
            const startMinutes = Math.floor(Math.random() * 4) * 15; // 0, 15, 30, 45
            const duration = Math.floor(Math.random() * 4) + 1; // 1-4 hours

            // Calculate end time properly
            const startTotalMinutes = startHour * 60 + startMinutes;
            const endTotalMinutes = Math.min(startTotalMinutes + (duration * 60), 23 * 60 + 45); // Max 23:45
            const endHour = Math.floor(endTotalMinutes / 60);
            const endMinutes = endTotalMinutes % 60;

            const schedule = {
                person_name: persons[Math.floor(Math.random() * persons.length)],
                room: rooms[Math.floor(Math.random() * rooms.length)],
                brand_name: brands[Math.floor(Math.random() * brands.length)],
                role: roles[Math.floor(Math.random() * roles.length)],
                start_time: `${startHour.toString().padStart(2, '0')}:${startMinutes.toString().padStart(2, '0')}`,
                end_time: `${endHour.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`,
                duration: duration
            };

            schedules.push(schedule);
        }

        // 確保凌晨時段也有班表（00:00-05:59）
        const earlyMorningSchedules = Math.floor(Math.random() * 3) + 1; // 1-3個凌晨班表
        for (let i = 0; i < earlyMorningSchedules; i++) {
            const startHour = Math.floor(Math.random() * 6); // 00:00 - 05:00
            const startMinutes = Math.floor(Math.random() * 4) * 15;
            const duration = Math.floor(Math.random() * 3) + 2; // 2-4 小時，適合夜班

            const startTotalMinutes = startHour * 60 + startMinutes;
            const endTotalMinutes = Math.min(startTotalMinutes + (duration * 60), 23 * 60 + 45);
            const endHour = Math.floor(endTotalMinutes / 60);
            const endMinutes = endTotalMinutes % 60;

            const nightSchedule = {
                person_name: persons[Math.floor(Math.random() * persons.length)],
                room: rooms[Math.floor(Math.random() * rooms.length)],
                brand_name: brands[Math.floor(Math.random() * brands.length)],
                role: '夜班' + roles[Math.floor(Math.random() * roles.length)], // 標示為夜班
                start_time: `${startHour.toString().padStart(2, '0')}:${startMinutes.toString().padStart(2, '0')}`,
                end_time: `${endHour.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`,
                duration: duration
            };

            schedules.push(nightSchedule);
        }

        // Intentionally create some time conflicts for demonstration
        if (schedules.length >= 3 && Math.random() > 0.5) {
            // Create a conflict between first two schedules in the same room
            const room = rooms[Math.floor(Math.random() * rooms.length)];
            schedules[0].room = room;
            schedules[1].room = room;

            // Make their times overlap
            schedules[0].start_time = '10:00';
            schedules[0].end_time = '12:00';
            schedules[1].start_time = '11:30';
            schedules[1].end_time = '13:30';
        }

        schedulesData[dateString] = schedules;
        console.log(`Generated ${schedules.length} random schedules for ${dateString}`);
        return schedules;
    }

    // Initialize timeline
    function initializeTimeline() {
        const selectedDate = timelineDate.value;
        currentDate = new Date(selectedDate);

        // Clear existing data and generate fresh random test data
        schedulesData = {};
        generateRandomScheduleData();

        // Create basic timeline structure with 7 days (-3 to +3)
        createTimelineStructure();

        // Load schedules for all initially visible dates
        for (let dayOffset = -3; dayOffset <= 3; dayOffset++) {
            const date = new Date(currentDate);
            date.setDate(date.getDate() + dayOffset);
            const dateString = date.toISOString().split('T')[0];
            loadSchedulesForDate(dateString);
            visibleDays.push(dateString);
        }

        // Initial room headers update
        setTimeout(() => {
            updateRoomHeaders([]);
        }, 200);

        // Setup infinite scroll
        setupInfiniteScroll();
    }

    // Create basic timeline structure
    function createTimelineStructure() {
        const timelineGrid = document.querySelector('.timeline-grid');

        if (!timelineGrid) return;

        // Clear existing content
        timelineGrid.innerHTML = '';

        // Clear visible days array
        visibleDays = [];

        // Create 7 days: 3 before, current, 3 after
        for (let dayOffset = -3; dayOffset <= 3; dayOffset++) {
            const date = new Date(currentDate);
            date.setDate(date.getDate() + dayOffset);

            createDayRow(date, timelineGrid);
        }

        // 重新設置 Intersection Observer for new containers
        setTimeout(() => {
            setupIntersectionObserver();
        }, 100);
    }

    // Create a complete day row with time labels and schedule area
    function createDayRow(date, container) {
        const dateString = date.toISOString().split('T')[0];

        // Create timeline row container
        const timelineRow = document.createElement('div');
        timelineRow.className = 'timeline-row';
        timelineRow.setAttribute('data-date', dateString);

        // Create time labels column
        const timeLabelsColumn = document.createElement('div');
        timeLabelsColumn.className = 'time-labels-column';

        // Create schedule content
        const scheduleContent = document.createElement('div');
        scheduleContent.className = 'schedule-content';

        // Add date separator for time labels
        const dateSeparator = document.createElement('div');
        dateSeparator.className = 'date-separator';
        dateSeparator.setAttribute('data-date', dateString);
        dateSeparator.textContent = formatDateDisplay(dateString);
        timeLabelsColumn.appendChild(dateSeparator);

        // Add time slots for 48 half-hour periods
        for (let halfHour = 0; halfHour < 48; halfHour++) {
            const hour = Math.floor(halfHour / 2);
            const minutes = (halfHour % 2) * 30;

            const timeSlot = document.createElement('div');
            timeSlot.className = 'time-slot';
            timeSlot.setAttribute('data-half-hour', halfHour);
            timeSlot.setAttribute('data-hour', hour);
            timeSlot.setAttribute('data-date', dateString);

            // Determine time period and background color
            let periodClass = '';
            let backgroundColor = '';
            let textColor = '#ffffff';

            if (hour >= 6 && hour < 12) {
                // 早上 (6:00-11:59) - 淺藍色
                periodClass = 'morning';
                backgroundColor = '#4a90e2';
            } else if (hour >= 12 && hour < 18) {
                // 下午 (12:00-17:59) - 橙色
                periodClass = 'afternoon';
                backgroundColor = '#f0ad4e';
                textColor = '#333333';
            } else if (hour >= 18 && hour < 22) {
                // 晚上 (18:00-21:59) - 深藍色
                periodClass = 'evening';
                backgroundColor = '#5a6d8a';
            } else {
                // 深夜/凌晨 (22:00-5:59) - 深灰色
                periodClass = 'night';
                backgroundColor = '#2c3e50';
            }

            timeSlot.classList.add(periodClass);
            timeSlot.style.backgroundColor = backgroundColor;
            timeSlot.style.color = textColor;
            timeSlot.style.height = '25px'; // 半小時格子高度
            timeSlot.style.margin = '0';
            timeSlot.style.padding = '0';

            const timeText = document.createElement('span');
            timeText.className = 'time-text';
            timeText.textContent = `${hour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
            timeText.style.color = textColor;
            timeText.style.fontSize = '10px'; // 較小字體適應半小時格
            timeText.style.margin = '0';
            timeText.style.padding = '0';

            timeSlot.appendChild(timeText);
            timeLabelsColumn.appendChild(timeSlot);
        }

        // Create schedule area for this day
        createScheduleAreaForDay(date, scheduleContent);

        // Assemble the row
        timelineRow.appendChild(timeLabelsColumn);
        timelineRow.appendChild(scheduleContent);
        container.appendChild(timelineRow);
    }

    // Create schedule area for a specific day
    function createScheduleAreaForDay(date, container) {
        const dateString = date.toISOString().split('T')[0];

        // Create room headers container for this day
        const roomHeadersContainer = document.createElement('div');
        roomHeadersContainer.className = 'room-headers-container';
        roomHeadersContainer.style.cssText = `
            position: sticky;
            top: 0;
            z-index: 100;
            background-color: #ffffff;
            border-bottom: 2px solid #212529;
            height: 50px;
            display: flex;
            flex-direction: row;
            gap: 0;
            padding: 0;
            margin: 0;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            align-items: stretch;
        `;
        container.appendChild(roomHeadersContainer);

        // Create day container with time period backgrounds
        const dayContainer = document.createElement('div');
        dayContainer.className = 'day-container';
        dayContainer.setAttribute('data-date', dateString);
        dayContainer.style.cssText = `
            min-height: 1250px;
            position: relative;
            display: flex;
            flex-direction: row;
            gap: 0;
            padding: 0;
            background-color: #ffffff;
        `;

        // Add time period background stripes
        const timeBackgrounds = document.createElement('div');
        timeBackgrounds.className = 'time-backgrounds';
        timeBackgrounds.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 100%;
            z-index: 1;
            pointer-events: none;
        `;

        // Create background stripes for different time periods (48 half-hour periods)
        for (let halfHour = 0; halfHour < 48; halfHour++) {
            const hour = Math.floor(halfHour / 2);
            const stripe = document.createElement('div');
            stripe.className = 'time-stripe';

            let backgroundColor = '';

            if (hour >= 6 && hour < 12) {
                // 早上 - 淺藍色背景
                backgroundColor = 'rgba(74, 144, 226, 0.03)';
            } else if (hour >= 12 && hour < 18) {
                // 下午 - 淺橙色背景
                backgroundColor = 'rgba(240, 173, 78, 0.03)';
            } else if (hour >= 18 && hour < 22) {
                // 晚上 - 淺深藍色背景
                backgroundColor = 'rgba(90, 109, 138, 0.03)';
            } else {
                // 深夜/凌晨 - 淺灰色背景
                backgroundColor = 'rgba(44, 62, 80, 0.03)';
            }

            // 重新計算正確的背景條紋位置（半小時段隔）
            const timeSlotHeight = 25; // 每個半小時段高度
            const topPosition = halfHour * timeSlotHeight; // 直接使用半小時 × 高度

            stripe.style.cssText = `
                position: absolute;
                top: ${topPosition}px;
                left: 0;
                right: 0;
                height: ${timeSlotHeight}px;
                background-color: ${backgroundColor};
                border-bottom: 1px solid rgba(0, 0, 0, 0.02);
            `;

            timeBackgrounds.appendChild(stripe);
        }

        dayContainer.appendChild(timeBackgrounds);
        container.appendChild(dayContainer);
    }

    // Setup infinite scroll with optimizations
    function setupInfiniteScroll() {
        const scrollArea = document.querySelector('.timeline-scroll-area');
        if (!scrollArea) return;

        let scrollTimeout;
        let isScrolling = false;
        let lastScrollTop = 0;
        const scrollThreshold = 400; // 降低觸發距離適應更少的天數

        // 使用 Intersection Observer 替代部分滾动檢測
        setupIntersectionObserver();

        scrollArea.addEventListener('scroll', function() {
            // 防止過於頻繁的執行
            if (isScrolling) return;
            isScrolling = true;

            clearTimeout(scrollTimeout);

            scrollTimeout = setTimeout(() => {
                const scrollTop = scrollArea.scrollTop;
                const scrollHeight = scrollArea.scrollHeight;
                const clientHeight = scrollArea.clientHeight;
                const scrollDirection = scrollTop > lastScrollTop ? 'down' : 'up';

                // 只在特定滾動方向和距離時觸發，且降低限制
                if (scrollDirection === 'up' && scrollTop <= scrollThreshold && !isLoading) {
                    loadPreviousDay();
                } else if (scrollDirection === 'down' &&
                    scrollTop + clientHeight >= scrollHeight - scrollThreshold &&
                    !isLoading) {
                    loadNextDay();
                }

                // 更新日期選擇器（降低頻率）
                updateDateSelector(scrollTop);

                lastScrollTop = scrollTop;
                isScrolling = false;
            }, 50); // 降低延遲時間
        }, { passive: true }); // 使用 passive 監聽器提升性能
    }

    // 使用 Intersection Observer 優化邊界檢測
    function setupIntersectionObserver() {
        if (!window.IntersectionObserver) return;

        // 清理舊的 observer
        if (window.timelineObserver) {
            window.timelineObserver.disconnect();
        }

        const options = {
            root: document.querySelector('.timeline-scroll-area'),
            rootMargin: '300px 0px', // 提前300px開始載入
            threshold: 0.1
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !isLoading) {
                    const dateContainer = entry.target;
                    const dateString = dateContainer.getAttribute('data-date');

                    // 檢查是否為接近邊界的容器
                    const allContainers = document.querySelectorAll('.day-container[data-date]');
                    const containerIndex = Array.from(allContainers).indexOf(dateContainer);

                    // 在第2個容器時載入前一天（左滑）
                    const isSecond = containerIndex === 1;
                    // 在倒數第2個容器時載入後一天（右滑）
                    const isSecondToLast = containerIndex === allContainers.length - 2;

                    if (isSecond) {
                        const prevDate = new Date(dateString);
                        prevDate.setDate(prevDate.getDate() - 1);
                        const prevDateStr = prevDate.toISOString().split('T')[0];
                        if (!document.querySelector(`[data-date="${prevDateStr}"]`)) {
                            loadPreviousDay();
                        }
                    } else if (isSecondToLast) {
                        const nextDate = new Date(dateString);
                        nextDate.setDate(nextDate.getDate() + 1);
                        const nextDateStr = nextDate.toISOString().split('T')[0];
                        if (!document.querySelector(`[data-date="${nextDateStr}"]`)) {
                            loadNextDay();
                        }
                    }
                }
            });
        }, options);

        // 觀察現有的日期容器
        const dayContainers = document.querySelectorAll('.day-container[data-date]');
        dayContainers.forEach(container => {
            observer.observe(container);
        });

        // 儲存 observer 以便後續使用
        window.timelineObserver = observer;
    }

    // Load previous day with sliding window
    function loadPreviousDay() {
        if (isLoading) return;

        const dayContainers = document.querySelectorAll('.day-container[data-date]');

        // Check if we already have max days
        if (dayContainers.length >= MAX_DAYS) {
            // Sliding window: remove last day when adding to front
            const lastContainer = dayContainers[dayContainers.length - 1];
            const lastRow = lastContainer.closest('.timeline-row');

            // Remove from visible days array
            const lastDateStr = lastContainer.getAttribute('data-date');
            const lastIndex = visibleDays.indexOf(lastDateStr);
            if (lastIndex > -1) {
                visibleDays.splice(lastIndex, 1);
            }

            // Remove DOM elements (entire row)
            if (lastRow) lastRow.remove();

            console.log('Removed last day:', lastDateStr);
        }

        isLoading = true;
        showLoading(true);

        // Calculate previous date from first container
        const firstContainer = document.querySelectorAll('.day-container[data-date]')[0];
        const firstDateStr = firstContainer.getAttribute('data-date');
        const previousDate = new Date(firstDateStr);
        previousDate.setDate(previousDate.getDate() - 1);
        const dateString = previousDate.toISOString().split('T')[0];

        console.log('Loading previous day:', dateString);

        // Add to visible days array
        visibleDays.unshift(dateString);

        // Fetch data if not already loaded
        if (!schedulesData[dateString]) {
            fetchScheduleData(dateString).then(data => {
                if (data) {
                    schedulesData[dateString] = data;
                }
                prependDay(previousDate);
                isLoading = false;
                showLoading(false);
            }).catch(error => {
                console.error('Error loading previous day:', error);
                isLoading = false;
                showLoading(false);
            });
        } else {
            prependDay(previousDate);
            isLoading = false;
            showLoading(false);
        }
    }

    // Load next day with sliding window
    function loadNextDay() {
        if (isLoading) return;

        const dayContainers = document.querySelectorAll('.day-container[data-date]');

        // Check if we already have max days
        if (dayContainers.length >= MAX_DAYS) {
            // Sliding window: remove first day when adding to end
            const firstContainer = dayContainers[0];
            const firstRow = firstContainer.closest('.timeline-row');

            // Remove from visible days array
            const firstDateStr = firstContainer.getAttribute('data-date');
            const firstIndex = visibleDays.indexOf(firstDateStr);
            if (firstIndex > -1) {
                visibleDays.splice(firstIndex, 1);
            }

            // Remove DOM elements (entire row)
            if (firstRow) firstRow.remove();

            console.log('Removed first day:', firstDateStr);
        }

        isLoading = true;
        showLoading(true);

        // Find the latest day currently in timeline
        const latestContainer = document.querySelectorAll('.day-container[data-date]');
        const latestDateStr = latestContainer[latestContainer.length - 1].getAttribute('data-date');

        const nextDate = new Date(latestDateStr);
        nextDate.setDate(nextDate.getDate() + 1);
        const dateString = nextDate.toISOString().split('T')[0];

        console.log('Loading next day:', dateString);

        // Add to visible days array
        visibleDays.push(dateString);

        // Fetch data if not already loaded
        if (!schedulesData[dateString]) {
            fetchScheduleData(dateString).then(data => {
                if (data) {
                    schedulesData[dateString] = data;
                }
                appendDay(nextDate);
                isLoading = false;
                showLoading(false);
            }).catch(error => {
                console.error('Error loading next day:', error);
                isLoading = false;
                showLoading(false);
            });
        } else {
            appendDay(nextDate);
            isLoading = false;
            showLoading(false);
        }
    }

    // Prepend a day to the timeline with observer support
    function prependDay(date) {
        const timelineGrid = document.querySelector('.timeline-grid');

        if (!timelineGrid) return;

        // Create new day row in temporary container
        const tempContainer = document.createElement('div');
        createDayRow(date, tempContainer);

        // Prepend the new row
        if (tempContainer.firstChild) {
            timelineGrid.insertBefore(tempContainer.firstChild, timelineGrid.firstChild);

            // 將新容器加入 Intersection Observer
            const newDayContainer = timelineGrid.firstChild.querySelector('.day-container');
            if (newDayContainer && window.timelineObserver) {
                window.timelineObserver.observe(newDayContainer);
                console.log(`Added observer for prepended container: ${date.toISOString().split('T')[0]}`);
            }
        }

        // Load schedules for this date
        const dateString = date.toISOString().split('T')[0];
        loadSchedulesForDate(dateString);

        // Adjust scroll position to maintain view
        const scrollArea = document.querySelector('.timeline-scroll-area');
        if (scrollArea) {
            scrollArea.scrollTop += 1250; // Adjust for new row height
        }
    }

    // Append a day to the timeline with observer support
    function appendDay(date) {
        const timelineGrid = document.querySelector('.timeline-grid');

        if (!timelineGrid) return;

        // Create and append new day row
        createDayRow(date, timelineGrid);

        // 將新容器加入 Intersection Observer
        const newDayContainer = timelineGrid.lastElementChild.querySelector('.day-container');
        if (newDayContainer && window.timelineObserver) {
            window.timelineObserver.observe(newDayContainer);
            console.log(`Added observer for appended container: ${date.toISOString().split('T')[0]}`);
        }

        // Load schedules for this date
        const dateString = date.toISOString().split('T')[0];
        loadSchedulesForDate(dateString);
    }

    // Fetch schedule data from server
    async function fetchScheduleData(dateString) {
        try {
            console.log(`Fetching data for ${dateString}...`);
            const response = await fetch(`/timeline/?date=${dateString}`, {
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });

            if (response.ok) {
                const data = await response.json();
                console.log(`Fetched ${data.schedules?.length || 0} schedules for ${dateString}`);
                return data.schedules || [];
            }
        } catch (error) {
            console.error('Error fetching schedule data:', error);
        }

        // If no real data found, generate random test data
        console.log(`No server data found for ${dateString}, generating random test data`);
        return generateRandomScheduleForDate(dateString);
    }

    // Update date selector based on scroll position (optimized)
    function updateDateSelector(scrollTop) {
        // 降低更新頻率
        if (updateDateSelector.lastUpdate && Date.now() - updateDateSelector.lastUpdate < 500) {
            return;
        }
        updateDateSelector.lastUpdate = Date.now();

        const dayContainers = document.querySelectorAll('.day-container[data-date]');
        const scrollArea = document.querySelector('.timeline-scroll-area');
        const viewportCenter = scrollTop + scrollArea.clientHeight / 2;

        let closestContainer = null;
        let minDistance = Infinity;

        dayContainers.forEach(container => {
            const containerCenter = container.offsetTop + container.offsetHeight / 2;
            const distance = Math.abs(viewportCenter - containerCenter);

            if (distance < minDistance) {
                minDistance = distance;
                closestContainer = container;
            }
        });

        if (closestContainer) {
            const dateString = closestContainer.getAttribute('data-date');
            if (timelineDate.value !== dateString) {
                timelineDate.value = dateString;
                currentDate = new Date(dateString);
            }
        }
    }

    // Format date for display
    function formatDateDisplay(dateString) {
        const date = new Date(dateString);
        const options = {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        };
        return date.toLocaleDateString('zh-TW', options);
    }

    // Load schedules for specific date
    function loadSchedulesForDate(date) {
        const daySchedules = schedulesData[date] || [];
        console.log(`Loading schedules for ${date}:`, daySchedules);

        const dayContainer = document.querySelector(`.day-container[data-date="${date}"]`);
        if (!dayContainer) {
            console.error(`Day container not found for date: ${date}`);
            return;
        }

        // Clear existing schedules
        const existingSchedules = dayContainer.querySelectorAll('.room-group');
        existingSchedules.forEach(schedule => schedule.remove());

        if (daySchedules.length === 0) {
            console.log(`No schedules found for ${date}`);
            return;
        }

        // Group schedules by room
        const schedulesByRoom = {};
        daySchedules.forEach(schedule => {
            const roomNumber = schedule.room || '未分配房間';
            if (!schedulesByRoom[roomNumber]) {
                schedulesByRoom[roomNumber] = [];
            }
            schedulesByRoom[roomNumber].push(schedule);
        });

        console.log(`Grouped schedules by room for ${date}:`, Object.keys(schedulesByRoom));

        // Check conflicts within each room and across all rooms
        const allConflicts = [];
        Object.entries(schedulesByRoom).forEach(([roomNumber, roomSchedules]) => {
            const roomConflicts = checkTimeConflicts(roomSchedules);
            allConflicts.push(...roomConflicts);
        });

        // Also check conflicts between different rooms for the same person
        checkPersonConflictsAcrossRooms(schedulesByRoom);

        if (allConflicts.length > 0) {
            console.log(`Found ${allConflicts.length} time conflicts for ${date}`);
        }

        // Update room headers
        updateRoomHeaders(Object.keys(schedulesByRoom));

        // Create room groups
        Object.entries(schedulesByRoom).forEach(([roomNumber, schedules]) => {
            const roomGroup = createRoomGroup(roomNumber, schedules);
            dayContainer.appendChild(roomGroup);
        });
    }

    // Check for conflicts when same person is scheduled in different rooms at overlapping times
    function checkPersonConflictsAcrossRooms(schedulesByRoom) {
        const allSchedules = [];

        // Flatten all schedules
        Object.values(schedulesByRoom).forEach(roomSchedules => {
            allSchedules.push(...roomSchedules);
        });

        // Group by person
        const schedulesByPerson = {};
        allSchedules.forEach(schedule => {
            const personName = schedule.person_name;
            if (personName) {
                if (!schedulesByPerson[personName]) {
                    schedulesByPerson[personName] = [];
                }
                schedulesByPerson[personName].push(schedule);
            }
        });

        // Check conflicts for each person
        Object.entries(schedulesByPerson).forEach(([personName, personSchedules]) => {
            if (personSchedules.length > 1) {
                checkTimeConflicts(personSchedules);
            }
        });
    }

    // Update room headers based on visible rooms
    function updateRoomHeaders(roomNumbers) {
        // Update headers for each day independently
        const dayContainers = document.querySelectorAll('.day-container[data-date]');

        dayContainers.forEach(dayContainer => {
            const dateString = dayContainer.getAttribute('data-date');
            const scheduleContent = dayContainer.closest('.schedule-content');
            const headersContainer = scheduleContent.querySelector('.room-headers-container');

            if (!headersContainer) return;

            // Get room numbers for this specific day
            const roomGroups = dayContainer.querySelectorAll('.room-group[data-room]');
            const dayRoomNumbers = Array.from(roomGroups).map(group => group.getAttribute('data-room'));

            // Clear existing headers for this day
            headersContainer.innerHTML = '';

            // Create headers for rooms in this day with proper styling
            dayRoomNumbers.forEach(roomNumber => {
                const headerTitle = document.createElement('div');
                headerTitle.className = 'room-header-title';
                headerTitle.textContent = roomNumber;
                headerTitle.setAttribute('data-room', roomNumber);
                headerTitle.style.cssText = `
                    min-width: 120px;
                    max-width: 150px;
                    flex-shrink: 0;
                    background-color: #495057;
                    color: white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 700;
                    font-size: 12px;
                    border-radius: 4px 4px 0 0;
                    border: 1px solid #343a40;
                    border-bottom: none;
                    text-align: center;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
                    margin: 0;
                    height: 100%;
                `;
                headersContainer.appendChild(headerTitle);
            });

            console.log(`Updated room headers for ${dateString}:`, dayRoomNumbers);
        });
    }

    // Check for time conflicts in schedules
    function checkTimeConflicts(schedules) {
        const conflicts = [];

        for (let i = 0; i < schedules.length; i++) {
            for (let j = i + 1; j < schedules.length; j++) {
                const schedule1 = schedules[i];
                const schedule2 = schedules[j];

                if (hasTimeOverlap(schedule1, schedule2)) {
                    // Mark both schedules as conflicted
                    schedule1.hasConflict = true;
                    schedule2.hasConflict = true;

                    // Store conflict information
                    if (!schedule1.conflicts) schedule1.conflicts = [];
                    if (!schedule2.conflicts) schedule2.conflicts = [];

                    schedule1.conflicts.push(schedule2);
                    schedule2.conflicts.push(schedule1);

                    conflicts.push({
                        schedule1: schedule1,
                        schedule2: schedule2
                    });
                }
            }
        }

        return conflicts;
    }

    // Check if two schedules have time overlap
    function hasTimeOverlap(schedule1, schedule2) {
        const start1 = timeToMinutes(schedule1.start_time || '00:00');
        const end1 = timeToMinutes(schedule1.end_time || '00:00');
        const start2 = timeToMinutes(schedule2.start_time || '00:00');
        const end2 = timeToMinutes(schedule2.end_time || '00:00');

        // Check if times overlap
        return (start1 < end2 && start2 < end1);
    }

    // Convert time string to minutes
    function timeToMinutes(timeString) {
        const parts = timeString.split(':').map(Number);
        return (parts[0] || 0) * 60 + (parts[1] || 0);
    }

    // Create room group with schedules
    function createRoomGroup(roomNumber, schedules) {
        // Layout overlapping schedule items into columns for side-by-side display
        const columns = [];
        // Sort schedules by start time
        schedules.sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time));
        schedules.forEach(schedule => {
            let placed = false;
            for (let i = 0; i < columns.length; i++) {
                const last = columns[i][columns[i].length - 1];
                if (!hasTimeOverlap(last, schedule)) {
                    columns[i].push(schedule);
                    schedule.columnIndex = i;
                    placed = true;
                    break;
                }
            }
            if (!placed) {
                columns.push([schedule]);
                schedule.columnIndex = columns.length - 1;
            }
        });
        const columnCount = columns.length;
        schedules.forEach(schedule => schedule.columnCount = columnCount);
        // Check for time conflicts (mark flags)
        checkTimeConflicts(schedules);

        const roomGroup = document.createElement('div');
        roomGroup.className = 'room-group';
        roomGroup.setAttribute('data-room', roomNumber);
        roomGroup.style.cssText = `
            display: flex;
            flex-direction: column;
            margin: 0;
            min-width: 120px;
            max-width: 150px;
            flex-shrink: 0;
            border: 1px solid #dee2e6;
            border-radius: 0 0 4px 4px;
            background-color: rgba(248, 249, 250, 0.9);
            position: relative;
            min-height: 1250px;
            z-index: 2;
        `;

        // Add schedules directly (no room header needed since we have it at the top)
        schedules.forEach(schedule => {
            const scheduleItem = createScheduleItem(schedule);
            roomGroup.appendChild(scheduleItem);
        });

        return roomGroup;
    }

    // Show/hide loading indicator
    function showLoading(show) {
        if (loadingIndicator) {
            loadingIndicator.style.display = show ? 'block' : 'none';
        }
    }

    // Create individual schedule item
    function createScheduleItem(schedule) {
        // Parse time safely
        const startTimeParts = (schedule.start_time || '00:00').split(':').map(Number);
        const endTimeParts = (schedule.end_time || '00:00').split(':').map(Number);

        const startHour = startTimeParts[0] || 0;
        const startMinutes = startTimeParts[1] || 0;
        const endHour = endTimeParts[0] || 0;
        const endMinutes = endTimeParts[1] || 0;

        // 重新分析定位結構（半小時段隔）：
        // 時間軸: date-separator(50px) + halfHour0(25px) + halfHour1(25px) + ... 
        // 班表區域: room-group直接對齊，只需補償date-separator + 時間位置

        const timeSlotHeight = 25; // 每個半小時段高度
        // 班表項目直接對齊半小時格，不加額外偏移
        const topPosition = (startHour * 2 * timeSlotHeight) + (startMinutes / 30 * timeSlotHeight);

        // 計算持續時間和高度
        const durationMinutes = (endHour * 60 + endMinutes) - (startHour * 60 + startMinutes);
        const height = Math.max((durationMinutes / 30) * timeSlotHeight, 15); // 最小15px高度

        // Determine column positioning for overlapping items
        const columnIndex = schedule.columnIndex || 0;
        const columnCount = schedule.columnCount || 1;
        const widthPercent = 100 / columnCount;
        const leftPercent = columnIndex * widthPercent;
        console.log(`Schedule positioned: ${schedule.person_name} ${schedule.start_time}-${schedule.end_time} at ${topPosition}px, column ${columnIndex}/${columnCount}`);

        // Generate color based on role or room, with conflict override
        const colorVariants = [
            'linear-gradient(135deg, #4a90e2, #357abd)', // Blue
            'linear-gradient(135deg, #5cb85c, #449d44)', // Green
            'linear-gradient(135deg, #f0ad4e, #ec971f)', // Orange
            'linear-gradient(135deg, #d9534f, #c9302c)', // Red
            'linear-gradient(135deg, #5bc0de, #46b8da)', // Light Blue
            'linear-gradient(135deg, #9b59b6, #8e44ad)', // Purple
            'linear-gradient(135deg, #1abc9c, #16a085)', // Teal
            'linear-gradient(135deg, #e67e22, #d35400)' // Dark Orange
        ];

        const colorIndex = (schedule.room || schedule.role || '').length % colorVariants.length;
        let backgroundColor = colorVariants[colorIndex];
        let borderColor = 'rgba(255, 255, 255, 0.2)';
        let borderWidth = '1px';

        // Override colors for conflicts
        if (schedule.hasConflict) {
            backgroundColor = 'linear-gradient(135deg, #e74c3c, #c0392b)'; // Bright red for conflicts
            borderColor = '#ff6b6b';
            borderWidth = '2px';
        }

        const scheduleItem = document.createElement('div');
        scheduleItem.className = 'schedule-item';
        if (schedule.hasConflict) {
            scheduleItem.classList.add('conflict');
        }

        scheduleItem.style.cssText = `
            position: absolute;
            top: ${topPosition}px;
            left: ${leftPercent}%;
            width: ${widthPercent}%;
            height: ${height}px;
            background: ${backgroundColor};
            color: white;
            border-radius: 3px;
            border: ${borderWidth} solid ${borderColor};
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            text-align: center;
            padding: 3px;
            font-size: 10px;
            font-weight: 600;
            overflow: visible;
            cursor: pointer;
            z-index: 10;
            transition: all 0.2s ease;
            ${schedule.hasConflict ? 'animation: conflict-pulse 2s infinite;' : ''}
        `;

        // Add conflict warning icon if there's a conflict
        if (schedule.hasConflict) {
            const conflictIcon = document.createElement('div');
            conflictIcon.className = 'conflict-icon';
            conflictIcon.innerHTML = '⚠️';
            conflictIcon.style.cssText = `
                position: absolute;
                top: -5px;
                right: -5px;
                width: 16px;
                height: 16px;
                background-color: #ff4444;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 10px;
                z-index: 15;
                animation: conflict-warning 1s infinite;
            `;
            scheduleItem.appendChild(conflictIcon);
        }

        // Enhanced hover effects for conflicts
        scheduleItem.addEventListener('mouseenter', function() {
            this.style.transform = 'scale(1.02)';
            this.style.boxShadow = schedule.hasConflict ?
                '0 3px 8px rgba(231, 76, 60, 0.5)' :
                '0 2px 6px rgba(0, 0, 0, 0.3)';
            this.style.zIndex = '20';
        });

        scheduleItem.addEventListener('mouseleave', function() {
            this.style.transform = 'scale(1)';
            this.style.boxShadow = schedule.hasConflict ?
                '0 2px 5px rgba(231, 76, 60, 0.3)' :
                '0 1px 3px rgba(0, 0, 0, 0.2)';
            this.style.zIndex = '10';
        });


        // Content container
        const content = document.createElement('div');
        content.style.cssText = `
            display: flex;
            flex-direction: column;
            justify-content: center;
            height: 100%;
            width: 100%;
        `;

        // Brand name only
        const title = document.createElement('div');
        title.className = 'schedule-title';
        title.textContent = schedule.brand_name || '';
        title.style.cssText = `
            font-size: 14px;
            font-weight: 600;
            line-height: 1.2;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            width: 100%;
            margin-bottom: 2px;
        `;

        content.appendChild(title);
        scheduleItem.appendChild(content);

        // Hover tooltip for schedule details
        // Hover tooltip for schedule details appended to body with structured layout
        scheduleItem.addEventListener('mouseenter', function() {
            const tooltip = document.createElement('div');
            tooltip.className = 'schedule-tooltip';
            tooltip.innerHTML = [
                `<div class="tooltip-row"><strong>直播人員:</strong> ${schedule.person_name || 'N/A'}</div>`,
                `<div class="tooltip-row"><strong>時間:</strong> ${schedule.start_time || 'N/A'} - ${schedule.end_time || 'N/A'}</div>`,
                `<div class="tooltip-row"><strong>職位:</strong> ${schedule.role || 'N/A'}</div>`,
                `<div class="tooltip-row"><strong>品牌:</strong> ${schedule.brand_name || 'N/A'}</div>`,
                `<div class="tooltip-row"><strong>房間:</strong> ${schedule.room || 'N/A'}</div>`,
                `<div class="tooltip-row"><strong>工時:</strong> ${schedule.duration || 'N/A'} 小時</div>`,
                schedule.hasConflict && schedule.conflicts
                    ? `<div class="tooltip-row conflict-note">⚠️ 時間衝突！</div>`
                    : ''
            ].join('');
            document.body.appendChild(tooltip);
            const rect = scheduleItem.getBoundingClientRect();
            tooltip.style.position = 'absolute';
            tooltip.style.top = `${rect.top + window.scrollY + rect.height / 2}px`;
            tooltip.style.left = `${rect.right + window.scrollX + 8}px`;
            scheduleItem._tooltipEl = tooltip;
        });
        scheduleItem.addEventListener('mouseleave', function() {
            if (scheduleItem._tooltipEl) {
                scheduleItem._tooltipEl.remove();
                scheduleItem._tooltipEl = null;
            }
        });

        return scheduleItem;
    }

    // No-op for schedule details popup; hover tooltips now provide details
    function showScheduleDetails(schedule) {
        // Intentionally left blank
    }

    // Show/hide loading indicator
    function showLoading(show) {
        if (loadingIndicator) {
            loadingIndicator.style.display = show ? 'block' : 'none';
        }
    }

    // Event listener for date change
    if (timelineDate) {
        timelineDate.addEventListener('change', function() {
            const selectedDate = this.value;
            currentDate = new Date(selectedDate);

            // Recreate timeline with new date
            createTimelineStructure();

            // Load schedules for all visible dates (7 days)
            setTimeout(() => {
                for (let dayOffset = -3; dayOffset <= 3; dayOffset++) {
                    const date = new Date(currentDate);
                    date.setDate(date.getDate() + dayOffset);
                    const dateString = date.toISOString().split('T')[0];
                    loadSchedulesForDate(dateString);
                }

                // Update room headers after all schedules are loaded
                setTimeout(() => {
                    updateRoomHeaders([]);
                }, 100);
            }, 150);

            console.log('Date changed to:', selectedDate);
        });
    }

    // Auto-scroll to current time
    function scrollToCurrentTime() {
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinutes = now.getMinutes();
        const currentHalfHour = currentHour * 2 + Math.floor(currentMinutes / 30);

        const scrollArea = document.querySelector('.timeline-scroll-area');
        const timeSlot = document.querySelector(`[data-half-hour="${currentHalfHour}"]`);

        if (scrollArea && timeSlot) {
            const offsetTop = timeSlot.offsetTop - scrollArea.offsetHeight / 2;
            scrollArea.scrollTop = Math.max(0, offsetTop);
        }
    }

    // Initialize everything
    initializeTimeline();

    // Auto-scroll to current time after a short delay
    setTimeout(() => {
        scrollToCurrentTime();
    }, 500);
});