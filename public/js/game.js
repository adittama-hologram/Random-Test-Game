import * as THREE from 'three';
import { sounds } from './sounds.js';

// --- CONFIGURATION ---
const GAME_TIME = 60;
const PADDLE_SPEED = 0.5;
const CPU_REACTION_SPEED = 0.12; 
const BALL_SPEED_START = 0.15;
const BALL_SPEED_INC = 0.005;
const FIELD_WIDTH = 25;
const FIELD_HEIGHT = 15;

// --- STATE ---
let gameState = 'START'; // START, PLAYING, END
let isCountingDown = false;
let timeLeft = GAME_TIME;
let playerScore = 0;
let cpuScore = 0;
let playerName = '';
let ballVelocity = new THREE.Vector3();
let timerInterval;

// --- THREE.JS SETUP ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000, 1);
document.getElementById('game-container').appendChild(renderer.domElement);

// --- LIGHTING ---
const ambientLight = new THREE.AmbientLight(0x404040, 2);
scene.add(ambientLight);
const pointLight = new THREE.PointLight(0xffffff, 100);
pointLight.position.set(0, 10, 15);
scene.add(pointLight);

// --- OBJECTS ---
// Background Stars - Purely in the deep background to avoid Z-fighting
const starGeometry = new THREE.BufferGeometry();
const starCount = 8000;
const starPositions = new Float32Array(starCount * 3);
for (let i = 0; i < starCount; i++) {
    const r = 400 + Math.random() * 200;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    
    starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    starPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    starPositions[i * 3 + 2] = r * Math.cos(phi) - 100; // Shifted far back
}
starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
const starMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 0.7, transparent: true, opacity: 0.5 });
const stars = new THREE.Points(starGeometry, starMaterial);
scene.add(stars);

// Game Field - Moved back to avoid Z-fighting with ball and paddles
const fieldGeo = new THREE.PlaneGeometry(FIELD_WIDTH, FIELD_HEIGHT);
const fieldMat = new THREE.MeshPhongMaterial({ 
    color: 0x1e1b4b, 
    transparent: true, 
    opacity: 0.3, 
    side: THREE.DoubleSide 
});
const field = new THREE.Mesh(fieldGeo, fieldMat);
field.position.z = -1; // Move back
scene.add(field);

// Paddles
const paddleGeo = new THREE.BoxGeometry(0.5, 3, 1);
const playerMat = new THREE.MeshPhongMaterial({ color: 0x3b82f6, emissive: 0x3b82f6, emissiveIntensity: 0.5 });
const cpuMat = new THREE.MeshPhongMaterial({ color: 0xef4444, emissive: 0xef4444, emissiveIntensity: 0.5 });

const playerPaddle = new THREE.Mesh(paddleGeo, playerMat);
playerPaddle.position.x = -FIELD_WIDTH / 2 + 1;
playerPaddle.position.z = 0;
scene.add(playerPaddle);

const cpuPaddle = new THREE.Mesh(paddleGeo, cpuMat);
cpuPaddle.position.x = FIELD_WIDTH / 2 - 1;
cpuPaddle.position.z = 0;
scene.add(cpuPaddle);

// Ball
const ballGeo = new THREE.SphereGeometry(0.3, 32, 32);
const ballMat = new THREE.MeshPhongMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.2 });
const ball = new THREE.Mesh(ballGeo, ballMat);
ball.position.z = 0;
scene.add(ball);

camera.position.z = 15;

// --- UI UTILS ---
function hideAllUI() {
    document.getElementById('name-input-screen').classList.add('hidden');
    document.getElementById('end-game-screen').classList.add('hidden');
    document.getElementById('leaderboard-screen').classList.add('hidden');
    document.getElementById('hud').classList.add('hidden');
    document.getElementById('countdown').classList.add('hidden');
}

