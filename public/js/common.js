const USER = {
    id: null, // Socket.io에서 할당
    name: localStorage.getItem('userName') || '익명',
    roomId: localStorage.getItem('roomId') || '',
    isPresenter: localStorage.getItem('isPresenter') === 'true'
};

// 슬라이드 데이터
const SLIDES = [
    {
        title: '컴퓨터의 발명',
        content: '<a href="https://blog.naver.com/moons4ir/223439412594">아타나소프-베리 컴퓨터(Atanasoff–Berry Computer)</a>는 세계 최초의 전자식 컴퓨터이다.',
        contentType: 'html', 
        image : 'static/firstcomputer.jpeg'
    },
    {
        title: '타이포와 알고리즘',
        content: '<a href="https://youtu.be/AgjtKQCm95I?si=m2DePNvVELHLYv1s&t=622">Ben Laposky의 전자 추상화 실험</a>, 최초의 디지털 그래픽 실험.',
        contentType: 'html',
        image : 'static/images (3).jpg'
    },
    {
        content: '차피노체의 디지털화 (1993)',
        image : 'static/download (1).jpeg'
    },
    {
        content: '2000년대 중반부터 타이포를 활용한 재밌는 실험들이 등장하기 시작했다. 실용적인 것부터 기괴한 것까지.<br> <a href="https://erikdemaine.org/fonts/">Mathematical and Puzzle Fonts/Typefaces (MIT EECS)</a>',
        contentType: 'html',
        image : 'static/image4.png'
    },
    {
        content: 'Yeohyun Ahn (TYPE I)',
        image : 'static/image5.png'
    },
    {
        title: 'Computational Design for Korean Typography',
        content: '- 타입페이스의 골격 구조 추출 및 분석 (Skeletonization)\n - 한글 타이포그래피 제작에 편리함을 주는 도구\n - 알고리즘을 활용한 나만의 한글 타이포 만들기',
        image : 'static/IMG_8004.JPG'
    },
    {
        title: '지금까지 어떤 것들을 했냐면요...',
        content: '<a href="https://p5js.org" target="_blank">p5.js</a>라는 프로그래밍 언어에 대한 스터디 <br> <a href="https://yewoncalli.notion.site/1bfd23952c13802c94b4fd024a00da50?v=1bfd23952c13800580d6000ce671a514&pvs=4" target="_blank">TypeLab 스터디 자료</a>',
        contentType: 'html', 
        image: 'static/image6.png'
    },
    {
        title : '변수에 관한 예제 (김지혜)',
        content: '<div class="iframe-container"><iframe src="https://editor.p5js.org/maziyo/full/bbOv9AWcc" style="width:90vw; height:450px;"></iframe></div>',
        contentType: 'html',
    },
    {
        title : '마우스 인터랙션에 관한 예제 (김봄)',
        content: '<div class="iframe-container"><iframe src="https://editor.p5js.org/blockbwriting/full/qhMc2aiLo" style="width:90vw; height:450px;"></iframe></div>',
        contentType: 'html',
    },
    {
        title : '폰트 제어를 위한 예제 (장예원)',
        content: '<div class="iframe-container"><iframe src="https://editor.p5js.org/blockbwriting/full/FqW2GFQaX" style="width:90vw; height:450px;"></iframe></div>',
        contentType: 'html',
    },
    {
        title: '삼각함수에 관한 예제 (손정우)',
        content: '<div class="iframe-container"><iframe src="https://editor.p5js.org/sonjw7139/full/QGq2Hg0Lt" style="width:90vw; height:550px;"></iframe></div>',
        contentType: 'html'
    },
    {
        title: '영상 필터링에 관한 예제 (한예슬)',
        content: '<div class="iframe-container"><iframe src="https://editor.p5js.org/blockbwriting/full/DzLctxJN6" style="width:90vw; height:550px;"></iframe></div>',
        contentType: 'html'
    },
    {
        title : '함수에 관한 예제 (한용파)',
        content: '<div class="iframe-container"><iframe src="https://editor.p5js.org/hanyongpa/full/NJ6D_ZOc3" style="width:90vw; height:550px;"></iframe></div>',
        contentType: 'html'
    },
    {
        title : '배열에 관한 예제 (박성훈)',
        content: '<div class="iframe-container"><iframe src="https://editor.p5js.org/Orwiss/full/r3D7oFUvx" style="width:90vw; height:550px;"></iframe></div>',
        contentType: 'html'
    },
    {
        title : '최종 결과물',
        content:'TypeLab 아카이빙 홈페이지 (with. 개인 작품)',
        image: 'static/IMG_7953.JPG'
    }
];

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
    
    // 스크롤 동기화 이벤트 추가
    socket.on('scrollPresentation', (data) => {
        if (!USER.isPresenter && callbacks.onScrollSync) {
            callbacks.onScrollSync(data);
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

// 스크롤 Throttle 유틸리티 함수
function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    }
}