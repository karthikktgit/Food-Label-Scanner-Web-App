// JavaScript for FoodGuard Web

// DOM Elements
const scannerModal = document.getElementById('scannerModal');
const resultsModal = document.getElementById('resultsModal');
const scanButton = document.getElementById('scanButton');
const closeScanner = document.getElementById('closeScanner');
const closeResults = document.getElementById('closeResults');
const switchMode = document.getElementById('switchMode');
const captureButton = document.getElementById('captureButton');
const fileUpload = document.getElementById('fileUpload');
const videoElement = document.getElementById('videoElement');
const cameraContainer = document.getElementById('cameraContainer');
const uploadContainer = document.getElementById('uploadContainer');
const scannedImage = document.getElementById('scannedImage');
const productName = document.getElementById('productName');
const ingredientsList = document.getElementById('ingredientsList');
const allergensList = document.getElementById('allergensList');
const allergenSection = document.getElementById('allergenSection');
const nutritionFacts = document.getElementById('nutritionFacts');
const healthScore = document.getElementById('healthScore');
const newScanButton = document.getElementById('newScanButton');

let stream = null;
let isCameraMode = true;

const sampleProducts = [
  // Sample product data as before...
];

// Event Listeners
scanButton.addEventListener('click', openScanner);
closeScanner.addEventListener('click', closeScannerModal);
closeResults.addEventListener('click', closeResultsModal);
switchMode.addEventListener('click', toggleMode);
captureButton.addEventListener('click', captureImage);
fileUpload.addEventListener('change', handleFileUpload);
newScanButton.addEventListener('click', () => {
  closeResultsModal();
  openScanner();
});

// Modal Handlers
function openScanner() {
  const scannerModal = document.getElementById('scannerModal');
  scannerModal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  startCamera(); // Only if using webcam
}

function closeScannerModal() {
  scannerModal.classList.add('hidden');
  document.body.style.overflow = 'auto';
  stopCamera();
}

function closeResultsModal() {
  resultsModal.classList.add('hidden');
  document.body.style.overflow = 'auto';
}

function toggleMode() {
  isCameraMode = !isCameraMode;
  if (isCameraMode) {
    switchMode.innerHTML = '<i class="fas fa-exchange-alt mr-1"></i> Switch to Upload';
    uploadContainer.classList.add('hidden');
    cameraContainer.classList.remove('hidden');
    captureButton.innerHTML = '<i class="fas fa-camera mr-1"></i> Capture';
    startCamera();
  } else {
    switchMode.innerHTML = '<i class="fas fa-exchange-alt mr-1"></i> Switch to Camera';
    cameraContainer.classList.add('hidden');
    uploadContainer.classList.remove('hidden');
    captureButton.innerHTML = '<i class="fas fa-upload mr-1"></i> Upload';
    stopCamera();
  }
}

async function startCamera() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: true });
    videoElement.srcObject = stream;
  } catch (err) {
    alert('Could not access camera. Please check your permissions.');
    toggleMode();
  }
}

function stopCamera() {
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
    videoElement.srcObject = null;
    stream = null;
  }
}

function captureImage() {
  if (isCameraMode) {
    const canvas = document.createElement('canvas');
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
    const imageDataUrl = canvas.toDataURL('image/jpeg');
    processImage(imageDataUrl);
  } else {
    if (fileUpload.files && fileUpload.files[0]) {
      const reader = new FileReader();
      reader.onload = (e) => processImage(e.target.result);
      reader.readAsDataURL(fileUpload.files[0]);
    }
  }
}

function handleFileUpload(e) {
  if (e.target.files && e.target.files[0]) {
    captureImage();
  }
}

function processImage(imageData) {
  closeScannerModal();
  showResults(imageData);
  setTimeout(() => {
    analyzeFood(imageData);
  }, 1500);
}

function showResults(imageData) {
  scannedImage.src = imageData;
  resultsModal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  productName.textContent = 'Analyzing...';
  ingredientsList.innerHTML = '<div class="text-center py-4"><i class="fas fa-spinner fa-spin text-blue-500 text-2xl"></i><p class="mt-2 text-gray-500">Analyzing ingredients...</p></div>';
  allergenSection.classList.add('hidden');
  nutritionFacts.innerHTML = '';
}

function analyzeFood(imageData) {
  const randomProduct = sampleProducts[Math.floor(Math.random() * sampleProducts.length)];
  productName.textContent = randomProduct.name;
  healthScore.textContent = randomProduct.healthScore;
  healthScore.className = `px-2 py-1 rounded-full text-xs font-medium ${randomProduct.healthScoreClass}`;

  ingredientsList.innerHTML = '';
  randomProduct.ingredients.forEach(ingredient => {
    const el = document.createElement('div');
    el.className = 'flex items-start';

    let iconClass = 'text-green-500';
    let icon = 'fa-check-circle';

    if (ingredient.safety === 'harmful') {
      iconClass = 'text-red-500';
      icon = 'fa-exclamation-circle';
    } else if (ingredient.safety === 'moderate') {
      iconClass = 'text-yellow-500';
      icon = 'fa-info-circle';
    }

    el.innerHTML = `
      <div class="flex-shrink-0 mt-1">
        <i class="fas ${icon} ${iconClass}"></i>
      </div>
      <div class="ml-3">
        <p class="text-sm font-medium ${ingredient.safety === 'harmful' ? 'text-red-700' : ingredient.safety === 'moderate' ? 'text-yellow-700' : 'text-gray-700'}">
          ${ingredient.name}
        </p>
      </div>`;

    ingredientsList.appendChild(el);
  });

  if (randomProduct.allergens.length > 0) {
    allergenSection.classList.remove('hidden');
    allergensList.innerHTML = '';
    randomProduct.allergens.forEach(allergen => {
      const el = document.createElement('span');
      el.className = 'allergen-chip';
      el.innerHTML = `<i class="fas fa-exclamation-triangle mr-1"></i> ${allergen}`;
      allergensList.appendChild(el);
    });
  } else {
    allergenSection.classList.add('hidden');
  }

  nutritionFacts.innerHTML = '';
  randomProduct.nutrition.forEach(nutrient => {
    const el = document.createElement('div');
    el.className = 'flex justify-between items-center border-b border-gray-200 pb-2';
    el.innerHTML = `
      <span class="text-sm font-medium text-gray-500">${nutrient.name}</span>
      <span class="text-sm font-medium text-gray-900">${nutrient.value} ${nutrient.unit}</span>`;
    nutritionFacts.appendChild(el);
  });
}

// Scroll-based animation
window.addEventListener('DOMContentLoaded', () => {
  const features = document.querySelectorAll('.relative.group');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
      }
    });
  }, { threshold: 0.1 });

  features.forEach(feature => {
    feature.style.opacity = '0';
    feature.style.transform = 'translateY(20px)';
    feature.style.transition = 'all 0.6s ease-out';
    observer.observe(feature);
  });
});