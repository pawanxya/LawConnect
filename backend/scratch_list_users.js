import mongoose from "mongoose";
import { User } from "./src/models/User.js";
import { Lawyer } from "./src/models/Lawyer.js";
import "./env.js";

const listUsers = async () => {
  const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/lawconnect";
  await mongoose.connect(mongoUri);
  
  const users = await User.find({}).lean();
  console.log("--- USERS COLLECTION ---");
  console.log("Total Users:", users.length);
  users.forEach(u => console.log(`- ${u.name} (${u.email}) [${u.role}] ID: ${u._id}`));
  
  const lawyers = await Lawyer.find({}).lean();
  console.log("\n--- LAWYERS COLLECTION ---");
  console.log("Total Lawyer Profiles:", lawyers.length);
  lawyers.forEach(l => console.log(`- ${l.name} (${l.email}) BarID: ${l.barId} UserID: ${l.userId}`));
  
  const collections = await mongoose.connection.db.listCollections().toArray();
  console.log("\n--- COLLECTIONS IN DATABASE ---");
  collections.forEach(c => console.log(`- ${c.name}`));
  
  await mongoose.connection.close();
};

listUsers().catch(console.error);
