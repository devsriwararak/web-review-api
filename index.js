import express from "express";
import cors from "cors";
import pool from "./db.js";
import multer from "multer";
import fs from "fs";
import stream from "stream";
// import { ftpClient, connectToFtp } from "./Ftp.js";
import ftpService from "./ftpService .js";
const app = express();

const corsOptions = {
  origin: ["http://localhost:3000", "https://reviewmoviehit.com"],
  credentials: true,
};
app.use(cors(corsOptions));

// app.use(cors());
app.use(express.json());
const port = process.env.PORT || 4000;

// FTP connect

app.get("/", (req, res) => {
  res.send("hello world");
});

// GET ALL WEBSITE
app.get("/api/website", async (req, res) => {
  try {
    const sql = `SELECT id,name FROM website`;
    const [result] = await pool.query(sql);
    res.status(200).json(result);
  } catch (error) {
    console.log(error);
    res.status(500).json(error);
  }
});

// GET TYPE
app.get("/api/type", async (req, res) => {
  try {
    const { search } = req.query;
    let sql = `SELECT type.id AS type_id ,type.name AS type_name, website_id , website.name AS website_name
    FROM type
    INNER JOIN website ON website.id = type.website_id
    `;
    const params = [];
    if (search) {
      sql += ` WHERE website_id = ?`;
      params.push(search);
    }

    const [result] = await pool.query(sql, params);
    res.status(200).json(result);
  } catch (error) {
    console.log(error);
    res.status(500).json(error.message);
  }
});
// POST TYPE
app.post("/api/type", async (req, res) => {
  try {
    const { website_id, name } = req.body;

    // check
    const sqlCheck = `SELECT name FROM type WHERE name = ? AND website_id = ?`;
    const [resultCheck] = await pool.query(sqlCheck, [name, website_id]);

    if (resultCheck.length > 0) {
      throw new Error("มีข้อมูลนี้แล้ว");
    }
    // INSERT SQL
    const sql = `INSERT INTO type (name, website_id ) VALUES (?, ?)`;
    await pool.query(sql, [name, website_id]);
    res.status(200).json({ message: "บันทึกสำเร็จ" });
  } catch (error) {
    console.log(error);
    res.status(500).json(error.message);
  }
});
app.put("/api/type", async (req, res) => {
  try {
    const { id, name, website_id } = req.body;
    //check
    const sqlCheck = `SELECT id FROM type WHERE name = ? AND website_id = ?`;
    const [resultCheck] = await pool.query(sqlCheck, [name, website_id]);
    if (resultCheck.length > 0) {
      throw new Error("มีหมวดหมู่นี้แล้ว ในเว็บไซต์นี้");
    }

    // UPDATE SQL
    const sql = `UPDATE type SET name = ? WHERE id = ?`;
    await pool.query(sql, [name, id]);
    res.status(200).json({ message: "ทำรายการสำเร็จ" });
  } catch (error) {
    console.log(error);
    res.status(500).json(error.message);
  }
});
// DELETE TYPE
app.delete("/api/type/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return false;
    const sql = `DELETE FROM type WHERE id = ?`;
    await pool.query(sql, [id]);
    res.status(200).json({ message: "ทำรายการสำเร็จ" });
  } catch (error) {
    console.log(error);
    res.status(500).json(error.message);
  }
});

// PRODUCTS **************************************************
// บันทึก
// ทำให้การทำงานเร็วขึ้น
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.post("/api/products", upload.single("image"), async (req, res) => {
  try {
    const {
      title,
      description,
      contants,
      keywords,
      score,
      website_id,
      id,
      isUpdate,
      type_id,
      image,
    } = req.body;

    const file = req.file || null;
    console.log(req.body);
    console.log(file);

    if (
      !title ||
      !description ||
      !contants ||
      !keywords ||
      score == "0" ||
      type_id == "null" ||
      (isUpdate === "false" && !req.file)
    ) {
      throw new Error("ส่งข้อมูลไม่ครบ");
    }
    // เช็ค ชื่่อหัวข้อซ้ำ
    const sqlCheckTitle = `SELECT title FROM blog WHERE website_id = ? AND title = ?`;
    const [resultCheckTitle] = await pool.query(sqlCheckTitle, [
      website_id,
      title,
    ]);
    if (resultCheckTitle.length > 0) {
      throw new Error("มีหัวข้อนี้แล้ว กรุณาเพิ่มใหม่ !!");
    }
    
    let newFileName = "";
    if (file !== null) {
      newFileName = Date.now() + "_" + file.originalname;
      const remoteFilePath = `/public_html/uploads/reviewmoviehit/${newFileName}`;
      // อัปโหลดไฟล์ไปยัง FTP
      const readStream = new stream.PassThrough();
      readStream.end(file.buffer);
      if (newFileName != image) {
        await ftpService.uploadFile(readStream, remoteFilePath);
      }
    }

    // // เช็ครูป
    let useimage = newFileName;
    if (id) {
      const sqlCheckImage = `SELECT image FROM blog WHERE id = ? `;
      const [resultCheckimage] = await pool.query(sqlCheckImage, [id]);
      if (resultCheckimage[0].image == image) {
        useimage = resultCheckimage[0].image;
      } else {
        useimage = newFileName;
        // ลบรูปเดิมใน FTP กรณีแก้ไขรูปใหม่
        if (isUpdate === "true") {
          const remoteFilePath = `/public_html/uploads/reviewmoviehit/${resultCheckimage[0].image}`;
          await ftpService.deleteRemoteFile(remoteFilePath);
        }
      }
    }
    // บันทึกข้อมูลลงในฐานข้อมูล
    let sql = "";
    let addData = [];
    if (isUpdate === "true") {
      sql =
        "UPDATE blog SET title = ?, description = ?, contants = ?, keywords = ?, score = ?, type_id = ?, image = ? WHERE id = ?";
      addData.push(
        title,
        description,
        contants,
        keywords,
        score,
        type_id,
        useimage,
        id
      );
    } else {
      sql = `INSERT INTO blog (website_id, title, description, contants, keywords, score, image, type_id) VALUES (?,?,?,?,?,?,?,?)`;
      addData.push(
        website_id,
        title,
        description,
        contants,
        keywords,
        score,
        newFileName,
        type_id
      );
    }
    const [result] = await pool.query(sql, addData);
    res
      .status(200)
      .json({ message: "บันทึกสำเร็จ", articleId: result.insertId });
  } catch (error) {
    console.log({ message: error.message });
    res.status(500).json(error.message);
  }
});

