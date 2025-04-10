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
const healthScore = document.getElementById('healthScore');
const newScanButton = document.getElementById('newScanButton');
const imageUpload = document.getElementById('imageUpload');
const preview = document.getElementById('preview');

let stream = null;
let isCameraMode = true;
let nutritionReference = {};

// Load reference JSON
fetch('nutritional_facts_reference.json')
  .then(response => response.json())
  .then(data => nutritionReference = data);

scanButton.addEventListener('click', openScanner);
closeScanner.addEventListener('click', closeScannerModal);
closeResults.addEventListener('click', closeResultsModal);
switchMode.addEventListener('click', toggleMode);
captureButton.addEventListener('click', captureImage);
fileUpload.addEventListener('change', handleFileUpload);
imageUpload.addEventListener('change', handleImageUploadFromHero);
newScanButton.addEventListener('click', () => {
  closeResultsModal();
  resetState();
  openScanner();
});

function openScanner() {
  scannerModal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  if (isCameraMode) startCamera();
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

function resetState() {
  ingredientsList.innerHTML = '';
  healthScore.textContent = '';
  scannedImage.src = '';
  productName.textContent = '';
  preview.src = '';
  preview.classList.add("hidden");
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

function handleImageUploadFromHero(e) {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function (event) {
      const imageDataUrl = event.target.result;
      preview.src = imageDataUrl;
      preview.classList.remove("hidden");
      processImage(imageDataUrl);
    };
    reader.readAsDataURL(file);
  }
}

function processImage(imageData) {
  closeScannerModal();
  showResults(imageData);

  Tesseract.recognize(imageData, 'eng', {
    logger: m => console.log(m)
  }).then(({ data: { text } }) => {
    productName.textContent = "Scan Complete";
    analyzeOCRText(text, imageData);
  }).catch(err => {
    console.error("OCR failed:", err);
    productName.textContent = "Failed to read label";
  });
}

function showResults(imageData) {
  scannedImage.src = imageData;
  resultsModal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  productName.textContent = 'Analyzing...';
  ingredientsList.innerHTML = '<div class="text-center py-4"><i class="fas fa-spinner fa-spin text-blue-500 text-2xl"></i><p class="mt-2 text-gray-500">Analyzing nutrition...</p></div>';
  healthScore.textContent = '';
}

function getClosestMatch(term, dictionary) {
  let bestMatch = null;
  let highestScore = 0;

  for (const key in dictionary) {
    const score = similarity(term, key);
    if (score > highestScore) {
      highestScore = score;
      bestMatch = key;
    }
  }
  return highestScore >= 0.6 ? bestMatch : null;
}

function similarity(a, b) {
  a = a.toLowerCase();
  b = b.toLowerCase();
  const longer = a.length > b.length ? a : b;
  const shorter = a.length > b.length ? b : a;
  const longerLength = longer.length;
  if (longerLength === 0) return 1.0;
  return (longerLength - editDistance(longer, shorter)) / longerLength;
}

function editDistance(s1, s2) {
  const costs = [];
  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0)
        costs[j] = j;
      else {
        if (j > 0) {
          let newValue = costs[j - 1];
          if (s1.charAt(i - 1) !== s2.charAt(j - 1))
            newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
    }
    if (i > 0)
      costs[s2.length] = lastValue;
  }
  return costs[s2.length];
}

function analyzeOCRText(text, imageData) {
  const lines = text.toLowerCase().split(/\n|\r|,/).map(l => l.trim()).filter(Boolean);

  ingredientsList.innerHTML = '';

  for (const line of lines) {
    const match = line.match(/([a-z\s]+)\s+(\d+\.?\d*)\s*(mg|g|kcal|%|mcg)?/);
    if (match) {
      const rawName = match[1].trim();
      const value = match[2];
      const unit = match[3] || '';

      const flatReference = Object.entries(nutritionReference).flatMap(([_, group]) => Object.keys(group));
      const correctedName = getClosestMatch(rawName, Object.fromEntries(flatReference.map(key => [key, true])));

      if (correctedName) {
        const nutrient = Object.entries(nutritionReference).flatMap(([_, group]) => Object.entries(group)).find(([key]) => key === correctedName);

        if (nutrient) {
          const safety = nutrient[1].safety;
          let color = 'text-yellow-500';
          let icon = 'fa-info-circle';
          if (parseFloat(value) === 0) {
            color = 'text-gray-500';
            icon = 'fa-minus-circle';
          } else if (safety === 'safe') {
            color = 'text-green-600';
            icon = 'fa-check-circle';
          } else if (safety === 'moderate') {
            color = 'text-yellow-500';
            icon = 'fa-info-circle';
          } else if (safety === 'harmful') {
            color = 'text-red-500';
            icon = 'fa-exclamation-circle';
          }

          const el = document.createElement('div');
          el.className = 'flex items-start';
          el.innerHTML = `
            <div class="flex-shrink-0 mt-1">
              <i class="fas ${icon} ${color}"></i>
            </div>
            <div class="ml-3">
              <p class="text-sm font-medium ${color}">${correctedName} — ${value}${unit}</p>
            </div>
          `;
          ingredientsList.appendChild(el);
        }
      }
    }
  }

  scannedImage.src = imageData;
  productName.textContent = "Nutrition Label Scanned";
  healthScore.textContent = "Nutrition Facts Analyzed";
  healthScore.className = "px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800";
}

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
