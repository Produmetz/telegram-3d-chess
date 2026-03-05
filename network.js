class TelegramNetworkManager {
    constructor(roomId, playerColor) {
        this.roomId = roomId;
        this.playerColor = playerColor; // 'White' или 'Black'
        this.moveCallback = null;
        this.opponentJoinedCallback = null;
        this.pollTimeout = null;

        if (!window.Telegram?.WebApp) {
            throw new Error("Not in Telegram");
        }

        window.Telegram.WebApp.ready();
        window.Telegram.WebApp.expand();

        // Обработчик входящих сообщений от бота
        window.Telegram.WebApp.onEvent('message', (data) => {
            try {
                const events = JSON.parse(data); // ожидаем массив событий
                events.forEach(ev => {
                    if (ev.type === 'move' && this.moveCallback) {
                        this.moveCallback(ev.move);
                    }
                    if (ev.type === 'opponent_joined' && this.opponentJoinedCallback) {
                        this.opponentJoinedCallback();
                    }
                });
            } catch (e) {
                console.error('Ошибка обработки сообщения', e);
            }
            // Планируем следующий poll после получения ответа
            this.schedulePoll();
        });

        // Отправляем init сразу
        this.sendData({ type: 'init', roomId, color: playerColor });
    }

    sendData(obj) {
        window.Telegram.WebApp.sendData(JSON.stringify(obj));
    }

    sendMove(move) {
        this.sendData({ type: 'move', roomId: this.roomId, color: this.playerColor, move });
    }

    onMove(callback) {
        this.moveCallback = callback;
    }

    onOpponentJoined(callback) {
        this.opponentJoinedCallback = callback;
    }

    schedulePoll() {
        if (this.pollTimeout) clearTimeout(this.pollTimeout);
        this.pollTimeout = setTimeout(() => {
            this.sendData({ type: 'poll', roomId: this.roomId, color: this.playerColor });
        }, 2000); // интервал 2 секунды
    }
}