// src/services/zammad/webhook.service.js
import { NotificationService } from "../notification.js";

export class WebhookService {
  /**
   * Processes webhook events from Zammad and dispatches in-app notifications
   */
  static async handleWebhook(db, env, payload, secret) {
    // 1. Verify webhook secret
    const expectedSecret = env.ZAMMAD_WEBHOOK_SECRET;
    if (expectedSecret && secret !== expectedSecret) {
      throw new Error("Unauthorized: Invalid webhook secret.");
    }

    const ticket = payload.ticket;
    if (!ticket || !ticket.id) {
      throw new Error("Bad Request: Missing ticket details in webhook payload.");
    }

    // 2. Fetch mapped ticket from MongoDB
    const ticketRecord = await db.collection("zammad_tickets").findOne({
      ticketId: ticket.id
    });

    if (!ticketRecord) {
      console.warn(`Webhook received for unmapped Zammad Ticket ID: ${ticket.id}`);
      return { success: false, reason: "Ticket not mapped to a student" };
    }

    // 3. Update status in MongoDB
    await db.collection("zammad_tickets").updateOne(
      { _id: ticketRecord._id },
      {
        $set: {
          status: ticket.state || ticketRecord.status,
          updatedAt: new Date()
        }
      }
    );

    // 4. Dispatch in-app notification if reply is from staff (Zammad Agent)
    const article = payload.article;
    if (article && !article.internal) {
      // Avoid sending notifications for student's own replies
      const createdByEmail = article.created_by || "";
      const isStudent = createdByEmail.toLowerCase() === ticketRecord.email.toLowerCase();

      if (!isStudent) {
        await NotificationService.createNotification(db, {
          organizationId: ticketRecord.organizationId,
          uid: ticketRecord.uid,
          type: "SUPPORT_TICKET_UPDATE",
          title: `Reply on Support Ticket #${ticket.number}`,
          message: `An agent replied to your support ticket: "${ticketRecord.category}"`,
          entityType: "zammad_ticket",
          entityId: ticketRecord._id.toString(),
          eventKey: `SUPPORT_TICKET_UPDATE:${ticket.id}:${article.id || Date.now()}`
        }).catch((err) => console.error("Failed to trigger support notification:", err));
      }
    }

    return { success: true };
  }
}
