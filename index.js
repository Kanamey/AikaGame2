// 必要なモジュールのインポート
const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const fs = require('fs');
const path = require('path');

// ポート設定
const PORT = process.env.PORT || 10000;

// 静的ファイルの提供
app.use(express.static('public'));

// 初期パズル位置情報を保持
const puzzlePositions = Array.from({ length: 16 }, () => ({
  left: Math.floor(Math.random() * 450),
  top: Math.floor(Math.random() * 450)
}));

// サーバーの起動
http.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log('Initial puzzle positions:', puzzlePositions);
});

// ソケット接続の処理
io.on('connection', (socket) => {
  console.log('A user connected');

  socket.emit('initialize puzzle', puzzlePositions);

  socket.on('start game', (data) => {
    console.log(`Game started by: ${data.participantNumber}${data.participantLetter}`);
    if (data.participantLetter === 'watch') {
      socket.emit('watch only');
    } else {
      io.emit('game started');
    }

    socket.gameLogFile = `game_log_${data.participantNumber}_${data.participantLetter}.csv`;
    fs.writeFileSync(socket.gameLogFile, 'Event,Duration (ms)\n', (err) => {
      if (err) throw err;
    });
  });

  socket.on('piece move', (data) => {
    puzzlePositions[data.index] = { left: data.left, top: data.top };
    socket.broadcast.emit('piece move', data);
  });

  socket.on('piece snap', (data) => {
    puzzlePositions[data.index] = { left: data.left, top: data.top };
    socket.broadcast.emit('piece snap', data);
  });

  socket.on('log interaction', (data) => {
    const logEntry = `Piece ${data.index},${data.duration}\n`;
    fs.appendFile(socket.gameLogFile, logEntry, (err) => {
      if (err) throw err;
    });
  });

  socket.on('game finished', (data) => {
    const logEntry = `Game Finished,${data.duration}\nTotal Move Time,${data.totalMoveTime}\n`;
    fs.appendFile(socket.gameLogFile, logEntry, (err) => {
      if (err) throw err;
      console.log('Game finished data saved.');
    });
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected');
  });
});
