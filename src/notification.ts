import { v4 as uuidv4 } from "uuid";

class Notification {
  id: string;
  recipientId: string;
  message: string;
  sentAt: number;

  constructor(recipientId: string, message: string) {
    this.id = uuidv4();
    this.recipientId = recipientId;
    this.message = message;
    this.sentAt = Date.now();
  }
}

const notificationQueue: Notification[] = [];

export function sendNotification(recipientId: string, message: string): void {
  const notification = new Notification(recipientId, message);
  notificationQueue.push(notification);
  console.log(`Notification sent to ${recipientId}: ${message}`);
}

export function getNotifications(recipientId: string): Notification[] {
  return notificationQueue.filter((n) => n.recipientId === recipientId);
}
