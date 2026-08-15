import "dotenv/config";
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { MongoClient, ObjectId } from "mongodb";

const app = new Hono();

const client = new MongoClient(process.env.MONGODB_URI!);
await client.connect();

const db = client.db(process.env.DB_NAME || "myapp");

const projects = db.collection("projects");
const tickets = db.collection("tickets");

// --------------------------------------------------
// PROJECTS
// --------------------------------------------------

// GET all projects
app.get("/projects", async (c) => {
  const data = await projects.find().toArray();

  return c.json(
    data.map((p) => ({
      id: p._id.toString(),
      name: p.name,
      description: p.description,
    })),
  );
});

// GET one project
app.get("/projects/:id", async (c) => {
  const { id } = c.req.param();

  if (!ObjectId.isValid(id)) {
    return c.json({ error: "Invalid project id" }, 400);
  }

  const project = await projects.findOne({
    _id: new ObjectId(id),
  });

  if (!project) {
    return c.json({ error: "Project not found" }, 404);
  }

  return c.json({
    id: project._id.toString(),
    name: project.name,
    description: project.description,
  });
});

// CREATE project
app.post("/projects", async (c) => {
  const body = await c.req.json();

  const project = {
    name: body.name,
    description: body.description || "",
  };

  const result = await projects.insertOne(project);

  return c.json(
    {
      id: result.insertedId.toString(),
      ...project,
    },
    201,
  );
});

// UPDATE project
app.put("/projects/:id", async (c) => {
  const { id } = c.req.param();

  if (!ObjectId.isValid(id)) {
    return c.json({ error: "Invalid project id" }, 400);
  }

  const body = await c.req.json();

  const result = await projects.findOneAndUpdate(
    { _id: new ObjectId(id) },
    {
      $set: {
        name: body.name,
        description: body.description || "",
      },
    },
    { returnDocument: "after" },
  );

  if (!result) {
    return c.json({ error: "Project not found" }, 404);
  }

  return c.json({
    id: result._id.toString(),
    name: result.name,
    description: result.description,
  });
});

// DELETE project
app.delete("/projects/:id", async (c) => {
  const { id } = c.req.param();

  if (!ObjectId.isValid(id)) {
    return c.json({ error: "Invalid project id" }, 400);
  }

  const result = await projects.deleteOne({
    _id: new ObjectId(id),
  });

  if (!result.deletedCount) {
    return c.json({ error: "Project not found" }, 404);
  }

  // Optional: delete tickets belonging to this project
  await tickets.deleteMany({
    projectId: id,
  });

  return c.json({ message: "Project deleted" });
});

// --------------------------------------------------
// TICKETS
// --------------------------------------------------

// GET all tickets
app.get("/tickets", async (c) => {
  const data = await tickets.find().toArray();

  return c.json(
    data.map((t) => ({
      id: t._id.toString(),
      projectId: t.projectId,
      name: t.name,
      priority: t.priority,
      status: t.status,
      description: t.description,
    })),
  );
});

// GET tickets for a specific project
app.get("/projects/:projectId/tickets", async (c) => {
  const { projectId } = c.req.param();

  if (!ObjectId.isValid(projectId)) {
    return c.json({ error: "Invalid project id" }, 400);
  }

  const tickets = await db.collection("tickets").find({ projectId }).toArray();

  return c.json(
    tickets.map((t) => ({
      id: t._id.toString(),
      projectId: t.projectId,
      name: t.name,
      priority: t.priority,
      status: t.status,
      description: t.description,
    })),
  );
});

// GET one ticket
app.get("/tickets/:id", async (c) => {
  const { id } = c.req.param();

  if (!ObjectId.isValid(id)) {
    return c.json({ error: "Invalid ticket id" }, 400);
  }

  const ticket = await tickets.findOne({
    _id: new ObjectId(id),
  });

  if (!ticket) {
    return c.json({ error: "Ticket not found" }, 404);
  }

  return c.json({
    id: ticket._id.toString(),
    projectId: ticket.projectId,
    name: ticket.name,
    priority: ticket.priority,
    status: ticket.status,
    description: ticket.description,
  });
});

// CREATE ticket
app.post("/tickets", async (c) => {
  const body = await c.req.json();

  const validPriorities = ["High", "Medium", "Low"];
  const validStatuses = ["To Do", "In Progress", "Done"];

  if (!validPriorities.includes(body.priority)) {
    return c.json({ error: "Invalid priority" }, 400);
  }

  if (!validStatuses.includes(body.status)) {
    return c.json({ error: "Invalid status" }, 400);
  }

  if (!ObjectId.isValid(body.projectId)) {
    return c.json({ error: "Invalid projectId" }, 400);
  }

  const project = await projects.findOne({
    _id: new ObjectId(body.projectId),
  });

  if (!project) {
    return c.json({ error: "Project not found" }, 404);
  }

  const ticket = {
    projectId: body.projectId,
    name: body.name,
    priority: body.priority,
    status: body.status,
    description: body.description || "",
  };

  const result = await tickets.insertOne(ticket);

  return c.json(
    {
      id: result.insertedId.toString(),
      ...ticket,
    },
    201,
  );
});

// UPDATE ticket
app.put("/tickets/:id", async (c) => {
  const { id } = c.req.param();

  if (!ObjectId.isValid(id)) {
    return c.json({ error: "Invalid ticket id" }, 400);
  }

  const body = await c.req.json();

  const validPriorities = ["High", "Medium", "Low"];
  const validStatuses = ["To Do", "In Progress", "Done"];

  if (!validPriorities.includes(body.priority)) {
    return c.json({ error: "Invalid priority" }, 400);
  }

  if (!validStatuses.includes(body.status)) {
    return c.json({ error: "Invalid status" }, 400);
  }

  if (!ObjectId.isValid(body.projectId)) {
    return c.json({ error: "Invalid projectId" }, 400);
  }

  const result = await tickets.findOneAndUpdate(
    { _id: new ObjectId(id) },
    {
      $set: {
        projectId: body.projectId,
        name: body.name,
        priority: body.priority,
        status: body.status,
        description: body.description || "",
      },
    },
    { returnDocument: "after" },
  );

  if (!result) {
    return c.json({ error: "Ticket not found" }, 404);
  }

  return c.json({
    id: result._id.toString(),
    projectId: result.projectId,
    name: result.name,
    priority: result.priority,
    status: result.status,
    description: result.description,
  });
});

// DELETE ticket
app.delete("/tickets/:id", async (c) => {
  const { id } = c.req.param();

  if (!ObjectId.isValid(id)) {
    return c.json({ error: "Invalid ticket id" }, 400);
  }

  const result = await tickets.deleteOne({
    _id: new ObjectId(id),
  });

  if (!result.deletedCount) {
    return c.json({ error: "Ticket not found" }, 404);
  }

  return c.json({ message: "Ticket deleted" });
});

// --------------------------------------------------

const port = Number(process.env.PORT || 3000);

console.log(`Server running on http://localhost:${port}`);

// serve({
//   fetch: app.fetch,
//   port,
// });

export default app;

// // Projects
// {
//   id: ""
//   name: "",
//   description: "",
// }

// // Tickets
// {
//   id: "",
//   projectId: int,
//   name: "",
//   priority: ("High", "Medium", "Low"),
//   status: ("To Do", "In Progress", "Done"),
//   description: ""
// }
