import mongoose from "mongoose";

export default async function connectDB() {
  try {
    mongoose.set("strictQuery", true);

    const mongoURI = process.env.MONGODB_URI;
    await mongoose.connect(mongoURI);

    console.log(`[DB] DB Connected successfully`);
    mongoose.connection.on('error', (err) => {
      console.log(`[DB] mongoose connection failed , error : ${err}`);
    });
  } catch (err) {
    console.log(`[DB] MONGOOSE CONNECTION FAILED , error : ${err}`);
    throw err;
  }
}