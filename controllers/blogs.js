import pool from "../db.js";
import path from "path";
import stream from "stream";
import ftpService from "../ftpService .js";
import moment from "moment";

const dateNoew = moment().format("YYYY-MM-DD")


export const addBlogs =  async (req,res)=> {
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
        sql = `INSERT INTO blogs (title, description, keywords, content, image, updatedAt) VALUES (?, ?, ?, ?, ?, ?)`;
        params.push(title, desc, keywords, content, newFileName, dateNoew)
      } 
      
      else if(id > 0) {
        sql = `UPDATE blogs SET title = ?, description = ?, keywords = ?, content = ?, image = ?, updatedAt = ? WHERE id = ?   `;
        params.push(title, desc, keywords, content, newFileName, dateNoew, id)
      }
  
      await db.query(sql, params);
  
      return res.status(200).json({ message: "บันทึกสำเร็จ" });
    } catch (error) {
      console.log(error);
    } finally {
      if (db) db.release();
    }
}

export const getAll = async(req,res)=> {
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
  
      let sql = `SELECT id, title, description , content, keywords, image, updatedAt FROM blogs   `;
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
}

export const getById = async(req,res)=> {
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
}

export const getOnlyIdBlog = async(req,res)=> {    
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
}

export const deleteByid =async(req,res)=> {
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
}


export const ohterBlogs = async(req,res)=> {
    let db = await pool.getConnection()
    const {id} = req.body
    
    try {

        if(!id) return res.status(400).json({message : 'ส่งข้อมูลไม่ครบ'})
            const sql = `SELECT id, image, title, description FROM blogs WHERE id != ? ORDER BY id DESC LIMIT 8`
            const [result] = await db.query(sql, [id])

            return res.status(200).json(result)
        
    } catch (error) {
        console.log(error);
        return res.status(500).json(error)
    }finally {
        if(db) db.release()
    }
}

