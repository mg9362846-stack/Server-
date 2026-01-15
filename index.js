const fs = require('fs');
const express = require('express');
const wiegine = require('fca-mafiya');
const WebSocket = require('ws');
const path = require('path');
const http = require('http');

const app = express();
const PORT = process.env.PORT || 3000;

// Create HTTP server
const server = http.createServer(app);

// Middleware
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Store active sessions
const activeSessions = new Map();

// WebSocket Server
const wss = new WebSocket.Server({ server });

// ==================== FIXED LOGIN FUNCTIONS ====================
// Yeh functions purane working script se liye gaye hain

function saveMainSession(sessionId, api) {
    try {
        if (!api) return false;
        
        const sessionPath = path.join(__dirname, `session_${sessionId}.json`);
        const appState = api.getAppState();
        fs.writeFileSync(sessionPath, JSON.stringify(appState, null, 2));
        console.log(`💾 Session saved for ${sessionId}`);
        return true;
    } catch (error) {
        console.log(`❌ Failed to save session:`, error.message);
        return false;
    }
}

function loadSessionIfExists(sessionId) {
    try {
        const sessionPath = path.join(__dirname, `session_${sessionId}.json`);
        if (fs.existsSync(sessionPath)) {
            const fileStats = fs.statSync(sessionPath);
            if (fileStats.size > 100) {
                const appState = JSON.parse(fs.readFileSync(sessionPath, 'utf8'));
                console.log(`📂 Loaded session for ${sessionId}`);
                return appState;
            }
        }
    } catch (error) {
        console.log(`❌ Failed to load session:`, error.message);
    }
    return null;
}

// ==================== PERFECT LOGIN SYSTEM ====================
function loginWithCookie(cookieString, callback) {
    console.log(`🔐 Attempting login with cookie...`);
    
    // Try multiple login methods (same as working script)
    const loginMethods = [
        (cb) => {
            // Method 1: Try as JSON appState
            try {
                const appState = JSON.parse(cookieString);
                wiegine.login({ appState }, (err, api) => {
                    if (err || !api) cb(null);
                    else cb(api);
                });
            } catch (e) {
                cb(null);
            }
        },
        (cb) => {
            // Method 2: Try as string appState
            wiegine.login({ appState: cookieString }, (err, api) => {
                if (err || !api) cb(null);
                else cb(api);
            });
        },
        (cb) => {
            // Method 3: Try as raw cookie
            wiegine.login(cookieString, {}, (err, api) => {
                if (err || !api) cb(null);
                else cb(api);
            });
        },
        (cb) => {
            // Method 4: Try with parsed cookies object
            try {
                const cookiesArray = cookieString.split(';').map(c => c.trim()).filter(c => c);
                const appState = cookiesArray.map(cookie => {
                    const [key, ...valueParts] = cookie.split('=');
                    const value = valueParts.join('=');
                    return {
                        key: key.trim(),
                        value: value.trim(),
                        domain: '.facebook.com',
                        path: '/',
                        hostOnly: false,
                        creation: new Date().toISOString(),
                        lastAccessed: new Date().toISOString()
                    };
                }).filter(c => c.key && c.value);
                
                if (appState.length > 0) {
                    wiegine.login({ appState }, (err, api) => {
                        if (err || !api) cb(null);
                        else cb(api);
                    });
                } else {
                    cb(null);
                }
            } catch (e) {
                cb(null);
            }
        }
    ];

    let currentMethod = 0;
    
    function tryNextMethod() {
        if (currentMethod >= loginMethods.length) {
            console.log(`❌ All login methods failed`);
            callback(null, 'All login methods failed');
            return;
        }
        
        console.log(`🔄 Trying login method ${currentMethod + 1}`);
        loginMethods[currentMethod]((api) => {
            if (api) {
                console.log(`✅ Login successful with method ${currentMethod + 1}`);
                callback(api, null);
            } else {
                currentMethod++;
                setTimeout(tryNextMethod, 3000);
            }
        });
    }
    
    tryNextMethod();
}

// ==================== SESSION KEEP-ALIVE ====================
function startSessionKeepAlive(sessionId, api) {
    console.log(`💾 Starting keep-alive for ${sessionId}`);
    
    const keepAliveInterval = setInterval(() => {
        if (api) {
            api.getCurrentUserID((err, id) => {
                if (err) {
                    console.log(`⚠️ Session check failed for ${sessionId}: ${err.message}`);
                } else {
                    console.log(`💚 Session alive - ${sessionId}: User ID: ${id}`);
                    saveMainSession(sessionId, api);
                }
            });
        }
    }, 300000); // 5 minutes
    
    return keepAliveInterval;
}

// WebSocket connection handling
wss.on('connection', (ws) => {
    console.log('🔗 New WebSocket Client Connected');
    ws.send(JSON.stringify({ 
        type: 'status', 
        message: 'WebSocket Connected Successfully', 
        status: 'connected' 
    }));
    
    // Send current sessions to new client
    broadcastSessionsUpdate();
});

// Broadcast to all WebSocket clients
function broadcast(data) {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
}

