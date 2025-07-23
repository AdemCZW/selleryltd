function showNotification(message, type = "success") {
    const notification = document.getElementById("notification");
    const notificationText = document.getElementById("notification-text");

    notificationText.textContent = message;
    notification.className = `notification ${type}`;
    notification.classList.add("show");

    setTimeout(() => {
        notification.classList.remove("show");
    }, 2500);
}

function checkForNotifications() {
    const urlParams = new URLSearchParams(window.location.search);
    const status = urlParams.get("status");

    if (status === "added") {
        showNotification("✅ 排班新增成功！", "success");
    } else if (status === "deleted") {
        showNotification("🗑️ 排班刪除成功！", "delete");
    } else if (status === "error") {
        showNotification("❌ 操作失敗，請重試", "error");
    }

    // 清理 URL 參數
    if (status) {
        const url = new URL(window.location);
        url.searchParams.delete("status");
        window.history.replaceState({}, "", url);
    }
}

document.addEventListener("DOMContentLoaded", () => {
            // 頁面載入時檢查通知
            checkForNotifications();

            const weekRange = document.getElementById("week-range");
            const calendarBody = document.getElementById("calendar-body");
            const prevBtn = document.getElementById("prev-week");
            const nextBtn = document.getElementById("next-week");
            const selectedDateSection = document.getElementById("selected-date-section");
            const selectedDateSpan = document.getElementById("selected-date");
            const employeeRoleSection = document.getElementById("employee-role-section");
            const empSelect = document.getElementById("employee-select");
            const timeSection = document.getElementById("time-section");
            const startTimeInput = document.getElementById("start-time");
            const endTimeInput = document.getElementById("end-time");
            const cancelSidebar = document.getElementById("cancel-sidebar");
            const sidebarClose = document.getElementById("sidebar-close");
            const otherReasonContainer = document.getElementById(
                "other-reason-container"
            );
            const otherReasonInput = document.getElementById("other-reason-input");
            const lateHoursContainer = document.getElementById("late-hours-container");
            const lateHoursInput = document.getElementById("late-hours-input");

            document.querySelectorAll('input[name="cancel-reason"]').forEach((radio) => {
                radio.addEventListener("change", function() {
                    // Toggle other reason and late hours inputs
                    if (this.id === "reason-other" && this.checked) {
                        otherReasonContainer.style.display = "block";
                    } else {
                        otherReasonContainer.style.display = "none";
                    }
                    if (this.id === "reason-late" && this.checked) {
                        lateHoursContainer.style.display = "block";
                    } else {
                        lateHoursContainer.style.display = "none";
                    }
                });
            });

            // 點擊側邊欄關閉按鈕
            sidebarClose.addEventListener("click", () => {
                cancelSidebar.style.transform = "translateX(100%)";
                setTimeout(() => {
                    cancelSidebar.style.display = "none";
                }, 300); // 等動畫結束
            });

            // 確認取消按鈕事件
            document
                .getElementById("confirm-cancel-btn")
                .addEventListener("click", function() {
                    // Determine late hours if applicable
                    let lateHours = 0;
                    const date = document.getElementById("cancel-date-text").textContent;
                    const room = document.querySelector("#cancel-schedule-details table")
                        .dataset.room;
                    const reasonRadio = document.querySelector(
                        'input[name="cancel-reason"]:checked'
                    );
                    let reason = reasonRadio ? reasonRadio.value : "cancel";
                    let otherReason = "";
                    if (reason === "late") {
                        const parsed = parseFloat(lateHoursInput.value);
                        lateHours = isNaN(parsed) ? 0 : parsed;
                    }

                    if (reason === "other") {
                        otherReason = document
                            .getElementById("other-reason-input")
                            .value.trim();
                        if (!otherReason) {
                            showNotification("❌ 請輸入其他原因", "error");
                            return;
                        }
                    }

                    if (
                        confirm(
                            `確定要以 "${reasonRadio.labels[0].textContent}" 為由，取消 ${date} 房間 ${room} 的排班嗎？`
                        )
                    ) {
                        fetch("/cancel-schedule/", {
                                method: "POST",
                                headers: {
                                    "Content-Type": "application/json",
                                    "X-CSRFToken": "{{ csrf_token }}",
                                },
                                body: JSON.stringify({
                                    date: date,
                                    room: room,
                                    reason: reason,
                                    other_reason: otherReason,
                                    late_hours: lateHours
                                }),
                            })
                            .then((response) => response.json())
                            .then((data) => {
                                if (data.success) {
                                    showNotification("✅ 操作成功！", "success");
                                    setTimeout(() => window.location.reload(), 1000);
                                } else {
                                    showNotification("❌ " + (data.error || "操作失敗"), "error");
                                }
                            })
                            .catch((error) => {
                                console.error("Error:", error);
                                showNotification("❌ 網路錯誤", "error");
                            });
                    }
                });

            // Build schedulesByDate mapping from Django context
            // 從 json_script 取得排班資料
            // 從 json_script 取得排班資料
            let schedulesByDate = {};
            const schedulesEl = document.getElementById("schedules-data");
            if (schedulesEl) {
                try {
                    schedulesByDate = JSON.parse(schedulesEl.textContent);
                } catch (e) {
                    console.error("Invalid schedules-data JSON", e);
                    schedulesByDate = {};
                }
            }

            const months = [
                "一月",
                "二月",
                "三月",
                "四月",
                "五月",
                "六月",
                "七月",
                "八月",
                "九月",
                "十月",
                "十一月",
                "十二月",
            ];
            // 使用 body data-attribute 作為初始日期，若無則使用今天
            const selectedDateParam = document.body.dataset.selectedDate || "";
            const today = new Date();
            const initialDate = selectedDateParam ?
                new Date(selectedDateParam) :
                new Date();
            // 計算本週一
            function getMonday(d) {
                d = new Date(d);
                const day = d.getDay(),
                    diff = d.getDate() - day + (day === 0 ? -6 : 1);
                return new Date(d.setDate(diff));
            }
            // 設定週一起始：若指定日期則以該日期為週 否則以今天為週
            let currentMonday = getMonday(initialDate);

            function resetSelections() {
                employeeRoleSection.style.display = "none";
                empSelect.selectedIndex = 0;
                document
                    .querySelectorAll('input[name="role-radio"]')
                    .forEach((r) => (r.checked = false));
                timeSection.style.display = "none";
                if (startTimeInput) startTimeInput.value = "09:00";
                if (endTimeInput) endTimeInput.value = "18:00";
                document.getElementById("form-date").value = "";
                document.getElementById("form-person").value = "";
                document.getElementById("form-role").value = "";
                document.getElementById("form-start-time").value = "";
                document.getElementById("form-end-time").value = "";
                document.getElementById("room-input").value = 0;
            }

            empSelect.addEventListener("change", function() {
                if (this.value) {
                    document.getElementById("form-person").value = this.value;
                    // 當選擇員工時，檢查是否已選擇類型來決定是否顯示時間段
                    const checkedRole = document.querySelector(
                        'input[name="role-radio"]:checked'
                    );
                    if (checkedRole) {
                        timeSection.style.display = "";
                    }
                } else {
                    document
                        .querySelectorAll('input[name="role-radio"]')
                        .forEach((r) => (r.checked = false));
                    timeSection.style.display = "none";
                    if (startTimeInput) startTimeInput.value = "09:00";
                    if (endTimeInput) endTimeInput.value = "18:00";
                    document.getElementById("form-person").value = "";
                    document.getElementById("form-role").value = "";
                }
            });

            document.querySelectorAll('input[name="role-radio"]').forEach((radio) => {
                radio.addEventListener("change", function() {
                    if (this.checked) {
                        document.getElementById("form-role").value = this.value;
                        // 當選擇類型時，檢查是否已選擇員工來決定是否顯示時間段
                        if (empSelect.value) {
                            timeSection.style.display = "";
                        }
                    }
                });
            });

            function renderWeek(monday) {
                // 顯示本週區間
                const weekDates = [];
                let weekStr = "";
                let row = document.createElement("tr");
                for (let i = 0; i < 7; i++) {
                    const d = new Date(monday);
                    d.setDate(monday.getDate() + i);
                    weekDates.push(d);
                    const cell = document.createElement("td");
                    // 使用本地年月日格式 yyyy-MM-dd，避免 toISOString 時區偏移
                    const year = d.getFullYear();
                    const month = String(d.getMonth() + 1).padStart(2, "0");
                    const day = String(d.getDate()).padStart(2, "0");
                    const dateStr = `${year}-${month}-${day}`;
                    // 日期圓圈
                    cell.innerHTML = `<span class=\"calendar-day-span\" data-date=\"${dateStr}\">${d.getDate()}</span>`;
                    if (d.toDateString() === today.toDateString()) {
                        cell.querySelector("span").classList.add("calendar-today");
                    }
                    if (i === 5) cell.querySelector("span").classList.add("calendar-sat");
                    if (i === 6) cell.querySelector("span").classList.add("calendar-sun");
                    cell.querySelector("span").addEventListener("click", function() {
                        document
                            .querySelectorAll(".calendar-selected")
                            .forEach((e) => e.classList.remove("calendar-selected"));
                        this.classList.add("calendar-selected");
                        selectedDateSection.style.display = "";
                        selectedDateSpan.textContent = dateStr;
                        document.getElementById("form-date").value = dateStr;
                        // 更新 URL 參數以維持所選日期
                        const newUrl = `${window.location.pathname}?date=${dateStr}`;
                        window.history.replaceState({}, "", newUrl);
                        employeeRoleSection.style.display = "";
                        empSelect.selectedIndex = 0;
                        document
                            .querySelectorAll('input[name="role-radio"]')
                            .forEach((r) => (r.checked = false));
                        timeSection.style.display = "none";
                        document.getElementById("form-start-time").value = startTimeInput.value;
                        document.getElementById("form-end-time").value = endTimeInput.value;
                        // 更新右側排班列表
                        const scheduleList = document.getElementById("schedule-list");
                        scheduleList.innerHTML = "";
                        const daySchedules = schedulesByDate[dateStr] || [];
                        if (daySchedules.length) {
                            daySchedules.forEach((s) => {
                                const tr = document.createElement("tr");
                                const roleClass =
                                    s.role === "主播" ?
                                    "anchor-role" :
                                    s.role === "運營" ?
                                    "operator-role" :
                                    "";
                                tr.innerHTML = `
                                        <td>${s.person_name}</td>
                                        <td>${s.brand_name}</td>
                                        <td class="${roleClass}">${s.role}</td>
                                        <td>${s.start_time} - ${s.end_time}</td>
                                        <td>${s.duration.toFixed(2)}</td>
                                        <td>${s.room}</td>
                                        <td>
                                            <a href="/schedule/edit/${
                                              s.id
                                            }/?date=${dateStr}" class="text-primary me-2">編輯</a>
                                            <a href="#" class="text-danger delete-schedule" data-schedule-id="${
                                              s.id
                                            }" data-date="${dateStr}">刪除</a>
                                        </td>
                                    `;
                                scheduleList.appendChild(tr);
                            });

                            // 添加刪除事件監聽器
                            document.querySelectorAll(".delete-schedule").forEach((link) => {
                                link.addEventListener("click", function(e) {
                                    e.preventDefault();
                                    const scheduleId = this.dataset.scheduleId;
                                    const date = this.dataset.date;

                                    if (confirm("確定要刪除這個排班嗎？")) {
                                        fetch(`/date-form/delete/${scheduleId}/`, {
                                                method: "POST",
                                                headers: {
                                                    "X-Requested-With": "XMLHttpRequest",
                                                    "X-CSRFToken": document.querySelector(
                                                        "[name=csrfmiddlewaretoken]"
                                                    ).value,
                                                },
                                            })
                                            .then((response) => response.json())
                                            .then((data) => {
                                                if (data.success) {
                                                    showNotification("🗑️ 排班刪除成功！", "delete");
                                                    // 重新載入頁面資料
                                                    window.location.reload();
                                                } else {
                                                    showNotification(
                                                        "❌ " + (data.error || "刪除失敗，請重試"),
                                                        "error"
                                                    );
                                                }
                                            })
                                            .catch((error) => {
                                                console.error("Error:", error);
                                                showNotification("❌ 網路錯誤，請重試", "error");
                                            });
                                    }
                                });
                            });
                        } else {
                            const tr = document.createElement("tr");
                            tr.innerHTML = '<td colspan="7">無排班資料。</td>';
                            scheduleList.appendChild(tr);
                        }
                    });
                    row.appendChild(cell);
                }
                calendarBody.innerHTML = "";
                calendarBody.appendChild(row);
                // 週區間顯示
                const start = weekDates[0];
                const end = weekDates[6];
                weekStr = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(start.getDate()).padStart(
      2,
      "0"
    )} ~ ${end.getFullYear()}-${String(end.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(end.getDate()).padStart(2, "0")}`;
                weekRange.textContent = weekStr;
                // 更新本週排班總覽（橫向，cell 內直向顯示主播/運營）
                const headerRow = document.getElementById("weekly-summary-header");
                const bodyRow = document.getElementById("weekly-summary-body");
                if (headerRow && bodyRow) {
                    headerRow.innerHTML = "";
                    bodyRow.innerHTML = "";
                    weekDates.forEach((d) => {
                                const y = d.getFullYear();
                                const m = String(d.getMonth() + 1).padStart(2, "0");
                                const dd = String(d.getDate()).padStart(2, "0");
                                const ds = `${y}-${m}-${dd}`;
                                // Get schedules for this date and filter by selected brand if any
                                let list = schedulesByDate[ds] || [];
                                const brandSelectEl = document.getElementById('brand-select');
                                const selectedBrandText = brandSelectEl && brandSelectEl.value ?
                                    brandSelectEl.options[brandSelectEl.selectedIndex].text :
                                    null;
                                if (selectedBrandText) {
                                    list = list.filter(s => s.brand_name === selectedBrandText);
                                }
                                const anchorNames =
                                    list
                                    .filter((s) => s.role === "主播")
                                    .map((s) => `${s.person_name} (房${s.room})`)
                                    .join("<br>") || "無";
                                const opNames =
                                    list
                                    .filter((s) => s.role === "運營")
                                    .map((s) => `${s.person_name} (房${s.room})`)
                                    .join("<br>") || "無";
                                // 表頭日期
                                const th = document.createElement("th");
                                th.textContent = ds;
                                headerRow.appendChild(th);
                                // 表身 cell：垂直顯示主播 & 運營
                                const td = document.createElement("td");
                                // 依房間分類，每房間顯示主播 & 運營
                                {
                                    const rooms = Array.from(new Set(list.map((s) => s.room))).sort(
                                        (a, b) => a - b
                                    );
                                    let html = "";
                                    rooms.forEach((room) => {
                                                const anchors =
                                                    list
                                                    .filter((s) => s.role === "主播" && s.room === room)
                                                    .map((s) => `${s.person_name}`)
                                                    .join("<br>") || "無";
                                                const ops =
                                                    list
                                                    .filter((s) => s.role === "運營" && s.room === room)
                                                    .map((s) => `${s.person_name}`)
                                                    .join("<br>") || "無";

                                                // 获取主播的时间作为基准时间
                                                const anchorTimes = list.filter(
                                                    (s) => s.role === "主播" && s.room === room
                                                );
                                                const timeInfo =
                                                    anchorTimes.length > 0 ?
                                                    anchorTimes
                                                    .map((s) => `${s.start_time}-${s.end_time}`)
                                                    .join(", ") :
                                                    "";

                                                // 房间编号旁边显示时间
                                                const roomTitle = `房間 ${room}${
              timeInfo ? " (" + timeInfo + ")" : ""
            }`;

                                                // 檢查此房間是否有任何延遲取消的排班
                                                const isLateCancelled = list.some(
                                                    (s) => s.room === room && s.is_late_cancellation
                                                );
                                                // 檢查班表是否已完成（未取消且最晚結束時間已過）
                                                const roomSchedules = list.filter((s) => s.room === room);
                                                // Get current playing brand for this room
                                                const brandName = roomSchedules.length > 0 ? roomSchedules[0].brand_name : '';
                                                const brandColor = roomSchedules.length > 0 ? roomSchedules[0].brand_color : '';
                                                // Determine the latest end_time for this room
                                                const endTimes = roomSchedules.map((s) => s.end_time).filter(Boolean);
                                                const latestEndTime = endTimes.length ?
                                                    endTimes.reduce((a, b) => (a > b ? a : b)) :
                                                    '';
                                                const isCompleted = !isLateCancelled &&
                                                    latestEndTime &&
                                                    new Date(`${ds}T${latestEndTime}`) < new Date();

                                                html += `
                                        <div class="room-schedule-block room-${room}" data-room="${room}" data-date="${ds}">
                                            ${
                                              isLateCancelled
                                                ? '<span class="late-cancel-warning" title="此時段有延遲取消的紀錄">!</span>'
                                                : ""
                                            }
                                            ${
                                              isCompleted
                                                ? '<span class="complete-check" title="此時段已完成">✔</span>'
                                                : ""
                                            }
                                            <span class="close-btn" style="position:absolute;bottom:-8px;right:-8px;width:24px;height:24px;background-color:rgba(0,0,0,0.6);border:2px solid var(--tech-accent1);border-radius:50%;display:flex;align-items:center;justify-content:center;color:var(--tech-accent1);cursor:pointer;z-index:10;">&times;</span>
                                            <!-- 打開取消直播側邊欄 -->
                                            <div class="room-header">${roomTitle}</div>
                                            <div class="roles-container">
                                                <div class="role-column">
                                                    <strong class="anchor-role">主播</strong>
                                                    <div class="role-content anchor-content">${anchors}</div>
                                                </div>
                                                <div class="role-separator"></div>
                                                <div class="role-column">
                                                    <strong class="operator-role">運營</strong>
                                                    <div class="role-content operator-content">${ops}</div>
                                                </div>
                                            </div>
                                            ${brandName ? `<div class="room-brand-name" style="color: ${brandColor}; border-color: ${brandColor};">${brandName}</div>` : ''}
                                        </div>
                                    `;
                    });
                    if (html === "") {
                        html = '<div class="no-schedule">無排班</div>';
                    }
                    td.innerHTML = html;
                }
                bodyRow.appendChild(td);
            });
        }
        // 更新本週已加入的品牌顯示
        (function updateCurrentBrands() {
            // 統計每個品牌的本週總時數
            const brandTimeMap = {};
            const brandColorMap = {};
            weekDates.forEach((d) => {
                const y = d.getFullYear();
                const m = String(d.getMonth() + 1).padStart(2, '0');
                const dd = String(d.getDate()).padStart(2, '0');
                const ds = `${y}-${m}-${dd}`;
                const list = schedulesByDate[ds] || [];
                list.forEach((s) => {
                    if (s.brand_name) {
                        // Only count anchor durations
                        if (s.role === '主播') {
                            if (!brandTimeMap[s.brand_name]) brandTimeMap[s.brand_name] = 0;
                            brandTimeMap[s.brand_name] += s.duration || 0;
                        }
                        // Record brand color once
                        if (s.brand_color && !brandColorMap[s.brand_name]) {
                            brandColorMap[s.brand_name] = s.brand_color;
                        }
                    }
                });
            });
            const brandsArray = Object.keys(brandTimeMap);
            const brandsEl = document.getElementById('current-brands');
            if (brandsEl) {
                brandsEl.classList.add('brand-hours-list');
                if (brandsArray.length) {
                    brandsEl.innerHTML = brandsArray.map(b => {
                        const color = brandColorMap[b] || '#0a1a2f';
                        return `<span class="brand-hours-item" style="background:none;border:none;color:${color}"><span class="brand-icon">🏷️</span><span class="brand-name" style="color:${color}">${b}</span> <span class="brand-hours-value" style="color:${color}">${brandTimeMap[b].toFixed(1)} 小時</span></span>`;
                    }).join('');
                } else {
                    brandsEl.innerHTML = '<span class="brand-hours-item">無品牌</span>';
                }
            }
        })();
    }

    renderWeek(currentMonday);
    // Bind close button to open cancel sidebar
    function bindCancelSidebarEvents() {
        document.querySelectorAll(".close-btn").forEach((btn) => {
            btn.addEventListener("click", function() {
                const roomBlock = this.closest(".room-schedule-block");
                const date = roomBlock.dataset.date;
                const room = roomBlock.dataset.room;
                document.getElementById("cancel-date-text").textContent = date;

                const scheduleDetailsContainer = document.getElementById(
                    "cancel-schedule-details"
                );
                scheduleDetailsContainer.innerHTML = ""; // 清空舊內容

                let schedules = schedulesByDate[date] || [];
                let roomSchedules = schedules.filter((s) => s.room == room);

                const personSelectContainer = document.getElementById("person-select-container");
                const personSelect = document.getElementById("cancel-person-select");

                if (roomSchedules.length > 0) {
                    const table = document.createElement("table");
                    table.className = "table table-dark table-striped";
                    table.dataset.room = room; // 將 room 存儲在 table 的 dataset 中
                    table.innerHTML = `
                                    <thead>
                                        <tr>
                                            <th>員工</th>
                                            <th>類型</th>
                                            <th>時段</th>
                                            <th>時數</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                    </tbody>
                                `;
                    const tbody = table.querySelector("tbody");
                    roomSchedules.forEach((s) => {
                        const tr = document.createElement("tr");
                        const roleClass =
                            s.role === "主播" ?
                            "anchor-role" :
                            s.role === "運營" ?
                            "operator-role" :
                            "";
                        tr.innerHTML = `
                                        <td>${s.person_name}</td>
                                        <td class="${roleClass}">${s.role}</td>
                                        <td>${s.start_time} - ${s.end_time}</td>
                                        <td>${s.duration.toFixed(2)}</td>
                                    `;
                        tbody.appendChild(tr);
                    });
                    scheduleDetailsContainer.appendChild(table);

                    // Populate person select options
                    personSelect.innerHTML = "";
                    roomSchedules.forEach((s) => {
                        const opt = document.createElement("option");
                        opt.value = s.id;
                        opt.textContent = s.person_name;
                        personSelect.appendChild(opt);
                    });
                    personSelectContainer.style.display = "block";
                } else {
                    scheduleDetailsContainer.textContent = "無排班資料。";
                    personSelectContainer.style.display = "none";
                }

                // 顯示側邊欄
                const cancelSidebar = document.getElementById("cancel-sidebar");
                cancelSidebar.style.display = "block";
                cancelSidebar.style.transform = "translateX(0)";
            });
        });
    }
    bindCancelSidebarEvents();

    prevBtn.addEventListener("click", () => {
        currentMonday.setDate(currentMonday.getDate() - 7);
        resetSelections();
        renderWeek(currentMonday);
        // Re-bind close button after week change
        bindCancelSidebarEvents();
    });
    nextBtn.addEventListener("click", () => {
        currentMonday.setDate(currentMonday.getDate() + 7);
        resetSelections();
        renderWeek(currentMonday);
        // Re-bind close button after week change
        bindCancelSidebarEvents();
    });

    startTimeInput.addEventListener("change", function() {
        document.getElementById("form-start-time").value = this.value;
    });
    endTimeInput.addEventListener("change", function() {
        document.getElementById("form-end-time").value = this.value;
    });

    // 表單提交處理
    const scheduleForm = document.getElementById("schedule-upload-form");
    if (scheduleForm) {
        scheduleForm.addEventListener("submit", function(e) {
            e.preventDefault();

            const formData = new FormData(this);

            fetch(this.action || window.location.pathname, {
                    method: "POST",
                    body: formData,
                    headers: {
                        "X-Requested-With": "XMLHttpRequest",
                    },
                })
                .then((response) => response.json())
                .then((data) => {
                    if (data.success) {
                        showNotification("✅ 排班新增成功！", "success");
                        // 重新整理當前頁面以顯示更新後的排班
                        setTimeout(() => {
                            window.location.reload();
                        }, 1000);
                    } else {
                        showNotification(
                            "❌ " + (data.error || "操作失敗，請重試"),
                            "error"
                        );
                    }
                })
                .catch((error) => {
                    console.error("Error:", error);
                    showNotification("❌ 網路錯誤，請重試", "error");
                });
        }); // end scheduleForm.addEventListener
    } // end if(scheduleForm)

    // 監聽取消直播側邊欄的原因選擇
    document.querySelectorAll('input[name="cancel-reason"]').forEach((radio) => {
        radio.addEventListener("change", function() {
            const otherReasonContainer = document.getElementById(
                "other-reason-container"
            );
            if (this.value === "other") {
                otherReasonContainer.style.display = "";
                document.getElementById("other-reason-input").focus();
            } else {
                otherReasonContainer.style.display = "none";
            }
        });
    });

    // 更新本週總覽旁邊的當前品牌顯示
    const brandSelect = document.getElementById('brand-select');
    const currentBrandEl = document.getElementById('current-brand');
    if (brandSelect && currentBrandEl) {
        // 初始顯示
        const getBrandText = () =>
            brandSelect.value ?
            brandSelect.options[brandSelect.selectedIndex].text :
            '全部品牌';
        currentBrandEl.textContent = getBrandText();
        brandSelect.addEventListener('change', () => {
            currentBrandEl.textContent = getBrandText();
            // 重新渲染每週總覽
            renderWeek(currentMonday);
        });
    }
}); // end DOMContentLoaded listener