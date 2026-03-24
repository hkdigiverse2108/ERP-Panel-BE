import mongoose from "mongoose";
import dns from "dns"
dns.setServers(["1.1.1.1", "8.8.8.8"])

export const connectDb = async () => {
  if (!process.env.DB_URL) {
    console.error(" DB_URL is missing! Check your .env file.");
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.DB_URL);
    console.log("Database Connected successfully");
  } catch (error) {
    console.error("DB Connection Failed", error);
    process.exit(1);
  }
};
