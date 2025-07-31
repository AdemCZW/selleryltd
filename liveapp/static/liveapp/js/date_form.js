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
        showNotification("✅ Schedule added successfully!", "success");
    } else if (status === "deleted") {
        showNotification("🗑️ Schedule deleted successfully!", "delete");
    } else if (status === "error") {
        showNotification("❌ Operation failed, please try again", "error");
    }

    // Clean URL parameters
    if (status) {
        const url = new URL(window.location);
        url.searchParams.delete("status");
        window.history.replaceState({}, "", url);
    }
}

document.addEventListener("DOMContentLoaded", () => {
            // Check notifications on page load
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
            const employeeScheduleSidebar = document.getElementById("employee-schedule-sidebar");
            const employeeScheduleBtn = document.getElementById("show-employee-schedule");
            const employeeScheduleClose = document.getElementById("employee-sidebar-close");
            const employeeScheduleSelect = document.getElementById("employee-schedule-select");
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

            // Click sidebar close button
            sidebarClose.addEventListener("click", () => {
                cancelSidebar.style.transform = "translateX(100%)";
                setTimeout(() => {
                    cancelSidebar.style.display = "none";
                }, 300); // Wait for animation to complete
            });

            // Confirm cancel button event
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
                    let modificationReason = document.getElementById("modification-reason-input").value.trim();

                    // If no notes are provided, use default reason
                    if (!modificationReason) {
                        if (reason === "late") {
                            modificationReason = "Late";
                        } else if (reason === "cancel") {
                            modificationReason = "Live stream cancelled";
                        }
                    }

                    if (reason === "late") {
                        const parsed = parseFloat(lateHoursInput.value);
                        lateHours = isNaN(parsed) ? 0 : parsed;
                    }

                    if (reason === "other") {
                        otherReason = document
                            .getElementById("other-reason-input")
                            .value.trim();
                        if (!otherReason) {
                            showNotification("❌ Please enter other reason", "error");
                            return;
                        }
                        modificationReason = otherReason; // If other reason, use the other reason as modification reason
                    }

                    if (
                        confirm(
                            `Are you sure you want to cancel the schedule for room ${room} on ${date} with reason "${reasonRadio.labels[0].textContent}"?`
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
                                    late_hours: lateHours,
                                    modification_reason: modificationReason
                                }),
                            })
                            .then((response) => response.json())
                            .then((data) => {
                                if (data.success) {
                                    showNotification("✅ Operation successful!", "success");
                                    setTimeout(() => window.location.reload(), 1000);
                                } else {
                                    showNotification("❌ " + (data.error || "Operation failed"), "error");
                                }
                            })
                            .catch((error) => {
                                console.error("Error:", error);
                                showNotification("❌ Network error", "error");
                            });
                    }
                });

            // Build schedulesByDate mapping from Django context
            // Get schedule data from json_script
            // Get schedule data from json_script
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
                "January",
                "February",
                "March",
                "April",
                "May",
                "June",
                "July",
                "August",
                "September",
                "October",
                "November",
                "December",
            ];
            // Use body data-attribute as initial date, otherwise use today
            const selectedDateParam = document.body.dataset.selectedDate || "";
            const today = new Date();
            const initialDate = selectedDateParam ?
                new Date(selectedDateParam) :
                new Date();
            // Calculate Monday of this week
            function getMonday(d) {
                d = new Date(d);
                const day = d.getDay(),
                    diff = d.getDate() - day + (day === 0 ? -6 : 1);
                return new Date(d.setDate(diff));
            }
            // Set Monday start: use specified date's week if provided, otherwise use today's week
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
                    // When selecting an employee, check if type is already selected to decide whether to show time slots
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
                        // When selecting a type, check if employee is already selected to decide whether to show time slots
                        if (empSelect.value) {
                            timeSection.style.display = "";
                        }
                    }
                });
            });

            function renderWeek(monday) {
                // Display current week range
                const weekDates = [];
                let weekStr = "";
                let row = document.createElement("tr");
                for (let i = 0; i < 7; i++) {
                    const d = new Date(monday);
                    d.setDate(monday.getDate() + i);
                    weekDates.push(d);
                    const cell = document.createElement("td");
                    // Use local date format yyyy-MM-dd to avoid toISOString timezone offset
                    const year = d.getFullYear();
                    const month = String(d.getMonth() + 1).padStart(2, "0");
                    const day = String(d.getDate()).padStart(2, "0");
                    const dateStr = `${year}-${month}-${day}`;
                    // Date circle
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
                        // Update URL parameters to maintain selected date
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
                        // Update right-side schedule list
                        const scheduleList = document.getElementById("schedule-list");
                        scheduleList.innerHTML = "";
                        const daySchedules = schedulesByDate[dateStr] || [];
                        if (daySchedules.length) {
                            daySchedules.forEach((s) => {
                                const tr = document.createElement("tr");
                                const roleClass =
                                    (s.role === "Streamer" || s.role === "主播") ?
                                    "anchor-role" :
                                    (s.role === "Operations" || s.role === "運營") ?
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
                                            }/?date=${dateStr}" class="text-primary me-2">Edit</a>
                                            <a href="#" class="text-danger delete-schedule" data-schedule-id="${
                                              s.id
                                            }" data-date="${dateStr}">Delete</a>
                                        </td>
                                    `;
                                scheduleList.appendChild(tr);
                            });

                            // Add delete event listeners
                            document.querySelectorAll(".delete-schedule").forEach((link) => {
                                link.addEventListener("click", function(e) {
                                    e.preventDefault();
                                    const scheduleId = this.dataset.scheduleId;
                                    const date = this.dataset.date;

                                    if (confirm("Are you sure you want to delete this schedule?")) {
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
                                                    showNotification("🗑️ Schedule deleted successfully!", "delete");
                                                    // Reload page data
                                                    window.location.reload();
                                                } else {
                                                    showNotification(
                                                        "❌ " + (data.error || "Delete failed, please try again"),
                                                        "error"
                                                    );
                                                }
                                            })
                                            .catch((error) => {
                                                console.error("Error:", error);
                                                showNotification("❌ Network error, please try again", "error");
                                            });
                                    }
                                });
                            });
                        } else {
                            const tr = document.createElement("tr");
                            tr.innerHTML = '<td colspan="7">No schedule data.</td>';
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
                // Update weekly schedule overview (horizontal layout, showing streamers/operations vertically in cells)
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
                                    .filter((s) => s.role === "Streamer" || s.role === "主播")
                                    .map((s) => `${s.person_name} (Room${s.room})`)
                                    .join("<br>") || "None";
                                const opNames =
                                    list
                                    .filter((s) => s.role === "Operations" || s.role === "運營")
                                    .map((s) => `${s.person_name} (Room${s.room})`)
                                    .join("<br>") || "None";
                                // 表頭日期
                                const th = document.createElement("th");
                                th.textContent = ds;
                                headerRow.appendChild(th);
                                // Table body cell: display streamers & operations vertically
                                const td = document.createElement("td");
                                // Group by room, display streamers & operations for each room
                                {
                                    const rooms = Array.from(new Set(list.map((s) => s.room))).sort(
                                        (a, b) => a - b
                                    );
                                    let html = "";
                                    rooms.forEach((room) => {
                                                const anchors =
                                                    list
                                                    .filter((s) => (s.role === "Streamer" || s.role === "主播") && s.room === room)
                                                    .map((s) => `${s.person_name}`)
                                                    .join("<br>") || "None";
                                                const ops =
                                                    list
                                                    .filter((s) => (s.role === "Operations" || s.role === "運營") && s.room === room)
                                                    .map((s) => `${s.person_name}`)
                                                    .join("<br>") || "None";

                                                // Get streamer's time as reference time
                                                const anchorTimes = list.filter(
                                                    (s) => (s.role === "Streamer" || s.role === "主播") && s.room === room
                                                );
                                                const timeInfo =
                                                    anchorTimes.length > 0 ?
                                                    anchorTimes
                                                    .map((s) => `${s.start_time}-${s.end_time}`)
                                                    .join(", ") :
                                                    "";

                                                // Display time next to room number
                                                const roomTitle = `Room ${room}${
              timeInfo ? " (" + timeInfo + ")" : ""
            }`;

                                                // Check if this room has any late cancellation schedules
                                                const isLateCancelled = list.some(
                                                    (s) => s.room === room && s.is_late_cancellation
                                                );
                                                // Check if schedule is completed (not cancelled and latest end time has passed)
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
                                            <!-- Open cancel stream sidebar -->
                                            <div class="room-header">${roomTitle}</div>
                                            <div class="roles-container">
                                                <div class="role-column">
                                                    <strong class="anchor-role">Streamers</strong>
                                                    <div class="role-content anchor-content">${anchors}</div>
                                                </div>
                                                <div class="role-separator"></div>
                                                <div class="role-column">
                                                    <strong class="operator-role">Operations</strong>
                                                    <div class="role-content operator-content">${ops}</div>
                                                </div>
                                            </div>
                                            ${brandName ? `<div class="room-brand-name" style="color: ${brandColor}; border-color: ${brandColor};">${brandName}</div>` : ''}
                                        </div>
                                    `;
                    });
                    if (html === "") {
                        html = '<div class="no-schedule">No Schedule</div>';
                    }
                    td.innerHTML = html;
                }
                bodyRow.appendChild(td);
            });
        }
        // Update current week brands display
        (function updateCurrentBrands() {
            // Calculate total hours for each brand this week
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
                        // Count both English and Chinese roles for compatibility
                        if (s.role === 'Streamer' || s.role === '主播') {
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
                brandsEl.className = 'brand-hours-card';
                if (brandsArray.length) {
                    const headerHtml = '<div class="brand-hours-header">Weekly Brand Hours</div>';
                    const itemsHtml = '<div class="brand-hours-list">' + 
                        brandsArray.map(b => {
                            const color = brandColorMap[b] || '#0a1a2f';
                            return `<span class="brand-hours-item" style="border-color: ${color};">
                                <span class="brand-icon" style="color: ${color};">🏷️</span>
                                <span class="brand-name" style="color: ${color};">${b}</span>
                                <span class="brand-hours-value" style="color: ${color};">${brandTimeMap[b].toFixed(1)}h</span>
                            </span>`;
                        }).join('') + 
                        '</div>';
                    brandsEl.innerHTML = headerHtml + itemsHtml;
                } else {
                    brandsEl.innerHTML = '<div class="brand-hours-header">Weekly Brand Hours</div><div class="brand-hours-list"><span class="brand-hours-item no-brands">No brands scheduled</span></div>';
                }
            }
        })();
        
        // Update current week room utilization display
        (function updateRoomUtilization() {
            // Calculate total hours for each room this week
            const roomTimeMap = {};
            const totalWeekHours = 7 * 24; // Total possible hours in a week
            const workingHoursPerDay = 12; // Assume 12 working hours per day (can be adjusted)
            const totalWorkingHours = 7 * workingHoursPerDay;
            
            weekDates.forEach((d) => {
                const y = d.getFullYear();
                const m = String(d.getMonth() + 1).padStart(2, '0');
                const dd = String(d.getDate()).padStart(2, '0');
                const ds = `${y}-${m}-${dd}`;
                const list = schedulesByDate[ds] || [];
                
                list.forEach((s) => {
                    if (s.room) {
                        // Count both English and Chinese roles for compatibility
                        if (s.role === 'Streamer' || s.role === '主播') {
                            if (!roomTimeMap[s.room]) roomTimeMap[s.room] = 0;
                            roomTimeMap[s.room] += s.duration || 0;
                        }
                    }
                });
            });
            
            // Convert to array and sort by utilization (highest first)
            const roomsArray = Object.keys(roomTimeMap).map(room => ({
                room: parseInt(room),
                hours: roomTimeMap[room],
                percentage: Math.min(100, (roomTimeMap[room] / totalWorkingHours * 100))
            })).sort((a, b) => b.percentage - a.percentage);
            
            const roomEl = document.getElementById('room-utilization');
            if (roomEl) {
                roomEl.className = 'room-utilization-card';
                if (roomsArray.length) {
                    const headerHtml = '<div class="room-utilization-header">Room Utilization</div>';
                    const itemsHtml = '<div class="room-utilization-list">' + 
                        roomsArray.map(r => {
                            let usageClass = 'low-usage';
                            if (r.percentage >= 80) usageClass = 'high-usage';
                            else if (r.percentage >= 50) usageClass = 'medium-usage';
                            
                            return `<div class="room-utilization-item">
                                <div class="room-info">
                                    <span class="room-number">Room ${r.room}</span>
                                </div>
                                <div class="room-progress-container">
                                    <div class="room-progress-bar">
                                        <div class="room-progress-fill ${usageClass}" style="width: ${r.percentage}%"></div>
                                    </div>
                                </div>
                                <div class="room-percentage">${r.percentage.toFixed(1)}%</div>
                            </div>`;
                        }).join('') + 
                        '</div>';
                    roomEl.innerHTML = headerHtml + itemsHtml;
                } else {
                    roomEl.innerHTML = '<div class="room-utilization-header">Room Utilization</div><div class="room-utilization-list"><div class="room-utilization-item no-rooms">No rooms scheduled</div></div>';
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
                            (s.role === "Streamer" || s.role === "主播") ?
                            "anchor-role" :
                            (s.role === "Operations" || s.role === "運營") ?
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
                    scheduleDetailsContainer.textContent = "No schedule data.";
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
                        showNotification("✅ Schedule added successfully!", "success");
                        // Reload current page to show updated schedule
                        setTimeout(() => {
                            window.location.reload();
                        }, 1000);
                    } else {
                        showNotification(
                            "❌ " + (data.error || "Operation failed, please try again"),
                            "error"
                        );
                    }
                })
                .catch((error) => {
                    console.error("Error:", error);
                    showNotification("❌ Network error, please try again", "error");
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

    // Update current brand display next to weekly overview
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

    // 員工班表查看功能
    if (employeeScheduleBtn) {
        employeeScheduleBtn.addEventListener('click', function() {
            employeeScheduleSidebar.style.transform = "translateX(0)";
            // 不在這裡載入數據，等用戶選擇員工後再載入
        });
    }

    if (employeeScheduleClose) {
        employeeScheduleClose.addEventListener('click', function() {
            employeeScheduleSidebar.style.transform = "translateX(-100%)";
        });
    }

    if (employeeScheduleSelect) {
        employeeScheduleSelect.addEventListener('change', function() {
            if (this.value) {
                loadEmployeeSchedule(this.value);
            } else {
                clearEmployeeScheduleData();
            }
        });
    }
}); // end DOMContentLoaded listener

// 載入員工班表數據
function loadEmployeeSchedule(employeeId = null) {
    const url = new URL(window.location.origin + '/api/employee-schedule/');
    if (employeeId) {
        url.searchParams.append('employee_id', employeeId);
    }

    console.log('Loading employee schedule from:', url.toString()); // 調試信息

    fetch(url)
        .then(response => {
            console.log('Response status:', response.status); // 調試信息
            return response.json();
        })
        .then(data => {
            console.log('Response data:', data); // 調試信息
            if (data.success) {
                updateEmployeeScheduleDisplay(data.data);
            } else {
                showNotification('❌ Failed to load employee schedule: ' + (data.error || 'Unknown error'), 'error');
            }
        })
        .catch(error => {
            console.error('Error loading employee schedule:', error);
            showNotification('❌ Network error, please try again', 'error');
        });
}

// 更新員工班表顯示
function updateEmployeeScheduleDisplay(data) {
    console.log('Updating display with data:', data); // 調試信息
    
    // 更新統計數據
    document.getElementById('employee-total-hours').textContent = data.stats.total_hours || '0';
    document.getElementById('employee-attendance-rate').textContent = data.stats.attendance_rate + '%' || '0%';

    // 顯示統計信息和班表列表
    document.getElementById('employee-stats').style.display = 'block';
    document.getElementById('employee-schedule-list').style.display = 'block';

    // Update schedule list
    const scheduleContainer = document.getElementById('schedule-items-container');
    if (!data.schedules || data.schedules.length === 0) {
        scheduleContainer.innerHTML = '<div class="text-muted text-center py-3">No schedule data available</div>';
        return;
    }

    const scheduleItems = data.schedules.map(schedule => {
        const statusBadge = getStatusBadge(schedule);
        const modificationInfo = schedule.modification_status && schedule.modification_status !== 'none' ? 
            `<small class="text-muted d-block">${getModificationText(schedule.modification_status)}</small>` : '';
        
        return `
            <div class="schedule-item border-bottom py-2">
                <div class="d-flex justify-content-between align-items-start">
                    <div class="flex-grow-1">
                        <div class="fw-medium">${schedule.date_display || schedule.date} ${schedule.start_time}-${schedule.end_time}</div>
                        <div class="text-muted small">${schedule.brand_name} - 房間${schedule.room}</div>
                        ${modificationInfo}
                    </div>
                    <div class="ms-2">
                        ${statusBadge}
                    </div>
                </div>
            </div>
        `;
    }).join('');

    scheduleContainer.innerHTML = scheduleItems;
}

// 獲取狀態徽章
function getStatusBadge(schedule) {
    if (schedule.is_cancelled) {
        return '<span class="badge bg-danger">已取消</span>';
    } else if (schedule.is_past) {
        return '<span class="badge bg-success">已完成</span>';
    } else if (schedule.is_today) {
        return '<span class="badge bg-warning">進行中</span>';
    } else if (schedule.is_future) {
        return '<span class="badge bg-primary">已排班</span>';
    }
    return '<span class="badge bg-secondary">未知</span>';
}

// 獲取修改狀態文字
function getModificationText(modificationStatus) {
    const texts = {
        'cancelled': '已取消',
        'late': '遲到',
        'rescheduled': '已調班'
    };
    return texts[modificationStatus] || '';
}

// 清空員工班表數據
function clearEmployeeScheduleData() {
    document.getElementById('employee-total-hours').textContent = '0';
    document.getElementById('employee-attendance-rate').textContent = '0';
    document.getElementById('employee-stats').style.display = 'none';
    document.getElementById('employee-schedule-list').style.display = 'none';
    document.getElementById('schedule-items-container').innerHTML = 
        '<div class="text-muted text-center py-3">請選擇員工查看班表</div>';
}