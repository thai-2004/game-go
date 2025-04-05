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
// Thêm biến để lưu lịch sử nước đi trong ván
let moveHistory = [];

// DOM elements
let canvas;
let ctx;
let selectSize;
let gameModeSelect;
let startButton;
let moveList;
let autoLearningStatus; // Thêm element hiển thị trạng thái

// Các cài đặt tự động học và lưu dữ liệu
const AUTO_EXPORT_FREQUENCY = 30; // Tự động xuất file sau 30 nước đi
let exportCounter = 0; // Bộ đếm để xuất file
let AUTO_RESTART = true; // Tự động khởi động lại trò chơi
let isAutoLearning = false; // Đánh dấu nếu đang trong quá trình học tự động
let gameInterval = null; // Để theo dõi và có thể dừng bộ đếm thời gian

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
    autoLearningStatus = document.getElementById('auto-learning-status');

    // Thêm các elements mới
    const viewWeightsButton = document.getElementById('viewWeightsButton');
    const saveWeightsButton = document.getElementById('saveWeightsButton');
    const loadWeightsButton = document.getElementById('loadWeightsButton');
    const viewDataButton = document.getElementById('viewDataButton');
    const clearDataButton = document.getElementById('clearDataButton');
    const exportDataButton = document.getElementById('exportDataButton');
    const importDataButton = document.getElementById('importDataButton');
    const importFileInput = document.getElementById('importFileInput');
    const weightsDisplay = document.getElementById('weights-display');
    const weightsContent = document.getElementById('weights-content');
    const removeDuplicatesButton = document.getElementById('removeDuplicatesButton');

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

    // Xử lý nút Xuất dữ liệu
    if (exportDataButton) {
        exportDataButton.addEventListener('click', function() {
            if (!dataCollector) {
                alert('Data collector chưa được khởi tạo!');
                return;
            }
            
            const trainingData = dataCollector.exportTrainingData();
            if (trainingData.length === 0) {
                alert('Không có dữ liệu training để xuất!');
                return;
            }
            
            // Tạo file JSON để tải xuống
            const dataStr = JSON.stringify(trainingData);
            const dataBlob = new Blob([dataStr], {type: 'application/json'});
            const dataUrl = URL.createObjectURL(dataBlob);
            
            // Tạo link tải xuống và click tự động
            const downloadLink = document.createElement('a');
            downloadLink.href = dataUrl;
            downloadLink.download = 'go_training_data.json';
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
            
            alert(`Đã xuất ${trainingData.length} mẫu dữ liệu training thành công!`);
        });
    }
    
    // Xử lý nút Nhập dữ liệu
    if (importDataButton && importFileInput) {
        importDataButton.addEventListener('click', function() {
            importFileInput.click();
        });
        
        importFileInput.addEventListener('change', function(event) {
            if (!dataCollector) {
                alert('Data collector chưa được khởi tạo!');
                return;
            }
            
            const file = event.target.files[0];
            if (!file) {
                return;
            }
            
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const importedData = JSON.parse(e.target.result);
                    
                    if (!Array.isArray(importedData)) {
                        throw new Error('Dữ liệu không đúng định dạng!');
                    }
                    
                    // Thêm dữ liệu vào dataCollector
                    importTrainingData(importedData);
                    
                    alert(`Đã nhập ${importedData.length} mẫu dữ liệu training thành công!`);
                } catch (error) {
                    alert('Lỗi khi nhập dữ liệu: ' + error.message);
                }
            };
            
            reader.readAsText(file);
            // Reset input để có thể chọn lại file
            event.target.value = null;
        });
    }

    // Xử lý nút Xóa trùng lặp
    if (removeDuplicatesButton) {
        removeDuplicatesButton.addEventListener('click', function() {
            if (!dataCollector) {
                alert('Data collector chưa được khởi tạo!');
                return;
            }
            
            const removedCount = dataCollector.removeDuplicates();
            
            if (removedCount > 0) {
                alert(`Đã xóa ${removedCount} bản ghi dữ liệu trùng lặp!`);
            } else {
                alert('Không tìm thấy dữ liệu trùng lặp.');
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
            startComputerVsComputer();
        } else {
            console.log('Invalid game mode');
        }
    });

    // Tự động nhập file dữ liệu nếu có
    tryAutoImportData();

    // Hiển thị trạng thái học tự động
    updateLearningStatus("Hệ thống sẵn sàng học tự động sau mỗi 10 nước đi");

    // Thêm xử lý cho checkbox tự động khởi động lại
    const autoRestartCheckbox = document.getElementById('autoRestartCheckbox');
    if (autoRestartCheckbox) {
        // Đặt trạng thái ban đầu dựa trên biến AUTO_RESTART
        autoRestartCheckbox.checked = AUTO_RESTART;
        
        // Thêm event listener để cập nhật biến AUTO_RESTART khi người dùng thay đổi
        autoRestartCheckbox.addEventListener('change', function() {
            AUTO_RESTART = this.checked;
            console.log("Tự động khởi động lại:", AUTO_RESTART);
            
            if (AUTO_RESTART) {
                updateLearningStatus("Đã bật tự động bắt đầu lại - AI sẽ tiếp tục học liên tục");
            } else {
                updateLearningStatus("Đã tắt tự động bắt đầu lại - Trò chơi sẽ dừng sau khi kết thúc");
            }
        });
    }

    // Thêm xử lý cho nút tự động học
    const autoLearnButton = document.getElementById('autoLearnButton');
    if (autoLearnButton) {
        autoLearnButton.addEventListener('click', function() {
            // Đảm bảo tính năng tự động bắt đầu lại được bật
            AUTO_RESTART = true;
            if (autoRestartCheckbox) {
                autoRestartCheckbox.checked = true;
            }
            
            // Chuyển sang chế độ computer-computer
            gameMode = 'computer-computer';
            if (gameModeSelect) {
                gameModeSelect.value = 'computer-computer';
            }
            
            // Bắt đầu quá trình tự động học
            updateLearningStatus("Đã bắt đầu chế độ tự động học liên tục");
            
            // Khởi tạo lại bàn cờ và bắt đầu
            initBoard();
            moveList.innerHTML = '';
            drawBoard();
            
            // Bắt đầu chế độ computer-computer
            startComputerVsComputer();
        });
    }

    // Thêm xử lý cho nút xóa dữ liệu trùng
    const cleanDuplicatesButton = document.getElementById('cleanDuplicatesButton');
    if (cleanDuplicatesButton) {
        cleanDuplicatesButton.addEventListener('click', function() {
            if (!dataCollector) {
                alert('Data collector chưa được khởi tạo!');
                return;
            }
            
            updateLearningStatus("Đang kiểm tra và xóa dữ liệu trùng lặp...");
            const removedCount = dataCollector.removeDuplicates();
            
            if (removedCount > 0) {
                updateLearningStatus(`Đã xóa ${removedCount} bản ghi dữ liệu trùng lặp!`);
            } else {
                updateLearningStatus('Không tìm thấy dữ liệu trùng lặp.');
            }
        });
    }
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
    moveHistory = []; // Reset lịch sử nước đi
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
    // Debug thông tin nước đi
    console.log('Debug - setStone:', {
        square: sq,
        color: color === BLACK ? 'Đen' : 'Trắng',
        isUser: user,
        currentBoard: [...board]
    });

    // Kiểm tra xem ô đã có viên đá hay chưa
    if (board[sq] != EMPTY) {
        console.log('Nước đi không hợp lệ: Ô đã có quân');
        if (user) alert("Illegal move!");
        return false;
    } else if (sq == ko) {
        console.log('Nước đi không hợp lệ: Nước đi ko');
        if (user) alert("Ko!");
        return false;
    }
    
    let old_ko = ko;
    ko = EMPTY;
    
    // Lưu trạng thái bàn cờ trước khi đặt quân
    const oldBoard = [...board];
    
    // Đặt quân cờ
    board[sq] = color;
    
    // Kiểm tra và xử lý quân bị bắt
    captures(3 - color, sq);
    
    // Đếm số tự do
    count(sq, color);
    
    // Kiểm tra nước đi tự sát
    let suicide = liberties.length === 0;
    
    // Khôi phục trạng thái bàn cờ
    restoreBoard();
    
    if (suicide) {
        console.log('Nước đi không hợp lệ: Tự sát');
        board[sq] = EMPTY;
        ko = old_ko;
        if (user) alert("Suicide move!");
        return false;
    }
    
    // Nếu nước đi hợp lệ, thực hiện lại các bước
    board[sq] = color;
    captures(3 - color, sq);
    
    // Thêm nước đi vào lịch sử
    if (!moveHistory.includes(sq)) {
        moveHistory.push(sq);
    }
    
    userMove = sq;
    
    // Debug trạng thái sau khi đặt quân
    console.log('Debug - Sau khi đặt quân:', {
        newBoard: [...board],
        moveHistory: [...moveHistory],
        ko: ko
    });
    
    return true;
}

