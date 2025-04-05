// Khai báo các hằng số
const EMPTY = 0;
const BLACK = 1;
const WHITE = 2;
const MARKER = 4;
const OFFBOARD = 7;
const LIBERTY = 8;

// Biến toàn cục cho game state
let board = [];
let size = 9;
let side = BLACK;
let liberties = [];
let block = [];
let points_side = [];
let points_count = [];
let ko = EMPTY;
let bestMove = EMPTY;
let userMove = 0;
let cell;
let gameMode = 'computer';

// DOM elements
let canvas;
let ctx;
let selectSize;
let gameModeSelect;
let startButton;
let moveList;

// Sử dụng các thành phần neural network trực tiếp từ window
// không khai báo lại với let
console.log("Neural network available:", !!window.neuralNet);
const neuralNet = window.neuralNet;
const dataCollector = window.dataCollector; 
// const saveWeights = window.saveWeights;
// const loadWeights = window.loadWeights;

// Thêm biến đếm số nước đi trước khi học
let moveCounter = 0;
const LEARN_FREQUENCY = 10; // Học sau mỗi 10 nước đi

// Khởi tạo bàn cờ và vẽ khi trang web được tải
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM đã load xong");
    
    // Tự động tải trọng số từ localStorage khi khởi động
    if (window.loadWeights) {
        console.log("Đang tải trọng số đã lưu...");
        window.loadWeights();
        console.log("Trọng số đã được tải thành công");
    }
    
    // Lấy các DOM elements
    canvas = document.getElementById('gobang');
    if (!canvas) {
        console.error('Không tìm thấy canvas');
        return;
    }
    ctx = canvas.getContext('2d');
    
    selectSize = document.getElementById('size');
    gameModeSelect = document.getElementById('gameMode');
    startButton = document.getElementById('startButton');
    moveList = document.getElementById('moveList');

    // Thêm các elements mới
    const viewWeightsButton = document.getElementById('viewWeightsButton');
    const saveWeightsButton = document.getElementById('saveWeightsButton');
    const loadWeightsButton = document.getElementById('loadWeightsButton');
    const viewDataButton = document.getElementById('viewDataButton');
    const clearDataButton = document.getElementById('clearDataButton');
    const weightsDisplay = document.getElementById('weights-display');
    const weightsContent = document.getElementById('weights-content');

    if (!selectSize || !gameModeSelect || !startButton || !moveList) {
        console.error('Không tìm thấy một hoặc nhiều phần tử DOM cần thiết');
        return;
    }

    // Khởi tạo kích thước ô
    size = parseInt(selectSize.value);
    cell = canvas.width / size;

    // Khởi tạo game
    initBoard();
    drawBoard();

    // Thêm event listeners
    selectSize.addEventListener('change', function() {
        size = parseInt(selectSize.value);
        cell = canvas.width / size;
        initBoard();
        drawBoard();
    });

    gameModeSelect.addEventListener('change', function() {
        gameMode = gameModeSelect.value;
    });

    // Xử lý nút Xem trọng số
    if (viewWeightsButton) {
        viewWeightsButton.addEventListener('click', function() {
            if (!neuralNet) {
                alert('Neural network chưa được khởi tạo!');
                return;
            }
            
            // Hiển thị/ẩn khu vực trọng số
            if (weightsDisplay.style.display === 'none') {
                weightsDisplay.style.display = 'block';
                weightsContent.textContent = JSON.stringify(neuralNet.weights, null, 2);
            } else {
                weightsDisplay.style.display = 'none';
            }
        });
    }

    // Xử lý nút Lưu trọng số
    if (saveWeightsButton) {
        saveWeightsButton.addEventListener('click', function() {
            if (!neuralNet) {
                alert('Neural network chưa được khởi tạo!');
                return;
            }
            
            // Lưu trọng số vào localStorage
            window.saveWeights();
            alert('Đã lưu trọng số thành công!');
        });
    }

    // Xử lý nút Tải trọng số
    if (loadWeightsButton) {
        loadWeightsButton.addEventListener('click', function() {
            // Tải trọng số từ localStorage
            window.loadWeights();
            
            if (weightsDisplay.style.display === 'block') {
                weightsContent.textContent = JSON.stringify(neuralNet.weights, null, 2);
            }
            
            alert('Đã tải trọng số thành công!');
        });
    }

    // Xử lý nút Xem dữ liệu
    if (viewDataButton) {
        viewDataButton.addEventListener('click', function() {
            if (!dataCollector) {
                alert('Data collector chưa được khởi tạo!');
                return;
            }
            
            const trainingData = dataCollector.exportTrainingData();
            alert(`Hiện có ${trainingData.length} mẫu dữ liệu training đã được thu thập.`);
        });
    }
    
    // Xử lý nút Xóa dữ liệu
    if (clearDataButton) {
        clearDataButton.addEventListener('click', function() {
            if (!dataCollector) {
                alert('Data collector chưa được khởi tạo!');
                return;
            }
            
            if (confirm('Bạn có chắc chắn muốn xóa tất cả dữ liệu training? Hành động này không thể hoàn tác.')) {
                dataCollector.clearData();
                alert('Đã xóa tất cả dữ liệu training.');
            }
        });
    }

    startButton.addEventListener('click', function() {
        console.log('Nút Start được nhấn');
        // Cập nhật kích thước bàn cờ và tính lại kích thước ô
        size = parseInt(selectSize.value);
        cell = canvas.width / size;
        
        // Khởi tạo lại bàn cờ
        initBoard();
        
        // Xóa lịch sử nước đi
        moveList.innerHTML = '';
        
        // Vẽ lại bàn cờ
        drawBoard();
        console.log('Đã vẽ lại bàn cờ với kích thước:', size);

        // Remove existing listener
        canvas.removeEventListener('click', userInput);

        // Add correct listener based on game mode
        if (gameModeSelect.value === 'human') {
            canvas.addEventListener('click', userInput);
            console.log('Human vs. Human mode');
        } else if (gameModeSelect.value === 'computer') {
            canvas.addEventListener('click', userInput);
            console.log('Human vs Computer mode');
        } else if (gameModeSelect.value === 'computer-computer') {
            console.log('Computer vs Computer mode');
            canvas.removeEventListener('click', userInput);
            let moveInterval = setInterval(() => {
                if (!play(6)) {
                    clearInterval(moveInterval);
                    endGame();
                    console.log("Game over!");
                    return;
                }
                side = 3 - side;
                drawBoard();
            }, 1000);
        } else {
            console.log('Invalid game mode');
        }
    });
});

