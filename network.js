// network.js
class NetworkManager {
    constructor() {
        if (new.target === NetworkManager) {
            throw new TypeError("Cannot instantiate abstract class");
        }
    }
    sendMove(move) { throw new Error("Not implemented"); }
    onMove(callback) { throw new Error("Not implemented"); }
    onOpponentJoined(callback) { throw new Error("Not implemented"); }
    onOpponentOnline(callback) { throw new Error("Not implemented"); }
}

class TelegramNetworkManager extends NetworkManager {
    constructor(roomId, playerColor) {
        super();
        this.roomId = roomId;
        this.playerColor = playerColor;
        this.moveCallback = null;
        this.opponentJoinedCallback = null;
        this.opponentOnlineCallback = null;
        this.pollInterval = null;

        if (!window.Telegram?.WebApp) {
            throw new Error("Not in Telegram");
        }

        // Инициализация
        window.Telegram.WebApp.ready();
        window.Telegram.WebApp.expand();

        this.setupMessageHandler();
        this.sendInit();
        this.startPolling(2000);
    }

    setupMessageHandler() {
        window.Telegram.WebApp.onEvent('message', (data) => {
            console.log("📩 Получено от бота:", data);
            document.getElementById('tg-status').textContent = 'Получено сообщение';
            try {
                const msg = JSON.parse(data);
                switch (msg.type) {
                    case 'move':
                        if (this.moveCallback) this.moveCallback(msg.move);
                        break;
                    case 'opponent_joined':
                    case 'opponent_online':
                        if (msg.type === 'opponent_joined' && this.opponentJoinedCallback) this.opponentJoinedCallback();
                        if (msg.type === 'opponent_online' && this.opponentOnlineCallback) this.opponentOnlineCallback();
                        break;
                    default:
                        console.log('Неизвестный тип сообщения', msg);
                }
            } catch (e) {
                console.error('Ошибка обработки сообщения от бота', e);
                document.getElementById('tg-status').textContent = 'Ошибка сообщения';
            }
        });
    }

    sendInit() {
        const initMsg = JSON.stringify({
            type: 'init',
            roomId: this.roomId,
            color: this.playerColor
        });
        console.log("📤 Отправка init:", initMsg);
        document.getElementById('tg-status').textContent = 'Отправка init...';
        window.Telegram.WebApp.sendData(initMsg);
    }

    sendMove(move) {
        const msg = JSON.stringify({
            type: 'move',
            roomId: this.roomId,
            playerColor: this.playerColor,
            move: move
        });
        console.log("📤 Отправка move:", msg);
        document.getElementById('tg-status').textContent = 'Отправка хода...';
        window.Telegram.WebApp.sendData(msg);
    }

    pollMoves() {
        const msg = JSON.stringify({
            type: 'poll',
            roomId: this.roomId
        });
        window.Telegram.WebApp.sendData(msg);
    }

    startPolling(interval) {
        this.pollInterval = setInterval(() => this.pollMoves(), interval);
    }

    stopPolling() {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }
    }

    onMove(callback) {
        this.moveCallback = callback;
    }

    onOpponentJoined(callback) {
        this.opponentJoinedCallback = callback;
    }

    onOpponentOnline(callback) {
        this.opponentOnlineCallback = callback;
    }
}