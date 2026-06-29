// src/services/zammad/ticket.service.js
import { ObjectId } from "mongodb";
import { ZammadClient } from "./client.js";

export class TicketService {
  /**
   * Look up or dynamically create a customer profile in Zammad.
   */
  static async getOrCreateCustomer(env, actor) {
    const email = actor.email;

    // 1. Search for user by email
    try {
      const search = await ZammadClient.request(env, `/users/search?query=email:${encodeURIComponent(email)}&limit=1`);
      if (search && search.length > 0) {
        return search[0].id;
      }
    } catch (e) {
      console.warn("Zammad customer lookup warning:", e.message);
    }

    // 2. Resolve display name split
    const displayName = actor.displayName || actor.email.split("@")[0] || "Student";
    const parts = displayName.trim().split(/\s+/);
    const firstname = parts[0] || "Student";
    const lastname = parts.slice(1).join(" ") || "User";

    // 3. Create the customer in Zammad
    try {
      const result = await ZammadClient.request(env, "/users", {
        method: "POST",
        body: JSON.stringify({
          firstname,
          lastname,
          email,
          roles: ["Customer"]
        })
      });
      return result.id;
    } catch (e) {
      console.error("Failed to create Zammad customer:", e.message);
      throw new Error(`Failed to map customer '${email}' in Zammad: ${e.message}`);
    }
  }

