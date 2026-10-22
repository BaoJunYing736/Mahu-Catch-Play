import { FaceLandmarker, HandLandmarker, FilesetResolver } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8";

const startScreen = document.getElementById('start-screen');
const gameScreen = document.getElementById('game-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const startBtn = document.getElementById('start-btn');
const mainMenuBtn = document.getElementById('main-menu-btn'); 
const cat = document.getElementById('cat');
const catShadow = document.getElementById('cat-shadow');
const scoreDisplay = document.getElementById('score');
const hpDisplay = document.getElementById('hp');
const finalScoreDisplay = document.getElementById('final-score');
const gameOverReason = document.getElementById('game-over-reason');
const gameArea = document.getElementById('game-area');
const quitBtn = document.getElementById('quit-btn'); 
const comboDisplay = document.getElementById('combo-display');
const startCameraBtn = document.getElementById('start-camera-btn');

const webcam = document.getElementById('webcam');
const cameraPreviewContainer = document.getElementById('camera-preview-container');
const trackingWarning = document.getElementById('tracking-warning');

const cameraInstructionOverlay = document.getElementById('camera-instruction-overlay');
const understandBtn = document.getElementById('understand-btn');

const settingsBtn = document.getElementById('settings-btn');
const overSettingsBtn = document.getElementById('over-settings-btn');
const settingsModal = document.getElementById('settings-modal');
const closeSettingsBtn = document.getElementById('close-settings-btn');
const openGalleryBtn = document.getElementById('open-gallery-btn');
const nextBgBtn = document.getElementById('next-bg-btn');
const uploadBgBtn = document.getElementById('upload-bg-btn');
const bgUpload = document.getElementById('bg-upload');

const galleryModal = document.getElementById('gallery-modal');
const closeGalleryBtn = document.getElementById('close-gallery-btn');
const galleryGrid = document.getElementById('gallery-grid');

const unlockedCatImg = document.getElementById('unlocked-cat-img');
const unlockMessage = document.getElementById('unlock-message');
const nextUnlockInfo = document.getElementById('next-unlock-info');

// 新增的音量和最高分 UI
const highScoreDisplay = document.getElementById('high-score-display');
const muteBtn = document.getElementById('mute-btn');
const volumeSlider = document.getElementById('volume-slider');

let score = 0;
let hp = 3; 
let isPlaying = false;
let catPosition = 50; 
let spawnLoop;
let currentSpeed = 2.2; 
let spawnInterval = 800; 
let combo = 1;
let isFrozen = false;

let faceLandmarker = null;
let handLandmarker = null;
let webcamRunning = false;
let lastVideoTime = -1;
let lastDetectionTime = 0; 

const totalSkins = 9;
let highestScore = parseInt(localStorage.getItem('mahuHighScore')) || 0;
let maxUnlockedLevel = Math.min(Math.floor(highestScore / 100) + 1, totalSkins);
let selectedSkinLevel = parseInt(localStorage.getItem('mahuSelectedSkin')) || 1;

if (selectedSkinLevel > maxUnlockedLevel) {
    selectedSkinLevel = maxUnlockedLevel;
}

// 音量相关状态
let isMuted = localStorage.getItem('mahuMuted') === 'true';
let savedVolume = parseFloat(localStorage.getItem('mahuVolume')) || 0.5;

function updateMainCat() {
    cat.src = `assets/cats/cat${selectedSkinLevel}.png`;
    highScoreDisplay.innerText = `Best Score: ${highestScore}`;
    
    volumeSlider.value = savedVolume;
    muteBtn.innerText = isMuted || savedVolume === 0 ? '🔇' : '🔊';
}
updateMainCat();

const sounds = {
    normal: new Audio('assets/normal.mp3'), 
    good: new Audio('assets/good.mp3'),
    toxic: new Audio('assets/game_over.mp3'),
    start: new Audio('assets/game_start.mp3'),
    button: new Audio('assets/button.mp3')
};

// 音量控制函数
function updateVolume() {
    Object.values(sounds).forEach(sound => {
        sound.volume = isMuted ? 0 : savedVolume;
    });
    muteBtn.innerText = isMuted || savedVolume === 0 ? '🔇' : '🔊';
}
updateVolume();

function playSound(soundName) {
    if (sounds[soundName]) {
        const soundClone = sounds[soundName].cloneNode();
        soundClone.play().catch(e => console.log("Audio error:", e));
    }
}

const normalFoods = [
    { img: "assets/jerky.png", points: 2, sound: 'good' },
    { img: "assets/canned_food.png", points: 1, sound: 'good' },
    { img: "assets/cat_food.png", points: 1, sound: 'normal' },
    { img: "assets/dried.png", points: 1, sound: 'normal' }
];

const toxicFoods = [
    { img: "assets/chocolate.png", isToxic: true }, 
    { img: "assets/grape.png", isToxic: true }, 
    { img: "assets/lily.png", isToxic: true }  
];

function startGame() {
    score = 0;
    hp = 3; 
    catPosition = 50;
    currentSpeed = 2.2;
    spawnInterval = 800;
    combo = 1;
    isFrozen = false;
    
    updateMainCat();
    scoreDisplay.innerText = score;
    hpDisplay.innerText = hp;
    updateCatPosition();
    
    comboDisplay.classList.remove('show');
    gameArea.classList.remove('frozen-effect');
    document.querySelectorAll('.falling-item').forEach(item => item.remove());
    
    startScreen.classList.remove('active');
    gameOverScreen.classList.remove('active');
    gameScreen.classList.add('active');
    
    if (webcamRunning) {
        cameraPreviewContainer.style.display = 'block';
    } else {
        cameraPreviewContainer.style.display = 'none';
        trackingWarning.classList.remove('show');
    }

    isPlaying = true;
    startSpawnLoop(); 
}

function startSpawnLoop() {
    clearInterval(spawnLoop);
    spawnLoop = setInterval(spawnItem, spawnInterval);
}

function endGame(isToxic) {
    webcamRunning = false;
    isPlaying = false;
    clearInterval(spawnLoop);
    
    finalScoreDisplay.innerText = score;
    gameOverReason.innerText = isToxic ? "You ate too much toxic food!" : "Game Over!";
    
    if (score > highestScore) {
        highestScore = score;
        localStorage.setItem('mahuHighScore', highestScore);
        maxUnlockedLevel = Math.min(Math.floor(highestScore / 100) + 1, totalSkins);
    }
    updateMainCat(); // 实时刷新主界面最高分

    unlockedCatImg.src = `assets/cats/cat${selectedSkinLevel}.png`;
    
    if (maxUnlockedLevel === totalSkins) {
        unlockMessage.innerText = `All 9 Mahu Unlocked!`;
        nextUnlockInfo.innerText = `You've collected them all!`;
    } else {
        unlockMessage.innerText = `Equipped: Mahu #${selectedSkinLevel}`;
        let scoreNeeded = (maxUnlockedLevel * 100) - highestScore;
        nextUnlockInfo.innerText = `Next unlock at ${maxUnlockedLevel * 100} pts (Need ${scoreNeeded})`;
    }

    gameScreen.classList.remove('active');
    gameOverScreen.classList.add('active');
}

function quitGame() {
    webcamRunning = false;
    isPlaying = false;
    clearInterval(spawnLoop);
    document.querySelectorAll('.falling-item').forEach(item => item.remove());
    gameScreen.classList.remove('active');
    startScreen.classList.add('active');
    
    cameraPreviewContainer.style.display = 'none';
    trackingWarning.classList.remove('show');
}

function spawnItem() {
    if (!isPlaying) return;

    const itemEl = document.createElement('div');
    itemEl.classList.add('falling-item');
    
    const r = Math.random();
    let itemData;
    let isToxic = false;

    if (r < 0.05) {
        itemData = { isFrozenItem: true };
    } else if (r < 0.35) { 
        itemData = toxicFoods[Math.floor(Math.random() * toxicFoods.length)];
        isToxic = true;
    } else { 
        itemData = normalFoods[Math.floor(Math.random() * normalFoods.length)];
    }

    if (itemData.isFrozenItem) {
        itemEl.innerHTML = "<div style='font-size:45px; text-align:center; line-height:60px;'>❄️</div>";
        itemEl.dataset.isFrozenItem = "true";
    } else {
        const imgEl = document.createElement('img');
        imgEl.src = itemData.img;
        itemEl.appendChild(imgEl);
        itemEl.dataset.points = itemData.points || 0;
        itemEl.dataset.isToxic = isToxic;
        if (itemData.sound) itemEl.dataset.sound = itemData.sound;
    }

    const randomX = Math.random() * 80 + 10;
    itemEl.style.left = randomX + '%';
    itemEl.style.animation = `fall ${currentSpeed}s linear forwards`;
    
    gameArea.appendChild(itemEl);
}

function checkCollision() {
    if (!isPlaying) return;

    const catRect = cat.getBoundingClientRect();
    const gameAreaRect = gameArea.getBoundingClientRect(); 
    const items = document.querySelectorAll('.falling-item');

    items.forEach(item => {
        const itemRect = item.getBoundingClientRect();

        if (itemRect.top > gameAreaRect.bottom) {
            item.remove();
            return;
        }

        if (
            itemRect.bottom >= catRect.top + 20 &&
            itemRect.bottom <= catRect.bottom &&
            itemRect.left < catRect.right - 10 &&
            itemRect.right > catRect.left + 10
        ) {
            const isToxic = item.dataset.isToxic === 'true';
            const isFrozenItem = item.dataset.isFrozenItem === 'true';
            const points = parseInt(item.dataset.points);
            const soundType = item.dataset.sound;

            const hitX = itemRect.left - gameAreaRect.left + 30;
            const hitY = itemRect.top - gameAreaRect.top;

            if (isFrozenItem) {
                activateFreeze();
                createFloatText(hitX, hitY, `FREEZE!`, false);
                triggerCatAnim('eat');
                playSound('good'); 
            } 
            else if (isToxic) {
                combo = 1;
                comboDisplay.classList.remove('show');
                
                hp -= 1;
                hpDisplay.innerText = hp;
                
                triggerCatAnim('hurt'); 
                playSound('toxic'); 
                
                gameScreen.classList.add('shake-screen');
                setTimeout(() => gameScreen.classList.remove('shake-screen'), 400);

                createFloatText(hitX, hitY, `-1 ❤️`, true);

                if (hp <= 0) endGame(true);
            } 
            else {
                score += points * combo;
                scoreDisplay.innerText = score;
                
                if (combo > 1) {
                    createFloatText(hitX, hitY, `+${points * combo} (x${combo})`, false);
                } else {
                    createFloatText(hitX, hitY, `+${points}`, false);
                }

                triggerCatAnim('eat'); 
                createParticles(hitX, hitY); 
                
                if (soundType) playSound(soundType);

                combo++;
                if (combo >= 2) {
                    comboDisplay.innerText = `Combo x${combo}`;
                    comboDisplay.classList.add('show');
                }

                if (score > 15 && currentSpeed > 1.0) {
                    currentSpeed -= 0.05; 
                    spawnInterval = Math.max(350, spawnInterval - 15); 
                    startSpawnLoop(); 
                }
            }
            item.remove();
        }
    });
}

function renderGallery() {
    galleryGrid.innerHTML = ''; 

    for (let i = 1; i <= totalSkins; i++) {
        const div = document.createElement('div');
        div.className = 'skin-item';
        
        const isUnlocked = i <= maxUnlockedLevel;
        
        if (!isUnlocked) {
            div.classList.add('locked');
        } else if (i === selectedSkinLevel) {
            div.classList.add('active');
        }

        const img = document.createElement('img');
        img.src = `assets/cats/cat${i}.png`;
        div.appendChild(img);

        div.addEventListener('click', () => {
            if (isUnlocked) {
                playSound('button'); 
                selectedSkinLevel = i;
                localStorage.setItem('mahuSelectedSkin', selectedSkinLevel); 
                updateMainCat();
                renderGallery(); 
            } else {
                playSound('toxic');
            }
        });

        galleryGrid.appendChild(div);
    }
}

function triggerCatAnim(type) {
    cat.classList.remove('cat-eat-anim', 'cat-hurt-anim');
    void cat.offsetWidth; 
    if (type === 'eat') cat.classList.add('cat-eat-anim');
    if (type === 'hurt') cat.classList.add('cat-hurt-anim');
}

function createParticles(x, y) {
    for (let i = 0; i < 8; i++) {
        const particle = document.createElement('div');
        particle.classList.add('particle');
        
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * 60 + 40;
        const tx = Math.cos(angle) * distance;
        const ty = Math.sin(angle) * distance;
        
        particle.style.left = x + 'px';
        particle.style.top = y + 'px';
        particle.style.setProperty('--tx', tx + 'px');
        particle.style.setProperty('--ty', ty + 'px');
        particle.style.transform = `rotate(${Math.random() * 360}deg)`;
        particle.style.animation = `explode 0.6s ease-out forwards`;
        
        gameArea.appendChild(particle);
        setTimeout(() => { if(particle.parentNode) particle.remove(); }, 600);
    }
}

function activateFreeze() {
    if (isFrozen) return;
    isFrozen = true;
    
    gameArea.classList.add('frozen-effect');
    document.querySelectorAll('.falling-item').forEach(item => {
        item.style.animationDuration = '4s'; 
    });
    
    const originalSpeed = currentSpeed;
    currentSpeed = 4.0; 

    setTimeout(() => {
        isFrozen = false;
        currentSpeed = originalSpeed; 
        gameArea.classList.remove('frozen-effect');
    }, 3000); 
}

function createFloatText(x, y, text, isToxic) {
    const floatEl = document.createElement('div');
    floatEl.classList.add('float-text');
    floatEl.innerText = text;
    
    if (isToxic) floatEl.classList.add('toxic-text');
    
    floatEl.style.left = x + 'px';
    floatEl.style.setProperty('--start-y', y + 'px');
    document.getElementById('float-container').appendChild(floatEl);

    setTimeout(() => { floatEl.remove(); }, 800);
}

function updateCatPosition() {
    cat.style.left = catPosition + '%';
    catShadow.style.left = catPosition + '%';
}

document.addEventListener('keydown', (e) => {
    if (!isPlaying || webcamRunning) return; 
    if (e.key === 'ArrowLeft') catPosition -= 8;
    else if (e.key === 'ArrowRight') catPosition += 8;

    if (catPosition < 5) catPosition = 5;
    if (catPosition > 95) catPosition = 95;
    updateCatPosition();
});

let touchStartX = 0;
let touchEndX = 0;

document.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
}, { passive: false });

