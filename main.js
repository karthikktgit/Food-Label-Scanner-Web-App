// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyC_FGACt4qrT1urVm2WhjG2tYbB8ba7oXA",
  authDomain: "food-guard-web-app.firebaseapp.com",
  projectId: "food-guard-web-app",
  storageBucket: "food-guard-web-app.appspot.com",
  messagingSenderId: "228015095716",
  appId: "1:228015095716:web:888349c77319f8fd140b31",
  measurementId: "G-SREN1XT4SE"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// Elements
const authButton = document.getElementById("authButton");
const userName = document.getElementById("userName");

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

let isCameraMode = true;
let stream = null;
let nutritionReference = {};
let flatNutrientKeys = [];
let abbreviationMap = {};

// Firebase Auth
onAuthStateChanged(auth, user => {
  if (user) {
    authButton.textContent = "Sign Out";
    userName.textContent = `Hi, ${user.displayName}`;
    userName.classList.remove("hidden");
  } else {
    authButton.textContent = "Sign In";
    userName.textContent = "";
    userName.classList.add("hidden");
  }
});

// 🔽 View History logic
document.getElementById("historyButton").addEventListener("click", () => {
  const user = auth.currentUser;
  if (user) {
    // You can later replace this with opening a modal or history page
    alert("📜 Opening your scan history...");
  } else {
    alert("🔐 Please sign in to view your scan history.");
  }
});

authButton.addEventListener("click", () => {
  const user = auth.currentUser;
  if (user) {
    signOut(auth)
      .then(() => {
        alert("Signed out");
        console.log("User signed out");
      })
      .catch((err) => console.error("Sign out error:", err));
  } else {
    signInWithPopup(auth, provider)
      .then((result) => {
        console.log("Signed in user:", result.user);
        alert(`Welcome, ${result.user.displayName}`);
      })
      .catch((error) => {
        console.error("Sign-in error:", error);
        alert("Sign-in failed");
      });
  }
});


// Fetch abbreviation & reference data
fetch('ocr_abbreviation_map.json')
  .then(res => res.json())
  .then(data => abbreviationMap = data);

fetch('nutritional_facts_reference.json')
  .then(res => res.json())
  .then(data => {
    nutritionReference = data;
    flatNutrientKeys = Object.values(data).flatMap(group => Object.keys(group));
  });

// Event listeners
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

// UI Logic
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
}

// Camera
preview.classList.add("hidden");
async function startCamera() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: true });
    videoElement.srcObject = stream;
  } catch (err) {
    alert('Could not access camera.');
    toggleMode();
  }
}

function stopCamera() {
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
    stream = null;
    videoElement.srcObject = null;
  }
}

// Image Capture
function captureImage() {
  if (isCameraMode) {
    const canvas = document.createElement('canvas');
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoElement, 0, 0);
    const imageDataUrl = canvas.toDataURL('image/jpeg');
    processImage(imageDataUrl);
  } else if (fileUpload.files?.[0]) {
    const reader = new FileReader();
    reader.onload = (e) => processImage(e.target.result);
    reader.readAsDataURL(fileUpload.files[0]);
  }
}

function handleFileUpload(e) {
  if (e.target.files?.[0]) captureImage();
}

function handleImageUploadFromHero(e) {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (event) => {
      const imageDataUrl = event.target.result;
      preview.src = imageDataUrl;
      preview.classList.remove("hidden");
      processImage(imageDataUrl);
    };
    reader.readAsDataURL(file);
  }
}

// OCR
async function processImage(imageData) {
  closeScannerModal();
  showResults(imageData);
  const upscaled = await upscaleImage(imageData);

  Tesseract.recognize(upscaled, 'eng', { logger: m => console.log(m) })
    .then(({ data: { text } }) => {
      productName.textContent = "Scan Complete";
      analyzeOCRText(text, upscaled);

      // 🔽 Save to Firestore if user is logged in
      const user = auth.currentUser;
      if (user) {
        const nutritionItems = extractNutritionItems(text);
        saveScanToFirestore(user.uid, imageData, nutritionItems);
      }
    })
    .catch(err => {
      console.error("OCR failed:", err);
      productName.textContent = "Failed to read label";
    });
}

