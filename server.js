import express from "express";
import cors from "cors";
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
