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

        if (!window.Telegram?.WebApp) {
            throw new Error("Not in Telegram");
        }
        window.Telegram.WebApp.ready();
        window.Telegram.WebApp.expand();

        this.init();
        this.startPolling(2000); // опрос отложенных ходов каждые 2 сек
    }

    init() {
        window.Telegram.WebApp.onEvent('message', (data) => {
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
                        console.log('Unknown message type', msg);
                }
            } catch (e) {
                console.error('Error processing Telegram message', e);
            }
        });

        // Отправляем init-сообщение боту
        window.Telegram.WebApp.sendData(JSON.stringify({
            type: 'init',
            roomId: this.roomId,
            color: this.playerColor
        }));
    }

    sendMove(move) {
        window.Telegram.WebApp.sendData(JSON.stringify({
            type: 'move',
            roomId: this.roomId,
            playerColor: this.playerColor,
            move: move
        }));
    }

    pollMoves() {
        window.Telegram.WebApp.sendData(JSON.stringify({
            type: 'poll',
            roomId: this.roomId
        }));
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