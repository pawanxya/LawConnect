import { socket } from "./socketClient";

/**
 * Initialize socket connection for messaging
 * @param {string} userId - Current user's ID
 * @param {Function} onConnect - Callback when socket connects
 */
export const initializeMessageSocket = (userId, onConnect) => {
  if (!userId) return;

  socket.connect();

  socket.on("connect", () => {
    socket.emit("join", userId);
    onConnect?.();
  });
};

/**
 * Send a message via socket
 * @param {object} data - Message data { receiverId, content, senderName, attachment }
 * @param {Function} callback - Callback with response { success, messageId, error }
 */
export const sendMessageSocket = (data, callback) => {
  socket.emit("send_message", data, callback);
};

/**
 * Listen for incoming messages
 * @param {Function} handler - Callback receives message object
 * @returns {Function} Unsubscribe function
 */
export const onReceiveMessage = (handler) => {
  socket.on("receive_message", handler);
  return () => socket.off("receive_message", handler);
};

/**
 * Listen for user typing
 * @param {Function} handler - Callback receives { userId }
 * @returns {Function} Unsubscribe function
 */
export const onUserTyping = (handler) => {
  socket.on("user_typing", handler);
  return () => socket.off("user_typing", handler);
};

/**
 * Listen for user stopped typing
 * @param {Function} handler - Callback receives { userId }
 * @returns {Function} Unsubscribe function
 */
export const onUserStoppedTyping = (handler) => {
  socket.on("user_stopped_typing", handler);
  return () => socket.off("user_stopped_typing", handler);
};

/**
 * Listen for messages read notifications
 * @param {Function} handler - Callback receives { messageIds, by }
 * @returns {Function} Unsubscribe function
 */
export const onMessagesRead = (handler) => {
  socket.on("messages_read", handler);
  return () => socket.off("messages_read", handler);
};

/**
 * Listen for user online/offline status
 * @param {Function} handler - Callback receives { userId, status }
 * @returns {Function} Unsubscribe function
 */
export const onUserStatus = (handler) => {
  socket.on("user_status", handler);
  return () => socket.off("user_status", handler);
};

/**
 * Check if a user is online
 * @param {string} userId - User ID to check
 * @param {Function} callback - Callback receives { status: 'online' | 'offline' }
 */
export const checkUserStatus = (userId, callback) => {
  socket.emit("check_status", userId, callback);
};

/**
 * Send typing indicator
 * @param {string} receiverId - ID of the person receiving the typing indicator
 */
export const sendTypingIndicator = (receiverId) => {
  if (!receiverId) return;
  socket.emit("typing", { to: receiverId });
};

/**
 * Send stopped typing indicator
 * @param {string} receiverId - ID of the person receiving the stopped typing indicator
 */
export const sendStoppedTypingIndicator = (receiverId) => {
  if (!receiverId) return;
  socket.emit("stop_typing", { to: receiverId });
};

/**
 * Mark messages as read
 * @param {array} messageIds - Array of message IDs to mark as read
 * @param {string} receiverId - ID of the message sender
 */
export const markMessagesRead = (messageIds, receiverId) => {
  if (!messageIds?.length) return;
  socket.emit("mark_read", { messageIds, to: receiverId });
};

/**
 * Disconnect socket
 */
export const disconnectMessageSocket = () => {
  socket.disconnect();
};
