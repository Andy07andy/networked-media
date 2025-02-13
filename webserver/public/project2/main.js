let caloriesPerSecond = 0.02; // Burn rate per second
let clockWidth = 1; // 1 = full size, stops at 50%

// Get seconds since midnight
function getSecondsSinceMidnight() {
    let now = new Date();
    return now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
}

// Initialize calorie clock based on time since midnight
function initializeCalorieClock() {
    let secondsSinceMidnight = getSecondsSinceMidnight();
    totalCalories = secondsSinceMidnight * caloriesPerSecond; // Correct calculation
    updateUI();
}

// Update calorie count every second
function updateCalorieClock() {
    totalCalories = getSecondsSinceMidnight() * caloriesPerSecond; // Always recalculated dynamically
    updateUI();
    updateClockShrink();
}

// Update UI elements
function updateUI() {
    document.querySelector('.calorie-display').textContent = totalCalories.toFixed(2) + ' kcal';
    updateTimeBar();
}

// Update time progress bar (based on time of day)
function updateTimeBar() {
    let progress = (getSecondsSinceMidnight() / 86400) * 100; // 86400 seconds in a full day
    document.querySelector('.time-bar-fill').style.width = progress + '%';
}

// Shrink the clock over time
function updateClockShrink() {
    if (clockWidth > 0.5) {
        clockWidth -= 0.0005;
        document.querySelector('.clock-wrapper').style.transform = `scaleX(${clockWidth})`;
    }
}

// Allow manual calorie burning
function burnCaloriesNow() {
    if (clockWidth > 0.5) {
        clockWidth -= 0.02;
    } else {
        document.querySelector('.warning-message').style.opacity = 1;
        document.querySelector('.reset-btn').style.display = "block";
        document.querySelector('.reset-btn').style.opacity = 1;
    }
}

// Reset clock when clicking reset
function resetClock() {
    clockWidth = 1;
    document.querySelector('.clock-wrapper').style.transform = `scaleX(${clockWidth})`;
    document.querySelector('.warning-message').style.opacity = 0;
    document.querySelector('.reset-btn').style.opacity = 0;
    document.querySelector('.reset-btn').style.display = "none";
}

// Check for midnight reset (not actually needed but keeping it as a failsafe)
function checkForMidnightReset() {
    let now = new Date();
    if (now.getHours() === 0 && now.getMinutes() === 0 && now.getSeconds() < 2) {
        initializeCalorieClock();
    }
}

// Event listeners
document.querySelector('.burn-btn').addEventListener('click', burnCaloriesNow);
document.querySelector('.reset-btn').addEventListener('click', resetClock);

// Start tracking
initializeCalorieClock();
setInterval(updateCalorieClock, 1000);
setInterval(checkForMidnightReset, 60000); // Check for midnight reset every minute