// Camera Shake Effect
function shakeCamera() {
    const originalPos = camera.position.clone();
    let count = 0;
    const interval = setInterval(() => {
        camera.position.x = originalPos.x + (Math.random() - 0.5) * 0.4;
        camera.position.y = originalPos.y + (Math.random() - 0.5) * 0.4;
        count++;
        if (count > 8) {
            clearInterval(interval);
            camera.position.copy(originalPos);
        }
    }, 30);
}

// --- CORE LOGIC ---
function resetBall() {
    ball.position.set(0, 0, 0);
    ballVelocity.set(0, 0, 0);
    isCountingDown = true;
    
    let count = 3;
    const countEl = document.getElementById('countdown');
    countEl.classList.remove('hidden');
    countEl.innerText = count;
    
    const countInterval = setInterval(() => {
        count--;
        if (count > 0) {
            countEl.innerText = count;
            sounds.playClick();
        } else if (count === 0) {
            countEl.innerText = 'GO!';
            sounds.playClick();
        } else {
            clearInterval(countInterval);
            countEl.classList.add('hidden');
            
            // Launch ball
            const angle = (Math.random() - 0.5) * Math.PI / 2;
            const dir = Math.random() > 0.5 ? 1 : -1;
            ballVelocity.set(dir * BALL_SPEED_START, Math.sin(angle) * BALL_SPEED_START, 0);
            isCountingDown = false;
        }
    }, 1000);
}

function updateGame() {
    if (gameState !== 'PLAYING' || isCountingDown) return;

    ball.position.add(ballVelocity);

    // Bounce off walls
    if (Math.abs(ball.position.y) > FIELD_HEIGHT / 2 - 0.3) {
        ballVelocity.y *= -1;
        sounds.playBounce();
        shakeCamera();
    }

    // Paddle collision
    if (ball.position.x < playerPaddle.position.x + 0.5 && 
        ball.position.x > playerPaddle.position.x - 0.5 &&
        ball.position.y < playerPaddle.position.y + 1.5 &&
        ball.position.y > playerPaddle.position.y - 1.5) {
        ballVelocity.x *= -1;
        ballVelocity.multiplyScalar(1.05);
        sounds.playBounce();
        shakeCamera();
    }

    if (ball.position.x > cpuPaddle.position.x - 0.5 && 
        ball.position.x < cpuPaddle.position.x + 0.5 &&
        ball.position.y < cpuPaddle.position.y + 1.5 &&
        ball.position.y > cpuPaddle.position.y - 1.5) {
        ballVelocity.x *= -1;
        ballVelocity.multiplyScalar(1.05);
        sounds.playBounce();
        shakeCamera();
    }

    if (ball.position.x < -FIELD_WIDTH / 2) {
        cpuScore++;
        updateScores();
        resetBall();
    }
    if (ball.position.x > FIELD_WIDTH / 2) {
        playerScore++;
        updateScores();
        resetBall();
    }

    // CPU AI
    const cpuTargetY = ball.position.y;
    if (cpuPaddle.position.y < cpuTargetY - 0.5) cpuPaddle.position.y += CPU_REACTION_SPEED;
    if (cpuPaddle.position.y > cpuTargetY + 0.5) cpuPaddle.position.y -= CPU_REACTION_SPEED;
    cpuPaddle.position.y = THREE.MathUtils.clamp(cpuPaddle.position.y, -FIELD_HEIGHT / 2 + 1.5, FIELD_HEIGHT / 2 - 1.5);
}

function updateScores() {
    document.getElementById('player-hud-score').innerText = playerScore;
    document.getElementById('cpu-hud-score').innerText = cpuScore;
}

// --- INPUTS ---
const keys = {};
window.addEventListener('keydown', (e) => keys[e.code] = true);
window.addEventListener('keyup', (e) => keys[e.code] = false);