  /**
   * Creates a ticket in Zammad on behalf of the student with injected business contexts.
   */
  static async createTicket(db, env, actor, orgId, payload) {
    const { title, category, body, batchId, assignmentId, submissionId } = payload;

    if (!title || !body) {
      throw new Error("Ticket title and description body are required.");
    }

    // 1. Resolve Organization context
    let orgName = "Unknown Organization";
    try {
      const org = await db.collection("organizations").findOne({ _id: new ObjectId(orgId) });
      if (org) orgName = org.name || org.title || orgName;
    } catch (e) {
      console.error("Failed to resolve organization context:", e.message);
    }

    // 2. Resolve Batch/Cohort context
    let batchName = "Not Enrolled";
    let batchDoc = null;
    if (batchId) {
      try {
        batchDoc = await db.collection("batches").findOne({ _id: new ObjectId(batchId) });
        if (batchDoc) batchName = batchDoc.name || batchDoc.title || batchDoc.batchCode || batchName;
      } catch (e) {
        console.error("Failed to resolve batch context:", e.message);
      }
    }

    // 3. Resolve Assignment context
    let assignmentTitle = "N/A";
    let assignmentWeek = "N/A";
    if (batchDoc && assignmentId) {
      const match = batchDoc.weeklyAssignments?.find(
        (a) => a._id?.toString() === assignmentId.toString()
      );
      if (match) {
        assignmentTitle = match.title || assignmentTitle;
        assignmentWeek = match.week || assignmentWeek;
      }
    }

    // 4. Resolve Submission / GitHub context
    let submissionUrl = "N/A";
    let githubUrl = "N/A";
    let attemptNumber = "N/A";
    let resolvedSub = null;

    const parseAssignmentId = (id) => {
      if (!id) return null;
      try { return new ObjectId(id); } catch { return id; }
    };

    if (submissionId) {
      try {
        resolvedSub = await db.collection("submissions").findOne({ _id: new ObjectId(submissionId) });
      } catch (e) {
        console.error("Failed to resolve submission by ID:", e.message);
      }
    } else if (assignmentId && batchId) {
      try {
        const query = {
          batchId: new ObjectId(batchId),
          assignmentId: parseAssignmentId(assignmentId),
          $or: [
            { uid: actor.uid },
            { memberSnapshot: actor.uid }
          ]
        };
        resolvedSub = await db.collection("submissions").findOne(query, { sort: { attemptNumber: -1 } });
      } catch (e) {
        console.error("Failed to resolve submission by assignment:", e.message);
      }
    }

    if (resolvedSub) {
      submissionUrl = `/submissions/${resolvedSub._id}`;
      githubUrl = resolvedSub.fileUrl || resolvedSub.link || githubUrl;
      attemptNumber = resolvedSub.attemptNumber || attemptNumber;
    }

    // Fallback: search student's active group repo URL
    if (githubUrl === "N/A" && batchId) {
      try {
        const group = await db.collection("groups").findOne({
          batchId: new ObjectId(batchId),
          members: actor.uid,
          status: "active"
        });
        if (group && group.repoUrl) {
          githubUrl = group.repoUrl;
        }
      } catch (e) {
        console.error("Failed to fetch group repo:", e.message);
      }
    }

    // 5. Select Zammad routing group and Priority
    let group = env.ZAMMAD_DEFAULT_GROUP || "Users";
    let priorityId = 2; // Default Normal

    switch (category) {
      case "Technical Issue":
        group = "Technical Team";
        priorityId = 3; // High
        break;
      case "Task Issue":
        group = "Mentor Support";
        priorityId = 3; // High
        break;
      case "Evaluation Issue":
        group = "Evaluator Support";
        priorityId = 3; // High
        break;
      case "Certificate Issue":
        group = "Certificate Team";
        priorityId = 2; // Normal
        break;
      case "General Question":
      default:
        group = "General Support";
        priorityId = 1; // Low
        break;
    }

    // 6. Format the structured context description block
    const formattedBody = `---
Shyoski Context
Student UID: ${actor.uid}
Organization: ${orgName}
Batch: ${batchName}
Assignment: ${assignmentTitle} (Week ${assignmentWeek})
Submission: ${submissionUrl}
GitHub: ${githubUrl}
Category: ${category || "General Question"}
Attempt Number: ${attemptNumber}
---

Problem:
${body}`;

    // 7. Resolve customer in Zammad (ensure they exist)
    const customerId = await TicketService.getOrCreateCustomer(env, actor);

    // 8. Request ticket creation from Zammad
    const ticketData = await ZammadClient.request(env, "/tickets", {
      method: "POST",
      body: JSON.stringify({
        title: `[${category || "General"}] ${title}`,
        group,
        priority_id: priorityId,
        customer_id: customerId,
        article: {
          subject: title,
          body: formattedBody,
          type: "note",
          internal: false
        }
      })
    });

    // 8. Log / Map Zammad ticket into MongoDB
    const zammadTicket = {
      ticketId: ticketData.id,
      ticketNumber: ticketData.number,
      uid: actor.uid,
      email: actor.email,
      organizationId: new ObjectId(orgId),
      batchId: batchId ? new ObjectId(batchId) : null,
      category: category || "General Question",
      status: ticketData.state || "new",
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await db.collection("zammad_tickets").insertOne(zammadTicket);

    return {
      id: ticketData.id,
      number: ticketData.number,
      title: ticketData.title,
      state: ticketData.state
    };
  }

  /**
   * Fetches ticket list from Zammad for the student
   */
  static async listTickets(db, env, uid, email) {
    const records = await db.collection("zammad_tickets").find({ uid }).toArray();
    if (records.length === 0) return [];

    let searchResult = null;
    try {
      searchResult = await ZammadClient.request(
        env,
        `/tickets/search?query=customer.email:${encodeURIComponent(email)}&limit=100`
      );
    } catch (e) {
      console.warn("Zammad search failed, using local DB cache:", e.message);
    }

    const ticketAssets = searchResult?.assets?.Ticket || {};

    return records.map((r) => {
      const t = ticketAssets[r.ticketId] || {};
      return {
        id: r.ticketId,
        number: r.ticketNumber,
        title: t.title || `[${r.category}] Support Ticket`,
        category: r.category,
        stateName: t.state || r.status || "open",
        updatedAt: t.updated_at || r.updatedAt,
        createdAt: t.created_at || r.createdAt
      };
    });
  }

  /**
   * Returns conversation articles for a ticket
   */
  static async getTicketArticles(db, env, ticketId, uid) {
    // 1. Security Check: verify requesting student owns the ticket
    const ticketRecord = await db.collection("zammad_tickets").findOne({
      ticketId: parseInt(ticketId),
      uid
    });
    if (!ticketRecord) {
      throw new Error("Forbidden: You do not have permission to access this ticket.");
    }

    // 2. Fetch ticket details to identify the owner (customer) User ID in Zammad
    let customerId = null;
    try {
      const ticketDetail = await ZammadClient.request(env, `/tickets/${ticketId}`);
      customerId = ticketDetail.customer_id;
    } catch (e) {
      console.warn("Failed to fetch Zammad ticket details for customer matching:", e.message);
    }

    const data = await ZammadClient.request(env, `/ticket_articles?ticket_id=${ticketId}`);
    const articles = Array.isArray(data) ? data : [];

    return articles
      .filter((a) => !a.internal)
      .map((a) => ({
        id: a.id,
        body: a.body,
        contentType: a.content_type,
        createdBy: a.created_by,
        createdAt: a.created_at,
        isCustomer: customerId ? a.created_by_id === customerId : a.sender === "Customer",
        sender: a.sender,
        type: a.type
      }));
  }

  /**
   * Posts reply / note to Zammad ticket
   */
  static async replyToTicket(db, env, ticketId, uid, email, body) {
    const ticketRecord = await db.collection("zammad_tickets").findOne({
      ticketId: parseInt(ticketId),
      uid
    });
    if (!ticketRecord) {
      throw new Error("Forbidden: You do not have permission to reply to this ticket.");
    }

    const reply = await ZammadClient.request(env, "/ticket_articles", {
      method: "POST",
      headers: {
        "X-On-Behalf-Of": email
      },
      body: JSON.stringify({
        ticket_id: parseInt(ticketId),
        subject: "Reply from Student",
        body,
        type: "note",
        internal: false
      })
    });

    return { id: reply.id };
  }
}
