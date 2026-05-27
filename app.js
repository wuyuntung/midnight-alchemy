// 1. 引入 MediaPipe Face Landmarker 官方 Web 資源
import { FilesetResolver, FaceLandmarker } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/wasm/vision_bundle.js";

// --- 全域變數宣告 ---
let faceLandmarker;
let videoElement;
let canvasElement;
let canvasCtx;
let currentFinalColor = 'white'; // 預設顏色，答題結束後會被更新
let loadedImages = {};           // 用來預載各個分數對應的可愛角色圖案

// ✨ 2. 原本 Node.js 的顏色對應表，現在直接在前端對應你的圖片路徑
const colorPatterns = {
    red:    './images/pattern_red.png',    // 臨界點：重度夜貓
    orange: './images/pattern_orange.png', 
    yellow: './images/pattern_yellow.png',
    green:  './images/pattern_green.png',
    blue:   './images/pattern_blue.png',
    purple: './images/pattern_purple.png',
    black:  './images/pattern_black.png',  // 暗黑風
    white:  './images/pattern_white.png'   // 初始/清爽風
};

// --- 初始化功能 ---

// 3. 網頁載入時初始化：預載圖片與啟動 MediaPipe
async function initApp() {
    videoElement = document.getElementById("webcam");
    canvasElement = document.getElementById("output_canvas");
    canvasCtx = canvasElement.getContext("2d");

    // A. 預載所有角色圖案，確保即時貼圖時不會閃爍或載入延遲
    preloadImages();

    // B. 初始化 MediaPipe AI 模型
    try {
        const filesetResolver = await FilesetResolver.forVisionTasks(
            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/wasm"
        );
        faceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
            baseOptions: { 
                modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task` 
            },
            runningMode: "VIDEO",
            numFaces: 1 // 鎖定單人互動，效能較好
        });
        console.log("✨ 《眼前的黑不是黑》AI 辨識核心準備就緒！");
    } catch (error) {
        console.error("MediaPipe 初始化失敗:", error);
    }
}

// 預載圖片的輔助函式
function preloadImages() {
    Object.keys(colorPatterns).forEach(color => {
        const img = new Image();
        img.src = colorPatterns[color];
        loadedImages[color] = img;
    });
}

// --- 測驗串接核心入口 ---

/**
 * 4. 當你的前端問答測驗（第 10 題）結束時，請在你的主程式「直接呼開這個函式」
 * @param {string} finalColor - 傳入答題計算出的顏色字串 (例如: 'red', 'purple')
 */
export function onQuizFinal(finalColor) {
    console.log(`=== 🚨 臨界點定色 🚨 === 結果: ${finalColor.toUpperCase()}`);
    currentFinalColor = colorPatterns[finalColor] ? finalColor : 'white';

    // A. 隱藏你的測驗 UI 區塊 (請根據你 HTML 的 ID 調整)
    const quizContainer = document.getElementById("quiz-container");
    if (quizContainer) quizContainer.style.display = "none";

    // B. 顯示相機與 Canvas 畫布區塊
    const trackingContainer = document.getElementById("tracking-container");
    if (trackingContainer) trackingContainer.style.style.display = "block";

    // C. 喚起使用者鏡頭並開始即時追蹤
    startCamera();
}

// 啟動相機
function startCamera() {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ 
            video: { width: 640, height: 480, facingMode: "user" } 
        }).then((stream) => {
            videoElement.srcObject = stream;
            videoElement.addEventListener("loadeddata", predictLoop);
        }).catch(err => {
            console.error("無法開啟相機，請檢查權限設定:", err);
        });
    }
}

// --- AI 即時辨識與畫布渲染循環 ---

// 5. 每影格的即時辨識與繪圖循環 (Loop)
async function predictLoop() {
    if (!faceLandmarker || videoElement.paused || videoElement.ended) return;

    let startTimeMs = performance.now();
    const results = await faceLandmarker.detectForVideo(videoElement, startTimeMs);

    // 每次畫影格前，先清空畫布，並把相機即時畫面填入 Canvas 當背景
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);

    // 如果有偵測到臉部
    if (results.faceLandmarks && results.faceLandmarks.length > 0) {
        const landmarks = results.faceLandmarks[0];

        // 🎯 關鍵：MediaPipe 478 網格中，眼睛正下方的精準特徵點
        // 左眼下方常用點：111 或 117 / 右眼下方常用點：340 或 346
        const leftEyeUnder = landmarks[111];
        const rightEyeUnder = landmarks[340];

        // 轉換為 Canvas 的真實像素座標
        const lx = leftEyeUnder.x * canvasElement.width;
        const ly = leftEyeUnder.y * canvasElement.height;
        const rx = rightEyeUnder.x * canvasElement.width;
        const ry = rightEyeUnder.y * canvasElement.height;

        // 6. 將對應分數顏色的可愛角色圖案貼在左、右黑眼圈位置
        drawPatternOnEye(lx, ly, currentFinalColor);
        drawPatternOnEye(rx, ry, currentFinalColor);
    }

    // 瀏覽器下一影格繼續執行，達到 60fps 的即時追蹤效果
    window.requestAnimationFrame(predictLoop);
}

// 在黑眼圈座標繪製圖案
function drawPatternOnEye(x, y, color) {
    const img = loadedImages[color];
    
    if (img && img.complete) {
        // 設定你要貼上的圖案大小（可自行調整尺寸，例如 50x50 像素）
        const imgSize = 60; 
        
        // 讓圖片的中心點完美對齊黑眼圈座標 (x, y)
        canvasCtx.drawImage(img, x - imgSize / 2, y - imgSize / 2, imgSize, imgSize);
    } else {
        // 防呆機制：如果圖片因故沒載入成功，改在外圍畫個淡淡的霓虹光圈
        canvasCtx.beginPath();
        canvasCtx.arc(x, y, 25, 0, 2 * Math.PI);
        canvasCtx.fillStyle = color;
        canvasCtx.globalAlpha = 0.4;
        canvasCtx.fill();
        canvasCtx.globalAlpha = 1.0; // 恢復透明度

        let faceLandmarker;
        let videoElement;
        let canvasElement;let canvasCtx;
        let currentFinalColor = 'white'; // 預設顏色，答題結束後會被更新
        let loadedImages = {};           // 用來預載各個分數對應的可愛角色圖案
    }
}

// 頁面載入完成後自動執行初始化
window.addEventListener("DOMContentLoaded", initApp);