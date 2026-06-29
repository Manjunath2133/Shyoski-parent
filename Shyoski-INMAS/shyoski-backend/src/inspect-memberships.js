import { MongoClient } from "mongodb";

const uri = "mongodb+srv://km:123@shyoski.nv2c0nw.mongodb.net/?appName=shyoski";
const client = new MongoClient(uri);

async function run() {
  try {
    await client.connect();
    const db = client.db("shyoski_v2");

    console.log("=== ENROLLMENTS ===");
    const enrollments = await db.collection("enrollments").find({}).toArray();
    enrollments.forEach(e => console.log(`- uid: ${e.uid}, batchId: ${e.batchId}, status: ${e.status}`));

    console.log("\n=== ORG MEMBERSHIPS ===");
    const memberships = await db.collection("organization_memberships").find({}).toArray();
    memberships.forEach(m => console.log(`- uid: ${m.uid}, role: ${m.role}, status: ${m.status}`));

  } finally {
    await client.close();
  }
}

run().catch(console.dir);