// GUI
function drawBoard() {
    // Tính lại kích thước ô
    cell = canvas.width / size;
    
    // Xóa bàn cờ cũ
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Vẽ nền bàn cờ
    ctx.fillStyle = "#F4A460";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Vẽ lưới
    ctx.beginPath();
    ctx.strokeStyle = "black";
    ctx.lineWidth = 1;
    
    // Vẽ các đường ngang
    for (let i = 0; i < size; i++) {
        const y = i * cell + cell / 2;
        ctx.moveTo(cell / 2, y);
        ctx.lineTo(canvas.width - cell / 2, y);
    }
    
    // Vẽ các đường dọc
    for (let i = 0; i < size; i++) {
        const x = i * cell + cell / 2;
        ctx.moveTo(x, cell / 2);
        ctx.lineTo(x, canvas.height - cell / 2);
    }
    ctx.stroke();

    // Vẽ điểm hoshi (điểm đánh dấu)
    const hoshiPoints = getHoshiPoints(size);
    for (const point of hoshiPoints) {
        const x = point.x * cell + cell / 2;
        const y = point.y * cell + cell / 2;
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, 2 * Math.PI);
        ctx.fillStyle = "black";
        ctx.fill();
    }

    // Vẽ quân cờ
    for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
            let sq = row * size + col;
            if (board[sq] == OFFBOARD) continue;
            if (board[sq]) {
                let color = board[sq] == BLACK ? "black" : "white";
                ctx.beginPath();
                ctx.arc(col * cell + cell / 2, row * cell + cell / 2, cell * 0.45, 0, 2 * Math.PI);
                ctx.fillStyle = color;
                ctx.fill();
                ctx.strokeStyle = "black";
                ctx.lineWidth = 1;
                ctx.stroke();
            }
            if (sq == userMove) {
                let color = board[sq] == BLACK ? "white" : "black";
                ctx.beginPath();
                ctx.arc(col * cell + cell / 2, row * cell + cell / 2, cell * 0.2, 0, 2 * Math.PI);
                ctx.fillStyle = color;
                ctx.fill();
                ctx.stroke();
            }
        }
    }
}

