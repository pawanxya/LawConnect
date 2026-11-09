# Messaging System Guide - LawConnect

## Overview

The messaging system has been enhanced with real-time socket.io communication between clients and lawyers. Here's how everything works together.

## Architecture

### Backend Components

1. **socket.js** - Socket.io server that handles:
   - User connections and online status
   - Real-time message delivery
   - Typing indicators
   - Read receipts
   - Message persistence to MongoDB

2. **Message Model** - MongoDB schema with fields:
   - `senderId`: Sender's user ID
   - `senderName`: Sender's display name
   - `receiverId`: Recipient's user ID
   - `content`: Message text
   - `attachment`: Optional file/document
   - `timestamp`: ISO timestamp
   - `read`: Boolean read status

3. **API Endpoints** (`/messages`):
   - `GET /messages` - Fetch all messages for current user
   - `POST /messages` - Create a new message

### Frontend Components

1. **Messages.jsx** - Main messaging page with:
   - Message list with real-time updates
   - Input field with typing indicators
   - Online status indicator
   - Document sharing
   - Read receipts

2. **messageSocket.js** - Helper functions for easy socket communication

3. **socketClient.js** - Socket.io client initialization

## How Messages Flow

### Sending a Message

```
User types message
    ↓
Clicks send / presses Enter
    ↓
handleSend() triggers
    ↓
socket.emit("send_message", {...})
    ↓
Backend socket listener saves to MongoDB + emits to receiver
    ↓
API call to POST /messages (for persistence)
    ↓
Message appears in UI
    ↓
Receiver gets real-time notification via socket
    ↓
Both UIs update with new message
```

### Using the Message Socket Helpers

Instead of manually managing socket events, you can use the helper functions:

```javascript
import {
  initializeMessageSocket,
  sendMessageSocket,
  onReceiveMessage,
  onUserTyping,
  onUserStoppedTyping,
  onMessagesRead,
  onUserStatus,
  checkUserStatus,
  sendTypingIndicator,
  sendStoppedTypingIndicator,
  markMessagesRead,
  disconnectMessageSocket
} from "@/lib/messageSocket";

// In your component
useEffect(() => {
  // Initialize socket connection
  initializeMessageSocket(userId, () => {
    console.log("Socket connected!");
  });

  // Listen for incoming messages
  const unsubscribeMessage = onReceiveMessage((message) => {
    console.log("New message:", message);
    setMessages(prev => [...prev, message]);
  });

  // Listen for typing
  const unsubscribeTyping = onUserTyping(({ userId }) => {
    setIsTyping(true);
  });

  // Listen for stopped typing
  const unsubscribeStoppedTyping = onUserStoppedTyping(({ userId }) => {
    setIsTyping(false);
  });

  // Listen for read receipts
  const unsubscribeRead = onMessagesRead(({ messageIds, by }) => {
    console.log("Messages read by:", by);
  });

  // Check if someone is online
  checkUserStatus(lawyerId, (response) => {
    console.log("Status:", response.status); // 'online' or 'offline'
  });

  return () => {
    unsubscribeMessage();
    unsubscribeTyping();
    unsubscribeStoppedTyping();
    unsubscribeRead();
    disconnectMessageSocket();
  };
}, [userId]);

// Send a message
const sendMessage = (content, receiverId) => {
  sendMessageSocket({
    receiverId,
    content,
    senderName: currentUser.name,
    attachment: null
  }, (response) => {
    if (response.success) {
      console.log("Message sent with ID:", response.messageId);
    } else {
      console.error("Send failed:", response.error);
    }
  });
};

// Send typing indicator
const handleInputChange = (value) => {
  sendTypingIndicator(lawyerId);
  clearTimeout(typingTimer);
  typingTimer = setTimeout(() => {
    sendStoppedTypingIndicator(lawyerId);
  }, 2000);
};

// Mark messages as read
const markAsRead = (messageIds, senderId) => {
  markMessagesRead(messageIds, senderId);
};
```

## Socket Events Reference

### Client → Server Events

| Event | Payload | Description |
|-------|---------|-------------|
| `join` | `userId` | User connects to their socket room |
| `send_message` | `{ receiverId, content, senderName, attachment }` | Send a message |
| `typing` | `{ to: receiverId }` | User started typing |
| `stop_typing` | `{ to: receiverId }` | User stopped typing |
| `mark_read` | `{ messageIds: [], to: receiverId }` | Mark messages as read |
| `check_status` | `userId` | Check if user is online |

### Server → Client Events

| Event | Payload | Description |
|-------|---------|-------------|
| `receive_message` | Message object | New message received |
| `user_typing` | `{ userId }` | Someone typing in conversation |
| `user_stopped_typing` | `{ userId }` | Someone stopped typing |
| `user_status` | `{ userId, status }` | User came online/offline |
| `messages_read` | `{ messageIds, by: userId }` | Messages marked as read |

## Database Schema

```javascript
{
  _id: ObjectId,
  senderId: ObjectId,      // Reference to User
  senderName: String,
  receiverId: ObjectId,    // Reference to User
  content: String,
  attachment: Object | null, // { filename, url, size }
  timestamp: String,       // ISO format
  read: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

## Key Features Implemented

✅ **Real-time Messages** - Instant delivery using Socket.io
✅ **Online Status** - See if lawyer/client is online
✅ **Typing Indicators** - Know when someone is typing
✅ **Read Receipts** - See if messages have been read
✅ **Document Sharing** - Share files and documents
✅ **Message History** - Store all messages in MongoDB
✅ **Error Handling** - Proper error messages and callbacks

## Setup Checklist

- [x] Socket.io server initialized with CORS
- [x] Message model created in MongoDB
- [x] Socket event handlers for send_message/receive_message
- [x] API endpoints for message persistence
- [x] Frontend Socket initialization
- [x] Messages page integrated with socket
- [x] Helper functions for easy socket usage
- [x] Online status tracking
- [x] Typing indicators
- [x] Read receipts

## Testing the System

1. Open two browser windows (or use incognito)
2. Log in as client in first window
3. Log in as lawyer in second window
4. Navigate to Messages page in both
5. Send a message and verify real-time delivery
6. Check typing indicators as you type
7. Verify read receipts appear

## Troubleshooting

**Messages not appearing in real-time?**
- Check browser console for socket connection errors
- Verify both users have `socket.emit("join", userId)` called
- Check that socket server is running on correct port

**Typing indicators not showing?**
- Ensure `typing` and `stop_typing` events are being emitted
- Check that `to` field contains correct receiver ID

**Read receipts not working?**
- Verify `mark_read` event is emitted when messages are viewed
- Check that receiver ID is correct

## Future Enhancements

- Message search functionality
- Message pinning
- Reactions/Emojis on messages
- Video/voice call integration
- Message editing/deletion
- Conversation archiving
- Message thread/replies