// GET ALL
app.get("/api/products/:website_id", async (req, res) => {
  try {
    const { website_id } = req.params;
    console.log(website_id);
    const sql = `SELECT id, title, description, contants, keywords, image, score, type_id FROM blog WHERE website_id = ? `;
    const [result] = await pool.query(sql, [website_id]);
    res.status(200).json(result);
  } catch (error) {
    console.log(error);
  }
});
// DELETE
app.post("/api/products/delete", async (req, res) => {
  try {
    const { id, image } = req.body;

    // ลบไฟล์ใน FTP server และข้อมูลในฐานข้อมูล
    await Promise.all([
      ftpService.deleteRemoteFile(
        `/public_html/uploads/reviewmoviehit/${image}`
      ), // เรียกใช้ฟังก์ชัน deleteRemoteFile จาก ftpService.js เพื่อลบไฟล์ใน FTP server
      pool.query(`DELETE FROM blog WHERE id = ?`, [id]), // ลบข้อมูลในฐานข้อมูล MySQL
    ]);

    // ส่งคำตอบกลับไปยัง client เมื่อทำงานเสร็จสมบูรณ์
    res.status(200).json({ message: "ลบไฟล์และข้อมูลบทความสำเร็จ" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "มีข้อผิดพลาดเกิดขึ้น" });
  }
});

// DISPLAY ***********************************************

// 8 อันดับหนังที่ได้ คะแนนมากที่สุด
app.get("/api/display/top_8/:website_id", async (req, res) => {
  try {
    const { website_id } = req.params;
    if (website_id == "") throw new Error("ไม่พบ website_id");
    const sql = `SELECT id, title, score, description, contants, image, keywords FROM blog WHERE website_id = ? ORDER BY score DESC LIMIT 8 `;
    const [result] = await pool.query(sql, [website_id]);
    res.status(200).json(result);
  } catch (error) {
    console.log(error);
    res.status(500).json(error.message);
  }
});
// 8 อันดับหนังมาใหม่ ที่ลงใหม่เฉยๆ
app.get("/api/display/top/:website_id", async (req, res) => {
  try {
    const { website_id } = req.params;
    console.log(website_id);
    if (website_id == "") throw new Error("ไม่พบ website_id");
    const sql = `SELECT id, title, score, description, contants, image, keywords FROM blog WHERE website_id = ? ORDER BY id DESC LIMIT 12 `;
    const [result] = await pool.query(sql, [website_id]);
    res.status(200).json(result);
  } catch (error) {
    console.log(error);
    res.status(500).json(error.message);
  }
});
// GET BY ID
app.get("/api/display/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (id == "") throw new Error("ไม่พบ id");
    const sql = `SELECT id, title, score, description, contants, image, keywords FROM blog WHERE id = ?  LIMIT 1 `;
    const [result] = await pool.query(sql, [id]);
    res.status(200).json(result);
  } catch (error) {
    console.log(error);
    res.status(500).json(error.message);
  }
});
// GET BY Type Movie
app.get("/api/display/type/:type_name", async (req, res) => {
  const { type_name } = req.params;
  const { website_id } = req.query;
  try {
    if (type_name == "" && website_id == "")
      throw new Error("ไม่พบ type_name && website_id ");
    // ค้นหา ID Type name
    let sql = `SELECT id, title , description, image, score type_id FROM blog WHERE website_id = ? `;
    let params = [];
    if (type_name === "all") {
      sql += ` `;
      params.push(website_id);
    } else {
      sql += ` AND type_id = ? `;
      params.push(website_id, type_name);
    }
    const [result] = await pool.query(sql, params);
    res.status(200).json(result);
  } catch (error) {
    console.log(error);
    res.status(500).json(error.message);
  }
});

// 4 บทความที่เกี่ยวข้อง
app.get("/api/display/top_4/:website_id", async (req, res) => {
  try {
    const { website_id } = req.params;
    if (website_id == "") throw new Error("ไม่พบ website_id");
    const sql = `SELECT id, title, score, description, contants, image, keywords FROM blog WHERE website_id = ? ORDER BY score DESC LIMIT 4 `;
    const [result] = await pool.query(sql, [website_id]);
    res.status(200).json(result);
  } catch (error) {
    console.log(error);
    res.status(500).json(error.message);
  }
});



app.listen(port, () => {
  console.log("server is", port);
});