document.addEventListener('touchmove', (e) => {
    if (isPlaying) e.preventDefault(); 
}, { passive: false });

document.addEventListener('touchend', (e) => {
    if (!isPlaying || webcamRunning) return;
    touchEndX = e.changedTouches[0].screenX;
    
    const swipeThreshold = 20; 
    const diff = touchEndX - touchStartX;
    if (diff > swipeThreshold) catPosition += 15;
    else if (diff < -swipeThreshold) catPosition -= 15;

    if (catPosition < 5) catPosition = 5;
    if (catPosition > 95) catPosition = 95;
    updateCatPosition();
}, { passive: false });

async function initCamera() {
    try {
        const vision = await FilesetResolver.forVisionTasks(
            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/wasm"
        );
        
        handLandmarker = await HandLandmarker.createFromOptions(vision, {
            baseOptions: { modelAssetPath: "assets/hand_landmarker.task", delegate: "GPU" },
            runningMode: "VIDEO", numHands: 1,
            minHandDetectionConfidence: 0.6,
            minHandPresenceConfidence: 0.6,
            minTrackingConfidence: 0.6
        });

        faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
            baseOptions: { modelAssetPath: "assets/face_landmarker.task", delegate: "GPU" },
            runningMode: "VIDEO", numFaces: 1
        });

        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        webcam.srcObject = stream;
        await webcam.play();
        webcamRunning = true;

        const hasSeenInstruction = localStorage.getItem('hasSeenCameraInstruction');
        
        if (hasSeenInstruction) {
            startGame();
        } else {
            cameraInstructionOverlay.classList.add('show');
            
            const autoHideTimer = setTimeout(() => {
                dismissInstruction();
            }, 3000); 
        }

        detectHandsAndFace();
    } catch (err) {
        alert("Camera failed to start. Please allow permissions.\n" + err);
        startCameraBtn.innerText = "Camera Mode";
        gameScreen.classList.remove('active');
        startScreen.classList.add('active');
        cameraInstructionOverlay.classList.remove('show');
    }
}

