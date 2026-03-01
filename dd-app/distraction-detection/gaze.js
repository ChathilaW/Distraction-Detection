/* ------------------------------
   Landmark indices
------------------------------ */

// Constants mapping to specific Mediapipe facial landmark indices for the eyes
const LEFT_EYE_CORNERS = [33, 133];
const RIGHT_EYE_CORNERS = [362, 263];

// Indices defining the position of the left and right irises
const LEFT_IRIS = [468, 469, 470, 471, 472];
const RIGHT_IRIS = [473, 474, 475, 476, 477];

/* ------------------------------
   Utilities
------------------------------ */

// Helper to convert normalized landmark coordinates to absolute pixel coordinates
function lmPx(lm, i, w, h) {
  return { 
    x: lm[i].x * w,
    y: lm[i].y * h 
  };
}

// Calculates the center point of an iris based on its surrounding landmarks
function irisCenter(lm, ids, w, h) {
  let x = 0, y = 0;
  // Sum up all the coordinates for the given iris indices
  ids.forEach(i => {
    const p = lmPx(lm, i, w, h);
    x += p.x;
    y += p.y;
  });
  // Average the coordinates to find the true center
  return { x: x / ids.length, y: y / ids.length };
}

/* ------------------------------
   Init MediaPipe
------------------------------ */

// Initializes the Mediapipe face landmarker instance for tracking gaze
export async function initGaze() {
  // Prevent duplicate initialization if landmarker already exists
  if (landmarker) return landmarker;

  // Load necessary WASM binaries for vision models
  const fileset = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32/wasm"
  );

  // Initialize the FaceLandmarker with the model asset and video running mode
  landmarker = await FaceLandmarker.createFromOptions(fileset, {
    baseOptions: {
      modelAssetPath: "/assets/ml-model/face_landmarker.task"
    },
    runningMode: "VIDEO",
    numFaces: 1
  });

  return landmarker;
}

/* ------------------------------
   Public API
------------------------------ */

// Main function to determine eye gaze direction based on landmarker output
export function updateGaze(landmarks, w, h) {
  
  // Get positions of the left eye's inner and outer corners
  const leftOuter = lmPx(landmarks, LEFT_EYE_CORNERS[0], w, h);
  const leftInner = lmPx(landmarks, LEFT_EYE_CORNERS[1], w, h);

  // Get positions of the right eye's inner and outer corners
  const rightOuter = lmPx(landmarks, RIGHT_EYE_CORNERS[0], w, h);
  const rightInner = lmPx(landmarks, RIGHT_EYE_CORNERS[1], w, h);

  // Determine the central points for both the left and right irises
  const leftIris = irisCenter(landmarks, LEFT_IRIS, w, h);
  const rightIris = irisCenter(landmarks, RIGHT_IRIS, w, h);

  // Calculate horizontal ratio by comparing iris position relative to eye width
  const horizontalRatio =
    ((leftIris.x - leftOuter.x) / (leftInner.x - leftOuter.x) +
     (rightIris.x - rightOuter.x) / (rightInner.x - rightOuter.x)) / 2;

  // Find the vertical center line of both eyes
  const leftEyeCenterY = (leftOuter.y + leftInner.y) / 2;
  const rightEyeCenterY = (rightOuter.y + rightInner.y) / 2;

  // Calculate vertical ratio by comparing the iris vertical position relative to eye center
  const verticalRatio =
    ((leftIris.y - leftEyeCenterY) +
     (rightIris.y - rightEyeCenterY)) / 2 / h;

  // Determine standard gaze direction using horizontal and vertical thresholding
  let gaze = "CENTER";
  if (horizontalRatio < 0.42) gaze = "RIGHT";
  else if (horizontalRatio > 0.6) gaze = "LEFT";
  else if (verticalRatio < -0.0075) gaze = "UP";
  // The y-axis typically grows downwards in canvas/video, so positive ratio is DOWN
  else if (verticalRatio > 0.0) gaze = "DOWN";

  // Return the calculated gaze strings along with the computed numerical ratios
  return {
    gaze,
    horizontalRatio,
    verticalRatio,
  };
  
}
