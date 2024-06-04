import mysql from 'mysql2/promise'
import dotenv from 'dotenv';
dotenv.config();


const pool = mysql.createPool({
    host: process.env.PRDUCTION_DB_HOST,
    user: process.env.PRDUCTION_DB_USER,
    password: process.env.PRDUCTION_DB_PASSWORD,
    database: process.env.PRDUCTION_DB_DATABASE,

})

export default pool