// Hàm trả về vị trí các điểm hoshi dựa trên kích thước bàn cờ
function getHoshiPoints(size) {
    const points = [];
    if (size === 9) {
        points.push({x: 2, y: 2}, {x: 6, y: 2}, {x: 4, y: 4}, {x: 2, y: 6}, {x: 6, y: 6});
    } else if (size === 13) {
        points.push(
            {x: 3, y: 3}, {x: 9, y: 3},
            {x: 6, y: 6},
            {x: 3, y: 9}, {x: 9, y: 9}
        );
    } else if (size === 19) {
        points.push(
            {x: 3, y: 3}, {x: 9, y: 3}, {x: 15, y: 3},
            {x: 3, y: 9}, {x: 9, y: 9}, {x: 15, y: 9},
            {x: 3, y: 15}, {x: 9, y: 15}, {x: 15, y: 15}
        );
    }
    return points;
}

function userInput(event) {
    let rect = canvas.getBoundingClientRect();
    let mouseX = event.clientX - rect.left;
    let mouseY = event.clientY - rect.top;
    let col = Math.floor(mouseX / cell);
    let row = Math.floor(mouseY / cell);
    
    // Kiểm tra biên
    if (col < 0 || col >= size || row < 0 || row >= size) {
        return;
    }
    
    let sq = row * size + col;
    if (board[sq]) return;
    if (!setStone(sq, side, true)) return;
    drawBoard();
    addToHistory(sq, side);
    if (gameMode === 'computer') {
        side = 3 - side;
        setTimeout(function() { play(6); }, 10);
    } else {
        side = 3 - side;
    }
}

function territory(sq) { /* Count territory, returns [side, points] */
  stone = board[sq]; // Lấy giá trị của ô tại chỉ số sq.
  
  if (stone == OFFBOARD) return OFFBOARD; // Nếu ô nằm ngoài bàn cờ, trả về OFFBOARD.
  
  if (stone == EMPTY) { // Nếu ô là trống.
    block.push(sq); // Thêm ô vào mảng block (các ô đang được kiểm tra).
    points_count.push(sq); // Thêm ô vào mảng points_count (các ô tính điểm).
    board[sq] |= MARKER; // Đánh dấu ô này bằng cách sử dụng MARKER.
    
    // Gọi đệ quy hàm territory cho các ô xung quanh.
    for (let offset of [1, size, -1, -size]) territory(sq + offset);
  } else if (stone != MARKER) { // Nếu ô không phải là MARKER.
    points_side.push(stone); // Thêm màu của viên đá vào mảng points_side.
  }
  
  // Nếu không có màu nào trong points_side, trả về [EMPTY, số lượng ô tính điểm].
  if (!points_side.length) return [EMPTY, points_count.length];
  
  // Nếu tất cả các màu trong points_side đều giống nhau, trả về màu đó và số lượng ô tính điểm.
  else if (points_side.every((element) => element == points_side[0]))
    return [points_side[0], points_count.length];
  
  // Nếu có nhiều màu khác nhau, trả về [EMPTY, số lượng ô tính điểm].
  else return [EMPTY, points_count.length];
}

function score() { /* Scores game, returns points [empty, black, white]*/
  let scorePosition = [0, 0, 0];
  for (let sq = 0; sq < size ** 2; sq++) {
    if (board[sq]) continue;
    let result = territory(sq);
    scorePosition[result[0]] += result[1];
    points_side = [];
    points_count = [];
  } restoreBoard();
  let prisoners = (side == BLACK ? evaluate(): -evaluate());
  if (prisoners > 0) scorePosition[BLACK] += prisoners;
  if (prisoners < 0) scorePosition[WHITE] += Math.abs(prisoners);
  scorePosition[WHITE] += 6.5; // komi
  return scorePosition;
}

function updateScore() {
    const pts = score();
    const element = document.getElementById("score");
    element.innerHTML = `Đen: ${pts[BLACK]}, Trắng: ${pts[WHITE]}, Trống: ${pts[EMPTY]}`;
}

// ENGINE
function initBoard() {
    // Tính lại kích thước ô
    cell = canvas.width / size;
    
    // Khởi tạo mảng board với kích thước mới
    board = new Array(size * size).fill(EMPTY);
    
    // Reset các biến trạng thái
    side = BLACK;
    ko = EMPTY;
    userMove = 0;
    bestMove = EMPTY;
    liberties = [];
    block = [];
    points_side = [];
    points_count = [];
}