function getUrgentMoves() { /* Get escape squares of groups with less than 3 liberties */
  let urgent = []; // Khởi tạo mảng để lưu các nước đi khẩn cấp.
  
  for (let sq = 0; sq < size ** 2; sq++) { // Lặp qua tất cả các ô trên bàn cờ.
    if (board[sq] == OFFBOARD || board[sq] == EMPTY) continue; // Bỏ qua các ô ngoài bàn cờ hoặc ô trống.
    
    count(sq, board[sq]); // Gọi hàm count để đếm số ô tự do cho nhóm viên đá tại ô sq.
    
    if (liberties.length < 3) { // Nếu số ô tự do của nhóm viên đá nhỏ hơn 3.
      // Chỉ xem xét những ô chưa từng đi
      for (let lib of liberties) {
        if (!moveHistory.includes(lib) && board[lib] === EMPTY) {
          urgent.push(lib);
        }
      }
    }
    
    restoreBoard(); // Khôi phục trạng thái bàn cờ về trước khi gọi hàm count.
  }
  
  return [...new Set(urgent)]; // Trả về mảng các nước đi khẩn cấp mà không có giá trị trùng lặp.
}

// Sửa đổi hàm evaluate để sử dụng neural network
function evaluate() {
    if (!neuralNet) {
        window.loadWeights();
    }

    // Debug chi tiết các biến thành phần
    console.log('Debug các biến thành phần:');
    console.log('board:', board);
    console.log('side:', side);
    console.log('ko:', ko);
    console.log('board length:', board.length);
    console.log('board size:', Math.sqrt(board.length));

    const gameState = {
        board: board,
        side: side,
        ko: ko
    };

    // Debug gameState
    console.log('Debug gameState:', {
        board: gameState.board,
        side: gameState.side,
        ko: gameState.ko,
        boardSize: Math.sqrt(gameState.board.length)
    });

    // Debug một số ô cụ thể trên bàn cờ
    const center = Math.floor(Math.sqrt(board.length) / 2);
    const centerIndex = center * Math.sqrt(board.length) + center;
    console.log('Debug ô trung tâm:', {
        index: centerIndex,
        value: board[centerIndex],
        position: {
            row: Math.floor(centerIndex / Math.sqrt(board.length)),
            col: centerIndex % Math.sqrt(board.length)
        }
    });

    return neuralNet.evaluate(gameState);
}

