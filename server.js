const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

// Express 앱 초기화
const app = express();

// CORS 설정
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
  credentials: true
}));

// 정적 파일 제공 (public 디렉토리)
app.use(express.static(path.join(__dirname, 'public')));

// HTTP 서버 생성
const server = http.createServer(app);

// Socket.io 서버 초기화
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true,
    allowedHeaders: ["Content-Type"]
  }
});

// 프레젠테이션 룸 데이터 저장
const rooms = {};

// 기본 라우트 설정
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

// Socket.io 연결 처리
io.on('connection', (socket) => {
  console.log('새 클라이언트 연결:', socket.id);
  
  // 룸 생성 또는 참가
  socket.on('joinRoom', (data) => {
    const { roomId, isPresenter, name } = data;
    console.log(`룸 참가 요청: ${name}(${socket.id}) → 룸 ${roomId}, 발표자: ${isPresenter}`);
    
    // 룸 ID 저장
    socket.roomId = roomId;
    socket.isPresenter = isPresenter;
    socket.name = name || '익명';
    
    // 룸 참가
    socket.join(roomId);
    
    // 새 룸이면 초기화
    if (!rooms[roomId]) {
      rooms[roomId] = {
        presenterId: isPresenter ? socket.id : null,
        currentSlide: 0,
        totalSlides: 0,
        participants: {}
      };
    } else if (isPresenter && !rooms[roomId].presenterId) {
      // 발표자가 없는 룸에 발표자로 참가
      rooms[roomId].presenterId = socket.id;
    }
    
    // 참가자 추가
    rooms[roomId].participants[socket.id] = {
      id: socket.id,
      isPresenter: isPresenter,
      name: socket.name
    };
    
    // 발표자에게 슬라이드 총 개수 요청
    if (isPresenter) {
      socket.emit('requestTotalSlides');
    }
    
    // 현재 슬라이드 및 상태 정보 전송
    socket.emit('roomState', {
      currentSlide: rooms[roomId].currentSlide,
      totalSlides: rooms[roomId].totalSlides,
      isPresenter: isPresenter,
      participants: Object.values(rooms[roomId].participants)
    });
    
    // 참가자 목록 업데이트 브로드캐스트
    io.to(roomId).emit('participantsUpdate', {
      participants: Object.values(rooms[roomId].participants)
    });
    
    console.log(`${socket.name}(${socket.id})가 룸 ${roomId}에 참가함 (발표자: ${isPresenter})`);
  });
  
  // 슬라이드 총 개수 설정
  socket.on('setTotalSlides', (total) => {
    const roomId = socket.roomId;
    if (roomId && rooms[roomId] && socket.isPresenter) {
      rooms[roomId].totalSlides = total;
      io.to(roomId).emit('totalSlidesUpdate', { total });
    }
  });
  
  // 슬라이드 변경
  socket.on('changeSlide', (data) => {
    const { slideNumber } = data;
    const roomId = socket.roomId;
    
    if (roomId && rooms[roomId]) {
      // 발표자만 슬라이드 변경 가능
      if (socket.isPresenter || rooms[roomId].presenterId === socket.id) {
        rooms[roomId].currentSlide = slideNumber;
        
        // 모든 참가자에게 슬라이드 변경 알림
        socket.to(roomId).emit('slideChanged', {
          slideNumber: slideNumber
        });
        
        console.log(`룸 ${roomId}의 슬라이드가 ${slideNumber}로 변경됨`);
      }
    }
  });
  
  // 그리기 포인트 전송
  socket.on('drawPoint', (data) => {
    const { roomId, point } = data;
    
    if (roomId && rooms[roomId]) {
      // 모든 참가자에게 그리기 이벤트 브로드캐스트 (자신 제외)
      socket.to(roomId).emit('drawPoint', {
        point: point,
        userId: socket.id
      });
      
      if (point.type === 'clear') {
        console.log(`룸 ${roomId}에서 ${socket.name}(${socket.id})가 캔버스를 지웠습니다.`);
      } else if (point.type === 'start') {
        console.log(`룸 ${roomId}에서 ${socket.name}(${socket.id})가 그리기 시작`);
      }
    }
  });
  
  // 메시지 전송
  socket.on('sendMessage', (message) => {
    const roomId = socket.roomId;
    if (roomId) {
      const messageData = {
        senderId: socket.id,
        senderName: socket.name,
        message,
        timestamp: new Date().toISOString()
      };
      console.log(`새 메시지 (${roomId}): ${socket.name} - ${message.substring(0, 30)}${message.length > 30 ? '...' : ''}`);
      io.to(roomId).emit('newMessage', messageData);
    }
  });
  
  // 발표자 변경
  socket.on('transferPresenter', (targetId) => {
    const roomId = socket.roomId;
    
    if (roomId && rooms[roomId] && socket.isPresenter) {
      const targetParticipant = rooms[roomId].participants[targetId];
      
      if (targetParticipant) {
        // 현재 발표자 상태 변경
        socket.isPresenter = false;
        rooms[roomId].participants[socket.id].isPresenter = false;
        
        // 새 발표자 상태 변경
        rooms[roomId].presenterId = targetId;
        rooms[roomId].participants[targetId].isPresenter = true;
        
        // 모든 참가자에게 발표자 변경 알림
        io.to(roomId).emit('presenterChanged', {
          previousPresenterId: socket.id,
          newPresenterId: targetId
        });
        
        console.log(`룸 ${roomId}의 발표자가 ${socket.id}에서 ${targetId}로 변경됨`);
      }
    }
  });
  
  // 연결 종료
  socket.on('disconnect', (reason) => {
    console.log(`클라이언트 연결 종료: ${socket.id}, 이유: ${reason}`);
    
    const roomId = socket.roomId;
    
    if (roomId && rooms[roomId]) {
      // 참가자 제거
      if (rooms[roomId].participants[socket.id]) {
        delete rooms[roomId].participants[socket.id];
      }
      
      // 발표자가 나간 경우
      if (rooms[roomId].presenterId === socket.id) {
        const participants = Object.values(rooms[roomId].participants);
        
        if (participants.length > 0) {
          // 첫 번째 참가자를 발표자로 지정
          const newPresenter = participants[0];
          rooms[roomId].presenterId = newPresenter.id;
          rooms[roomId].participants[newPresenter.id].isPresenter = true;
          
          // 발표자 변경 알림
          io.to(roomId).emit('presenterChanged', {
            previousPresenterId: socket.id,
            newPresenterId: newPresenter.id
          });
          
          console.log(`룸 ${roomId}의 새 발표자: ${newPresenter.id}`);
        } else {
          // 참가자가 없으면 룸 삭제
          delete rooms[roomId];
          console.log(`빈 룸 ${roomId} 삭제됨`);
          return;
        }
      }
      
      // 참가자 목록 업데이트
      io.to(roomId).emit('participantsUpdate', {
        participants: Object.values(rooms[roomId].participants)
      });
      
      console.log(`클라이언트 ${socket.id}가 룸 ${roomId}에서 연결 종료됨`);
    }
  });
});

// 서버 시작
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`서버가 포트 ${PORT}에서 실행 중입니다`);
  console.log(`http://localhost:${PORT}`);
});