import express from "express";
import cors from "cors";
import http from "http";
import bodyParser from "body-parser";
import * as packageInfo from "../package.json";
import { ConnectDb } from "./database/connection";
import { router } from "./routes";


const app = express();

app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));

ConnectDb();

const health = (req, res) => {
  return res.status(200).json({
    message: `Project Name Server is Running, Server health is green`,
    app: packageInfo.name,
    description: packageInfo.description,
    author: packageInfo.author,
    license: packageInfo.license,
  });
};

app.get("/", health);
app.get("/health", health);
app.get("/isServerUp", (req, res) => {
  res.send("Server is running");
});

app.use(router);
// app.use("/*", bad_gateway);

app.use((req, res) => {
  res.status(502).json({
    status: 502,
    message: "Project Name Backend API Bad Gateway",
  });
});

let server = new http.Server(app);
export default server;
