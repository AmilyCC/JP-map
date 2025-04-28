const wrapper = document.getElementById("map-wrapper");
const pinLayer = document.getElementById("pin-layer");
const popup = document.getElementById("popup");
const popupTitle = document.getElementById("popup-title");
const popupMessage = document.getElementById("popup-message");
const popupImage = document.getElementById("popup-image");

let mapData = [];
let isPopupActive = false;

//  初始狀態
let currentScale = 0.55;
let currentTransform = { x: 0, y: 0 };
const defaultScale = 1;
const defaultTransform = { x: 0, y: 0 };

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
    img.src = "images/pin.png";
    img.alt = "Map Pin";
    img.className = "pin-icon";

    el.appendChild(shadow);
    el.appendChild(img);

    el.addEventListener("click", (e) => {
      e.stopPropagation();
      if (isPopupActive) {
        closePopup(() => focusOnPoint(point, el), false); // ❗ 不 reset
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

function focusOnPoint(point, pointEl) {
  isPopupActive = true;

  const isMobile = window.innerWidth <= 768;
  const targetScreenX = isMobile ? 40 : window.innerWidth / 2;
  const targetScreenY = isMobile ? 50 : window.innerHeight * 0.9;

  //  先改 scale，再做偏移
  currentScale = defaultScale;
  applyTransform();

  setTimeout(() => {
    const rect = pointEl.getBoundingClientRect();
    const currentX = rect.left + rect.width / 2;
    const currentY = rect.top + rect.height / 2;

    const deltaX = (targetScreenX - currentX) / currentScale;
    const deltaY = (targetScreenY - currentY) / currentScale;

    currentTransform.x += deltaX;
    currentTransform.y += deltaY;

    applyTransform();

    setTimeout(() => {
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

      // 預先建立 Image 來載入
      const preloadImg = new Image();
      preloadImg.src = point.image;

      preloadImg.onload = () => {
        popupTitle.innerText = point.name;
        popupMessage.innerText = point.message;
        popupImage.src = point.image;

        popup.classList.remove("hide");
        popup.classList.add("show");
      };
    }, 400);
  }, 300);
}

//  關閉POPUP與地圖還原
function closePopup(callback = null, resetMap = true) {
  popup.classList.remove("show");
  popup.classList.add("hide");

  setTimeout(() => {
    isPopupActive = false;
    if (resetMap) {
      currentScale = defaultScale;
      currentTransform = { ...defaultTransform };
      applyTransform();
    }
    if (callback) callback();
  }, 300);
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

wrapper.addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();
    const scaleAmount = -e.deltaY * 0.001;
    currentScale = Math.min(Math.max(0.5, currentScale + scaleAmount), 2);
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

wrapper.addEventListener(
  "touchmove",
  (e) => {
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

// 頁面提示 
const guideOverlay = document.getElementById("guide-overlay");

function hideGuide() {
  if (guideOverlay) {
    guideOverlay.classList.add("hide");
    setTimeout(() => {
      guideOverlay.style.display = "none";
    }, 500);
  }
}

document.addEventListener("click", () => {
  hideGuide();
});
