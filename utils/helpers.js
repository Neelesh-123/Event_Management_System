const config = require('../config/config');

/**
 * Validate event input data
 * @param {Object} eventData - The event data to validate
 * @returns {Object} - Validation result with success and error message
 */
const validateEventData = (eventData) => {
  const { name, date, time, location, capacity } = eventData;

  if (!name || !date || !time || !location || !capacity) {
    return {
      isValid: false,
      message: 'Required fields are missing'
    };
  }

  const capacityNum = parseInt(capacity);
  if (isNaN(capacityNum) || capacityNum <= 0) {
    return {
      isValid: false,
      message: 'Capacity must be a positive number'
    };
  }

  const eventDate = new Date(date);
  if (isNaN(eventDate.getTime())) {
    return {
      isValid: false,
      message: 'Invalid date format'
    };
  }

  return {
    isValid: true,
    data: {
      ...eventData,
      capacity: capacityNum
    }
  };
};

/**
 * Format date for display
 * @param {Date} date - The date to format
 * @returns {string} - Formatted date string
 */
const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

/**
 * Format time for display
 * @param {string} time - The time to format
 * @returns {string} - Formatted time string
 */
const formatTime = (time) => {
  return new Date(`1970-01-01T${time}`).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Check if event is fully booked
 * @param {Object} event - The event object
 * @returns {boolean} - True if event is fully booked
 */
const isEventFullyBooked = (event) => {
  return event.registeredUsers.length >= event.capacity;
};

/**
 * Get event status with color
 * @param {string} status - The event status
 * @returns {Object} - Status object with text and color
 */
const getEventStatus = (status) => {
  const statusMap = {
    upcoming: { text: 'Upcoming', color: 'blue' },
    ongoing: { text: 'In Progress', color: 'green' },
    finished: { text: 'Completed', color: 'gray' },
    cancelled: { text: 'Cancelled', color: 'red' }
  };
  return statusMap[status] || { text: status, color: 'gray' };
};

module.exports = {
  validateEventData,
  formatDate,
  formatTime,
  isEventFullyBooked,
  getEventStatus
};