document.addEventListener('DOMContentLoaded', function() {
    // Set current date and time
    function updateDateTime() {
        const now = new Date();
        document.getElementById('current-date').textContent = now.toLocaleDateString('en-US', { 
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
        });
        document.getElementById('current-time').textContent = now.toLocaleTimeString('en-US');
    }
    updateDateTime();
    setInterval(updateDateTime, 1000);

    // Set default date to today in the form
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('date').value = today;
    document.getElementById('filter-date').value = today;
    
    // Initialize FullCalendar
    const calendarEl = document.getElementById('calendar');
    const calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
        },
        height: 'auto',
        events: function(fetchInfo, successCallback, failureCallback) {
            fetch('/get_tasks_by_date/' + fetchInfo.startStr)
                .then(response => response.json())
                .then(data => {
                    const events = data.map(task => ({
                        title: task.title,
                        start: task.date + 'T' + task.time,
                        allDay: false,
                        backgroundColor: task.completed ? '#28a745' : '#dc3545',
                        borderColor: task.completed ? '#28a745' : '#dc3545',
                        extendedProps: {
                            description: task.description
                        }
                    }));
                    successCallback(events);
                })
                .catch(error => {
                    failureCallback(error);
                });
        },
        dateClick: function(info) {
            document.getElementById('filter-date').value = info.dateStr;
            filterTasksByDate(info.dateStr);
        },
        eventClick: function(info) {
            alert(`Task: ${info.event.title}\n\nDescription: ${info.event.extendedProps.description || 'No description'}`);
            info.jsEvent.preventDefault();
        }
    });
    calendar.render();

    // Initialize charts
    function initCharts() {
        fetch('/get_stats')
            .then(response => response.json())
            .then(data => {
                // Daily Chart
                createChart('dailyChart', 'Daily', data.daily);
                
                // Weekly Chart
                createChart('weeklyChart', 'Weekly', data.weekly);
                
                // Monthly Chart
                createChart('monthlyChart', 'Monthly', data.monthly);
            });
    }

    function createChart(elementId, title, data) {
        const ctx = document.getElementById(elementId).getContext('2d');
        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Completed', 'Pending'],
                datasets: [{
                    data: [data.completed, data.total - data.completed],
                    backgroundColor: ['#28a745', '#dc3545'],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            boxWidth: 12,
                            padding: 20
                        }
                    },
                    title: {
                        display: false,
                        text: title
                    }
                },
                cutout: '70%'
            }
        });
    }
    
    initCharts();

    // Filter tasks by date
    document.getElementById('filter-btn').addEventListener('click', function() {
        const date = document.getElementById('filter-date').value;
        if (date) {
            filterTasksByDate(date);
        }
    });

    function filterTasksByDate(date) {
        fetch('/get_tasks_by_date/' + date)
            .then(response => response.json())
            .then(tasks => {
                const resultsContainer = document.getElementById('filter-results');
                
                if (tasks.length === 0) {
                    resultsContainer.innerHTML = `
                        <div class="alert alert-info m-0">
                            No tasks found for ${new Date(date).toLocaleDateString()}
                        </div>
                    `;
                    return;
                }

                let html = `
                    <h6 class="mb-3">Tasks for ${new Date(date).toLocaleDateString()}</h6>
                    <div class="table-responsive">
                        <table class="table table-sm">
                            <thead>
                                <tr>
                                    <th>Status</th>
                                    <th>Task</th>
                                    <th>Time</th>
                                </tr>
                            </thead>
                            <tbody>
                `;

                tasks.forEach(task => {
                    html += `
                        <tr class="${task.completed ? 'table-success' : ''}">
                            <td>
                                ${task.completed ? 
                                    '<span class="badge bg-success">Done</span>' : 
                                    '<span class="badge bg-warning">Pending</span>'}
                            </td>
                            <td>
                                <strong>${task.title}</strong>
                                ${task.description ? `<br><small class="text-muted">${task.description}</small>` : ''}
                            </td>
                            <td>${task.time}</td>
                        </tr>
                    `;
                });

                html += `
                            </tbody>
                        </table>
                    </div>
                `;

                resultsContainer.innerHTML = html;
            });
    }

    // Initial filter load
    filterTasksByDate(today);
});