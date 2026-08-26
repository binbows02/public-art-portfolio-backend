import express from 'express';
import cors from 'cors';
import mysql from 'mysql2/promise';
import multer from 'multer';
import 'dotenv/config';

const db = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

console.log('Connected to MySQL');

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 2 * 1024 * 1024
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only images are allowed'));
        }
    }
});
const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/comments', async (req, res) => {
    const [comments] = await db.query(
        `SELECT id, username, comment, profile_image, date,
        profile_image_data IS NOT NULL AS has_profile_image
        FROM comments
        ORDER BY date DESC`
    );

    res.json(comments);
});

app.post('/api/comments', upload.single('profileImage'), async (req, res) => {
    console.log(req.file);

    const { username, comment } = req.body;

    const profileImageData = req.file
        ? req.file.buffer
        : null;

    const [result] = await db.query(
        `INSERT INTO comments (username, comment, profile_image_data)
     VALUES (?, ?, ?)`,
        [
            username || 'Anonymous',
            comment,
            profileImageData
        ]
    );

    const [newComment] = await db.query(
        `SELECT id, username, comment, profile_image, date,
        profile_image_data IS NOT NULL AS has_profile_image
        FROM comments
        WHERE id = ?`,
        [result.insertId]
    );

    res.json(newComment[0]);
});

app.get('/api/comments/:id/image', async (req, res) => {
    const [rows] = await db.query(
        'SELECT profile_image_data FROM comments WHERE id = ?',
        [req.params.id]
    );

    if (!rows.length || !rows[0].profile_image_data) {
        return res.status(404).send('Image not found');
    }

    res.set('Content-Type', 'image/jpeg');
    res.send(rows[0].profile_image_data);
});

const PORT = process.env.PORT || 5000;


app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});