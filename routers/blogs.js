import express from "express";
import { addBlogs, deleteByid, getAll, getById, getOnlyIdBlog, ohterBlogs } from "../controllers/blogs.js";
import multer from "multer";
const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.post(`/add`, upload.single("image"), addBlogs);
router.post(`/all`, getAll);
router.get(`/:id`, getById);
router.get(`/all/id`, getOnlyIdBlog);
router.delete(`/:id`, deleteByid)
router.post(`/other`, ohterBlogs)

export default router;
