import { MongoClient } from 'mongodb';

const MONGODB_URI = "mongodb+srv://km:123@shyoski.nv2c0nw.mongodb.net/?appName=shyoski";

async function run() {
  const client = new MongoClient(MONGODB_URI);
  try {
    await client.connect();
    const db = client.db('shyoski_v2');

    // Find the user
    const user = await db.collection('users').findOne({ email: 'student1@gmail.com' });
    if (!user) {
      console.error("❌ student1@gmail.com not found. Make sure the user has signed up!");
      process.exit(1);
    }

    // Clean up old submissions for this student to avoid duplicates/confusion
    await db.collection('submissions').deleteMany({ uid: user.uid });

    // Update student progress in users collection
    await db.collection('users').updateOne(
      { uid: user.uid },
      {
        $set: {
          'progress.week1.status': 'approved',
          'progress.week1.feedback': 'Excellent work!',
          'progress.week2.status': 'approved',
          'progress.week2.feedback': 'Awesome setup!',
          'progress.week3.status': 'approved',
          'progress.week3.feedback': 'Great team project!',
          'progress.week4.status': 'pending',
          'progress.isCertified': false
        }
      }
    );

    // Create a Week 4 submission
    const submissionDoc = {
      uid: user.uid,
      weekNumber: 4,
      status: 'pending',
      link: 'https://github.com/student1/shyoski-v2-final-project',
      submittedAt: new Date()
    };
    await db.collection('submissions').insertOne(submissionDoc);

    console.log("🎉 Successfully prepared Week 4 pending submission for student1@gmail.com!");
    console.log("Admin can now evaluate this submission on the dashboard at http://localhost:5177/admin");
  } catch (err) {
    console.error("Error preparing week 4 submission:", err);
  } finally {
    await client.close();
  }
}

run();