function search(depth) {
    if (!depth) return evaluate();

    let bestScore = -10000;
    // Chỉ xem xét những nước chưa từng được đi
    let validMoves = getUrgentMoves().filter(sq => !moveHistory.includes(sq));
    
    // Nếu không có nước đi khẩn cấp hợp lệ nào, thử tất cả các ô trống chưa được đi
    if (validMoves.length === 0) {
        for (let sq = 0; sq < size * size; sq++) {
            if (board[sq] === EMPTY && !moveHistory.includes(sq)) {
                validMoves.push(sq);
            }
        }
    }

    // Nếu không còn nước đi hợp lệ nào, trả về điểm đánh giá
    if (validMoves.length === 0) {
        return evaluate();
    }

    for (let sq of validMoves) {
        // Bỏ qua các ô nằm sát cạnh bàn cờ nếu đang ở độ sâu 1
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
  // Các vị trí tiêu biểu để di chuyển
  for (let sq of [
    (4*size+4), (4*size+(size-5)), ((size-5)*size+4), ((size-5)*size+(size-5)),
    ((size-1)/2*size+3), (3*size+(size-1)/2), ((size-1)/2*size+(size-4)), ((size-4)*size+(size-1)/2)
  ]) {
    // Chỉ xem xét các ô trống chưa từng đi
    if (board[sq] === EMPTY && !moveHistory.includes(sq)) {
      if (inEye(sq)) break;
      else return sq;
    }
  };
  
  if (score()[EMPTY]) {
    let smallestGroup = 100, tenuki = 0;
    for (let sq = 0; sq < size ** 2; sq++) {
      if (board[sq] == (3-side)) {
        let attack = 0;
        count(sq, board[sq]);
        
        if (liberties.length < smallestGroup) {
          smallestGroup = liberties.length;
          // Lọc các ô tự do chưa từng đi
          const availableLibs = liberties.filter(lib => 
            !moveHistory.includes(lib) && board[lib] === EMPTY
          );
          if (availableLibs.length > 0) {
            attack = availableLibs[0];
          }
        } else if (liberties.length) {
          // Lọc các ô tự do chưa từng đi
          const availableLibs = liberties.filter(lib => 
            !moveHistory.includes(lib) && board[lib] === EMPTY
          );
          if (availableLibs.length > 0) {
            attack = availableLibs[(direction ? availableLibs.length-1 : 0)];
          }
        }
        
        restoreBoard();
        
        let libs = 0;
        for (let lib of [1, -1, size, -size])
          if (board[attack+lib] == EMPTY) libs++;
          
        if (attack && libs && attack != ko && !moveHistory.includes(attack)) {
          tenuki = attack;
        }
      }
    }
    return tenuki;
  }
}

// Thêm hàm để tìm nước đi tốt nhất từ dữ liệu training
function findBestMoveFromTraining(currentBoard, currentSide) {
    if (!dataCollector) return null;
    
    const trainingData = dataCollector.exportTrainingData();
    if (trainingData.length === 0) return null;
    
    // Tính toán điểm tương đồng giữa trạng thái hiện tại và các trạng thái đã lưu
    let bestSimilarity = 0.65; // Ngưỡng tối thiểu để coi là tương tự
    let bestMove = null;
    let bestScore = -Infinity;
    
    // Lấy tất cả mẫu dữ liệu
    for (const sample of trainingData) {
        // Bỏ qua nếu khác bên đi
        if (sample.side !== currentSide) continue;
        
        // Tính độ tương đồng
        const similarity = calculateBoardSimilarity(currentBoard, sample.board);
        
        // Nếu độ tương đồng đủ cao và có kết quả tốt hơn
        if (similarity > bestSimilarity && sample.result > bestScore) {
            bestSimilarity = similarity;
            bestMove = sample.move;
            bestScore = sample.result;
            
            // Nếu tìm thấy trận đấu gần hoàn hảo (>90% tương đồng)
            if (similarity > 0.9) {
                console.log("Tìm thấy trận đấu gần như giống hệt!");
                break;
            }
        }
    }
    
    if (bestMove !== null) {
        console.log(`Tìm thấy nước đi tốt nhất từ dữ liệu: ${bestMove}, với độ tương đồng: ${bestSimilarity.toFixed(2)}, điểm: ${bestScore.toFixed(2)}`);
    }
    
    return bestMove;
}

// Tính độ tương đồng giữa hai trạng thái bàn cờ
function calculateBoardSimilarity(board1, board2) {
    if (!board1 || !board2 || board1.length !== board2.length) return 0;
    
    let matchCount = 0;
    let totalCount = 0;
    
    for (let i = 0; i < board1.length; i++) {
        // Bỏ qua các ô ngoài bàn cờ
        if (board1[i] === OFFBOARD || board2[i] === OFFBOARD) continue;
        
        // Đếm các ô giống nhau
        if (board1[i] === board2[i]) {
            matchCount++;
        }
        
        totalCount++;
    }
    
    return totalCount > 0 ? matchCount / totalCount : 0;
}

// Sửa đổi hàm play để sử dụng dữ liệu training trước khi tìm kiếm
function play(depth) {
    let currentScore = 0;
    bestMove = 0;
    
    console.log('Debug - Bắt đầu lượt đi của máy:');
    console.log('Bên đang đi:', side === BLACK ? 'Đen' : 'Trắng');
    console.log('Trạng thái bàn cờ:', board);
    console.log('Lịch sử nước đi:', moveHistory);
    
    // Trước tiên, thử tìm nước đi tốt nhất từ dữ liệu training
    const trainingMove = findBestMoveFromTraining(board, side);
    
    // Nếu tìm thấy nước đi tốt từ dữ liệu và chưa được đi trong ván này
    if (trainingMove !== null && !moveHistory.includes(trainingMove) && board[trainingMove] === EMPTY) {
        console.log("Sử dụng nước đi từ dữ liệu training:", trainingMove);
        updateLearningStatus("AI đang sử dụng kinh nghiệm đã học");
        bestMove = trainingMove;
    } else {
        // Nếu không tìm thấy, dùng thuật toán tìm kiếm thông thường
        console.log("Không tìm thấy nước đi từ dữ liệu, dùng thuật toán tìm kiếm");
        updateLearningStatus("AI đang tính toán nước đi tốt nhất");
        currentScore = search(depth);
    }

    // Nếu không tìm được nước đi hoặc nước đi đã được chọn trước đó, chọn một nước đi ngẫu nhiên từ những ô trống còn lại
    if (!bestMove || moveHistory.includes(bestMove) || board[bestMove] !== EMPTY) {
        console.log("Tìm nước đi mới - nước cũ có thể đã được đi");
        let emptySquares = [];
        for (let i = 0; i < size * size; i++) {
            if (board[i] === EMPTY && !moveHistory.includes(i)) {
                emptySquares.push(i);
            }
        }
        console.log('Các ô trống còn lại:', emptySquares);
        if (emptySquares.length > 0) {
            bestMove = emptySquares[Math.floor(Math.random() * emptySquares.length)];
            console.log("Đã chọn nước đi ngẫu nhiên:", bestMove);
        } else {
            console.log("Không còn nước đi hợp lệ hoặc bàn cờ đã đầy - kết thúc ván!");
            endGame();
            return false;
        }
    }

    if (!setStone(bestMove, side, false)) {
        console.log("Không thể đặt quân cờ, bỏ qua lượt");
        return false;
    }

    // Lưu trạng thái game sau mỗi nước đi
    dataCollector.saveGameState(board, bestMove, side, evaluate());
    
    // Tăng bộ đếm nước đi
    moveCounter++;
    exportCounter++;
    
    // Thực hiện học liên tục sau mỗi X nước đi
    if (moveCounter >= LEARN_FREQUENCY) {
        continuousLearning();
        moveCounter = 0; // Reset bộ đếm
    }
    
    // Kiểm tra xem có cần tự động xuất file sau AUTO_EXPORT_FREQUENCY nước đi
    if (exportCounter >= AUTO_EXPORT_FREQUENCY) {
        exportData();
        exportCounter = 0; // Reset bộ đếm xuất
    }

    drawBoard();
    addToHistory(bestMove, side);
    updateScore();
    
    console.log('Debug - Kết thúc lượt đi của máy:');
    console.log('Nước đi vừa thực hiện:', bestMove);
    console.log('Bên tiếp theo:', side === BLACK ? 'Đen' : 'Trắng');
    
    return true;
}

// Hàm học liên tục trên dữ liệu đã thu thập
function continuousLearning() {
    console.log("Đang thực hiện học liên tục...");
    updateLearningStatus("Đang học từ dữ liệu đã thu thập...");
    
    if (!window.neuralNet || !window.dataCollector || !window.trainNetwork || !window.saveWeights) {
        console.error("Không thể học liên tục: thiếu các thành phần cần thiết");
        updateLearningStatus("Lỗi: Không thể học do thiếu thành phần");
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
            updateLearningStatus(`Đã học từ ${recentData.length} mẫu dữ liệu. Tổng cộng: ${trainingData.length} mẫu`);
        } else {
            updateLearningStatus("Chưa có đủ dữ liệu để học");
        }
    } catch (error) {
        console.error("Lỗi khi học liên tục:", error);
        updateLearningStatus("Lỗi khi học: " + error.message);
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
    updateLearningStatus("Đang học từ trận đấu vừa kết thúc...");
    
    // Đánh dấu rằng đang trong quá trình học tự động
    isAutoLearning = true;
    
    // Đảm bảo neuralNet và các hàm hỗ trợ tồn tại
    if (!window.neuralNet || !window.dataCollector || !window.trainNetwork || !window.saveWeights) {
        console.error("Không thể huấn luyện neural network: thiếu các thành phần cần thiết");
        isAutoLearning = false;
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
            updateLearningStatus("Đã học xong! Tự động khởi động lại trò chơi...");
            
            // Tự động khởi động lại trò chơi nếu AUTO_RESTART được bật
            if (AUTO_RESTART) {
                setTimeout(function() {
                    console.log("Tự động khởi động lại trò chơi...");
                    autoRestartGame();
                }, 2000); // Đợi 2 giây trước khi khởi động lại
            } else {
                isAutoLearning = false;
                alert("Game kết thúc! Trọng số AI đã được cập nhật và lưu lại.");
            }
        } else {
            isAutoLearning = false;
        }
    } catch (error) {
        console.error("Lỗi khi huấn luyện neural network:", error);
        updateLearningStatus("Lỗi khi học: " + error.message);
        isAutoLearning = false;
    }
}

