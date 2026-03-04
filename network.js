// network.js
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
        this.initialized = false;         // Был ли уже отправлен init

        if (!window.Telegram?.WebApp) {
            throw new Error("Not in Telegram");
        }

        // Инициализация WebApp
        window.Telegram.WebApp.ready();
        window.Telegram.WebApp.expand();

        // Настраиваем главную кнопку
        window.Telegram.WebApp.MainButton.setText("Готов");
        window.Telegram.WebApp.MainButton.show();
        window.Telegram.WebApp.onEvent('mainButtonClicked', () => this.onMainButtonClick());

        this.setupMessageHandler();

        // Для отладки
        document.getElementById('tg-check').textContent = '✅ присутствует';
    }

    onMainButtonClick() {
        if (!this.initialized) {
            // Первый раз — отправляем init
            const initMsg = JSON.stringify({
                type: 'init',
                roomId: this.roomId,
                color: this.playerColor
            });
            console.log("📤 Отправка init:", initMsg);
            window.Telegram.WebApp.sendData(initMsg);
            this.initialized = true;
            window.Telegram.WebApp.MainButton.hide();
        } else if (this.pendingMove) {
            // Есть неотправленный ход — отправляем его
            const msg = JSON.stringify({
                type: 'move',
                roomId: this.roomId,
                playerColor: this.playerColor,
                move: this.pendingMove
            });
            console.log("📤 Отправка move:", msg);
            window.Telegram.WebApp.sendData(msg);
            this.pendingMove = null;
            window.Telegram.WebApp.MainButton.hide();
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
                        if (msg.type === 'opponent_joined' && this.opponentJoinedCallback) this.opponentJoinedCallback();
                        if (msg.type === 'opponent_online' && this.opponentOnlineCallback) this.opponentOnlineCallback();
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
        window.Telegram.WebApp.MainButton.setText("Отправить ход");
        window.Telegram.WebApp.MainButton.show();
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