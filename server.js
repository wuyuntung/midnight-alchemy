const { WebSocketServer } = require('ws');
const { Client } = require('node-osc');

const oscClient = new Client('127.0.0.1', 10000);
const wss = new WebSocketServer({ port: 8080 });

wss.on('connection', (ws) => {
    console.log('✨ 壓力回收網頁已連線！');

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            
            // 傳送給 TouchDesigner 的兩條核心 OSC 通道
            oscClient.send('/quiz/step', data.step); // 目前的題數 (1~10)
            oscClient.send('/quiz/isfinal', data.isFinal ? 1 : 0); // 是否定色 (0或1)

            if (!data.isFinal) {
                console.log(`[答題中] 目前進行到第 ${data.step} 題...`);
            } else {
                // 第 10 題結束，發送最終顏色 ID (0~7) 給 TD 的 Switch TOP[cite: 2]
                console.log(`=== 🚨 臨界點定色 🚨 === 結果: ${data.finalColor.toUpperCase()}`);
                
                const colorIds = { red: 0, orange: 1, yellow: 2, green: 3, blue: 4, purple: 5, black: 6, white: 7 };
                const finalId = colorIds[data.finalColor] || 0;
                
                oscClient.send('/quiz/colorid', finalId); 
            }

        } catch (e) {
            console.error('解析網頁數據出錯：', e);
        }
    });
});

console.log('------------------------------------------------------------');
console.log('《眼前的黑不是黑》企劃標準版轉運站已啟動！');
console.log(' (/quiz/colorid)');
console.log('------------------------------------------------------------');