// Thêm hàm để nhập dữ liệu training từ file
function importTrainingData(importedData) {
    if (!dataCollector || !Array.isArray(importedData)) {
        console.error("Không thể nhập dữ liệu: DataCollector không tồn tại hoặc dữ liệu không phải mảng");
        return;
    }
    
    // Số lượng dữ liệu hiện tại
    const currentDataCount = dataCollector.gameData.length;
    
    // Trích xuất từng mẫu dữ liệu và thêm vào dataCollector
    let importCount = 0;
    let duplicateCount = 0;
    
    for (const sample of importedData) {
        // Kiểm tra mẫu dữ liệu có đúng định dạng không
        if (!sample.board || !sample.move || !sample.side || sample.result === undefined) {
            console.warn("Bỏ qua mẫu dữ liệu không đúng định dạng:", sample);
            continue;
        }
        
        // Kiểm tra dữ liệu trùng lặp trước khi thêm
        if (dataCollector.isDuplicateData(sample.board, sample.move, sample.side)) {
            duplicateCount++;
            continue;
        }
        
        // Thêm vào dataCollector (không gọi saveGameState để tránh lưu tự động)
        dataCollector.gameData.push({
            board: sample.board,
            move: sample.move,
            side: sample.side,
            result: sample.result,
            timestamp: sample.timestamp || Date.now()
        });
        
        importCount++;
    }
    
    // Giới hạn kích thước dữ liệu nếu vượt quá ngưỡng
    if (dataCollector.gameData.length > dataCollector.maxDataSize) {
        const keepCount = Math.floor(dataCollector.maxDataSize * 0.9);
        dataCollector.gameData = dataCollector.gameData.slice(-keepCount);
    }
    
    // Lưu dữ liệu đã nhập
    dataCollector.saveData();
    
    console.log(`Đã nhập ${importCount} mẫu dữ liệu, bỏ qua ${duplicateCount} mẫu trùng lặp, giữ lại tổng cộng ${dataCollector.gameData.length} mẫu`);
}