function dismissInstruction() {
    if (!cameraInstructionOverlay.classList.contains('show')) return;
    
    cameraInstructionOverlay.classList.remove('show');
    localStorage.setItem('hasSeenCameraInstruction', 'true'); 
    playSound('start');
    startGame(); 
}

let isHandControlActive = false;

function detectHandsAndFace() {
    if (!webcamRunning) return;

    if (webcam.currentTime !== lastVideoTime) {
        lastVideoTime = webcam.currentTime;
        
        const handResults = handLandmarker.detectForVideo(webcam, performance.now());
        let targetX = null;

        if (handResults.landmarks && handResults.landmarks.length > 0) {
            const landmarks = handResults.landmarks[0];
            if (landmarks[8]) {
                targetX = landmarks[8].x;
                isHandControlActive = true; 
            }
        } 

        if (targetX === null) {
            const faceResults = faceLandmarker.detectForVideo(webcam, performance.now());
            if (faceResults.faceLandmarks && faceResults.faceLandmarks.length > 0) {
                targetX = faceResults.faceLandmarks[0][1].x;
            }
            isHandControlActive = false; 
        }

        if (targetX !== null) {
            lastDetectionTime = performance.now();
            trackingWarning.classList.remove('show');
            
            let newPosition = (1 - targetX) * 100;
            if (newPosition < 5) newPosition = 5;
            if (newPosition > 95) newPosition = 95;
            
            if (isHandControlActive) {
                catPosition = newPosition;
            } else {
                catPosition = catPosition + (newPosition - catPosition) * 0.4;
            }
            
            updateCatPosition();
        } else {
            if (performance.now() - lastDetectionTime > 1000) {
                trackingWarning.classList.add('show');
            }
        }
    }
    requestAnimationFrame(detectHandsAndFace);
}

