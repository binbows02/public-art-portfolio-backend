import express from 'express';
import cors from 'cors';
import mysql from 'mysql2/promise';
import multer from 'multer';
import path from 'path';
import 'dotenv/config';

const db = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

console.log('Connected to MySQL');

const storage = multer.diskStorage({
    destination: './public/uploads/profile',

    filename: (req, file, cb) => {
        const uniqueName = Date.now() + path.extname(file.originalname);

        cb(null, uniqueName);
    }
});

const upload = multer({ storage });

const app = express();

app.use(cors());
app.use(express.json());

app.use('/uploads', express.static('./public/uploads'));

app.get('/api/comments', async (req, res) => {
    const [comments] = await db.query(
        'SELECT * FROM comments ORDER BY date DESC'
    );

    res.json(comments);
});

app.post('/api/comments', upload.single('profileImage'), async (req, res) => {
    const { username, comment } = req.body;

    const profileImage = req.file
        ? `./uploads/profile/${req.file.filename}`
        : null;

    const [result] = await db.query(
        `INSERT INTO comments (username, comment, profile_image)
         VALUES (?, ?, ?)`,
        [
            username || 'Anonymous',
            comment,
            profileImage
        ]
    );

    const [newComment] = await db.query(
        'SELECT * FROM comments WHERE id = ?',
        [result.insertId]
    );

    res.json(newComment[0]);
});

const PORT = process.env.PORT || 5000;


app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});