// Thêm hàm để tự động xuất file
function exportData() {
    if (!dataCollector) {
        console.error("DataCollector không tồn tại");
        return;
    }
    
    const trainingData = dataCollector.exportTrainingData();
    if (trainingData.length === 0) {
        console.warn("Không có dữ liệu training để xuất");
        return;
    }
    
    // Tạo file JSON để tải xuống
    const dataStr = JSON.stringify(trainingData);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const dataUrl = URL.createObjectURL(dataBlob);
    
    // Tạo link tải xuống và click tự động
    const downloadLink = document.createElement('a');
    downloadLink.href = dataUrl;
    downloadLink.download = 'go_training_data.json';
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    
    console.log("Đã xuất dữ liệu training thành công");
}

// Hàm cập nhật thông báo trạng thái học
function updateLearningStatus(message) {
    if (autoLearningStatus) {
        autoLearningStatus.textContent = message;
    }
}

// Hàm thử tự động nhập file dữ liệu từ localStorage 
function tryAutoImportData() {
    try {
        // Kiểm tra xem đã có dữ liệu trong localStorage chưa
        const savedData = localStorage.getItem('goGameTrainingData');
        if (savedData && dataCollector) {
            const parsedData = JSON.parse(savedData);
            if (Array.isArray(parsedData) && parsedData.length > 0) {
                // Đã có dữ liệu, hiển thị thông báo
                updateLearningStatus(`Đã tải ${parsedData.length} mẫu dữ liệu training từ bộ nhớ`);
            } else {
                // Chưa có dữ liệu, nhắc người dùng chơi để thu thập dữ liệu
                updateLearningStatus("Chưa có dữ liệu training. Hãy chơi để thu thập dữ liệu");
            }
        }
    } catch (error) {
        console.error("Lỗi khi tự động nhập dữ liệu:", error);
    }
}

