import express from "express";
import cors from "cors";
import pool from "./db.js";
import multer from "multer";
import fs from "fs";
import stream from "stream";
// import { ftpClient, connectToFtp } from "./Ftp.js";
import ftpService from "./ftpService .js";
import { v4 as uuidv4 } from "uuid";
import path from "path";
const app = express();

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

// System
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  let db = await pool.getConnection();

  try {
    if (!username || !password)
      return res.status(400).json({ message: "ส่งข้อมูลไม่ครบ" });
    if (username == "admin" && password == "1234") {
      return res.status(200).json({ message: "เข้าสู่ระบบสำเร็จ" });
    } else {
      return res.status(400).json({ message: "user pass ไม่ถั่วต้ม" });
    }
  } catch (error) {
    console.log(error);
  } finally {
    if (db) db.release();
  }
});

// Blogs **************************************************
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.post(`/api/add/blog`, upload.single("image"), async (req, res) => {
  let db = await pool.getConnection();
  try {
    const file = req.file || null;
    const { id, title, desc, content, keywords, image } = req.body;

    // Check Title ซ้ำ
    let paramsChcekTitle = [title]
    let sqlCheckTitle = `SELECT id FROM blogs WHERE title = ?`
    if(id) {
      sqlCheckTitle += ` AND id != ?`
      paramsChcekTitle.push(id)
    }
    const [resultCheckTitle] = await db.query(sqlCheckTitle, paramsChcekTitle)
    if(resultCheckTitle.length > 0) return res.status(400).json({message : 'มีหัวข้อนี้แล้ว'})

    // check รูปเก่าก่อน
    let checkImage = ""
    if(id > 0){
      const sqlCheckImage = `SELECT image FROM blogs WHERE id = ?`;
      const [resultCheckImage] = await db.query(sqlCheckImage, [id]);
       checkImage = resultCheckImage[0]?.image || "";
    }


    let newFileName = "";
    if (file !== null) {
      
      const ext = path.extname(file.originalname);
      newFileName = Date.now() + "_" + ext;
      const remoteFilePath = `/public_html/web/uploads/${newFileName}`;
      // อัปโหลดไฟล์ไปยัง FTP
      const readStream = new stream.PassThrough();
      readStream.end(file.buffer);

      // ลบรูปเก่าก่อน ถ้ามีนะ
      if (checkImage)
        await ftpService.deleteRemoteFile(
          `/public_html/web/uploads/${checkImage}`
        );
      await ftpService.uploadFile(readStream, remoteFilePath);
    } else {
      newFileName = image || "";
    }

    //บันทึก
    let sql = ``;
    let params = []
    
    if (id <= 0 ) {      
      sql = `INSERT INTO blogs (title, description, keywords, content, image) VALUES (?, ?, ?, ?, ?)`;
      params.push(title, desc, keywords, content, newFileName)
    } 
    
    else if(id > 0) {
      sql = `UPDATE blogs SET title = ?, description = ?, keywords = ?, content = ?, image = ? WHERE id = ?   `;
      params.push(title, desc, keywords, content, newFileName, id)
    }

    await db.query(sql, params);

    return res.status(200).json({ message: "บันทึกสำเร็จ" });
  } catch (error) {
    console.log(error);
  } finally {
    if (db) db.release();
  }
});

app.post("/api/blogs", async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const { search, full } = req.body;

    // paginations
    const page = parseInt(req.body.page) || 1;
    let sqlPage = `SELECT COUNT(id) as count FROM blogs   `;
    let params_search = [];
    if (search) {
      sqlPage += ` WHERE title LIKE ?`;
      params_search.push(`%${search}%`);
    }
    const [resultPage] = await connection.query(sqlPage, params_search);
    const limit = full ? resultPage[0].count : 10;
    const offset = (page - 1) * limit;
    const totalItems = parseInt(resultPage[0].count);
    const totalPages = Math.ceil(totalItems / limit);

    let sql = `SELECT id, title, description , content, keywords, image FROM blogs   `;
    let params = [];
    if (search) {
      sql += ` WHERE title LIKE ?`;
      params.push(`%${search}%`);
    }

    sql += ` LIMIT ? OFFSET ? `;
    params.push(limit, offset);

    const [result] = await connection.query(sql, params);

    return res.status(200).json({
      page,
      limit,
      totalPages,
      totalItems,
      data: result,
    });
  } catch (error) {
    console.log(error);
  } finally {
    if (connection) connection.release();
  }
});

app.get(`/api/blog/:id`, async (req, res) => {
  const { id } = req.params;
  let db = await pool.getConnection();
  try {
    if (!id) return res.status(400).json({ message: "ส่งข้อมูลไม่ครบ" });

    const sql = `SELECT id, title, description, keywords, content, image FROM blogs WHERE id = ? `;
    const [result] = await db.query(sql, [id]);
    return res.status(200).json(result[0]);
  } catch (error) {
    console.log(error);
    return res.status(500).json(error.message);
  } finally {
    if (db) db.release();
  }
});

app.get('/api/blogs/byid', async(req,res)=> {
  let db = await pool.getConnection()
  try {
    
    const sql = `SELECT id FROM blogs`
    const [results]  = await db.query(sql)
    return res.status(200).json(results)
    
  } catch (error) {
    console.log(error);
    return res.status(500).json(error.message)
    
  }finally {
    if(db) db.release()
  }
})

app.delete("/api/blog/:id", async (req, res) => {
  const { id } = req.params;
  let db = await pool.getConnection();

  try {
    if (!id) return res.status(400).json({ message: "ส่งข้อมูลไม่ครบ" });

    // check รูปเก่าก่อน
    const sqlCheckImage = `SELECT image FROM blogs WHERE id = ?`;
    const [resultCheckImage] = await db.query(sqlCheckImage, [id]);
    const checkImage = resultCheckImage[0].image || "";

    if (checkImage)
      await ftpService.deleteRemoteFile(
        `/public_html/web/uploads/${checkImage}`
      );

    const sql = `DELETE FROM blogs WHERE id = ?`;
    await db.query(sql, [id]);

    return res.status(200).json({ message: "ลบสำเร็จ" });
  } catch (error) {
    console.log(error);
    return res.status(500).json(error.message);
  } finally {
    if (db) db.release();
  }
});

// DISPLAY ***********************************************

app.listen(port, () => {
  console.log("server is", port);
});
