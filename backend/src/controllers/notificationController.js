import { Notification } from "../models/Notification.js";

const toNotifDto = (n) => ({
  id: n._id.toString(),
  type: n.type,
  title: n.title,
  body: n.body,
  read: n.read,
  link: n.link,
  createdAt: n.createdAt,
});

// GET /api/notifications
const getNotifications = async (req, res) => {
  const notifications = await Notification.find({ userId: req.user._id })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  const unreadCount = notifications.filter((n) => !n.read).length;

  return res.status(200).json({
    notifications: notifications.map(toNotifDto),
    unreadCount,
  });
};

// PATCH /api/notifications/:id/read
const markOneRead = async (req, res) => {
  await Notification.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    { read: true },
  );
  return res.status(204).send();
};

// PATCH /api/notifications/read-all
const markAllRead = async (req, res) => {
  await Notification.updateMany({ userId: req.user._id, read: false }, { read: true });
  return res.status(204).send();
};

export { getNotifications, markAllRead, markOneRead };
