// network.js
class NetworkManager {
    constructor(game) {
        this.game = game;
        this.socket = null;
        this.connected = false;
        this.roomId = null;
        this.playerColor = null;
        this.opponentName = null;
    }

    connect(address, playerName, roomId = null) {
        try {
            this.socket = new WebSocket(address);

            this.socket.onopen = () => {
                this.connected = true;
                this.game.updateNetworkStatus('Подключено');

                // Отправляем информацию о подключении
                this.send({
                    type: 'join',
                    playerName: playerName,
                    roomId: roomId
                });
            };

            this.socket.onmessage = (event) => {
                this.handleMessage(JSON.parse(event.data));
            };

            this.socket.onclose = () => {
                this.connected = false;
                this.game.updateNetworkStatus('Отключено');
            };

            this.socket.onerror = (error) => {
                console.error('WebSocket error:', error);
                this.game.updateNetworkStatus('Ошибка подключения');
            };

        } catch (error) {
            console.error('Connection error:', error);
            alert('Ошибка подключения к серверу');
        }
    }

    handleMessage(data) {
        switch (data.type) {
            case 'room_created':
                this.roomId = data.roomId;
                this.playerColor = 'White';
                this.game.updateRoomId(this.roomId);
                this.game.updatePlayerColor('Белые');
                // При создании комнаты мы играем белыми и ходим первыми
                this.game.setMyTurn(true);
                break;

            case 'joined_room':
                this.roomId = data.roomId;
                this.playerColor = data.color;
                this.opponentName = data.opponentName;
                this.game.updateRoomId(this.roomId);
                this.game.updatePlayerColor(this.playerColor === 'White' ? 'Белые' : 'Черные');
                this.game.updateOpponentName(this.opponentName);
                // Устанавливаем очередь хода в зависимости от цвета
                this.game.setMyTurn(this.playerColor === 'White');
                break;

            case 'opponent_joined':
                this.opponentName = data.playerName;
                this.game.updateOpponentName(this.opponentName);
                break;

            case 'move':
                this.game.makeMoveFromNetwork(data.move);
                break;

            case 'chat':
                this.game.addChatMessage(data.sender, data.message);
                break;

            case 'undo_request':
                this.game.handleUndoRequest();
                break;

            case 'undo_response':
                this.game.handleUndoResponse(data.accepted);
                break;

            case 'error':
                alert(data.message);
                break;
        }
    }

    send(data) {
        if (this.connected) {
            this.socket.send(JSON.stringify(data));
        }
    }

    sendMove(move) {
        this.send({
            type: 'move',
            move: move
        });
    }

    sendChat(message) {
        this.send({
            type: 'chat',
            message: message
        });
    }

    sendUndoRequest() {
        this.send({
            type: 'undo_request'
        });
    }

    sendUndoResponse(accepted) {
        this.send({
            type: 'undo_response',
            accepted: accepted
        });
    }

    disconnect() {
        if (this.socket) {
            this.socket.close();
        }
        this.connected = false;
    }
}