const canvas = document.getElementById('gobang');
const ctx = canvas.getContext('2d');
const EMPTY = 0
const BLACK = 1
const WHITE = 2
const MARKER = 4
const OFFBOARD = 7
const LIBERTY = 8

var board = [];
var size = 15;
var side = BLACK;
var liberties = [];
var block = [];
var points_side = [];
var points_count = [];
var ko = EMPTY; // Khởi tạo vị trí ko (vị trí không thể đánh).
var bestMove = EMPTY;
var userMove = 0;
var cell = canvas.width / size;
var selectSize = document.getElementById("size");
const gameModeSelect = document.getElementById('gameMode');
const startButton = document.getElementById('startButton');
let gameMode = 'computer'; // Mặc định chơi với máy

// Lắng nghe sự kiện thay đổi chế độ chơi
gameModeSelect.addEventListener('change', function() {
    gameMode = gameModeSelect.value;
});

// GUI
function drawBoard() { /* Render board to screen */
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.beginPath();
  for (let i = 0; i < size; i++) {
    const x = i * cell + cell / 2;
    const y = i * cell + cell / 2;
    ctx.strokeStyle = "black";
    ctx.moveTo(cell / 2, y);
    ctx.lineTo(canvas.width - cell / 2, y);
    ctx.moveTo(x, cell / 2);
    ctx.lineTo(x, canvas.height - cell / 2);
  };ctx.stroke();
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      let sq = row * size + col;
      if (board[sq] == 7) continue;
      if (board[sq]) {
        let color = board[sq] == 1 ? "black" : "white";
        ctx.beginPath();
        ctx.arc(col * cell + cell / 2, row * cell + cell / 2, cell / 2 - 2, 0, 2 * Math.PI);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.stroke();
      }
      if (sq == userMove) {
        let color = board[sq] == 1 ? "white" : "black";
        ctx.beginPath();
        ctx.arc(col * cell+(cell/4)*2, row * cell +(cell/4)*2, cell / 4 - 2, 0, 2 * Math.PI);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.stroke();
      }
    }
  }
}