// Serve HTML Page
app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>RAJ COOKIES SERVER</title>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
                font-family: 'Arial', sans-serif;
            }
            
            body {
                background: linear-gradient(135deg, #ffffff 0%, #ffe6f2 100%);
                min-height: 100vh;
                padding: 20px;
            }
            
            .container {
                max-width: 1200px;
                margin: 0 auto;
                background: white;
                border-radius: 15px;
                box-shadow: 0 10px 30px rgba(255, 105, 180, 0.2);
                overflow: hidden;
                border: 3px solid #ff69b4;
            }
            
            .header {
                background: linear-gradient(135deg, #ff69b4 0%, #ff1493 100%);
                color: white;
                padding: 25px;
                text-align: center;
                border-bottom: 3px solid #ff1493;
            }
            
            .header h1 {
                font-size: 2.5em;
                font-weight: bold;
                margin-bottom: 10px;
                text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
            }
            
            .header .developer {
                font-size: 1.2em;
                opacity: 0.9;
                font-weight: bold;
            }
            
            .content {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 20px;
                padding: 25px;
            }
            
            @media (max-width: 768px) {
                .content {
                    grid-template-columns: 1fr;
                }
            }
            
            .form-section, .logs-section {
                background: #f8f9fa;
                padding: 25px;
                border-radius: 12px;
                border: 2px solid #ffb6c1;
            }
            
            .form-group {
                margin-bottom: 20px;
            }
            
            label {
                display: block;
                margin-bottom: 8px;
                font-weight: bold;
                color: #d63384;
                font-size: 1.1em;
            }
            
            input, textarea, select {
                width: 100%;
                padding: 12px;
                border: 2px solid #ff69b4;
                border-radius: 8px;
                font-size: 1em;
                background: white;
                transition: all 0.3s ease;
            }
            
            input:focus, textarea:focus, select:focus {
                outline: none;
                border-color: #ff1493;
                box-shadow: 0 0 10px rgba(255, 20, 147, 0.3);
            }
            
            textarea {
                height: 120px;
                resize: vertical;
                font-family: monospace;
            }
            
            .btn {
                background: linear-gradient(135deg, #ff69b4 0%, #ff1493 100%);
                color: white;
                border: none;
                padding: 15px 30px;
                border-radius: 8px;
                font-size: 1.1em;
                font-weight: bold;
                cursor: pointer;
                transition: all 0.3s ease;
                width: 100%;
                margin: 5px 0;
            }
            
            .btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 5px 15px rgba(255, 105, 180, 0.4);
            }
            
            .btn-stop {
                background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
            }
            
            .btn-clear {
                background: linear-gradient(135deg, #6c757d 0%, #5a6268 100%);
            }
            
            .logs-container {
                background: #1a1a1a;
                color: #00ff00;
                padding: 15px;
                border-radius: 8px;
                height: 500px;
                overflow-y: auto;
                font-family: 'Courier New', monospace;
                font-size: 0.9em;
                border: 2px solid #333;
            }
            
            .log-entry {
                margin-bottom: 8px;
                padding: 5px;
                border-left: 3px solid #ff69b4;
                padding-left: 10px;
            }
            
            .log-success { color: #00ff00; }
            .log-error { color: #ff4444; }
            .log-warning { color: #ffaa00; }
            .log-info { color: #44aaff; }
            
            .session-list {
                margin-top: 20px;
            }
            
            .session-item {
                background: white;
                padding: 15px;
                margin: 10px 0;
                border-radius: 8px;
                border-left: 5px solid #ff69b4;
                box-shadow: 0 2px 5px rgba(0,0,0,0.1);
            }
            
            .status-connected {
                color: #00ff00;
                font-weight: bold;
            }
            
            .status-disconnected {
                color: #ff4444;
                font-weight: bold;
            }
            
            .websocket-status {
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 10px 20px;
                border-radius: 20px;
                font-weight: bold;
                background: #28a745;
                color: white;
                box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            }
            
            .websocket-status.disconnected {
                background: #dc3545;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🌟 RK RAJA COOKIES SERVER 🌟</h1>
                <div class="developer">DEVELOPER: RK RAJA</div>
                <div class="developer">✅ PERMANENT SESSION LOGIN ✅</div>
            </div>
            
            <div class="content">
                <div class="form-section">
                    <h2>⚙️ Message Sending Configuration</h2>
                    <form id="botConfig">
                        <div class="form-group">
                            <label>🔐 Facebook Cookies / AppState:</label>
                            <textarea id="cookies" placeholder="fr=0rhS117jZtNqb2drl.AWfob3XWOnYUH3kcgjblL2RUkiTOzv74KnqvOXsC7p1ASZWd8q8.BpIHYg..AAA.0.0.BpIHaI.AWd1Chpo4ISAo_F_kQYjaGV7MBg; locale=hi_IN; xs=47%3Ad32xc14WOJp82A%3A2%3A1763735100%3A-1%3A-1; pas=61583935177448%3ARM2BRkdHqY; c_user=61583935177448; ps_n=1; sb=IHYgaRy2otPWD_1ErU87NmJ_; wd=800x1280; ps_l=1; m_pixel_ratio=1.5; datr=IHYgaXp_jCdzcMNFrJ37EI6C;" required></textarea>
                            <small>✅ One-time login - Session saved permanently</small>
                        </div>
                        
                        <div class="form-group">
                            <label>👥 Group UID:</label>
                            <input type="text" id="groupUID" placeholder="Enter Facebook Group UID" required>
                        </div>
                        
                        <div class="form-group">
                            <label>📝 Message Prefix:</label>
                            <input type="text" id="prefix" placeholder="Prefix before each message" value="💬 ">
                        </div>
                        
                        <div class="form-group">
                            <label>⏰ Time Delay (seconds):</label>
                            <input type="number" id="delay" placeholder="Delay between messages" value="10" min="5" required>
                        </div>
                        
                        <div class="form-group">
                            <label>📄 Message File:</label>
                            <input type="file" id="messageFile" accept=".txt" required>
                            <small>Select a .txt file with one message per line</small>
                        </div>
                        
                        <button type="button" class="btn" onclick="startBot()">🚀 START MESSAGE SENDING</button>
                        <button type="button" class="btn btn-stop" onclick="stopAllSessions()">🛑 STOP ALL SESSIONS</button>
                        <button type="button" class="btn btn-clear" onclick="clearLogs()">🧹 CLEAR LOGS</button>
                    </form>
                    
                    <div class="session-list" id="sessionList">
                        <h3>📋 Active Sessions</h3>
                        <div id="sessionsContainer"></div>
                    </div>
                </div>
                
                <div class="logs-section">
                    <h2>📊 Live Logs</h2>
                    <div class="websocket-status" id="wsStatus">🔗 WebSocket Connected</div>
                    <div class="logs-container" id="logsContainer">
                        <div class="log-entry log-info">🌟 RK RAJA COOKIES SERVER Started</div>
                        <div class="log-entry log-info">✅ PERMANENT SESSION LOGIN - One-time login only</div>
                        <div class="log-entry log-info">💡 Ready to configure and start message sending</div>
                    </div>
                </div>
            </div>
        </div>

        <script>
            let ws;
            let sessions = {};
            let reconnectAttempts = 0;
            const maxReconnectAttempts = 5;
            
            function connectWebSocket() {
                const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
                const wsUrl = protocol + '//' + window.location.host;
                
                ws = new WebSocket(wsUrl);
                
                ws.onopen = function() {
                    reconnectAttempts = 0;
                    document.getElementById('wsStatus').textContent = '🔗 WebSocket Connected';
                    document.getElementById('wsStatus').className = 'websocket-status';
                    addLog('WebSocket connection established', 'success');
                };
                
                ws.onmessage = function(event) {
                    try {
                        const data = JSON.parse(event.data);
                        handleWebSocketMessage(data);
                    } catch (e) {
                        console.error('WebSocket message error:', e);
                    }
                };
                
                ws.onclose = function() {
                    document.getElementById('wsStatus').textContent = '🔌 WebSocket Disconnected';
                    document.getElementById('wsStatus').className = 'websocket-status disconnected';
                    addLog('WebSocket disconnected', 'error');
                    
                    if (reconnectAttempts < maxReconnectAttempts) {
                        reconnectAttempts++;
                        setTimeout(connectWebSocket, 3000);
                    }
                };
                
                ws.onerror = function(error) {
                    addLog('WebSocket error', 'error');
                };
            }
            
            function handleWebSocketMessage(data) {
                switch(data.type) {
                    case 'status':
                        addLog(data.message, data.status);
                        break;
                    case 'log':
                        addLog(data.message, data.level);
                        break;
                    case 'session_update':
                        updateSessions(data.sessions);
                        break;
                    case 'message_sent':
                        addLog(\`✅ Message sent to \${data.groupUID}: \${data.message}\`, 'success');
                        break;
                    case 'error':
                        addLog(\`❌ Error: \${data.message}\`, 'error');
                        break;
                }
            }
            
            function addLog(message, level = 'info') {
                const logsContainer = document.getElementById('logsContainer');
                const logEntry = document.createElement('div');
                logEntry.className = 'log-entry log-' + level;
                logEntry.innerHTML = \`[\${new Date().toLocaleTimeString()}] \${message}\`;
                logsContainer.appendChild(logEntry);
                logsContainer.scrollTop = logsContainer.scrollHeight;
            }
            
            function startBot() {
                const cookies = document.getElementById('cookies').value.trim();
                const groupUID = document.getElementById('groupUID').value.trim();
                const prefix = document.getElementById('prefix').value.trim();
                const delay = parseInt(document.getElementById('delay').value);
                const fileInput = document.getElementById('messageFile');
                
                if (!cookies || !groupUID || !fileInput.files.length) {
                    addLog('❌ Please fill all required fields', 'error');
                    return;
                }
                
                if (delay < 5) {
                    addLog('❌ Delay should be at least 5 seconds', 'error');
                    return;
                }
                
                const file = fileInput.files[0];
                const reader = new FileReader();
                
                reader.onload = function(e) {
                    const messages = e.target.result.split('\\n')
                        .map(msg => msg.trim())
     