function extractNutritionItems(text) {
  const lines = text.toLowerCase().split(/\n|\r|,/).map(l => l.trim()).filter(Boolean);
  const items = [];

  for (const line of lines) {
    const match = line.match(/([a-z.\s]+)\s+(\d+\.?\d*)\s*(mg|g|kcal|%|mcg)?/);
    if (match) {
      let rawName = match[1].trim();
      const value = parseFloat(match[2]);
      const unit = match[3] || '';

      for (const abbr in abbreviationMap) {
        if (rawName.includes(abbr)) {
          rawName = abbreviationMap[abbr];
        }
      }

      const correctedName = fuzzyMatch(rawName, flatNutrientKeys);
      if (correctedName) {
        items.push({ name: correctedName, value, unit });
      }
    }
  }

  return items;
}

async function saveScanToFirestore(userId, imageUrl, nutritionItems) {
  try {
    const docRef = await addDoc(collection(db, "scanHistory"), {
      userId,
      imageUrl,
      nutritionItems,
      timestamp: new Date()
    });
    console.log("✅ Scan saved with ID:", docRef.id);
  } catch (error) {
    console.error("❌ Error saving scan:", error);
  }
}

function upscaleImage(imageDataUrl, factor = 3) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width * factor;
      canvas.height = img.height * factor;
      const ctx = canvas.getContext('2d');
      ctx.scale(factor, factor);
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/jpeg'));
    };
    img.src = imageDataUrl;
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

function analyzeOCRText(text, imageData) {
  const lines = text.toLowerCase().split(/\n|\r|,/).map(l => l.trim()).filter(Boolean);
  ingredientsList.innerHTML = '';
  for (const line of lines) {
    const match = line.match(/([a-z.\s]+)\s+(\d+\.?\d*)\s*(mg|g|kcal|%|mcg)?/);
    if (match) {
      let rawName = match[1].trim();
      const value = parseFloat(match[2]);
      const unit = match[3] || '';

      for (const abbr in abbreviationMap) {
        if (rawName.includes(abbr)) rawName = abbreviationMap[abbr];
      }

      const correctedName = fuzzyMatch(rawName, flatNutrientKeys);
      if (!correctedName) continue;

      const entry = Object.entries(nutritionReference).flatMap(([_, group]) => Object.entries(group)).find(([key]) => key === correctedName);
      if (!entry) continue;

      const safety = entry[1].safety;
      let color = 'text-yellow-500', icon = 'fa-info-circle';
      if (value === 0) { color = 'text-gray-500'; icon = 'fa-minus-circle'; }
      else if (safety === 'safe') { color = 'text-green-600'; icon = 'fa-check-circle'; }
      else if (safety === 'moderate') { color = 'text-yellow-500'; icon = 'fa-info-circle'; }
      else if (safety === 'harmful') { color = 'text-red-500'; icon = 'fa-exclamation-circle'; }

      const el = document.createElement('div');
      el.className = 'flex items-start';
      el.innerHTML = `<div class="flex-shrink-0 mt-1"><i class="fas ${icon} ${color}"></i></div>
                      <div class="ml-3"><p class="text-sm font-medium ${color}">${correctedName} — ${value}${unit}</p></div>`;
      ingredientsList.appendChild(el);
    }
  }

  scannedImage.src = imageData;
  productName.textContent = "Nutrition Label Scanned";
  healthScore.textContent = "Nutrition Facts Analyzed";
  healthScore.className = "px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800";
}

// Fuzzy match
function fuzzyMatch(input, referenceList) {
  let bestMatch = '';
  let lowestDistance = Infinity;
  input = input.toLowerCase();
  for (const ref of referenceList) {
    const distance = levenshteinDistance(input, ref.toLowerCase());
    if (distance < lowestDistance && distance / ref.length < 0.4) {
      lowestDistance = distance;
      bestMatch = ref;
    }
  }
  return bestMatch || null;
}

function levenshteinDistance(a, b) {
  const dp = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) dp[i][j] = dp[i - 1][j - 1];
      else dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + 1);
    }
  }
  return dp[a.length][b.length];
}