function userInput(event) { /* Handle user input */
  let rect = canvas.getBoundingClientRect();
  let mouseX = event.clientX - rect.left;
  let mouseY = event.clientY - rect.top;
  let col = Math.floor(mouseX / cell);
  let row = Math.floor(mouseY / cell);
  let sq = row * size + col;
  if (board[sq]) return;
  if (!setStone(sq, side, true)) return;
  drawBoard();
  addToHistory(sq, side); // Thêm nước đi vào lịch sử
  if (gameMode === 'computer') {
    side = 3 - side; // Switch turn after user's move
    setTimeout(function() { play(6); }, 10);
  } else {
    side = 3 - side; // Switch turn after user's move
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

function updateScore() { /* Render score to screen */
  let element = document.getElementById("score");
  element.innerHTML = "Black " + pts[BLACK] + ", White " + pts[WHITE] + ", Empty " + pts[EMPTY];
}

// ENGINE
function initBoard() { /* Empty board, set offboard squares */
  board = [];
  for (let sq = 0; sq < size ** 2; sq++) {
        board[sq] = EMPTY;
  }
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
function evaluate() { /* Count captures stones difference */
  let eval = 0; // Khởi tạo biến đánh giá tổng thể.
  let blackStones = 0; // Biến để đếm số viên đá đen.
  let whiteStones = 0; // Biến để đếm số viên đá trắng.
  
  // Lặp qua tất cả các ô trên bàn cờ.
  for (let sq = 0; sq < size ** 2; sq++) {
    // Bỏ qua ô trống và ô ngoài bàn cờ.
    if (!board[sq] || board[sq] == OFFBOARD) continue;
    
    // Đếm số viên đá đen.
    if (board[sq] == BLACK) blackStones += 1;
    
    // Đếm số viên đá trắng.
    if (board[sq] == WHITE) whiteStones += 1;
  }
  
  // Tính sự chênh lệch giữa số viên đá đen và trắng.
  eval += (blackStones - whiteStones);
  
  // Trả về giá trị đánh giá dựa trên bên hiện tại.
  return (side == BLACK) ? eval : -eval;
}

function search(depth) { /* Recursively search fighting moves */
  if (!depth) return evaluate(); // Nếu độ sâu là 0, trả về giá trị đánh giá hiện tại của bàn cờ.
  
  let bestScore = -10000; // Khởi tạo điểm số tốt nhất với giá trị rất thấp.
  
  for (let sq of getUrgentMoves()) { // Lặp qua các nước đi khẩn cấp.
    for (let offset of [1, size, -1, -size]) // Lặp qua các offset để kiểm tra các vị trí xung quanh.
      if (board[sq + offset] == OFFBOARD && depth == 1) continue; // Nếu vị trí ngoài bàn cờ và độ sâu là 1, bỏ qua.
    
    if (sq == ko) continue; // Nếu nước đi là nước đi ko, bỏ qua.
    
    let oldBoard = JSON.stringify(board); // Lưu trạng thái bàn cờ hiện tại.
    let oldSide = side; // Lưu bên hiện tại (đen hoặc trắng).
    let oldKo = ko; // Lưu vị trí ko hiện tại.
    
    if (!setStone(sq, side, false)) continue; // Đặt viên đá tại vị trí sq, nếu không thành công, bỏ qua.
    
    let eval = -search(depth - 1); // Gọi đệ quy hàm search với độ sâu giảm đi 1 và đảo ngược giá trị đánh giá.
    
    if (eval > bestScore) { // Nếu giá trị đánh giá tốt hơn điểm số tốt nhất đã lưu.
      bestScore = eval; // Cập nhật điểm số tốt nhất.
      if (depth == 6) bestMove = sq; // Nếu độ sâu là 6, lưu nước đi tốt nhất.
    }
    
    board = JSON.parse(oldBoard); // Khôi phục trạng thái bàn cờ.
    side = oldSide; // Khôi phục bên hiện tại.
    ko = oldKo; // Khôi phục vị trí ko.
  }
  
  return bestScore; // Trả về điểm số tốt nhất tìm được.
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

function play(depth) { /* Engine plays a move */
    let eval = 0;
    bestMove = 0;
    eval = search(depth);

    if (!bestMove) {
        // If no tactical move is found, play a random empty square
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
            return; // Game over
        }
    }

    if (!setStone(bestMove, side, false)) {
        console.log("Could not set stone, skipping turn");
        return;
    }

    drawBoard();
    addToHistory(bestMove, side);
    updateScore();
}

// Lịch sử nước đi
const moveList = document.getElementById('moveList');

function addToHistory(sq, side) {
    const moveItem = document.createElement('li');
    const row = Math.floor(sq / size);
    const col = sq % size;
    const color = side === BLACK ? 'Đen' : 'Trắng';
    moveItem.textContent = `${color}: (${col}, ${row})`;
    moveList.insertBefore(moveItem, moveList.firstChild);
    // moveList.appendChild(moveItem);
    // moveList.scrollTop = moveList.scrollHeight; // Tự động cuộn xuống cuối
}

// Update score display
function updateScore() { /* Render score to screen */
  let pts = score();
  let element = document.getElementById("score");
  element.innerHTML = "Đen: " + pts[BLACK] + ", Trắng: " + pts[WHITE] + ", Empty: " + pts[EMPTY];
}

// --- Event Listeners ---
startButton.addEventListener('click', function() {
  size = parseInt(selectSize.value);
  cell = canvas.width / size;
  initBoard();
  drawBoard();
  side = BLACK;
  ko = EMPTY;

  // Remove existing listener (to avoid duplicates)
  canvas.removeEventListener('click', userInput);

  // Add correct listener based on game mode
  if (gameModeSelect.value === 'human') {
    canvas.addEventListener('click', userInput);
    console.log('Human vs. Human mode');
  } else if (gameModeSelect.value === 'computer'){
    canvas.addEventListener('click', userInput);
    console.log('Human vs Computer mode');
  } else if (gameModeSelect.value === 'computer-computer'){
    console.log('Computer vs Computer mode');
    // computerVsComputer(); // Start the machine game automatically
    canvas.removeEventListener('click', userInput); // Disable human input
    let moveInterval = setInterval(() => {
      play(6);
      side = 3 - side;  // Switch sides
      drawBoard();
      if (board.every(cell => cell !== EMPTY)) {
        clearInterval(moveInterval);
        console.log("Game over - board full!");
        return;
      }
    }, 1000);
  } else {
    console.log('Invalid game mode');
  }
});

//Call initBoard() and drawBoard() once the page loads
initBoard();
drawBoard();