function inEye(sq) { /* Check if square is in diamond shape */
  let eyeColor = -1; // Khởi tạo biến để lưu màu của viên đá trong "mắt", -1 có nghĩa là chưa xác định.
  let otherColor = -1; // Khởi tạo biến để lưu màu của viên đá khác, -1 có nghĩa là chưa xác định.
  
  for (let offset of [1, size, -1, -size]) { // Lặp qua các offset để kiểm tra các ô xung quanh ô sq.
    if (board[sq + offset] == OFFBOARD) continue; // Nếu ô nằm ngoài bàn cờ, bỏ qua.
    if (board[sq + offset] == EMPTY) return 0; // Nếu ô là trống, trả về 0 (không phải là "mắt").
    
    if (eyeColor == -1) { // Nếu chưa xác định màu của viên đá trong "mắt".
      eyeColor = board[sq + offset]; // Gán màu của viên đá hiện tại cho eyeColor.
      otherColor = 3 - eyeColor; // Tính màu của viên đá khác (nếu eyeColor là 1, thì otherColor là 2 và ngược lại).
    } else if (board[sq + offset] == otherColor) // Nếu ô hiện tại có màu khác với eyeColor.
      return 0; // Trả về 0 (không phải là "mắt").
  }
  
  if (eyeColor > 2) eyeColor -= MARKER; // Nếu eyeColor lớn hơn 2 (có thể là một ô đã đánh dấu), trừ đi MARKER.
  
  return eyeColor; // Trả về màu của viên đá trong "mắt" (1 hoặc 2), hoặc 0 nếu không phải là "mắt".
}

function clearBlock(move) { /* Erase stones when captured */
  if (block.length == 1 && inEye(move, 0) == 3 - side) // Nếu chỉ có một viên đá trong block và ô move là "mắt" của bên đối thủ.
    ko = block[0]; // Đặt vị trí ko là vị trí của viên đá bị bắt.
  
  for (let i = 0; i < block.length; i++) // Lặp qua tất cả các viên đá trong block.
    board[block[i]] = EMPTY; // Đặt các ô tương ứng trong board thành EMPTY (xóa viên đá).
}

function captures(color, move) { /* Handle captured stones */
  for (let sq = 0; sq < size ** 2; sq++) { // Lặp qua tất cả các ô trên bàn cờ.
    let stone = board[sq]; // Lấy giá trị của ô tại chỉ số sq.
    
    if (stone == OFFBOARD) continue; // Nếu ô nằm ngoài bàn cờ, bỏ qua.
    
    if (stone & color) { // Kiểm tra xem ô có chứa viên đá của màu đã cho không.
      count(sq, color); // Gọi hàm count để đếm số ô tự do cho nhóm viên đá tại ô sq.
      
      if (liberties.length == 0) // Nếu không còn ô tự do nào.
        clearBlock(move); // Gọi hàm clearBlock để xóa các viên đá bị bắt.
      
      restoreBoard(); // Khôi phục trạng thái bàn cờ về trước khi gọi hàm count.
    }
  }
}

function count(sq, color) { /* Count group liberties */
  stone = board[sq]; // Lấy giá trị của ô tại chỉ số sq.
  
  if (stone == OFFBOARD) return; // Nếu ô nằm ngoài bàn cờ, kết thúc hàm.
  
  // Kiểm tra xem ô có chứa viên đá của màu đã cho và chưa được đánh dấu không.
  if (stone && (stone & color) && (stone & MARKER) == 0) {
    block.push(sq); // Thêm ô vào mảng block (các ô đang được kiểm tra).
    board[sq] |= MARKER; // Đánh dấu ô này để tránh kiểm tra lại.
    
    // Gọi đệ quy hàm count cho các ô xung quanh.
    for (let offset of [1, size, -1, -size]) 
      count(sq + offset, color);
  } else if (stone == EMPTY) { // Nếu ô là trống.
    board[sq] |= LIBERTY; // Đánh dấu ô này là ô tự do.
    liberties.push(sq); // Thêm ô vào mảng liberties (các ô tự do).
  }
}

function restoreBoard() { /* Remove group markers */
  block = []; liberties = []; points_side = [];
  for (let sq = 0; sq < size ** 2; sq++) {
    if (board[sq] != OFFBOARD) board[sq] &= 3;
  }
}