startCameraBtn.addEventListener('click', () => {
    playSound('button');
    startScreen.classList.remove('active');
    gameScreen.classList.add('active');
    
    cameraInstructionOverlay.classList.add('show');
    startCameraBtn.innerText = "Loading AI...";
    
    initCamera().catch(err => console.error(err));
});

startBtn.addEventListener('click', () => { 
    playSound('start'); 
    webcamRunning = false; 
    startGame(); 
});

const allScreens = document.querySelectorAll('.screen'); 
const builtInBackgrounds = [
    'assets/bg1.png', 'assets/bg2.png', 'assets/bg3.png',
    'assets/bg4.jpg', 'assets/bg5.jpg', 'assets/bg6.jpg'
];
let currentBgIndex = 0;

function applyBackgroundToAll(url) {
    allScreens.forEach(screen => { screen.style.backgroundImage = `url('${url}')`; });
}
if (builtInBackgrounds.length > 0) applyBackgroundToAll(builtInBackgrounds[0]);

function nextBackground() {
    if (builtInBackgrounds.length === 0) return;
    currentBgIndex++;
    if (currentBgIndex >= builtInBackgrounds.length) currentBgIndex = 0;
    applyBackgroundToAll(builtInBackgrounds[currentBgIndex]);
    playSound('button'); 
}

