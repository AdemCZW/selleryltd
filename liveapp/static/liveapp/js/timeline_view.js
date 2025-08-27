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
                    // 載入從後台傳遞過來的初始數據
                    const initialData = JSON.parse(schedulesDataElement.textContent);
                    schedulesData = initialData || {};
                    console.log('Loaded initial schedule data from server:', Object.keys(schedulesData));
                } catch (e) {
                    console.error('Error parsing initial schedules data:', e);
                    schedulesData = {};
                }
            } else {
                console.log('No initial schedule data element found, will fetch from server');
                schedulesData = {};
            }

            // Helper function to safely stringify objects, avoiding circular references
            function safeStringify(obj) {
                const seen = new WeakSet();
                return JSON.stringify(obj, (key, val) => {
                    if (val != null && typeof val === "object") {
                        if (seen.has(val)) {
                            return `[Circular Reference: ${val.constructor.name}]`;
                        }
                        seen.add(val);
                    }
                    // Skip circular reference properties
                    if (key === 'conflicts' && Array.isArray(val)) {
                        return `[${val.length} conflicts]`;
                    }
                    return val;
                });
            }

            // Helper function to adjust color brightness
            function adjustBrightness(hex, percent) {
                // Remove # if present
                hex = hex.replace('#', '');

                // Parse r, g, b values
                const num = parseInt(hex, 16);
                const amt = Math.round(2.55 * percent);
                const R = (num >> 16) + amt;
                const G = (num >> 8 & 0x00FF) + amt;
                const B = (num & 0x0000FF) + amt;

                return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
                    (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
                    (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
            }

            // Initialize timeline
            async function initializeTimeline() {
                const selectedDate = timelineDate.value;
                currentDate = new Date(selectedDate);

                // Create basic timeline structure with 7 days (-3 to +3)
                createTimelineStructure();

                // Add a global click listener to clear tooltips when clicking outside
                document.addEventListener('click', function(e) {
                    // Check if the click is not on a schedule item or its tooltip
                    if (!e.target.closest('.schedule-item') && !e.target.closest('.schedule-tooltip')) {
                        clearAllTooltips();
                    }
                });

                // Load schedules for all initially visible dates
                for (let dayOffset = -3; dayOffset <= 3; dayOffset++) {
                    const date = new Date(currentDate);
                    date.setDate(date.getDate() + dayOffset);
                    const dateString = date.toISOString().split('T')[0];
                    await loadSchedulesForDate(dateString);
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
                // 現在滾動容器是整個視窗，因為 .timeline-scroll-area 設為 overflow-y: visible
                const scrollContainer = window;
                const scrollElement = document.documentElement; // 用於取得 scrollTop, scrollHeight 等

                let scrollTimeout;
                let isScrolling = false;
                let lastScrollTop = 0;
                const scrollThreshold = 800; // 增加觸發距離，減少敏感度

                // 使用 Intersection Observer 替代部分滾动檢測
                setupIntersectionObserver();

                scrollContainer.addEventListener('scroll', function() {
                    // 防止過於頻繁的執行
                    if (isScrolling) return;
                    isScrolling = true;

                    clearTimeout(scrollTimeout);

                    scrollTimeout = setTimeout(() => {
                        const scrollTop = scrollElement.scrollTop;
                        const scrollHeight = scrollElement.scrollHeight;
                        const clientHeight = scrollElement.clientHeight;
                        const scrollDirection = scrollTop > lastScrollTop ? 'down' : 'up';

                        // 增加最小滾動距離要求
                        const scrollDelta = Math.abs(scrollTop - lastScrollTop);
                        const minScrollDelta = 50; // 最小滾動距離

                        // 只在特定滾動方向、足夠距離且達到閾值時觸發
                        if (scrollDirection === 'up' &&
                            scrollDelta >= minScrollDelta &&
                            scrollTop <= scrollThreshold &&
                            !isLoading) {
                            console.log('Triggering loadPreviousDay at scroll position:', scrollTop);
                            loadPreviousDay();
                        } else if (scrollDirection === 'down' &&
                            scrollDelta >= minScrollDelta &&
                            scrollTop + clientHeight >= scrollHeight - scrollThreshold &&
                            !isLoading) {
                            console.log('Triggering loadNextDay at scroll position:', scrollTop);
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
                    root: null, // 使用 viewport 作為 root，因為現在是全頁面滾動
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
            async function loadPreviousDay() {
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
                    try {
                        const data = await fetchScheduleData(dateString);
                        if (data) {
                            schedulesData[dateString] = data;
                        }
                        prependDay(previousDate);
                        // 等待 DOM 更新後載入排班資料
                        setTimeout(async() => {
                            await loadSchedulesForDate(dateString);
                        }, 50);
                    } catch (error) {
                        console.error('Error loading previous day:', error);
                    } finally {
                        isLoading = false;
                        showLoading(false);
                    }
                } else {
                    prependDay(previousDate);
                    // 等待 DOM 更新後載入排班資料  
                    setTimeout(async() => {
                        await loadSchedulesForDate(dateString);
                    }, 50);
                    isLoading = false;
                    showLoading(false);
                }
            }

            // Load next day with sliding window
            async function loadNextDay() {
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
                    try {
                        const data = await fetchScheduleData(dateString);
                        if (data) {
                            schedulesData[dateString] = data;
                        }
                        appendDay(nextDate);
                        await loadSchedulesForDate(dateString);
                    } catch (error) {
                        console.error('Error loading next day:', error);
                    } finally {
                        isLoading = false;
                        showLoading(false);
                    }
                } else {
                    appendDay(nextDate);
                    await loadSchedulesForDate(dateString);
                    isLoading = false;
                    showLoading(false);
                }
            }

            // Prepend a day to the timeline with observer support
            function prependDay(date) {
                const timelineGrid = document.querySelector('.timeline-grid');

                if (!timelineGrid) return;

                // 記錄當前滾動位置
                const currentScrollTop = window.pageYOffset || document.documentElement.scrollTop;

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

                    // 計算新增的行高度並調整滾動位置以保持相對視圖位置
                    const newRowHeight = timelineGrid.firstChild.offsetHeight;
                    window.scrollTo(0, currentScrollTop + newRowHeight);
                }

                // Load schedules for this date
                const dateString = date.toISOString().split('T')[0];
                loadSchedulesForDate(dateString);
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
                        const schedules = data.schedules || [];
                        console.log(`Fetched ${schedules.length} schedules for ${dateString}`);

                        // 檢查排班的ID結構
                        if (schedules.length > 0) {
                            console.log('Sample schedule data structure:', {
                                first_schedule: schedules[0],
                                ids_sample: schedules.slice(0, 3).map(s => ({ id: s.id, type: typeof s.id, person: s.person_name }))
                            });
                        }

                        return schedules;
                    } else {
                        console.warn(`Failed to fetch data for ${dateString}: ${response.status}`);
                        return [];
                    }
                } catch (error) {
                    console.error('Error fetching schedule data:', error);
                    return [];
                }
            }

            // Update date selector based on scroll position (optimized)
            function updateDateSelector(scrollTop) {
                // 降低更新頻率
                if (updateDateSelector.lastUpdate && Date.now() - updateDateSelector.lastUpdate < 500) {
                    return;
                }
                updateDateSelector.lastUpdate = Date.now();

                const dayContainers = document.querySelectorAll('.day-container[data-date]');
                // 現在使用視窗高度而不是滾動區域高度
                const viewportCenter = scrollTop + window.innerHeight / 2;

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
            async function loadSchedulesForDate(date) {
                let daySchedules = schedulesData[date] || [];

                // If no schedules in cache, fetch from server
                if (daySchedules.length === 0) {
                    console.log(`No cached schedules for ${date}, fetching from server...`);
                    try {
                        daySchedules = await fetchScheduleData(date);
                        schedulesData[date] = daySchedules; // Cache the results
                    } catch (error) {
                        console.error(`Failed to fetch schedules for ${date}:`, error);
                        daySchedules = [];
                    }
                }

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

                // Group schedules by room number only (not room-brand combination)
                // 如果希望按房間-品牌分組，將下面的 roomNumber 改為 `${roomNumber}-${brandName}`
                const schedulesByRoom = {};
                daySchedules.forEach(schedule => {
                    // Ensure roomNumber is always a number
                    const roomNumber = parseInt(schedule.room) || 0;
                    const groupKey = roomNumber; // 只按房間分組

                    if (!schedulesByRoom[groupKey]) {
                        schedulesByRoom[groupKey] = {
                            room: roomNumber,
                            schedules: []
                        };
                    }
                    schedulesByRoom[groupKey].schedules.push(schedule);
                });

                console.log(`Grouped schedules by room for ${date}:`, Object.keys(schedulesByRoom));

                // Check conflicts within each room group and across all groups
                const allConflicts = [];
                Object.entries(schedulesByRoom).forEach(([groupKey, group]) => {
                    const groupConflicts = checkTimeConflictsWithinGroup(group.schedules);
                    allConflicts.push(...groupConflicts);
                });

                // Also check conflicts between different groups for the same person
                checkPersonConflictsAcrossGroups(schedulesByRoom);

                if (allConflicts.length > 0) {
                    console.log(`Found ${allConflicts.length} time conflicts for ${date}`);
                }

                // Update room headers with room numbers
                const roomHeaders = Object.values(schedulesByRoom).map(group => group.room);
                updateRoomHeaders(roomHeaders);

                // Create room groups
                Object.entries(schedulesByRoom).forEach(([groupKey, group]) => {
                    const roomGroup = createRoomGroup(group.room, group.schedules);
                    dayContainer.appendChild(roomGroup);
                });
            }

            // Check for conflicts when same person is scheduled in different groups at overlapping times
            function checkPersonConflictsAcrossGroups(schedulesByRoom) {
                const allSchedules = [];

                // Flatten all schedules
                Object.values(schedulesByRoom).forEach(group => {
                    allSchedules.push(...group.schedules);
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

                // Check conflicts for each person across different groups
                Object.entries(schedulesByPerson).forEach(([personName, personSchedules]) => {
                    if (personSchedules.length > 1) {
                        // 對於跨組衝突，只檢查同一人在不同地點的時間重疊
                        // 這是真正的衝突（一個人不能同時在兩個地方）
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
                    const dayRoomHeaders = Array.from(roomGroups).map(group =>
                        `Room ${group.getAttribute('data-room')}`
                    );

                    // Clear existing headers for this day
                    headersContainer.innerHTML = '';

                    // Create headers for rooms in this day with proper styling
                    dayRoomHeaders.forEach(headerText => {
                        const headerTitle = document.createElement('div');
                        headerTitle.className = 'room-header-title';
                        headerTitle.textContent = headerText;
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

                    console.log(`Updated room headers for ${dateString}:`, dayRoomHeaders);
                });
            }

            // Check for time conflicts within a room-brand group (more intelligent conflict detection)
            function checkTimeConflictsWithinGroup(schedules) {
                const conflicts = [];

                for (let i = 0; i < schedules.length; i++) {
                    for (let j = i + 1; j < schedules.length; j++) {
                        const schedule1 = schedules[i];
                        const schedule2 = schedules[j];

                        if (hasTimeOverlap(schedule1, schedule2)) {
                            // Only consider it a conflict if:
                            // 1. Same person scheduled twice (person conflict)
                            // 2. Multiple people with same role (role conflict)
                            let isRealConflict = false;

                            // Check if same person
                            if (schedule1.person_name === schedule2.person_name) {
                                isRealConflict = true;
                                console.log('Person conflict detected:', schedule1.person_name, 'scheduled multiple times');
                            }
                            // Check if same role (multiple streamers or multiple operators in same time slot)
                            else if (schedule1.role === schedule2.role) {
                                isRealConflict = true;
                                console.log('Role conflict detected:', schedule1.role, 'multiple people in same role');
                            }
                            // Different roles (streamer + operator) in same room-brand is normal, not a conflict
                            else {
                                console.log('Normal pairing detected:', schedule1.person_name, '(', schedule1.role, ') +', schedule2.person_name, '(', schedule2.role, ')');
                            }

                            if (isRealConflict) {
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
                }

                return conflicts;
            }

            // Check for time conflicts in schedules (general function for cross-group conflicts)
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

            // Create room group with merged schedules (supports multiple brands in same room)
            function createRoomGroup(roomNumber, schedules) {
                // Group schedules by time slot to merge overlapping or same-time schedules
                const timeSlotGroups = {};

                schedules.forEach(schedule => {
                    const timeKey = `${schedule.start_time}-${schedule.end_time}`;
                    if (!timeSlotGroups[timeKey]) {
                        timeSlotGroups[timeKey] = {
                            start_time: schedule.start_time,
                            end_time: schedule.end_time,
                            schedules: [],
                            brand_color: schedule.brand_color,
                            brand_name: schedule.brand_name,
                            room: schedule.room
                        };
                    }
                    timeSlotGroups[timeKey].schedules.push(schedule);
                });

                // Convert to array and process overlaps
                const mergedSchedules = [];
                Object.values(timeSlotGroups).forEach(group => {
                    if (group.schedules.length === 1) {
                        // Single schedule, keep as is
                        mergedSchedules.push(group.schedules[0]);
                    } else {
                        // Multiple schedules in same time slot, create merged schedule
                        const mergedSchedule = createMergedSchedule(group);
                        mergedSchedules.push(mergedSchedule);
                    }
                });

                // Layout overlapping schedule items into columns for side-by-side display
                const columns = [];
                // Sort schedules by start time
                mergedSchedules.sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time));
                mergedSchedules.forEach(schedule => {
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
                mergedSchedules.forEach(schedule => schedule.columnCount = columnCount);

                // Check for time conflicts AFTER merging and BEFORE creating DOM elements
                // 不需要在這裡再次檢查衝突，因為：
                // 1. 單個排班的衝突已在 checkTimeConflictsWithinGroup 中正確處理
                // 2. 合併排班本身不應該產生新的衝突
                // checkTimeConflicts(mergedSchedules);  // 移除這行避免誤判

                // 確保合併排班的衝突狀態正確更新
                mergedSchedules.forEach(schedule => {
                    if (schedule.is_merged && schedule.all_schedules) {
                        // 重新檢查合併排班中是否有任何子排班有衝突
                        schedule.hasConflict = schedule.all_schedules.some(s => s.hasConflict) || schedule.hasConflict;

                        // 如果合併排班本身被標記為衝突，也要更新所有子排班
                        if (schedule.hasConflict) {
                            schedule.all_schedules.forEach(s => s.hasConflict = true);
                        }
                    }
                });

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

                // Make room group a drop target
                setupDropTarget(roomGroup, roomNumber);

                // Add merged schedules
                mergedSchedules.forEach(schedule => {
                    const scheduleItem = createScheduleItem(schedule);
                    roomGroup.appendChild(scheduleItem);
                });

                return roomGroup;
            }

            // Create merged schedule from multiple schedules in same time slot
            function createMergedSchedule(group) {
                const schedules = group.schedules;

                // Separate by role
                const streamers = schedules.filter(s => s.role === '主播' || s.role === 'streamer');
                const operators = schedules.filter(s => s.role === '運營' || s.role === 'operator' || s.role !== '主播');

                // Create merged schedule object
                const merged = {
                    id: schedules[0].id, // 使用第一個排班的ID作為主要ID
                    start_time: group.start_time,
                    end_time: group.end_time,
                    room: group.room,
                    brand_name: group.brand_name,
                    brand_color: group.brand_color,
                    is_merged: true,
                    streamers: streamers,
                    operators: operators,
                    all_schedules: schedules
                };

                // 驗證所有排班都有有效的ID
                console.log('Creating merged schedule with schedules:', schedules.map(s => ({
                    id: s.id,
                    person: s.person_name,
                    role: s.role,
                    start_time: s.start_time,
                    end_time: s.end_time,
                    room: s.room,
                    brand_name: s.brand_name,
                    type: typeof s.id
                })));
                const invalidSchedules = schedules.filter(s => !s.id || s.id === undefined || s.id === null);
                if (invalidSchedules.length > 0) {
                    console.warn('Found schedules without valid IDs:', invalidSchedules.map(s => ({
                        person: s.person_name,
                        role: s.role,
                        id: s.id,
                        type: typeof s.id
                    })));
                }

                // Calculate duration
                const startMinutes = timeToMinutes(group.start_time);
                const endMinutes = timeToMinutes(group.end_time);
                merged.duration = (endMinutes - startMinutes) / 60;

                // Determine primary person name for display
                if (streamers.length > 0) {
                    merged.person_name = streamers[0].person_name;
                    merged.person_nick_name = streamers[0].person_nick_name;
                } else if (operators.length > 0) {
                    merged.person_name = operators[0].person_name;
                    merged.person_nick_name = operators[0].person_nick_name;
                }

                // Check for conflicts or special statuses - 先檢查原有衝突
                merged.hasConflict = schedules.some(s => s.hasConflict);

                // 記錄衝突數量而不是完整的衝突對象（避免循環引用）
                if (merged.hasConflict) {
                    merged.conflictCount = 0;
                    schedules.forEach(s => {
                        if (s.conflicts && s.conflicts.length > 0) {
                            merged.conflictCount += s.conflicts.length;
                        }
                    });
                    console.log('Merged schedule has conflicts:', merged.person_name, 'conflict count:', merged.conflictCount);
                }

                const statusSchedule = schedules.find(s => s.modification_status && s.modification_status !== 'normal');
                merged.modification_status = statusSchedule ? statusSchedule.modification_status : 'normal';
                merged.is_late_cancellation = schedules.some(s => s.is_late_cancellation);
                merged.late_hours = schedules.reduce((sum, s) => sum + (s.late_hours || 0), 0);

                return merged;
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

                // Generate color based on brand color, with fallback to role/room
                let backgroundColor;
                let borderColor = 'rgba(255, 255, 255, 0.2)';
                let borderWidth = '1px';

                // Use brand color if available
                if (schedule.brand_color && schedule.brand_color !== '#6c757d') {
                    // Convert hex color to gradient
                    const brandColor = schedule.brand_color;
                    // Create a slightly darker shade for gradient
                    const darkerColor = adjustBrightness(brandColor, -20);
                    backgroundColor = `linear-gradient(135deg, ${brandColor}, ${darkerColor})`;
                } else {
                    // Fallback to color variants based on role/room
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
                    backgroundColor = colorVariants[colorIndex];
                }

                // Override colors for conflicts and special statuses
                if (schedule.hasConflict) {
                    backgroundColor = 'linear-gradient(135deg, #e74c3c, #c0392b)'; // Bright red for conflicts
                    borderColor = '#ff6b6b';
                    borderWidth = '2px';
                } else if (schedule.modification_status === 'late') {
                    backgroundColor = 'linear-gradient(135deg, #f39c12, #d68910)'; // Orange for late
                    borderColor = '#f39c12';
                } else if (schedule.modification_status === 'cancelled') {
                    backgroundColor = 'linear-gradient(135deg, #95a5a6, #7f8c8d)'; // Gray for cancelled
                    borderColor = '#95a5a6';
                } else if (schedule.is_late_cancellation) {
                    backgroundColor = 'linear-gradient(135deg, #e67e22, #d35400)'; // Dark orange for late cancellation
                    borderColor = '#e67e22';
                    borderWidth = '2px';
                }

                const scheduleItem = document.createElement('div');
                scheduleItem.className = 'schedule-item';
                if (schedule.hasConflict) {
                    scheduleItem.classList.add('conflict');
                    console.log('Creating conflict schedule item:', schedule.person_name, 'isMerged:', schedule.is_merged);
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
            cursor: grab;
            z-index: 10;
            transition: all 0.2s ease;
            user-select: none;
            ${schedule.hasConflict ? 'animation: conflict-pulse 2s infinite;' : ''}
        `;

                // Make the schedule item draggable
                scheduleItem.draggable = true;

                // 特別處理衝突項目，確保完全可拖拽
                if (schedule.hasConflict) {
                    console.log('Setting up draggable for conflict item:', schedule.person_name);

                    // 強制設定所有拖拽相關屬性 - 使用最高優先級
                    scheduleItem.style.pointerEvents = 'auto';
                    scheduleItem.draggable = true;
                    scheduleItem.style.webkitUserDrag = 'element';
                    scheduleItem.style.mozUserSelect = 'none';
                    scheduleItem.style.userSelect = 'none';
                    scheduleItem.style.webkitUserSelect = 'none';
                    scheduleItem.style.touchAction = 'none';
                    scheduleItem.style.cursor = 'grab';
                    scheduleItem.setAttribute('draggable', 'true');

                    // 強制添加拖拽類別以確保 CSS 生效
                    scheduleItem.classList.add('draggable-conflict');

                    // 設置內聯樣式確保最高優先級
                    scheduleItem.style.cssText = scheduleItem.style.cssText + `
                pointer-events: auto !important;
                -webkit-user-drag: element !important;
                -moz-user-select: none !important;
                user-select: none !important;
                -webkit-user-select: none !important;
                touch-action: none !important;
                cursor: grab !important;
            `;

                    // 檢查是否被正確設定
                    console.log('Conflict item drag setup check:', {
                        draggable: scheduleItem.draggable,
                        dragAttribute: scheduleItem.getAttribute('draggable'),
                        pointerEvents: getComputedStyle(scheduleItem).pointerEvents,
                        webkitUserDrag: getComputedStyle(scheduleItem).webkitUserDrag || scheduleItem.style.webkitUserDrag,
                        cursor: getComputedStyle(scheduleItem).cursor
                    });
                }

                // 設置排班ID，合併排班使用特殊標識
                if (schedule.is_merged && schedule.all_schedules) {
                    // 合併排班使用所有子排班ID的組合作為標識
                    const allIds = schedule.all_schedules.map(s => s.id).join('-');
                    scheduleItem.setAttribute('data-schedule-id', `merged-${allIds}`);
                    scheduleItem.setAttribute('data-is-merged', 'true');
                } else {
                    scheduleItem.setAttribute('data-schedule-id', schedule.id || `${schedule.person_name}-${schedule.start_time}-${schedule.room}`);
                    scheduleItem.setAttribute('data-is-merged', 'false');
                }
                scheduleItem.setAttribute('data-original-room', parseInt(schedule.room) || 0);
                scheduleItem.setAttribute('data-original-brand', schedule.brand_name);

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
                pointer-events: none;
            `;
                    scheduleItem.appendChild(conflictIcon);

                    // 調試：檢查衝突項目的拖拽屬性
                    console.log('Conflict item setup:', {
                        draggable: scheduleItem.draggable,
                        pointerEvents: scheduleItem.style.pointerEvents,
                        classList: scheduleItem.classList.toString()
                    });
                }

                // Enhanced hover effects for conflicts
                scheduleItem.addEventListener('mouseenter', function() {
                    if (!this.classList.contains('dragging')) {
                        this.style.transform = 'scale(1.02)';
                        this.style.boxShadow = schedule.hasConflict ?
                            '0 3px 8px rgba(231, 76, 60, 0.5)' :
                            '0 2px 6px rgba(0, 0, 0, 0.3)';
                        this.style.zIndex = '20';
                    }
                });

                scheduleItem.addEventListener('mouseleave', function() {
                    if (!this.classList.contains('dragging')) {
                        this.style.transform = 'scale(1)';
                        this.style.boxShadow = schedule.hasConflict ?
                            '0 2px 5px rgba(231, 76, 60, 0.3)' :
                            '0 1px 3px rgba(0, 0, 0, 0.2)';
                        this.style.zIndex = '10';
                    }
                });

                // 測試衝突項目的滑鼠事件
                if (schedule.hasConflict) {
                    console.log('Adding event listeners for conflict item:', schedule.person_name);

                    scheduleItem.addEventListener('mousedown', function(e) {
                        console.log('Conflict item mousedown triggered:', schedule.person_name, {
                            button: e.button,
                            draggable: this.draggable,
                            pointerEvents: getComputedStyle(this).pointerEvents,
                            cursor: getComputedStyle(this).cursor
                        });
                    });

                    scheduleItem.addEventListener('click', function(e) {
                        console.log('Conflict item click triggered:', schedule.person_name, e);
                    });

                    // 添加額外的拖拽測試事件
                    scheduleItem.addEventListener('dragstart', function(e) {
                        console.log('!!! CONFLICT DRAGSTART TEST EVENT:', schedule.person_name, {
                            defaultPrevented: e.defaultPrevented,
                            dataTransfer: !!e.dataTransfer,
                            draggable: this.draggable
                        });
                    }, true); // 捕獲階段

                    // 移除重複的 dragstart 監聽器，避免衝突
                    console.log('Conflict item prepared for main dragstart listener');
                }

                // Drag and drop functionality - 統一的 dragstart 監聽器
                scheduleItem.addEventListener('dragstart', function(e) {
                    isDragging = true; // Set dragging flag
                    console.log('=== DRAGSTART EVENT ===');
                    console.log('Schedule:', schedule.person_name);
                    console.log('hasConflict:', schedule.hasConflict);
                    console.log('draggable:', this.draggable);
                    console.log('Element classes:', this.className);
                    console.log('======================');

                    // 衝突項目特別處理
                    if (schedule.hasConflict) {
                        console.log('Processing drag for conflict item:', schedule.person_name);
                        console.log('Conflict item element state:', {
                            draggable: this.draggable,
                            pointerEvents: getComputedStyle(this).pointerEvents,
                            classList: this.classList.toString()
                        });

                        // 確保拖拽不會被阻止
                        e.stopPropagation(); // 只阻止事件冒泡，不阻止預設行為
                    }

                    // 清除任何現有的 tooltip
                    if (this._tooltipEl) {
                        this._tooltipEl.remove();
                        this._tooltipEl = null;
                    }

                    this.classList.add('dragging');
                    this.style.cursor = 'grabbing';
                    this.style.opacity = '0.7';
                    this.style.zIndex = '1000';

                    // 確保拖拽時移除衝突動畫，避免干擾
                    this.style.animation = 'none';

                    // Store schedule data in dataTransfer
                    const dragData = {
                        scheduleId: this.getAttribute('data-schedule-id'),
                        scheduleData: {
                            ...schedule,
                            // 移除循環引用的衝突對象，只保留基本信息
                            conflicts: schedule.conflicts ? schedule.conflicts.length : 0,
                            hasConflict: schedule.hasConflict,
                            // 確保合併排班的所有子排班信息都被保留
                            all_schedules: schedule.is_merged && schedule.all_schedules ?
                                schedule.all_schedules.map(s => ({
                                    ...s,
                                    // 移除循環引用
                                    conflicts: s.conflicts ? s.conflicts.length : 0
                                })) : undefined
                        },
                        originalRoom: parseInt(this.getAttribute('data-original-room')) || 0,
                        originalBrand: this.getAttribute('data-original-brand'),
                        originalTop: this.style.top,
                        originalLeft: this.style.left
                    };

                    console.log('Drag data prepared:', dragData);
                    console.log('Is merged schedule?', schedule.is_merged);
                    if (schedule.is_merged && schedule.all_schedules) {
                        console.log('All schedules in drag data:', schedule.all_schedules.map(s => ({
                            id: s.id,
                            person: s.person_name,
                            role: s.role
                        })));
                    }
                    e.dataTransfer.setData('text/plain', safeStringify(dragData));
                    e.dataTransfer.effectAllowed = 'move';

                    // Add visual feedback to all drop zones
                    addDropZoneIndicators();
                });

                scheduleItem.addEventListener('dragend', function(e) {
                    console.log('Drag ended for:', schedule.person_name);
                    this.classList.remove('dragging');
                    this.style.cursor = 'grab';
                    this.style.opacity = '1';
                    this.style.zIndex = '10';

                    // Reset dragging flag after a short delay to allow click event to check it
                    setTimeout(() => {
                        isDragging = false;
                    }, 100);

                    // 恢復衝突項目的動畫
                    if (schedule.hasConflict) {
                        this.style.animation = 'conflict-pulse 2s infinite';
                    }

                    // 確保清除任何殘留的 tooltip
                    if (this._tooltipEl) {
                        this._tooltipEl.remove();
                        this._tooltipEl = null;
                    }

                    // 清除所有可能殘留的 tooltip
                    const allTooltips = document.querySelectorAll('.schedule-tooltip');
                    allTooltips.forEach(tooltip => tooltip.remove());

                    // Remove drop zone indicators
                    removeDropZoneIndicators();
                });


                // Content container
                const content = document.createElement('div');
                content.style.cssText = `
            display: flex;
            flex-direction: column;
            justify-content: center;
            height: 100%;
            width: 100%;
            padding: 2px;
        `;

                // Handle merged schedule display
                if (schedule.is_merged) {
                    // Merged schedule - show streamers and operators
                    const streamers = schedule.streamers || [];
                    const operators = schedule.operators || [];

                    // Brand name (primary for merged)
                    const brandName = document.createElement('div');
                    brandName.className = 'schedule-brand';
                    brandName.textContent = schedule.brand_name || '';
                    brandName.style.cssText = `
                font-size: 10px;
                font-weight: 600;
                line-height: 1.1;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                width: 100%;
                margin-bottom: 2px;
                color: #fff;
            `;
                    content.appendChild(brandName);

                    // Streamers section
                    if (streamers.length > 0) {
                        const streamerSection = document.createElement('div');
                        streamerSection.className = 'schedule-streamers';
                        streamerSection.style.cssText = `
                    font-size: 9px;
                    font-weight: 500;
                    line-height: 1.1;
                    margin-bottom: 1px;
                    color: rgba(255, 255, 255, 0.95);
                `;

                        const streamerNames = streamers.map(a => a.person_nick_name || a.person_name).join(', ');
                        streamerSection.innerHTML = `<span style="opacity: 0.8;">主播:</span> ${streamerNames}`;
                        content.appendChild(streamerSection);
                    }

                    // Operators section
                    if (operators.length > 0) {
                        const operatorSection = document.createElement('div');
                        operatorSection.className = 'schedule-operators';
                        operatorSection.style.cssText = `
                    font-size: 9px;
                    font-weight: 500;
                    line-height: 1.1;
                    margin-bottom: 1px;
                    color: rgba(255, 255, 255, 0.95);
                `;

                        const operatorNames = operators.map(o => o.person_nick_name || o.person_name).join(', ');
                        operatorSection.innerHTML = `<span style="opacity: 0.8;">運營:</span> ${operatorNames}`;
                        content.appendChild(operatorSection);
                    }

                    // Time info for merged
                    const timeInfo = document.createElement('div');
                    timeInfo.className = 'schedule-time';
                    timeInfo.textContent = `${schedule.start_time}-${schedule.end_time}`;
                    timeInfo.style.cssText = `
                font-size: 8px;
                font-weight: 400;
                line-height: 1.1;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                width: 100%;
                opacity: 0.8;
                margin-top: 1px;
            `;
                    content.appendChild(timeInfo);

                } else {
                    // Single schedule - original display
                    // Person name (primary display)
                    const personName = document.createElement('div');
                    personName.className = 'schedule-person';
                    personName.textContent = schedule.person_nick_name || schedule.person_name || '';
                    personName.style.cssText = `
                font-size: 11px;
                font-weight: 600;
                line-height: 1.1;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                width: 100%;
                margin-bottom: 1px;
            `;

                    // Brand name (secondary)
                    const brandName = document.createElement('div');
                    brandName.className = 'schedule-brand';
                    brandName.textContent = schedule.brand_name || '';
                    brandName.style.cssText = `
                font-size: 9px;
                font-weight: 500;
                line-height: 1.1;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                width: 100%;
                opacity: 0.9;
                margin-bottom: 1px;
            `;

                    // Time info (tertiary)
                    const timeInfo = document.createElement('div');
                    timeInfo.className = 'schedule-time';
                    timeInfo.textContent = `${schedule.start_time}-${schedule.end_time}`;
                    timeInfo.style.cssText = `
                font-size: 8px;
                font-weight: 400;
                line-height: 1.1;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                width: 100%;
                opacity: 0.8;
            `;

                    content.appendChild(personName);
                    content.appendChild(brandName);
                    content.appendChild(timeInfo);
                }

                // Status indicator (if needed)
                if (schedule.modification_status && schedule.modification_status !== 'normal') {
                    const statusIcon = document.createElement('div');
                    statusIcon.className = 'schedule-status';
                    const statusIcons = {
                        'late': '⏰',
                        'cancelled': '❌',
                        'other': '⚠️'
                    };
                    statusIcon.textContent = statusIcons[schedule.modification_status] || '⚠️';
                    statusIcon.style.cssText = `
                position: absolute;
                top: 2px;
                right: 2px;
                font-size: 10px;
                z-index: 20;
                pointer-events: none;
            `;
                    scheduleItem.appendChild(statusIcon);
                }

                scheduleItem.appendChild(content);

                // Add click event handler for navigation to schedule edit page
                let isDragging = false;
                let dragStartTime = 0;

                scheduleItem.addEventListener('mousedown', function(e) {
                    isDragging = false;
                    dragStartTime = Date.now();
                });

                scheduleItem.addEventListener('click', function(e) {
                    // Prevent click during drag operations or if dragging just occurred
                    const timeSinceMouseDown = Date.now() - dragStartTime;
                    if (e.defaultPrevented || isDragging || timeSinceMouseDown > 300) {
                        return;
                    }

                    // If it's a merged schedule, navigate to date form with the date
                    if (schedule.is_merged) {
                        const dateParam = encodeURIComponent(schedule.date || getCurrentDateString());
                        window.location.href = `/date-form/?date=${dateParam}`;
                    } else {
                        // For single schedules, navigate to edit page
                        const scheduleId = schedule.id;
                        const dateParam = encodeURIComponent(schedule.date || getCurrentDateString());
                        window.location.href = `/schedule/edit/${scheduleId}/?date=${dateParam}`;
                    }
                });

                // Enhanced hover tooltip with better design and readability
                scheduleItem.addEventListener('mouseenter', function() {
                            const tooltip = document.createElement('div');
                            tooltip.className = 'schedule-tooltip-enhanced';

                            // Main header section
                            const header = document.createElement('div');
                            header.className = 'tooltip-header';

                            if (schedule.is_merged) {
                                header.innerHTML = `
                    <div class="tooltip-brand" style="color: ${schedule.brand_color || '#007bff'};">
                        ${schedule.brand_name || 'N/A'}
                    </div>
                    <div class="tooltip-room-time">
                        <span class="room-info">Room ${schedule.room || 'N/A'}</span>
                        <span class="time-info">${schedule.start_time || 'N/A'} - ${schedule.end_time || 'N/A'}</span>
                    </div>
                    <div class="tooltip-duration">總工時: <strong>${(schedule.duration || 0).toFixed(1)}小時</strong></div>
                `;
                            } else {
                                header.innerHTML = `
                    <div class="tooltip-person">
                        <strong>${schedule.person_name || 'N/A'}</strong>
                        ${schedule.person_nick_name ? `<span class="nickname">(${schedule.person_nick_name})</span>` : ''}
                    </div>
                    <div class="tooltip-brand" style="color: ${schedule.brand_color || '#007bff'};">
                        ${schedule.brand_name || 'N/A'}
                    </div>
                    <div class="tooltip-room-time">
                        <span class="room-info">Room ${schedule.room || 'N/A'}</span>
                        <span class="time-info">${schedule.start_time || 'N/A'} - ${schedule.end_time || 'N/A'}</span>
                    </div>
                `;
            }

            // Personnel section (for merged schedules)
            const personnel = document.createElement('div');
            personnel.className = 'tooltip-personnel';
            
            if (schedule.is_merged) {
                let personnelHTML = '';
                
                // Streamers section
                if (schedule.streamers && schedule.streamers.length > 0) {
                    personnelHTML += `
                        <div class="personnel-group">
                            <div class="group-header">
                                主播人員
                            </div>
                            <div class="group-members">
                    `;
                    schedule.streamers.forEach(streamer => {
                        const displayName = streamer.person_nick_name ?
                            `${streamer.person_name} <span class="nickname">(${streamer.person_nick_name})</span>` :
                            streamer.person_name;
                        personnelHTML += `<div class="member-item">${displayName}</div>`;
                    });
                    personnelHTML += '</div></div>';
                }

                // Operators section
                if (schedule.operators && schedule.operators.length > 0) {
                    personnelHTML += `
                        <div class="personnel-group">
                            <div class="group-header">
                                運營人員
                            </div>
                            <div class="group-members">
                    `;
                    schedule.operators.forEach(operator => {
                        const displayName = operator.person_nick_name ?
                            `${operator.person_name} <span class="nickname">(${operator.person_nick_name})</span>` :
                            operator.person_name;
                        personnelHTML += `<div class="member-item">${displayName} <span class="role-tag">${operator.role || '運營'}</span></div>`;
                    });
                    personnelHTML += '</div></div>';
                }
                
                personnel.innerHTML = personnelHTML;
            } else {
                // Single schedule role info
                personnel.innerHTML = `
                    <div class="role-info">
                        <span class="role-tag ${schedule.role === '主播' || schedule.role === 'Streamer' ? 'anchor-role' : 'operator-role'}">${schedule.role || 'N/A'}</span>
                        <span class="duration-info">${(schedule.duration || 0).toFixed(1)}小時</span>
                    </div>
                `;
            }

            // Status and alerts section
            const status = document.createElement('div');
            status.className = 'tooltip-status';
            let statusHTML = '';

            // Information completeness warnings
            let warnings = [];

            // Check for missing information
            if (schedule.is_merged) {
                // For merged schedules, check if we have both anchors and operators
                if (!schedule.anchors || schedule.anchors.length === 0) {
                    warnings.push('缺少主播資訊');
                }
                if (!schedule.operators || schedule.operators.length === 0) {
                    warnings.push('缺少運營資訊');
                }
                if (!schedule.brand_name || schedule.brand_name.trim() === '') {
                    warnings.push('缺少品牌資訊');
                }
                if (!schedule.room || schedule.room === 0) {
                    warnings.push('缺少房間資訊');
                }
            } else {
                // For single schedules
                if (!schedule.person_name || schedule.person_name.trim() === '') {
                    warnings.push('缺少人員資訊');
                }
                if (!schedule.role || schedule.role.trim() === '') {
                    warnings.push('缺少角色資訊');
                } else {
                    // Check if role is complete (should be either 主播 or 運營)
                    if (!['主播', 'anchor', 'Streamer', '運營', 'operator', 'Operator'].includes(schedule.role)) {
                        warnings.push('角色資訊不完整');
                    }
                }
                if (!schedule.brand_name || schedule.brand_name.trim() === '') {
                    warnings.push('缺少品牌資訊');
                }
                if (!schedule.room || schedule.room === 0) {
                    warnings.push('缺少房間資訊');
                }
            }

            // Add warnings to status HTML
            if (warnings.length > 0) {
                statusHTML += `
                    <div class="status-item warning-status">
                        <span class="status-text">資訊不完整: ${warnings.join(', ')}</span>
                    </div>
                `;
            }

            // Conflict warning
            if (schedule.hasConflict) {
                statusHTML += `
                    <div class="status-item conflict-status">
                        <span class="status-text">時間衝突</span>
                    </div>
                `;
            }

            // Modification status
            let modificationStatus;
            if (schedule.is_merged) {
                const statusSchedule = schedule.all_schedules && schedule.all_schedules.find(s => s.modification_status && s.modification_status !== 'normal');
                modificationStatus = statusSchedule ? statusSchedule.modification_status : null;
            } else {
                modificationStatus = schedule.modification_status;
            }

            if (modificationStatus && modificationStatus !== 'normal') {
                const statusConfig = {
                    'late': { text: '遲到', color: '#f39c12' },
                    'cancelled': { text: '取消', color: '#e74c3c' },
                    'other': { text: '其他', color: '#6c757d' }
                };
                const config = statusConfig[modificationStatus] || statusConfig['other'];
                statusHTML += `
                    <div class="status-item" style="color: ${config.color};">
                        <span class="status-text">${config.text}</span>
                    </div>
                `;
            }

            // Late cancellation
            if (schedule.is_late_cancellation) {
                statusHTML += `
                    <div class="status-item late-cancel-status">
                        <span class="status-text">延遲取消</span>
                    </div>
                `;
            }

            // Late hours
            if (schedule.late_hours && schedule.late_hours > 0) {
                statusHTML += `
                    <div class="status-item late-hours-status">
                        <span class="status-text">遲到時數: ${schedule.late_hours}小時</span>
                    </div>
                `;
            }

            status.innerHTML = statusHTML;

            // Additional info section
            const additionalInfo = document.createElement('div');
            additionalInfo.className = 'tooltip-additional';
            let additionalHTML = '';

            // Brand responsible person
            let brandResponsible;
            if (schedule.is_merged) {
                const brandResponsibleSchedule = schedule.all_schedules && schedule.all_schedules.find(s => s.brand_responsible);
                brandResponsible = brandResponsibleSchedule ? brandResponsibleSchedule.brand_responsible : null;
            } else {
                brandResponsible = schedule.brand_responsible;
            }

            if (brandResponsible) {
                additionalHTML += `
                    <div class="additional-item">
                        <span class="label">品牌負責人:</span>
                        <span class="value">${brandResponsible}</span>
                    </div>
                `;
            }

            // Modification time
            let modifiedAt;
            if (schedule.is_merged) {
                const modifiedSchedule = schedule.all_schedules && schedule.all_schedules.find(s => s.modified_at);
                modifiedAt = modifiedSchedule ? modifiedSchedule.modified_at : null;
            } else {
                modifiedAt = schedule.modified_at;
            }
            
            if (modifiedAt) {
                const modifiedDate = new Date(modifiedAt);
                const formattedTime = modifiedDate.toLocaleDateString('zh-TW') + ' ' + 
                                   modifiedDate.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });
                additionalHTML += `
                    <div class="additional-item">
                        <span class="label">最後修改:</span>
                        <span class="value">${formattedTime}</span>
                    </div>
                `;
            }

            additionalInfo.innerHTML = additionalHTML;

            // Assemble tooltip
            tooltip.appendChild(header);
            if (personnel.innerHTML.trim()) {
                tooltip.appendChild(personnel);
            }
            if (status.innerHTML.trim()) {
                tooltip.appendChild(status);
            }
            if (additionalInfo.innerHTML.trim()) {
                tooltip.appendChild(additionalInfo);
            }

            // Apply enhanced styling
            tooltip.style.cssText = `
                position: absolute;
                background: linear-gradient(145deg, #ffffff, #f8f9fa);
                color: #2c3e50;
                border: 2px solid #3498db;
                border-radius: 12px;
                padding: 0;
                font-size: 13px;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(52, 152, 219, 0.3);
                z-index: 10000;
                max-width: 320px;
                min-width: 280px;
                backdrop-filter: blur(10px);
                animation: tooltipFadeIn 0.2s ease-out;
                pointer-events: none;
            `;

            document.body.appendChild(tooltip);
            
            // Position tooltip
            const rect = scheduleItem.getBoundingClientRect();
            const tooltipRect = tooltip.getBoundingClientRect();
            
            // Smart positioning to avoid viewport edges
            let top = rect.top + window.scrollY - 10;
            let left = rect.right + window.scrollX + 10;
            
            // Adjust if tooltip goes off screen
            if (left + tooltipRect.width > window.innerWidth + window.scrollX) {
                left = rect.left + window.scrollX - tooltipRect.width - 10;
            }
            
            if (top + tooltipRect.height > window.innerHeight + window.scrollY) {
                top = rect.bottom + window.scrollY - tooltipRect.height + 10;
            }
            
            if (top < window.scrollY) {
                top = rect.bottom + window.scrollY + 10;
            }
            
            tooltip.style.top = `${top}px`;
            tooltip.style.left = `${left}px`;
            
            scheduleItem._tooltipEl = tooltip;
        });
        scheduleItem.addEventListener('mouseleave', function() {
            if (scheduleItem._tooltipEl) {
                scheduleItem._tooltipEl.remove();
                scheduleItem._tooltipEl = null;
            }
        });

        // 對衝突項目進行拖拽能力測試
        if (schedule.hasConflict) {
            // 延遲測試，確保所有樣式都已應用
            setTimeout(() => testConflictItemDragability(scheduleItem, schedule), 100);
        }

        return scheduleItem;
    }

    // 確保衝突項目可以拖拽的檢查函數
    function testConflictItemDragability(scheduleItem, schedule) {
        if (!schedule.hasConflict) return;
        
        console.log('Testing conflict item dragability for:', schedule.person_name);
        
        // 綜合測試
        const tests = {
            draggable: scheduleItem.draggable,
            dragAttribute: scheduleItem.getAttribute('draggable'),
            pointerEvents: getComputedStyle(scheduleItem).pointerEvents,
            cursor: getComputedStyle(scheduleItem).cursor,
            webkitUserDrag: getComputedStyle(scheduleItem).webkitUserDrag || scheduleItem.style.webkitUserDrag,
            userSelect: getComputedStyle(scheduleItem).userSelect,
            touchAction: getComputedStyle(scheduleItem).touchAction,
            hasConflictClass: scheduleItem.classList.contains('conflict'),
            hasDraggableConflictClass: scheduleItem.classList.contains('draggable-conflict')
        };
        
        console.log('Dragability test results:', tests);
        
        // 如果有任何測試失敗，重新強制設置
        if (!tests.draggable || tests.dragAttribute !== 'true' || tests.cursor !== 'grab') {
            console.warn('Conflict item failed dragability test, re-applying settings');
            
            // 重新強制設置所有屬性
            scheduleItem.draggable = true;
            scheduleItem.setAttribute('draggable', 'true');
            scheduleItem.style.cursor = 'grab !important';
            scheduleItem.style.pointerEvents = 'auto !important';
            scheduleItem.style.webkitUserDrag = 'element';
            scheduleItem.classList.add('draggable-conflict');
            
            // 移除可能干擾的事件監聽器
            scheduleItem.style.touchAction = 'none';
            
            console.log('Re-applied dragability settings for:', schedule.person_name);
        }
    }

    // Setup drop target for room groups
    function setupDropTarget(roomGroup, roomNumber) {
        roomGroup.addEventListener('dragover', function(e) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';

            // Calculate drop position within the room
            const rect = this.getBoundingClientRect();
            const mouseY = e.clientY - rect.top;

            // Convert mouse position to time slot
            const timeSlotHeight = 25; // 每個半小時段高度
            const halfHourSlot = Math.floor(mouseY / timeSlotHeight);
            const dropHour = Math.floor(halfHourSlot / 2);
            const dropMinutes = (halfHourSlot % 2) * 30;

            // Visual feedback for drop position
            showDropIndicator(this, mouseY);
        });

        roomGroup.addEventListener('dragleave', function(e) {
            // Remove drop indicator when leaving the drop zone
            const dropIndicator = this.querySelector('.drop-indicator');
            if (dropIndicator) {
                dropIndicator.remove();
            }
        });

        roomGroup.addEventListener('drop', function(e) {
            e.preventDefault();
            console.log('Item dropped on room:', roomNumber);

            let dropData;
            try {
                const dragText = e.dataTransfer.getData('text/plain');
                console.log('Raw drag data:', dragText);
                dropData = JSON.parse(dragText);
            } catch (error) {
                console.error('Failed to parse drop data:', error);
                console.error('Raw data:', e.dataTransfer.getData('text/plain'));
                return;
            }
            
            const rect = this.getBoundingClientRect();
            const mouseY = e.clientY - rect.top;

            // Calculate new time position
            const timeSlotHeight = 25;
            const halfHourSlot = Math.floor(mouseY / timeSlotHeight);
            const dropHour = Math.floor(halfHourSlot / 2);
            const dropMinutes = (halfHourSlot % 2) * 30;
            const newStartTime = `${dropHour.toString().padStart(2, '0')}:${dropMinutes.toString().padStart(2, '0')}`;

            // Calculate end time (preserve duration)
            const originalSchedule = dropData.scheduleData;
            const originalDurationMinutes = timeToMinutes(originalSchedule.end_time) - timeToMinutes(originalSchedule.start_time);
            const newEndTimeMinutes = (dropHour * 60 + dropMinutes) + originalDurationMinutes;
            const newEndHour = Math.floor(newEndTimeMinutes / 60);
            const newEndMinutes = newEndTimeMinutes % 60;
            const newEndTime = `${newEndHour.toString().padStart(2, '0')}:${newEndMinutes.toString().padStart(2, '0')}`;

            // Remove drop indicator
            const dropIndicator = this.querySelector('.drop-indicator');
            if (dropIndicator) {
                dropIndicator.remove();
            }

            // Handle the drop (keep original brand)
            handleScheduleDrop(dropData, roomNumber, originalSchedule.brand_name, newStartTime, newEndTime, mouseY);
        });
    }

    // Show visual indicator for drop position
    function showDropIndicator(roomGroup, mouseY) {
        // Remove existing indicator
        const existingIndicator = roomGroup.querySelector('.drop-indicator');
        if (existingIndicator) {
            existingIndicator.remove();
        }

        // Create new drop indicator
        const indicator = document.createElement('div');
        indicator.className = 'drop-indicator';
        indicator.style.cssText = `
            position: absolute;
            left: 0;
            right: 0;
            height: 3px;
            background-color: #007bff;
            border-radius: 1.5px;
            z-index: 1001;
            box-shadow: 0 0 5px rgba(0, 123, 255, 0.5);
            top: ${mouseY}px;
            pointer-events: none;
        `;

        roomGroup.appendChild(indicator);
    }

    // Add visual indicators to all drop zones
    function addDropZoneIndicators() {
        const roomGroups = document.querySelectorAll('.room-group');
        roomGroups.forEach(group => {
            group.style.border = '2px dashed #007bff';
            group.style.backgroundColor = 'rgba(0, 123, 255, 0.05)';
        });
    }

    // Remove visual indicators from all drop zones
    function removeDropZoneIndicators() {
        const roomGroups = document.querySelectorAll('.room-group');
        roomGroups.forEach(group => {
            group.style.border = '1px solid #dee2e6';
            group.style.backgroundColor = 'rgba(248, 249, 250, 0.9)';

            // Remove any remaining drop indicators
            const dropIndicator = group.querySelector('.drop-indicator');
            if (dropIndicator) {
                dropIndicator.remove();
            }
        });
    }

    // Clear all tooltips from the document
    function clearAllTooltips() {
        const allTooltips = document.querySelectorAll('.schedule-tooltip');
        allTooltips.forEach(tooltip => {
            tooltip.remove();
        });
        
        // Also clear tooltip references from schedule items
        const allScheduleItems = document.querySelectorAll('.schedule-item');
        allScheduleItems.forEach(item => {
            if (item._tooltipEl) {
                item._tooltipEl = null;
            }
        });
    }

    // Handle schedule drop and update
    function handleScheduleDrop(dropData, newRoom, newBrand, newStartTime, newEndTime, dropY) {
        const originalSchedule = dropData.scheduleData;

        // 立即清除所有 tooltip
        clearAllTooltips();

        console.log('Moving schedule:', {
            person: originalSchedule.person_name,
            from: `Room ${dropData.originalRoom} - ${dropData.originalBrand}`,
            to: `Room ${newRoom} - ${newBrand}`,
            originalTime: `${originalSchedule.start_time}-${originalSchedule.end_time}`,
            newTime: `${newStartTime}-${newEndTime}`
        });

        // Check if it's actually a move (not dropped in same place)
        if (dropData.originalRoom === newRoom &&
            dropData.originalBrand === newBrand &&
            originalSchedule.start_time === newStartTime) {
            console.log('No change detected, ignoring drop');
            showNotification('沒有變更，排班位置相同', 'info');
            return;
        }

        // Create updated schedule object - 只包含必要的屬性，避免循環引用
        const updatedSchedule = {
            id: originalSchedule.id,
            person_name: originalSchedule.person_name,
            person_nick_name: originalSchedule.person_nick_name,
            role: originalSchedule.role,
            brand_name: newBrand,
            brand_color: originalSchedule.brand_color,
            room: newRoom,
            start_time: newStartTime,
            end_time: newEndTime,
            duration: originalSchedule.duration,
            modification_status: originalSchedule.modification_status,
            is_late_cancellation: originalSchedule.is_late_cancellation,
            late_hours: originalSchedule.late_hours,
            is_merged: originalSchedule.is_merged,
            hasConflict: originalSchedule.hasConflict,
            // 只包含衝突計數，不包含循環引用的 conflicts 陣列
            conflictCount: originalSchedule.conflictCount || (originalSchedule.conflicts ? originalSchedule.conflicts.length : 0)
        };

        // 如果是合併排班，添加特殊標記和所有相關的排班ID
        if (originalSchedule.is_merged && originalSchedule.all_schedules) {
            updatedSchedule.is_merged_update = true;
            // 確保只包含有效的ID
            const validIds = originalSchedule.all_schedules
                .filter(s => s.id && s.id !== undefined && s.id !== null)
                .map(s => s.id);
            updatedSchedule.all_schedule_ids = validIds;
            console.log('=== MERGED SCHEDULE UPDATE DEBUG ===');
            console.log('Original merged schedule info:', {
                is_merged: originalSchedule.is_merged,
                all_schedules_count: originalSchedule.all_schedules.length,
                valid_ids_count: validIds.length,
                all_schedule_ids: updatedSchedule.all_schedule_ids
            });
            console.log('All schedules in merged group:', originalSchedule.all_schedules.map(s => ({
                id: s.id, 
                person: s.person_name, 
                role: s.role,
                start_time: s.start_time,
                end_time: s.end_time,
                room: s.room,
                brand_name: s.brand_name
            })));
            console.log('New time slot:', {from: `${originalSchedule.start_time}-${originalSchedule.end_time}`, to: `${newStartTime}-${newEndTime}`});
            console.log('New location:', {from: `Room ${dropData.originalRoom} - ${dropData.originalBrand}`, to: `Room ${newRoom} - ${newBrand}`});
            console.log('====================================');
            
            // 如果沒有有效的ID，則不應該作為合併更新處理
            if (validIds.length === 0) {
                console.warn('No valid IDs found for merged schedule, treating as single schedule update');
                updatedSchedule.is_merged_update = false;
                delete updatedSchedule.all_schedule_ids;
            }
        }

        // Show confirmation dialog
        const confirmMessage = `
確認移動排班？

人員: ${originalSchedule.person_name || originalSchedule.person_nick_name}
從: Room ${dropData.originalRoom} - ${dropData.originalBrand}
到: Room ${newRoom} - ${newBrand}
時間: ${originalSchedule.start_time}-${originalSchedule.end_time} → ${newStartTime}-${newEndTime}

點擊確定繼續，取消則恢復原位置。
        `;

        if (confirm(confirmMessage.trim())) {
            // Show loading notification
            showNotification('正在移動排班...', 'info');

            // Update the schedule
            updateScheduleOnServer(updatedSchedule)
                .then(success => {
                    if (success) {
                        // Clear any lingering tooltips
                        clearAllTooltips();
                        
                        // Update local data - 使用正確的標識符
                        let scheduleIdentifier = dropData.scheduleId;
                        
                        // 對於合併排班，使用特殊的標識
                        if (originalSchedule.is_merged) {
                            scheduleIdentifier = `merged-${originalSchedule.id}`;
                            console.log('Using merged schedule identifier:', scheduleIdentifier);
                        }
                        
                        const updated = updateLocalScheduleData(scheduleIdentifier, updatedSchedule);

                        // Refresh the timeline display for current date
                        const currentDateStr = getCurrentDateString();
                        loadSchedulesForDate(currentDateStr).then(() => {
                            showNotification('✅ 排班移動成功！', 'success');
                        });

                        console.log('Schedule move completed successfully');
                    } else {
                        showNotification('❌ 移動失敗，請檢查網路連接後重試', 'error');
                        // Optionally refresh to restore original state
                        const currentDateStr = getCurrentDateString();
                        loadSchedulesForDate(currentDateStr);
                    }
                })
                .catch(error => {
                    console.error('Error updating schedule:', error);
                    showNotification('❌ 移動失敗：' + (error.message || '未知錯誤'), 'error');
                    // Refresh to restore original state
                    const currentDateStr = getCurrentDateString();
                    loadSchedulesForDate(currentDateStr);
                });
        } else {
            console.log('User cancelled the move operation');
            showNotification('移動操作已取消', 'info');
        }
    }

    // Update schedule on server
    async function updateScheduleOnServer(updatedSchedule) {
        try {
            console.log('Updating schedule on server:', updatedSchedule);
            console.log('Schedule ID:', updatedSchedule.id, 'Type:', typeof updatedSchedule.id);
            console.log('Is merged update:', updatedSchedule.is_merged_update);
            console.log('All schedule IDs:', updatedSchedule.all_schedule_ids);
            
            const response = await fetch('/api/update-schedule/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCsrfToken()
                },
                body: safeStringify(updatedSchedule)
            });            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    console.log('Schedule updated successfully:', result.data);
                    return true;
                } else {
                    console.error('Failed to update schedule:', result.error);
                    return false;
                }
            } else {
                const errorData = await response.json();
                console.error('HTTP error:', response.status, errorData);
                return false;
            }

        } catch (error) {
            console.error('Network error updating schedule:', error);
            return false;
        }
    }

    // Update local schedule data
    function updateLocalScheduleData(scheduleId, updatedSchedule) {
        let updated = false;

        console.log('Updating local schedule data:', {
            scheduleId,
            is_merged_update: updatedSchedule.is_merged_update,
            all_schedule_ids: updatedSchedule.all_schedule_ids
        });

        // Handle merged schedule update
        if (updatedSchedule.is_merged_update && updatedSchedule.all_schedule_ids) {
            console.log('Processing merged schedule local update for IDs:', updatedSchedule.all_schedule_ids);
            
            // Update all schedules in the merged group
            Object.keys(schedulesData).forEach(date => {
                const schedules = schedulesData[date];
                updatedSchedule.all_schedule_ids.forEach(id => {
                    const scheduleIndex = schedules.findIndex(s => s.id && s.id.toString() === id.toString());
                    if (scheduleIndex !== -1) {
                        // Update individual schedule with new data
                        schedulesData[date][scheduleIndex] = {
                            ...schedulesData[date][scheduleIndex],
                            room: updatedSchedule.room,
                            brand_name: updatedSchedule.brand_name,
                            start_time: updatedSchedule.start_time,
                            end_time: updatedSchedule.end_time,
                            modified_at: updatedSchedule.modified_at || new Date().toISOString(),
                            modification_status: 'modified'
                        };
                        console.log(`Updated merged schedule component: ID ${id} in date ${date}`);
                        updated = true;
                    }
                });
            });
        } else {
            // Single schedule update (original logic)
            Object.keys(schedulesData).forEach(date => {
                const schedules = schedulesData[date];
                const scheduleIndex = schedules.findIndex(s => {
                    // Try multiple matching strategies
                    if (s.id && s.id.toString() === scheduleId) return true;
                    if (`${s.person_name}-${s.start_time}-${s.room}` === scheduleId) return true;
                    if (s.person_name === updatedSchedule.person_name &&
                        s.start_time === updatedSchedule.start_time &&
                        s.room === updatedSchedule.room) return true;
                    return false;
                });

                if (scheduleIndex !== -1) {
                    // Update the existing schedule with new data
                    schedulesData[date][scheduleIndex] = {
                        ...schedulesData[date][scheduleIndex],
                        ...updatedSchedule
                    };
                    console.log('Updated local schedule data for date:', date, 'at index:', scheduleIndex);
                    updated = true;
                }
            });
        }

        if (!updated) {
            console.warn('Could not find schedule to update in local data:', scheduleId);
            // Add to current date if not found
            const currentDateStr = getCurrentDateString();
            if (!schedulesData[currentDateStr]) {
                schedulesData[currentDateStr] = [];
            }
            schedulesData[currentDateStr].push(updatedSchedule);
            console.log('Added new schedule to current date:', currentDateStr);
        }

        return updated;
    }

    // Get current date string
    function getCurrentDateString() {
        return currentDate.toISOString().split('T')[0];
    }

    // Get CSRF token for API calls
    function getCsrfToken() {
        // Try multiple methods to get CSRF token
        let token = null;

        // Method 1: Look for CSRF token in a hidden input
        const tokenInput = document.querySelector('[name=csrfmiddlewaretoken]');
        if (tokenInput) {
            token = tokenInput.value;
        }

        // Method 2: Look for CSRF token in meta tag
        if (!token) {
            const tokenMeta = document.querySelector('meta[name="csrf-token"]');
            if (tokenMeta) {
                token = tokenMeta.getAttribute('content');
            }
        }

        // Method 3: Get from cookie
        if (!token) {
            const cookies = document.cookie.split(';');
            for (let cookie of cookies) {
                const [name, value] = cookie.trim().split('=');
                if (name === 'csrftoken') {
                    token = value;
                    break;
                }
            }
        }

        if (!token) {
            console.warn('CSRF token not found - API calls may fail');
        }

        return token || '';
    }

    // Show notification to user
    function showNotification(message, type = 'info', duration = 3000) {
        // Remove existing notifications of the same type
        const existingNotifications = document.querySelectorAll('.drag-notification');
        existingNotifications.forEach(notification => {
            if (notification.getAttribute('data-type') === type) {
                notification.remove();
            }
        });

        // Create notification element
        const notification = document.createElement('div');
        notification.className = 'drag-notification';
        notification.setAttribute('data-type', type);

        // Set background color based on type
        let backgroundColor;
        let icon;
        switch (type) {
            case 'success':
                backgroundColor = '#28a745';
                icon = '✅';
                break;
            case 'error':
                backgroundColor = '#dc3545';
                icon = '❌';
                duration = 5000; // Show errors longer
                break;
            case 'warning':
                backgroundColor = '#ffc107';
                icon = '⚠️';
                break;
            default:
                backgroundColor = '#007bff';
                icon = 'ℹ️';
        }

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
            background-color: ${backgroundColor};
            transition: all 0.3s ease;
            transform: translateX(100%);
            opacity: 0;
            font-size: 14px;
            line-height: 1.4;
            border-left: 4px solid rgba(255, 255, 255, 0.3);
        `;

        // Add icon and message
        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 16px;">${icon}</span>
                <span>${message}</span>
            </div>
        `;

        // Add to page
        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
            notification.style.opacity = '1';
        }, 10);

        // Auto remove after specified duration
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, duration);

        // Add click to dismiss
        notification.addEventListener('click', () => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        });
    }

    // Show/hide loading indicator
    function showLoading(show) {
        if (loadingIndicator) {
            loadingIndicator.style.display = show ? 'block' : 'none';
        }
    }

    // Event listener for date change
    if (timelineDate) {
        timelineDate.addEventListener('change', async function() {
            const selectedDate = this.value;
            currentDate = new Date(selectedDate);

            // Recreate timeline with new date
            createTimelineStructure();

            // Load schedules for all visible dates (7 days)
            setTimeout(async() => {
                for (let dayOffset = -3; dayOffset <= 3; dayOffset++) {
                    const date = new Date(currentDate);
                    date.setDate(date.getDate() + dayOffset);
                    const dateString = date.toISOString().split('T')[0];
                    await loadSchedulesForDate(dateString);
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

        const timeSlot = document.querySelector(`[data-half-hour="${currentHalfHour}"]`);

        if (timeSlot) {
            const offsetTop = timeSlot.offsetTop - window.innerHeight / 2;
            window.scrollTo(0, Math.max(0, offsetTop));
        }
    }

    // Initialize everything
    initializeTimeline();

    // Auto-scroll to current time after a short delay
    setTimeout(() => {
        scrollToCurrentTime();
    }, 500);
});