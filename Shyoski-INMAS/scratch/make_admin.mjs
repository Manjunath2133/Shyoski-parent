import { MongoClient } from 'mongodb';

const MONGODB_URI = "mongodb+srv://km:123@shyoski.nv2c0nw.mongodb.net/?appName=shyoski";

async function promote(email) {
  if (!email) {
    console.error("Please provide an email address. Usage: node scratch/make_admin.mjs user@example.com");
    process.exit(1);
  }

  const client = new MongoClient(MONGODB_URI);
  try {
    await client.connect();
    const db = client.db('shyoski_v2');
    
    // Find the user
    const user = await db.collection('users').findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      console.error(`❌ User with email ${email} not found in the database. Make sure you sign up first at http://localhost:5177/signup`);
      process.exit(1);
    }

    // Update their role to admin
    await db.collection('users').updateOne(
      { email: user.email },
      { $set: { role: 'admin', globalRole: 'super_admin' } }
    );

    console.log(`\n🎉 Success! User ${email} has been promoted to Admin and Super Admin!`);
    console.log(`You can now log in at http://localhost:5177/login and access the Admin panel at http://localhost:5177/admin`);
  } catch (err) {
    console.error("Error promoting user:", err);
  } finally {
    await client.close();
  }
}

const emailArg = process.argv[2];
promote(emailArg);