settingsBtn.addEventListener('click', () => {
    playSound('button');
    settingsModal.classList.add('show');
});
overSettingsBtn.addEventListener('click', () => {
    playSound('button');
    settingsModal.classList.add('show');
});

closeSettingsBtn.addEventListener('click', () => {
    playSound('button');
    settingsModal.classList.remove('show');
});

openGalleryBtn.addEventListener('click', () => {
    playSound('button');
    renderGallery(); 
    galleryModal.classList.add('show');
});

nextBgBtn.addEventListener('click', nextBackground);

uploadBgBtn.addEventListener('click', () => {
    playSound('button');
    bgUpload.click();
});

bgUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            applyBackgroundToAll(event.target.result); 
        };
        reader.readAsDataURL(file);
    }
});

closeGalleryBtn.addEventListener('click', () => {
    playSound('button');
    galleryModal.classList.remove('show');
});

quitBtn.addEventListener('click', () => { playSound('button'); quitGame(); }); 
mainMenuBtn.addEventListener('click', () => {
    playSound('button');
    gameOverScreen.classList.remove('active');
    startScreen.classList.add('active');
});

// 音量滑块和静音按钮事件
volumeSlider.addEventListener('input', (e) => {
    savedVolume = parseFloat(e.target.value);
    localStorage.setItem('mahuVolume', savedVolume);
    
    if (savedVolume === 0) {
        isMuted = true;
        localStorage.setItem('mahuMuted', 'true');
    } else {
        isMuted = false;
        localStorage.setItem('mahuMuted', 'false');
    }
    updateVolume();
});

muteBtn.addEventListener('click', () => {
    isMuted = !isMuted;
    localStorage.setItem('mahuMuted', isMuted);
    
    if (!isMuted && savedVolume === 0) {
        savedVolume = 0.5;
        volumeSlider.value = 0.5;
        localStorage.setItem('mahuVolume', savedVolume);
    }
    
    updateVolume();
    playSound('button');
});

function gameTick() {
    if (isPlaying) checkCollision();
    requestAnimationFrame(gameTick);
}
// 确保按钮点击事件绑定成功
understandBtn.addEventListener('click', () => {
    dismissInstruction();
});
gameTick();