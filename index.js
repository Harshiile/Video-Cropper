const express = require('express');
const ffmpeg = require('fluent-ffmpeg');
const path = require('path')
const cors = require('cors')
const multer = require('multer');

const app = express();
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cors());

const { Server } = require('socket.io');
const server = require('http').createServer(app);
const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173",
        allowedHeaders: [],
        credentials: true
    }
})


const port = 3000;

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './client/public/uploads')
    },
    filename: function (req, file, cb) {
        const ext = path.extname(file.originalname);
        const filename = `${file.originalname.replace(ext, '')}_${Date.now()}_${ext}`;
        cb(null, filename)
    }
})
const upload = multer({ storage })


io.on('connection', (socket) => {
    console.log('User connected : ', socket.id);
})


app.post('/api/upload', upload.single('video'), (req, res) => {
    req.file ? res.json({ error: false, filename: req.file.filename }) : res.json({ error: true })
})
app.post('/api/crop', (req, res) => {
    const { filename, dimensions, socketId } = req.body;
    ffmpeg(`./client/public/uploads/${filename}`)
        .videoFilter(`crop=${dimensions.width}:${dimensions.height}:${dimensions.x}:${dimensions.y}`)
        .videoCodec('libx264')
        .outputOptions('-crf 23')
        .on("progress", (e) => {
            io.to(socketId).emit('cropping-progress', { progress: e.percent.toPrecision(4) })
            // console.log(`Cropping : ${}%`)
        })
        .on('end', () => { console.log('Cropping completed!'); res.json({ error: false }) })
        .on('error', (err) => { console.error('Error:', err); res.json({ error: true }) })
        .save(`./client/public/crops/${filename}`);
})

server.listen(3000, () => {
    console.log(`Server is running on http://localhost:${port}`);
});

// 1920 × 1080