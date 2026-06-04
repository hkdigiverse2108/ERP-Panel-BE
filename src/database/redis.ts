import { createClient } from "redis";

const redisUrl = process.env.REDIS_URL || "redis://redis:6379";

const redisClient = createClient({
  url: redisUrl,
  socket: {
    reconnectStrategy: (retries) => {
      console.log(`Redis reconnecting... attempt ${retries}`);
      return Math.min(retries * 1000, 5000);
    },
  },
});

redisClient.on("error", (err) => console.error("Redis Client Error", err));
redisClient.on("connect", () => console.log("Redis Database Connected successfully"));

export const connectRedis = async () => {
  try {
    await redisClient.connect();
  } catch (error) {
    console.error("Failed to connect to Redis", error);
  }
};

export default redisClient;