import { MongoClient } from 'mongodb';

const MONGODB_URI = "mongodb+srv://km:123@shyoski.nv2c0nw.mongodb.net/?appName=shyoski";

async function run() {
  const client = new MongoClient(MONGODB_URI);
  try {
    await client.connect();
    const db = client.db('shyoski_v2');
    const users = await db.collection('users').find({}).toArray();
    console.log("Seeded Users in Database:");
    console.log(JSON.stringify(users, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
}

run();
