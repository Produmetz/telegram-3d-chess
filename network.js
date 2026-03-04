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
        this.playerColor = playerColor; // 'White' или 'Black'
        this.moveCallback = null;
        this.opponentJoinedCallback = null;
        this.opponentOnlineCallback = null;

        if (!window.Telegram?.WebApp) {
            throw new Error("Not in Telegram");
        }

        // Инициализация WebApp
        window.Telegram.WebApp.ready();
        window.Telegram.WebApp.expand();

        // Настраиваем обработчик сообщений от бота
        this.setupMessageHandler();

        // Отправляем init сразу при загрузке
        this.sendInit();

        // Запускаем периодический опрос (poll) каждые 3 секунды
        this.pollInterval = setInterval(() => this.sendPoll(), 3000);

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

    sendPoll() {
        const pollMsg = JSON.stringify({
            type: 'poll',
            roomId: this.roomId,
            color: this.playerColor
        });
        console.log("📤 Отправка poll");
        try {
            window.Telegram.WebApp.sendData(pollMsg);
        } catch (e) {
            console.error("❌ Ошибка sendData poll:", e);
        }
    }

    setupMessageHandler() {
        window.Telegram.WebApp.onEvent('message', (data) => {
            console.log("📩 Получено от бота:", data);
            try {
                const events = JSON.parse(data); // бот присылает массив событий
                if (!Array.isArray(events)) {
                    console.warn("Ожидался массив событий, получено:", events);
                    return;
                }
                events.forEach(msg => {
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
                });
            } catch (e) {
                console.error('Ошибка обработки сообщения от бота', e);
            }
        });
    }

    sendMove(move) {
        const msg = JSON.stringify({
            type: 'move',
            roomId: this.roomId,
            color: this.playerColor,
            move: move
        });
        console.log("📤 Отправка move:", msg);
        try {
            window.Telegram.WebApp.sendData(msg);
            console.log("✅ move отправлен");
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

    // Если нужно остановить polling (например, при закрытии страницы)
    destroy() {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
        }
    }
}