// Hàm để tự động khởi động lại trò chơi
function autoRestartGame() {
    // Đặt lại các biến trạng thái
    isAutoLearning = false;
    moveCounter = 0;
    exportCounter = 0;
    ko = EMPTY;
    userMove = 0;
    bestMove = EMPTY;
    side = BLACK;
    moveHistory = []; // Reset lịch sử nước đi
    
    // Khởi tạo lại bàn cờ
    initBoard();
    
    // Xóa lịch sử nước đi
    if (moveList) {
        moveList.innerHTML = '';
    }
    
    // Cập nhật giao diện
    drawBoard();
    updateScore();
    updateLearningStatus("Trò chơi đã tự động khởi động lại - AI tiếp tục học");
    
    // Nếu là chế độ computer-computer thì bắt đầu lại việc đi
    if (gameMode === 'computer-computer') {
        console.log("Tự động bắt đầu lại chế độ computer-computer");
        startComputerVsComputer();
    }
}

function startComputerVsComputer() {
    console.log('Bắt đầu chế độ Computer vs Computer');
    canvas.removeEventListener('click', userInput);
    
    // Dừng interval trước đó nếu có
    if (gameInterval) {
        clearInterval(gameInterval);
    }
    
    // Đánh dấu rằng đang trong chế độ học tự động
    isAutoLearning = true;
    
    // Bắt đầu interval mới
    gameInterval = setInterval(() => {
        console.log('Debug - Chuẩn bị lượt đi mới:');
        console.log('Bên đang đi:', side === BLACK ? 'Đen' : 'Trắng');
        
        if (!play(6)) {
            console.log('Không thể thực hiện nước đi, kết thúc game');
            clearInterval(gameInterval);
            endGame();
            return;
        }
        
        // Chuyển lượt
        side = 3 - side;
        console.log('Đã chuyển lượt, bên tiếp theo:', side === BLACK ? 'Đen' : 'Trắng');
        
        drawBoard();
    }, 1000);
}

// Hàm để dừng chế độ tự động học
function stopAutoLearning() {
    if (gameInterval) {
        clearInterval(gameInterval);
        gameInterval = null;
    }
    
    isAutoLearning = false;
    updateLearningStatus("Đã dừng chế độ tự động học");
}