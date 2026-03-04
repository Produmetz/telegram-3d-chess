// main.js
(function() {
    // Читаем параметры из URL
    const urlParams = new URLSearchParams(window.location.search);
    const roomId = urlParams.get('roomId');
    const color = urlParams.get('color'); // 'White' или 'Black'

    let networkManager = null;

    // Если есть параметры комнаты, значит игра сетевая через Telegram
    if (roomId && color) {
        try {
            networkManager = new TelegramNetworkManager(roomId, color);
        } catch (e) {
            console.error('Failed to init Telegram', e);
            document.body.innerHTML = '<div style="color: white; background: #0a192f; padding: 20px;">Ошибка подключения к Telegram. Игра недоступна.</div>';
            return; // Останавливаем выполнение, если Telegram не доступен
        }
    }

    // Создаём игру (networkManager может быть null для локального режима)
    window.chessGame = new Game(networkManager, color, roomId);
})();