function setStone(sq, color, user) { /* Place stone on board */
  // Kiểm tra xem ô đã có viên đá hay chưa
  if (board[sq] != EMPTY) {
    if (user) alert("Illegal move!"); // Nếu là người dùng, hiển thị thông báo nước đi không hợp lệ
    return false; // Trả về false nếu ô đã có viên đá
  } else if (sq == ko) { // Kiểm tra xem nước đi có phải là nước đi ko không
    if (user) alert("Ko!"); // Nếu là người dùng, hiển thị thông báo nước đi ko
    return false; // Trả về false nếu nước đi là ko
  }
  
  let old_ko = ko; // Lưu vị trí ko hiện tại
  ko = EMPTY; // Đặt lại vị trí ko về trống
  board[sq] = color; // Đặt viên đá tại vị trí sq với màu đã cho
  
  captures(3 - color, sq); // Gọi hàm captures để xử lý các viên đá bị bắt
  count(sq, color); // Gọi hàm count để đếm số ô tự do cho nhóm viên đá
  
  let suicide = liberties.length ? false : true; // Kiểm tra xem nước đi có phải là tự sát không
  restoreBoard(); // Khôi phục trạng thái bàn cờ về trước khi đặt viên đá
  
  if (suicide) { // Nếu nước đi là tự sát
    board[sq] = EMPTY; // Đặt lại ô đó thành trống
    ko = old_ko; // Khôi phục vị trí ko
    if (user) alert("Suicide move!"); // Nếu là người dùng, hiển thị thông báo nước đi tự sát
    return false; // Trả về false
  }
  
  userMove = sq; // Lưu nước đi của người dùng
  return true; // Trả về true nếu nước đi hợp lệ
}

function getUrgentMoves() { /* Get escape squares of groups with less than 3 liberties */
  let urgent = []; // Khởi tạo mảng để lưu các nước đi khẩn cấp.
  
  for (let sq = 0; sq < size ** 2; sq++) { // Lặp qua tất cả các ô trên bàn cờ.
    if (board[sq] == OFFBOARD || board[sq] == EMPTY) continue; // Bỏ qua các ô ngoài bàn cờ hoặc ô trống.
    
    count(sq, board[sq]); // Gọi hàm count để đếm số ô tự do cho nhóm viên đá tại ô sq.
    
    if (liberties.length < 3) // Nếu số ô tự do của nhóm viên đá nhỏ hơn 3.
      for (let sq of liberties) urgent.push(sq); // Thêm các ô tự do vào mảng urgent.
    
    restoreBoard(); // Khôi phục trạng thái bàn cờ về trước khi gọi hàm count.
  }
  
  return [...new Set(urgent)]; // Trả về mảng các nước đi khẩn cấp mà không có giá trị trùng lặp.
}

// Sửa đổi hàm evaluate để sử dụng neural network
function evaluate() {
    if (!neuralNet) {
        window.loadWeights();
    }

    const gameState = {
        board: board,
        side: side,
        ko: ko
    };

    return neuralNet.evaluate(gameState);
}

function search(depth) {
    if (!depth) return evaluate();

    let bestScore = -10000;

    for (let sq of getUrgentMoves()) {
        for (let offset of [1, size, -1, -size])
            if (board[sq + offset] == OFFBOARD && depth == 1) continue;

        if (sq == ko) continue;

        let oldBoard = JSON.stringify(board);
        let oldSide = side;
        let oldKo = ko;

        if (!setStone(sq, side, false)) continue;

        let currentScore = -search(depth - 1);

        if (currentScore > bestScore) {
            bestScore = currentScore;
            if (depth == 6) bestMove = sq;
        }

        board = JSON.parse(oldBoard);
        side = oldSide;
        ko = oldKo;
    }

    return bestScore;
}

function tenuki(direction) { /* Play away when no urgent moves */
  for (let sq of [
    (4*size+4), (4*size+(size-5)), ((size-5)*size+4), ((size-5)*size+(size-5)),
    ((size-1)/2*size+3), (3*size+(size-1)/2), ((size-1)/2*size+(size-4)), ((size-4)*size+(size-1)/2)
  ]) {
    if (board[sq] == EMPTY) {
      if (inEye(sq)) break;
      else return sq;
    }
  };if (score()[EMPTY]) {
    let smallestGroup = 100, tenuki = 0;
    for (let sq = 0; sq < size ** 2; sq++) {
      if (board[sq] == (3-side)) {
        let attack = 0;
        count(sq, board[sq]);
        if (liberties.length < smallestGroup) {
          smallestGroup = liberties.length;
          attack = liberties[0];
        } else if (liberties.length) {
          attack = liberties[(direction?liberties.length-1:0)];
        };restoreBoard();
          let libs = 0;
          for (let lib of [1, -1, size, -size])
            if (board[attack+lib] == EMPTY) libs++;
          if (attack&&libs&&attack!=ko) tenuki = attack;
      }
    };return tenuki;
  }
}

