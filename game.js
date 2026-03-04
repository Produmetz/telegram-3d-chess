// game.js
class Game {
    constructor(networkManager = null, playerColor = null, roomId = null) {
        this.currentPlayer = 'White';
        this.moveHistory = [];
        this.isDragging = false;
        this.dragThreshold = 5;
        this.isStandardPosition = true;

        this.networkManager = networkManager;
        this.playerColor = playerColor;
        this.roomId = roomId;

        // Отображение информации о комнате
        document.getElementById('room-id-display').textContent = this.roomId || '-';
        document.getElementById('player-color-display').textContent =
            this.playerColor === 'White' ? 'Белые' : (this.playerColor === 'Black' ? 'Чёрные' : '-');
        document.getElementById('opponent-status').textContent = 'не подключён';

        // Подписка на события сети
        if (this.networkManager) {
            this.networkManager.onMove((move) => {
                document.getElementById('tg-status').textContent = 'Получен ход соперника';
                this.makeMoveFromTelegram(move);
            });
            this.networkManager.onMove((move) => this.makeMoveFromTelegram(move));
            this.networkManager.onOpponentJoined(() => {
                document.getElementById('opponent-status').textContent = 'в игре';
            });
            this.networkManager.onOpponentOnline(() => {
                document.getElementById('opponent-status').textContent = 'в игре';
            });
        }

        this.init();
    }

    init() {
        ChessEngine.InitGame();
        createAndFillBoardOnPole(ChessEngine.Pole);
        this.setupEventListeners();
        animate();
        console.log('Игра началась! Ходят ' + this.currentPlayer);
        this.updateUI();
    }

    resetToStandart() {
        ChessEngine.InitGame();
        this.currentPlayer = 'White';
        this.moveHistory = [];
        this.isDragging = false;
        this.isStandardPosition = true;

        createAndFillBoardOnPole(ChessEngine.Pole);
        this.updateUI();
        console.log('Новая игра началась! Ходят ' + this.currentPlayer);
    }

    setupEventListeners() {
        let mouseDownX, mouseDownY;

        canvas.addEventListener('mousedown', (event) => {
            if (event.button === 0) {
                mouseDownX = event.clientX;
                mouseDownY = event.clientY;
                this.isDragging = false;
            }
        });

        canvas.addEventListener('mousemove', (event) => {
            if (event.buttons === 1) {
                const dx = Math.abs(event.clientX - mouseDownX);
                const dy = Math.abs(event.clientY - mouseDownY);
                if (dx > this.dragThreshold || dy > this.dragThreshold) {
                    this.isDragging = true;
                }
            }
        });

        canvas.addEventListener('click', (event) => {
            if (event.button === 0 && !this.isDragging) {
                this.handleCanvasClick(event);
            }
        });
    }

    handleCanvasClick(event) {
        const cellCoords = GraphicsEngine.cellFromClick(event.clientX, event.clientY);
        if (!cellCoords) return;

        const { i, j, k } = cellCoords;
        const figure = ChessEngine.Pole[i][j][k];

        if (GraphicsEngine.highlightedCell &&
            GraphicsEngine.highlightedCell.i == i &&
            GraphicsEngine.highlightedCell.j == j &&
            GraphicsEngine.highlightedCell.k == k) {
            GraphicsEngine.unselectCell();
            GraphicsEngine.unHighlightingPossibleMoves();
            return;
        }

        if (GraphicsEngine.highlightedCell && this.isPossibleMove(i, j, k) && this.isMyTurn()) {
            this.makeMove(GraphicsEngine.highlightedCell.i, GraphicsEngine.highlightedCell.j, GraphicsEngine.highlightedCell.k, i, j, k);
            return;
        }

        if (figure && figure.Color === this.currentPlayer && this.isMyTurn()) {
            GraphicsEngine.selectCell(i, j, k);
            GraphicsEngine.highlightingPossibleMoves(ChessEngine.MaybeMovesWithCheck(i, j, k, ChessEngine.Pole));
        } else if (GraphicsEngine.highlightedCell) {
            GraphicsEngine.unHighlightingPossibleMoves();
            GraphicsEngine.unselectCell();
        }
    }

