const wrapper = document.getElementById("map-wrapper");
const pinLayer = document.getElementById("pin-layer");
const popup = document.getElementById("popup");
const popupTitle = document.getElementById("popup-title");
const popupMessage = document.getElementById("popup-message");
const popupImage = document.getElementById("popup-image");

let mapData = [];
let isPopupActive = false;
let isScaleChanged = true;
let visitedPoints = new Set();

//  初始狀態
let currentScale = 0.55;
let currentTransform = { x: 0, y: 0 };
const defaultScale = 1;
const defaultTransform = { x: 0, y: 0 };

// 進度條元素
const progressFill = document.querySelector('.progress-fill');
const progressPercentage = document.getElementById('progress-percentage');
const transitionOverlay = document.getElementById('transition-overlay');

// 載入畫面元素
const loadingScreen = document.getElementById('loading-screen');
const progressBar = document.querySelector('.progress-bar');
const progressText = document.querySelector('.progress-text');
const loadingText = document.querySelector('.loading-text');

// 設置圓形進度條的初始狀態
const radius = 54;
const circumference = 2 * Math.PI * radius;
progressBar.style.strokeDasharray = circumference;
progressBar.style.strokeDashoffset = circumference;

// 監聽視窗大小變化
window.addEventListener('resize', () => {
  const newCircumference = 2 * Math.PI * radius;
  progressBar.style.strokeDasharray = newCircumference;
  progressBar.style.strokeDashoffset = newCircumference;
});

// 載入地圖資料
fetch("mapData.json")
  .then((res) => res.json())
  .then((data) => {
    mapData = data;
    renderPoints();
  });

// 插入座標
function renderPoints() {
  mapData.forEach((point) => {
    const el = document.createElement("div");
    el.className = "point";
    el.style.left = `${point.position.x * 1000}px`;
    el.style.top = `${point.position.y * 1000}px`;

    const shadow = document.createElement("div");
    shadow.className = "pin-shadow";

    const img = document.createElement("img");
    img.src = "images/pin.webp";
    img.alt = "Map Pin";
    img.className = "pin-icon";

    el.appendChild(shadow);
    el.appendChild(img);

    el.addEventListener("click", (e) => {
      e.stopPropagation();
      if (isPopupActive) {
        closePopup(() => focusOnPoint(point, el), false); 
      } else {
        focusOnPoint(point, el);
      }
    });
    

    pinLayer.appendChild(el);
  });
}

//  點擊座標後的scale 與 translate
function applyTransform() {
  wrapper.style.transform = `scale(${currentScale}) translate(${currentTransform.x}px, ${currentTransform.y}px)`;
}

// 更新進度
function updateProgress() {
  const percentage = Math.round((visitedPoints.size / mapData.length) * 100);
  progressFill.style.width = `${percentage}%`;
  progressPercentage.textContent = percentage;
  
  // 當進度達到特定百分比時添加特殊效果
  if (percentage === 25 || percentage === 50 || percentage === 75 || percentage === 100) {
    progressFill.classList.add('milestone');
    setTimeout(() => {
      progressFill.classList.remove('milestone');
    }, 1000);
  }
}

// 轉場效果
function playTransition(callback) {
  // 確保之前的轉場已經完成
  if (transitionOverlay.classList.contains('show')) {
    transitionOverlay.classList.remove('show');
  }
  
  // 使用 requestAnimationFrame 確保動畫流暢
  requestAnimationFrame(() => {
    transitionOverlay.classList.add('show');
    
    // 使用 Promise 來處理轉場動畫
    new Promise(resolve => {
      setTimeout(() => {
        transitionOverlay.classList.remove('show');
        resolve();
      }, 400);
    }).then(() => {
      if (callback) callback();
    });
  });
}

// 修改 focusOnPoint 函數
function focusOnPoint(point, pointEl) {
  if (!visitedPoints.has(point.name)) {
    visitedPoints.add(point.name);
    updateProgress();
    pointEl.classList.add('collected');
  }

  isPopupActive = true;
  
  // 使用 Promise 來確保轉場和動畫的順序
  new Promise(resolve => {
    playTransition(resolve);
  }).then(() => {
    const isMobile = window.innerWidth <= 768;
    const targetScreenX = isMobile ? 40 : window.innerWidth / 2;
    const targetScreenY = isMobile ? 50 : window.innerHeight * 0.9;

    let isImageReady = false;
    let isMoveReady = false;

    function tryShowPopup() {
      if (isImageReady && isMoveReady) {
        const rect = pointEl.getBoundingClientRect();
        if (isMobile) {
          popup.style.left = `${rect.right + 10}px`;
          popup.style.top = `${rect.top}px`;
        } else {
          const popupWidth = 250;
          const popupHeight = 500;
          popup.style.left = `${rect.left + rect.width / 2 - popupWidth / 2}px`;
          popup.style.top = `${rect.top - popupHeight - 16}px`;
        }

        popupTitle.innerText = point.name;
        popupMessage.innerText = point.message;
        popupImage.src = point.image;

        popup.classList.remove('hide');
        popup.classList.add('show');
      }
    }

    // 先 preload 圖片
    const preloadImg = new Image();
    preloadImg.src = point.image;
    preloadImg.onload = () => {
      isImageReady = true;
      tryShowPopup();
    };
    preloadImg.onerror = () => {
      isImageReady = true;
      tryShowPopup();
    };

    // 開始縮放
    currentScale = defaultScale;
    applyTransform();

    if (isScaleChanged) {
      setTimeout(() => {
        moveToTarget();
        isScaleChanged = false;
      }, 300);
    } else {
      moveToTarget();
    }

    function moveToTarget() {
      const rect = pointEl.getBoundingClientRect();
      const currentX = rect.left + rect.width / 2;
      const currentY = rect.top + rect.height / 2;

      const deltaX = (targetScreenX - currentX) / currentScale;
      const deltaY = (targetScreenY - currentY) / currentScale;

      currentTransform.x += deltaX;
      currentTransform.y += deltaY;

      applyTransform();

      setTimeout(() => {
        isMoveReady = true;
        tryShowPopup();
      }, 400);
    }
  });
}

