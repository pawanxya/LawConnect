/**
 * Generate default consultation slots
 * Time: 10 AM to 4 PM
 * Duration: 60 minutes per slot
 * @param {string} date - Date in format "YYYY-MM-DD"
 * @returns {array} Array of slots { startTime, endTime }
 */
export const generateDefaultSlots = (date) => {
  const slots = [];
  const startHour = 10; // 10 AM
  const endHour = 16; // 4 PM
  const slotDuration = 60; // minutes

  for (let currentMinutes = startHour * 60; currentMinutes + slotDuration <= endHour * 60; currentMinutes += slotDuration) {
    const startHourValue = Math.floor(currentMinutes / 60);
    const startMinuteValue = currentMinutes % 60;
    const endMinutes = currentMinutes + slotDuration;
    const endHourValue = Math.floor(endMinutes / 60);
    const endMinuteValue = endMinutes % 60;

    const startTime = `${String(startHourValue).padStart(2, "0")}:${String(startMinuteValue).padStart(2, "0")}`;
    const endTime = `${String(endHourValue).padStart(2, "0")}:${String(endMinuteValue).padStart(2, "0")}`;

    slots.push({ startTime, endTime, duration: slotDuration, date });
  }

  return slots;
};

/**
 * Format time string to 12-hour format
 * @param {string} time - Time in "HH:MM" format
 * @returns {string} Time in "h:MM AM/PM" format
 */
export const formatTime12Hour = (time) => {
  const [hours, minutes] = time.split(":");
  const hour = parseInt(hours);
  const minute = parseInt(minutes);
  const ampm = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${String(minute).padStart(2, "0")} ${ampm}`;
};

export const addMinutesToTime = (time, minutesToAdd) => {
  const [hours, minutes] = String(time || "00:00").split(":").map(Number);
  const totalMinutes = hours * 60 + minutes + minutesToAdd;
  const safeMinutes = Math.max(totalMinutes, 0);
  const nextHours = Math.floor(safeMinutes / 60);
  const nextMinutes = safeMinutes % 60;

  return `${String(nextHours).padStart(2, "0")}:${String(nextMinutes).padStart(2, "0")}`;
};

/**
 * Format time slot display
 * @param {string} startTime - Start time in "HH:MM" format
 * @param {string} endTime - End time in "HH:MM" format
 * @returns {string} Formatted slot text
 */
export const formatSlot = (startTime, endTime) => {
  return `${formatTime12Hour(startTime)} - ${formatTime12Hour(endTime)}`;
};

/**
 * Check if date is in the past
 * @param {string} date - Date in "YYYY-MM-DD" format
 * @returns {boolean} True if date is in past
 */
export const isDatePast = (date) => {
  const selectedDate = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return selectedDate < today;
};

/**
 * Get next 30 days from today
 * @returns {array} Array of dates in "YYYY-MM-DD" format
 */
export const getNext30Days = () => {
  const dates = [];
  const today = new Date();
  for (let i = 0; i < 30; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    dates.push(`${year}-${month}-${day}`);
  }
  return dates;
};

export const getWeekdayDatesFrom = (startDate, limit = 30) => {
  const dates = [];
  const baseDate = new Date(startDate);

  if (Number.isNaN(baseDate.getTime())) {
    return dates;
  }

  for (let offset = 0; dates.length < limit; offset += 1) {
    const date = new Date(baseDate);
    date.setDate(baseDate.getDate() + offset);

    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      continue;
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    dates.push(`${year}-${month}-${day}`);
  }

  return dates;
};

/**
 * Format date for display
 * @param {string} date - Date in "YYYY-MM-DD" format
 * @returns {string} Formatted date
 */
export const formatDate = (date) => {
  const dateObj = new Date(date);
  return dateObj.toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};
