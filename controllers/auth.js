
import pool from "../db.js";


export const login = async(req,res)=> {
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
}