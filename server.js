import express from "express";
import cors from "cors";
import pool from "./db.js";
import multer from "multer";
import fs from "fs";
// import { ftpClient, connectToFtp } from "./Ftp.js";
import ftpService from "./ftpService .js";
import { v4 as uuidv4 } from "uuid";
const app = express();

// router
import authRouter from './routers/auth.js'
import blogsRouter from './routers/blogs.js'

const corsOptions = {
  origin: ["http://localhost:3000", "https://web.thaibusinessmate.com"],
  credentials: true,
};
app.use(cors(corsOptions));

app.use(express.json());
const port = process.env.PORT || 4000;

app.get("/", async (req, res) => {
  try {
    return res.send("hello world");
  } catch (error) {
    console.log(error);
  }
});

app.use(`/api/auth`, authRouter)
app.use(`/api/blogs`, blogsRouter)


app.listen(port, () => {
  console.log("server is", port);
});