    isPossibleMove(i, j, k) {
        return GraphicsEngine.highlightedPossibleMoves.some(move =>
            move[0] == i && move[1] == j && move[2] == k
        );
    }

    makeMove(fromX, fromY, fromZ, toX, toY, toZ, skipSend = false) {
        const capturedFigure = ChessEngine.Pole[toX][toY][toZ];
        const moveInfo = {
            from: { x: fromX, y: fromY, z: fromZ },
            to: { x: toX, y: toY, z: toZ },
            movedFigure: ChessEngine.Pole[fromX][fromY][fromZ],
            capturedFigure: capturedFigure
        };

        const moveResult = ChessEngine.Move(
            fromX, fromY, fromZ,
            toX, toY, toZ,
            ChessEngine.Pole,
            this.currentPlayer == 'White'
        );

        if (moveResult.success) {
            this.moveHistory.push(moveInfo);

            // Отправляем ход сопернику, если есть сетевой менеджер и не пропущена отправка
            if (this.networkManager && !skipSend) {
                this.networkManager.sendMove({
                    from: { x: fromX, y: fromY, z: fromZ },
                    to: { x: toX, y: toY, z: toZ }
                });
                document.getElementById('tg-status').textContent = 'Ход отправлен';
            }

            GraphicsEngine.createAndFillBoardOnPole(ChessEngine.Pole);
            GraphicsEngine.unHighlightingPossibleMoves();

            this.currentPlayer = moveResult.nextMove;
            this.checkGameState();
            this.updateUI();
            console.log(`Ход выполнен. Теперь ходят: ${this.currentPlayer}`);
        } else {
            console.log('Недопустимый ход:', moveResult.message);
        }

        GraphicsEngine.unselectCell();
    }

    makeMoveFromTelegram(move) {
        this.makeMove(move.from.x, move.from.y, move.from.z, move.to.x, move.to.y, move.to.z, true);
    }

    isMyTurn() {
        if (!this.networkManager) return true; // локально всегда можно ходить
        return this.playerColor === this.currentPlayer;
    }

    skipTurn() {
        this.currentPlayer = this.currentPlayer === 'White' ? 'Black' : 'White';
        this.checkGameState();
        this.updateUI();
        console.log(`Ход пропущен. Теперь ходят: ${this.currentPlayer}`);
    }

    undoMove() {
        if (this.moveHistory.length == 0) return;

        const lastMove = this.moveHistory.pop();
        const { from, to, movedFigure, capturedFigure } = lastMove;

        ChessEngine.Pole[from.x][from.y][from.z] = movedFigure;
        if (capturedFigure) {
            ChessEngine.Pole[to.x][to.y][to.z] = capturedFigure;
        } else {
            ChessEngine.Pole[to.x][to.y][to.z] = null;
        }

        this.currentPlayer = this.currentPlayer === 'White' ? 'Black' : 'White';
        createAndFillBoardOnPole(ChessEngine.Pole);
        this.checkGameState();
        this.updateUI();
        console.log('Ход отменен. Теперь ходят: ' + this.currentPlayer);
    }

    checkGameState() {
        if (!GraphicsEngine.isWhiteFigure && !GraphicsEngine.isBlackFigure) {
            document.getElementById('game-status').textContent = 'Нет фигур на доске! Игра не может продолжаться.';
            return;
        }

        if ((this.currentPlayer === 'White' && !GraphicsEngine.isWhiteFigure) ||
            (this.currentPlayer === 'Black' && !GraphicsEngine.isBlackFigure)) {
            document.getElementById('game-status').textContent =
                `У ${this.currentPlayer === 'White' ? 'белых' : 'черных'} нет фигур! Пропуск хода.`;
            this.skipTurn();
            return;
        }

        const gameState = ChessEngine.FoundKing(ChessEngine.Pole);
        highlightKingInCheck(gameState);
        switch (gameState) {
            case 'CheckWhite':
                document.getElementById('game-status').textContent = 'Шах белым!';
                break;
            case 'CheckMateWhite':
                document.getElementById('game-status').textContent = 'Мат белым! Игра окончена.';
                break;
            case 'CheckBlack':
                document.getElementById('game-status').textContent = 'Шах черным!';
                break;
            case 'CheckMateBlack':
                document.getElementById('game-status').textContent = 'Мат черным! Игра окончена.';
                break;
            default:
                document.getElementById('game-status').textContent = '';
                break;
        }
    }