function handleInput() {
    if (gameState !== 'PLAYING') return;

    if (keys['ArrowUp'] || keys['KeyW']) playerPaddle.position.y += PADDLE_SPEED;
    if (keys['ArrowDown'] || keys['KeyS']) playerPaddle.position.y -= PADDLE_SPEED;
    playerPaddle.position.y = THREE.MathUtils.clamp(playerPaddle.position.y, -FIELD_HEIGHT / 2 + 1.5, FIELD_HEIGHT / 2 - 1.5);
}

// Mobile controls
document.getElementById('move-up').addEventListener('touchstart', (e) => { e.preventDefault(); keys['ArrowUp'] = true; });
document.getElementById('move-up').addEventListener('touchend', (e) => { e.preventDefault(); keys['ArrowUp'] = false; });
document.getElementById('move-down').addEventListener('touchstart', (e) => { e.preventDefault(); keys['ArrowUp'] = false; keys['ArrowDown'] = true; });
document.getElementById('move-down').addEventListener('touchend', (e) => { e.preventDefault(); keys['ArrowDown'] = false; });

document.getElementById('start-btn').addEventListener('click', () => {
    playerName = document.getElementById('player-name').value || 'Anonymous';
    sounds.playClick();
    startGame();
});

document.getElementById('retry-btn').addEventListener('click', () => {
    sounds.playClick();
    resetGame();
    startGame();
});

document.getElementById('leaderboard-btn').addEventListener('click', () => {
    sounds.playClick();
    showLeaderboard();
});

document.getElementById('back-to-menu-btn').addEventListener('click', () => {
    sounds.playClick();
    document.getElementById('leaderboard-screen').classList.add('hidden');
    document.getElementById('end-game-screen').classList.remove('hidden');
});

function startGame() {
    gameState = 'PLAYING';
    timeLeft = GAME_TIME;
    playerScore = 0;
    cpuScore = 0;
    updateScores();
    hideAllUI();
    document.getElementById('hud').classList.remove('hidden');
    resetBall();
    sounds.startBGM();

    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        if (!isCountingDown) {
            timeLeft--;
            document.getElementById('timer').innerText = timeLeft + 's';
            if (timeLeft <= 0) endGame();
        }
    }, 1000);
}

function endGame() {
    gameState = 'END';
    clearInterval(timerInterval);
    sounds.stopBGM();
    sounds.playEnd();
    hideAllUI();
    document.getElementById('end-game-screen').classList.remove('hidden');
    document.getElementById('final-player-score').innerText = playerScore;
    document.getElementById('final-cpu-score').innerText = cpuScore;
    
    if (playerScore > cpuScore) document.getElementById('result-text').innerText = "VICTORY";
    else if (playerScore < cpuScore) document.getElementById('result-text').innerText = "DEFEAT";
    else document.getElementById('result-text').innerText = "DRAW";

    saveScore();
}

function resetGame() {
    playerPaddle.position.y = 0;
    cpuPaddle.position.y = 0;
    ball.position.set(0, 0, 0);
}

async function saveScore() {
    try {
        await fetch('/api/scores', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ playerName, playerScore, cpuScore })
        });
    } catch (err) {
        console.error('Failed to save score:', err);
    }
}

async function showLeaderboard() {
    hideAllUI();
    document.getElementById('leaderboard-screen').classList.remove('hidden');
    
    const list = document.getElementById('leaderboard-list');
    list.innerHTML = 'Loading pilots...';

    try {
        const res = await fetch('/api/scores');
        const scores = await res.json();
        list.innerHTML = '';
        scores.forEach((s, i) => {
            const item = document.createElement('div');
            item.className = 'leaderboard-item';
            item.innerHTML = `
                <span>${i + 1}. ${s.playerName}</span>
                <span class="score-ratio">${s.playerScore} - ${s.cpuScore}</span>
            `;
            list.appendChild(item);
        });
    } catch (err) {
        list.innerHTML = 'Failed to load leaderboard.';
    }
}

function animate() {
    requestAnimationFrame(animate);
    stars.rotation.y += 0.0002;
    stars.rotation.x += 0.0001;
    handleInput();
    updateGame();
    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();
