// 공통 JavaScript 함수 및 유틸리티

// 현재 사용자 정보 저장
const USER = {
    id: null, // Socket.io에서 할당
    name: localStorage.getItem('userName') || '익명',
    roomId: localStorage.getItem('roomId') || '',
    isPresenter: localStorage.getItem('isPresenter') === 'true'
};

// 슬라이드 데이터
const SLIDES = [
    {
        title: '실시간 동기화 프레젠테이션',
        content: '이 프레젠테이션은 WebSocket을 사용하여 모든 참가자의 화면을 실시간으로 동기화합니다.'
    },
    {
        title: '주요 기능',
        content: '- 발표자 제어\n- 실시간 동기화\n- 참가자 채팅\n- 발표자 전환\n- 룸 기반 분리'
    },
    {
        title: '어떻게 작동하나요?',
        content: 'Socket.io를 사용한 WebSocket 기술로, 서버가 모든 클라이언트의 상태를 동기화합니다. 발표자가 슬라이드를 변경하면 모든 참가자의 화면이 자동으로 업데이트됩니다.'
    },
    {
        title: '확장 가능성',
        content: '이 기본 시스템에 다양한 기능을 추가할 수 있습니다:\n- 화면 공유\n- 실시간 투표\n- 질문 & 답변\n- 드로잉 및 주석'
    },
    {
        title: '감사합니다',
        content: '질문이 있으신가요?'
    }
];

// 유틸리티 함수
function formatDate(dateString) {
    const date = new Date(dateString);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
}

function generateRandomId(length = 6) {
    return Math.random().toString(36).substring(2, 2 + length);
}

function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// 텍스트에서 URL을 찾아 링크로 변환
function linkify(text) {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.replace(urlRegex, url => `<a href="${url}" target="_blank">${url}</a>`);
}

// 텍스트에서 줄바꿈을 <br>로 변환
function nl2br(text) {
    return text.replace(/\n/g, '<br>');
}

// 메시지 포맷팅 (이스케이프, 링크, 줄바꿈)
function formatMessage(message) {
    return linkify(nl2br(escapeHtml(message)));
}

// Socket.io 클라이언트 인스턴스
let socket = null;

// Socket.io 연결 초기화
function initializeSocket(callbacks = {}) {
    // 이미 연결된 경우 재사용
    if (socket && socket.connected) {
        return socket;
    }
    
    // 서버 URL 설정 (배포 환경에 맞게 조정)
    const socketServerUrl = window.location.hostname === 'localhost' 
        ? 'http://localhost:3000' 
        : window.location.origin;
        
    console.log('소켓 연결 시도:', socketServerUrl);
    
    // Socket.io 연결
    socket = io(socketServerUrl, {
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 20000
    });
    
    // 연결 성공 이벤트
    socket.on('connect', () => {
        console.log('서버에 연결됨:', socket.id);
        USER.id = socket.id;
        
        // 룸 참가
        socket.emit('joinRoom', {
            roomId: USER.roomId,
            isPresenter: USER.isPresenter,
            name: USER.name
        });
        
        // 연결 성공 콜백
        if (callbacks.onConnect) {
            callbacks.onConnect();
        }
    });
    
    // 연결 오류 이벤트
    socket.on('connect_error', (error) => {
        console.error('연결 오류:', error);
        if (callbacks.onConnectError) {
            callbacks.onConnectError(error);
        }
    });
    
    // 연결 끊김 이벤트
    socket.on('disconnect', (reason) => {
        console.log('서버와 연결 끊김:', reason);
        if (callbacks.onDisconnect) {
            callbacks.onDisconnect(reason);
        }
    });
    
    // 룸 상태 수신
    socket.on('roomState', (state) => {
        console.log('룸 상태 수신:', state);
        if (callbacks.onRoomState) {
            callbacks.onRoomState(state);
        }
    });
    
    // 슬라이드 총 개수 요청
    socket.on('requestTotalSlides', () => {
        if (USER.isPresenter) {
            console.log('총 슬라이드 수 전송:', SLIDES.length);
            socket.emit('setTotalSlides', SLIDES.length);
        }
    });
    
    // 슬라이드 변경 수신
    socket.on('slideChanged', (data) => {
        console.log('슬라이드 변경 수신:', data);
        if (callbacks.onSlideChanged) {
            callbacks.onSlideChanged(data);
        }
    });
    
    // 총 슬라이드 수 업데이트 수신
    socket.on('totalSlidesUpdate', (data) => {
        console.log('총 슬라이드 수 업데이트:', data);
        if (callbacks.onTotalSlidesUpdate) {
            callbacks.onTotalSlidesUpdate(data);
        }
    });
    
    // 참가자 목록 업데이트 수신
    socket.on('participantsUpdate', (data) => {
        console.log('참가자 목록 업데이트:', data);
        if (callbacks.onParticipantsUpdate) {
            callbacks.onParticipantsUpdate(data);
        }
    });
    
    // 발표자 변경 수신
    socket.on('presenterChanged', (data) => {
        console.log('발표자 변경 수신:', data);
        // 내가 새 발표자가 되었는지 확인
        if (data.newPresenterId === USER.id) {
            USER.isPresenter = true;
            localStorage.setItem('isPresenter', 'true');
        } else if (data.previousPresenterId === USER.id) {
            USER.isPresenter = false;
            localStorage.setItem('isPresenter', 'false');
        }
        
        if (callbacks.onPresenterChanged) {
            callbacks.onPresenterChanged(data);
        }
    });
    
    // 새 메시지 수신
    socket.on('newMessage', (data) => {
        console.log('새 메시지 수신:', data);
        if (callbacks.onNewMessage) {
            callbacks.onNewMessage(data);
        }
    });
    
    return socket;
}