    updateUI() {
        document.getElementById('current-player').textContent =
            this.currentPlayer === 'White' ? 'Белые' : 'Черные';
        this.updateMoveHistory();
    }

    updateMoveHistory() {
        const historyList = document.getElementById('history-list');
        historyList.innerHTML = '';

        this.moveHistory.forEach((move, index) => {
            const moveElement = document.createElement('div');
            moveElement.textContent = `${index + 1}. ${move.movedFigure.Color} ${move.movedFigure.Name}: 
                (${move.from.x},${move.from.y},${move.from.z}) → 
                (${move.to.x},${move.to.y},${move.to.z})`;
            historyList.appendChild(moveElement);
        });

        historyList.scrollTop = historyList.scrollHeight;
    }

    handleAxisChange(axisId) {
        let axis = null;
        if (axisId === 'axis-x') axis = 'x';
        else if (axisId === 'axis-y') axis = 'y';
        else if (axisId === 'axis-z') axis = 'z';
        else if (axisId === 'axis-none') axis = null;
        GraphicsEngine.setExpandedAxis(axis);
        GraphicsEngine.createAndFillBoardOnPole(ChessEngine.Pole);
    }

    saveSettings() {
        console.log('Сохранение настроек');
        const settings = {
            bgColor: document.getElementById('bg-color').value,
            boardColor1: document.getElementById('board-color-1').value,
            boardColor2: document.getElementById('board-color-2').value,
            whiteFiguresColor: document.getElementById('white-figures-color').value,
            blackFiguresColor: document.getElementById('black-figures-color').value
        };

        const dataStr = JSON.stringify(settings);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });

        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = 'chess_settings.json';
        link.click();
    }

    loadSettings(file) {
        console.log('Загрузка настроек из файла:', file.name);
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const settings = JSON.parse(e.target.result);
                document.getElementById('bg-color').value = settings.bgColor;
                document.getElementById('board-color-1').value = settings.boardColor1;
                document.getElementById('board-color-2').value = settings.boardColor2;
                document.getElementById('white-figures-color').value = settings.whiteFiguresColor;
                document.getElementById('black-figures-color').value = settings.blackFiguresColor;

                this.changeColor('background', settings.bgColor);
                this.changeColor('board1', settings.boardColor1);
                this.changeColor('board2', settings.boardColor2);
                this.changeColor('whiteFigure', settings.whiteFiguresColor);
                this.changeColor('blackFigure', settings.blackFiguresColor);

                alert('Настройки успешно загружены!');
            } catch (error) {
                alert('Ошибка при загрузке настроек: ' + error.message);
            }
        };
        reader.readAsText(file);
    }

    saveGame() {
        console.log('Сохранение игры');
        const setupType = this.isStandardPosition ? "standart" : "custom";
        let dataToSave = '';

        const serializeFigure = (figure) => {
            if (!figure) return 'null';
            return JSON.stringify({
                __type: figure.constructor.name,
                Color: figure.Color,
                Name: figure.Name
            });
        };

        if (setupType === 'standart') {
            dataToSave = setupType + "\n" + JSON.stringify(this.moveHistory);
        } else {
            dataToSave = "custom\n" + this.currentPlayer + "\n";
            for (let i = 0; i < 6; i++) {
                for (let j = 0; j < 6; j++) {
                    let row = [];
                    for (let k = 0; k < 8; k++) {
                        const figure = ChessEngine.Pole[i][j][k];
                        row.push(serializeFigure(figure));
                    }
                    dataToSave += row.join('\t') + "\n";
                }
            }
            dataToSave += JSON.stringify(this.moveHistory);
        }

        const dataBlob = new Blob([dataToSave], { type: 'text/plain' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = 'chess_game_save.txt';
        link.click();
    }

    loadGame(file) {
        console.log('Загрузка игры из файла:', file.name);
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = e.target.result;
                const lines = data.split('\n');
                const setupType = lines[0].trim();

                const createFigureFromData = (figureData) => {
                    if (!figureData || figureData === 'null') return null;
                    try {
                        const parsedData = typeof figureData === 'string' ? JSON.parse(figureData) : figureData;
                        if (parsedData.__type) {
                            const figureClass = window.ChessEngine[parsedData.__type];
                            if (figureClass) return new figureClass();
                        } else if (parsedData.Color && parsedData.Name) {
                            const className = parsedData.Color + parsedData.Name;
                            const figureClass = window.ChessEngine[className];
                            if (figureClass) return new figureClass();
                        }
                    } catch (error) {
                        console.warn('Ошибка создания фигуры:', error);
                    }
                    return null;
                };

                if (setupType === 'standart') {
                    ChessEngine.InitGame();
                    this.currentPlayer = 'White';
                    this.moveHistory = [];
                    this.isStandardPosition = true;

                    if (lines.length > 1 && lines[1].trim() !== '') {
                        const moves = JSON.parse(lines[1]);
                        for (const move of moves) {
                            move.movedFigure = createFigureFromData(move.movedFigure);
                            move.capturedFigure = createFigureFromData(move.capturedFigure);
                            this.makeMove(
                                move.from.x, move.from.y, move.from.z,
                                move.to.x, move.to.y, move.to.z
                            );
                        }
                    }
                } else if (setupType === 'custom' || setupType === 'Custom Position') {
                    this.isStandardPosition = false;
                    this.currentPlayer = lines[1].trim();
                    this.moveHistory = [];

                    ChessEngine.FillPole();

                    for (let i = 0; i < 6; i++) {
                        for (let j = 0; j < 6; j++) {
                            const lineIndex = 2 + i * 6 + j;
                            if (lineIndex < lines.length) {
                                const parts = lines[lineIndex].split('\t');
                                for (let k = 0; k < 8; k++) {
                                    if (k < parts.length) {
                                        ChessEngine.Pole[i][j][k] = createFigureFromData(parts[k].trim());
                                    }
                                }
                            }
                        }
                    }

                    const historyIndex = 2 + 36;
                    if (lines.length > historyIndex && lines[historyIndex].trim() !== '') {
                        const moves = JSON.parse(lines[historyIndex]);
                        for (const move of moves) {
                            move.movedFigure = createFigureFromData(move.movedFigure);
                            move.capturedFigure = createFigureFromData(move.capturedFigure);
                            this.moveHistory.push(move);
                        }
                    }
                } else {
                    alert('Неизвестный формат файла');
                    return;
                }

                GraphicsEngine.createAndFillBoardOnPole(ChessEngine.Pole);
                this.checkGameState();
                this.updateUI();
                alert('Игра успешно загружена!');
            } catch (error) {
                alert('Ошибка при загрузке игры: ' + error.message);
                console.error(error);
            }
        };
        reader.readAsText(file);
    }

    changeColor(type, value) {
        console.log('Изменение цвета:', type, value);
        const colors = GraphicsEngine.getColors();

        switch (type) {
            case 'cube':
                colors.cubeColor = GraphicsEngine.hexToColor(value);
                break;
            case 'background':
                colors.backgroundColor = GraphicsEngine.hexToColor(value);
                scene.background = new THREE.Color(colors.backgroundColor);
                break;
            case 'board1':
                colors.boardColor1 = GraphicsEngine.hexToColor(value);
                break;
            case 'board2':
                colors.boardColor2 = GraphicsEngine.hexToColor(value);
                break;
            case 'whiteFigure':
                colors.whiteFigureColor = GraphicsEngine.hexToColor(value);
                break;
            case 'blackFigure':
                colors.blackFigureColor = GraphicsEngine.hexToColor(value);
                break;
        }

        GraphicsEngine.updateColors(colors);
    }
}