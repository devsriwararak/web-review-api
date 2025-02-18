import ftp from "ftp"
import path from "path"
import fs from "fs"
import dotenv from 'dotenv';
dotenv.config();



const ftpConfig = {
    host: process.env.PRODUCTION_FTP_HOST,
    user: process.env.PRODUCTION_FTP_USER,
    password: process.env.PRODUCTION_FTP_PASSWORD,
  };
  

  const uploadFile = (stream, remoteFilePath) => {
    return new Promise((resolve, reject) => {
      const client = new ftp();
  
      client.on('ready', () => {
        client.put(stream, remoteFilePath, (err) => {
          if (err) {
            client.end();
            return reject(err);
          }
          client.end();
          resolve();
        });
      });
  
      client.connect(ftpConfig);
    }); 
    
  };
  


  const deleteRemoteFile = (remoteFilePath) => {
    return new Promise((resolve, reject) => {
        const client = new ftp();
        client.on('ready', () => {
            client.delete(remoteFilePath, (err) => {
                if (err) {
                    client.end();
                    return reject(err);
                }
                client.end();
                resolve();
            });
        });
        client.connect(ftpConfig);
    });
};

  export default {
    uploadFile,
    deleteRemoteFile,
  }