// 修改 closePopup 函數
function closePopup(callback = null, resetMap = true) {
  popup.classList.remove('show');
  popup.classList.add('hide');

  playTransition(() => {
    isPopupActive = false;
    if (resetMap) {
      currentScale = defaultScale;
      currentTransform = { ...defaultTransform };
      applyTransform();
    }
    if (callback) callback();
  });
}

document.addEventListener("click", (e) => {
  if (isPopupActive && !popup.contains(e.target)) {
    closePopup();
  }
});

// 滑鼠拖曳與滾輪縮放(PC)
let isDragging = false;
let start = { x: 0, y: 0 };

wrapper.addEventListener("mousedown", (e) => {
  if (window.innerWidth > 768) {
    isDragging = true;
    start.x = e.clientX;
    start.y = e.clientY;
    document.body.classList.add("dragging");
  }
});
window.addEventListener("mousemove", (e) => {
  if (isDragging) {
    const dx = (e.clientX - start.x) / currentScale;
    const dy = (e.clientY - start.y) / currentScale;
    currentTransform.x += dx;
    currentTransform.y += dy;
    start.x = e.clientX;
    start.y = e.clientY;
    applyTransform();
  }
});
window.addEventListener("mouseup", () => {
  isDragging = false;
  document.body.classList.remove("dragging");
});

wrapper.addEventListener("wheel", (e) => {
    e.preventDefault();
    const scaleAmount = -e.deltaY * 0.001;
    currentScale = Math.min(Math.max(0.5, currentScale + scaleAmount), 2);
    isScaleChanged = true;
    applyTransform();
  },
  { passive: false }
);

// 兩指縮放&一指拖曳(SP)
let lastTouchDist = 0;
let isTouchDragging = false;

wrapper.addEventListener("touchstart", (e) => {
  if (e.touches.length === 1) {
    isTouchDragging = true;
    start.x = e.touches[0].clientX;
    start.y = e.touches[0].clientY;
  } else if (e.touches.length === 2) {
    lastTouchDist = getTouchDistance(e.touches[0], e.touches[1]);
  }
});

wrapper.addEventListener("touchmove", (e) => {
    e.preventDefault();

    if (e.touches.length === 1 && isTouchDragging) {
      const dx = (e.touches[0].clientX - start.x) / currentScale;
      const dy = (e.touches[0].clientY - start.y) / currentScale;
      currentTransform.x += dx;
      currentTransform.y += dy;
      start.x = e.touches[0].clientX;
      start.y = e.touches[0].clientY;
      applyTransform();
    } else if (e.touches.length === 2) {
      const newDist = getTouchDistance(e.touches[0], e.touches[1]);
      const delta = newDist - lastTouchDist;
      currentScale = Math.min(Math.max(0.5, currentScale + delta * 0.005), 2);
      lastTouchDist = newDist;
      isScaleChanged = true;
      applyTransform();
    }
  },
  { passive: false }
);

wrapper.addEventListener("touchend", (e) => {
  isTouchDragging = false;
});

function getTouchDistance(t1, t2) {
  const dx = t1.clientX - t2.clientX;
  const dy = t1.clientY - t2.clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

// 模擬載入進度
function simulateLoading() {
  let progress = 0;
  const interval = setInterval(() => {
    progress += Math.random() * 8;
    if (progress >= 100) {
      progress = 100;
      clearInterval(interval);
      
      // 隱藏載入中文字
      loadingText.style.opacity = '0';
      setTimeout(() => {
        loadingText.style.display = 'none';
        // 顯示開始提示
        const startMessage = document.querySelector('.start-message');
        startMessage.classList.remove('hidden');
        startMessage.style.opacity = '0';
        // 使用 requestAnimationFrame 確保動畫流暢
        requestAnimationFrame(() => {
          startMessage.style.opacity = '1';
          // 添加載入完成標記
          loadingScreen.classList.add('loaded');
        });
      }, 300);
    }
    
    // 更新圓形進度條
    const offset = circumference - (progress / 100) * circumference;
    progressBar.style.strokeDashoffset = offset;
    progressText.textContent = `${Math.round(progress)}%`;
  }, 100);
}

// 等待所有資源載入完成
window.addEventListener('load', () => {
  // 確保地圖圖片已載入
  const mapImage = document.getElementById('map-image');
  if (mapImage.complete) {
    simulateLoading();
  } else {
    mapImage.onload = simulateLoading;
  }
});

// 點擊開始探索
document.addEventListener('click', (e) => {
  // 只有在載入完成後才允許關閉
  if (loadingScreen.classList.contains('loaded')) {
    loadingScreen.classList.add('hide');
    setTimeout(() => {
      loadingScreen.style.display = 'none';
    }, 800);
  }
});
