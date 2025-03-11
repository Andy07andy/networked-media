let caloriesPerSecond = 0.02; // Burn rate per second
let clockWidth = 1; // 1 = full size, stops at 50%

// Get the number of seconds passed since midnight
function getSecondsSinceMidnight() {
    let now = new Date();
    return now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
}

// Correctly calculates total calories burned from midnight
function calculateCaloriesSinceMidnight() {
    return getSecondsSinceMidnight() * caloriesPerSecond;
}

// Update the calorie count every second
function updateCalorieClock() {
    totalCalories = calculateCaloriesSinceMidnight();
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
        document.querySelector('.clock-wrapper').style.transform = `scaleX(${clockWidth})`;
    } else {
        document.querySelector('.warning-message').style.opacity = 1;
        document.querySelector('.reset-btn').style.display = "block";
        document.querySelector('.reset-btn').style.opacity = 1;
    }
}

// Reset clock width when clicking reset
function resetClock() {
    clockWidth = 1;
    document.querySelector('.clock-wrapper').style.transform = `scaleX(${clockWidth})`;
    document.querySelector('.warning-message').style.opacity = 0;
    document.querySelector('.reset-btn').style.opacity = 0;
    document.querySelector('.reset-btn').style.display = "none";
}

// Update the analog clock hands
function updateAnalogClock() {
    let now = new Date();
    let hours = now.getHours() % 12;
    let minutes = now.getMinutes();
    let seconds = now.getSeconds();
    
    document.querySelector('.hour-hand').style.transform = `rotate(${hours * 30 + minutes / 2}deg)`;
    document.querySelector('.minute-hand').style.transform = `rotate(${minutes * 6}deg)`;
    document.querySelector('.second-hand').style.transform = `rotate(${seconds * 6}deg)`;
}

// Initialize calorie tracking and clock
function initializeCalorieClock() {
    updateCalorieClock(); 
    updateAnalogClock(); 
    setInterval(updateCalorieClock, 1000); 
    setInterval(updateAnalogClock, 1000); 
}

// Event listeners
document.querySelector('.burn-btn').addEventListener('click', burnCaloriesNow);
document.querySelector('.reset-btn').addEventListener('click', resetClock);

// Start everything
initializeCalorieClock();



<select id="activity-level">
            <option value="1.2" data-description="A sedentary day means fewer calories burned beyond your basic metabolism. Choosing this helps estimate your true daily energy expenditure accurately.">🛋️ Sedentary (Almost no movement)</option>
            <option value="1.375" data-description="Even small movements, like short walks or house chores, increase your total calorie burn. Selecting this ensures those minor activities are accounted for.">🚶 Light Activity (Some movement, no structured exercise)</option>
            <option value="1.55" data-description="Moderate activity significantly raises your daily calorie needs. This factor helps adjust your energy expenditure for more accurate tracking.">🏋️ Moderate Activity (Regular movement, moderate exercise)</option>
            <option value="1.725" data-description="Higher activity levels require more energy to sustain. Choosing this accounts for heavy exercise or physically demanding work throughout the day.">🏃 High Activity (Heavy exercise or physically demanding tasks)</option>
            <option value="1.9" data-description="Extreme physical exertion means your body burns calories at a much higher rate. This factor helps reflect the extra energy demand.">🔥 Very High (Extremely strenuous day, professional training)</option>
        </select>