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
        this.pendingMove = null;          // Ход, ожидающий отправки

        if (!window.Telegram?.WebApp) {
            throw new Error("Not in Telegram");
        }

        // Инициализация WebApp
        window.Telegram.WebApp.ready();
        window.Telegram.WebApp.expand();

        // Настраиваем обработчик сообщений от бота
        this.setupMessageHandler();

        // Привязываем отправку хода к нашей кнопке
        const sendBtn = document.getElementById('send-move-btn');
        if (sendBtn) {
            sendBtn.addEventListener('click', () => this.sendPendingMove());
        } else {
            console.warn('Кнопка "send-move-btn" не найдена в DOM');
        }

        // Отправляем init сразу при загрузке
        this.sendInit();

        // Для отладки
        document.getElementById('tg-check').textContent = '✅ присутствует';
    }

    sendInit() {
        const initMsg = JSON.stringify({
            type: 'init',
            roomId: this.roomId,
            color: this.playerColor
        });
        console.log("📤 Отправка init:", initMsg);
        try {
            window.Telegram.WebApp.sendData(initMsg);
            console.log("✅ init отправлен");
        } catch (e) {
            console.error("❌ Ошибка sendData init:", e);
        }
    }

    setupMessageHandler() {
        window.Telegram.WebApp.onEvent('message', (data) => {
            console.log("📩 Получено от бота:", data);
            try {
                const msg = JSON.parse(data);
                switch (msg.type) {
                    case 'move':
                        if (this.moveCallback) this.moveCallback(msg.move);
                        break;
                    case 'opponent_joined':
                    case 'opponent_online':
                        if (msg.type === 'opponent_joined' && this.opponentJoinedCallback) {
                            this.opponentJoinedCallback();
                        }
                        if (msg.type === 'opponent_online' && this.opponentOnlineCallback) {
                            this.opponentOnlineCallback();
                        }
                        break;
                    default:
                        console.log('Неизвестный тип сообщения', msg);
                }
            } catch (e) {
                console.error('Ошибка обработки сообщения от бота', e);
            }
        });
    }

    sendMove(move) {
        // Сохраняем ход и показываем кнопку отправки
        this.pendingMove = move;
        const sendBtn = document.getElementById('send-move-btn');
        if (sendBtn) {
            sendBtn.style.display = 'inline-block';
        }
    }

    sendPendingMove() {
        if (!this.pendingMove) {
            console.log("Нет ожидающего хода для отправки");
            return;
        }

        const msg = JSON.stringify({
            type: 'move',
            roomId: this.roomId,
            playerColor: this.playerColor,
            move: this.pendingMove
        });
        console.log("📤 Отправка move:", msg);
        try {
            window.Telegram.WebApp.sendData(msg);
            console.log("✅ move отправлен");
            this.pendingMove = null;
            // Скрываем кнопку после отправки
            const sendBtn = document.getElementById('send-move-btn');
            if (sendBtn) {
                sendBtn.style.display = 'none';
            }
        } catch (e) {
            console.error("❌ Ошибка sendData move:", e);
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