// Sửa đổi hàm play để thu thập dữ liệu training và học liên tục
function play(depth) {
    let currentScore = 0;
    bestMove = 0;
    currentScore = search(depth);

    if (!bestMove) {
        let emptySquares = [];
        for (let i = 0; i < size * size; i++) {
            if (board[i] === EMPTY) {
                emptySquares.push(i);
            }
        }
        if (emptySquares.length > 0) {
            bestMove = emptySquares[Math.floor(Math.random() * emptySquares.length)];
        } else {
            console.log("Board is full - game over!");
            endGame();
            return false;
        }
    }

    if (!setStone(bestMove, side, false)) {
        console.log("Could not set stone, skipping turn");
        return false;
    }

    // Lưu trạng thái game sau mỗi nước đi
    dataCollector.saveGameState(board, bestMove, side, evaluate());
    
    // Tăng bộ đếm nước đi
    moveCounter++;
    
    // Thực hiện học liên tục sau mỗi X nước đi
    if (moveCounter >= LEARN_FREQUENCY) {
        continuousLearning();
        moveCounter = 0; // Reset bộ đếm
    }

    drawBoard();
    addToHistory(bestMove, side);
    updateScore();
    return true;
}

// Hàm học liên tục trên dữ liệu đã thu thập
function continuousLearning() {
    console.log("Đang thực hiện học liên tục...");
    
    if (!window.neuralNet || !window.dataCollector || !window.trainNetwork || !window.saveWeights) {
        console.error("Không thể học liên tục: thiếu các thành phần cần thiết");
        return;
    }
    
    try {
        // Lấy dữ liệu training từ data collector
        const trainingData = window.dataCollector.exportTrainingData();
        
        if (trainingData.length > 0) {
            // Nếu có quá nhiều dữ liệu, chỉ lấy 50 mẫu gần nhất để học
            const recentData = trainingData.slice(-50);
            console.log(`Học liên tục trên ${recentData.length} mẫu dữ liệu gần nhất`);
            
            // Huấn luyện neural network với dữ liệu mới - chỉ 3 epochs để tránh chậm
            window.trainNetwork(recentData, 3);
            
            // Lưu trọng số đã được cập nhật vào localStorage
            window.saveWeights();
            
            console.log("Học liên tục hoàn tất, đã lưu trọng số");
        }
    } catch (error) {
        console.error("Lỗi khi học liên tục:", error);
    }
}

// Lịch sử nước đi
function addToHistory(sq, side) {
    const moveItem = document.createElement('li');
    const row = Math.floor(sq / size);
    const col = sq % size;
    const color = side === BLACK ? 'Đen' : 'Trắng';
    moveItem.textContent = `${color}: (${col}, ${row})`;
    moveList.insertBefore(moveItem, moveList.firstChild);
}

// Thêm hàm endGame để training network
function endGame() {
    console.log("Game kết thúc, đang huấn luyện neural network...");
    
    // Đảm bảo neuralNet và các hàm hỗ trợ tồn tại
    if (!window.neuralNet || !window.dataCollector || !window.trainNetwork || !window.saveWeights) {
        console.error("Không thể huấn luyện neural network: thiếu các thành phần cần thiết");
        return;
    }
    
    try {
        // Lấy dữ liệu training từ data collector
        const trainingData = window.dataCollector.exportTrainingData();
        console.log(`Có ${trainingData.length} mẫu dữ liệu training`);
        
        if (trainingData.length > 0) {
            // Huấn luyện neural network với dữ liệu mới
            window.trainNetwork(trainingData, 10); // Huấn luyện 10 epochs
            
            // Lưu trọng số đã được cập nhật vào localStorage
            window.saveWeights();
            console.log("Đã lưu trọng số neural network");
            
            // Hiển thị thông báo
            alert("Game kết thúc! Trọng số AI đã được cập nhật và lưu lại.");
        }
    } catch (error) {
        console.error("Lỗi khi huấn luyện neural network:", error);
    }
}