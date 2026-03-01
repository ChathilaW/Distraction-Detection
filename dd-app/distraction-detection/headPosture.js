// Import MediaPipe Face Landmarker tasks for vision processing
import {
  FaceLandmarker,
  FilesetResolver
} from "@mediapipe/tasks-vision";

/* ----------------------------------------
   Thresholds & params
---------------------------------------- */
// Define acceptable yaw (left/right motion) thresholds
const YAW_NEG_THRESHOLD = -5.0;
const YAW_POS_THRESHOLD = 5.0;

// Define acceptable pitch (up/down motion) thresholds
const PITCH_NEG_THRESHOLD = 6.5;
const PITCH_POS_THRESHOLD = 18.0;

// Grace period in milliseconds to remember the last detected face position
const FACE_LOST_GRACE_MS = 600;

// Alpha value for Exponential Moving Average (EMA) smoothing of head movements
const SMOOTHING_ALPHA = 0.7;

/* ----------------------------------------
   Internal state
---------------------------------------- */
// Holds the MediaPipe face landmarker instance
let landmarker;

// Tracks the most recent yaw and pitch values
let lastYaw = 0;
let lastPitch = 0;

// Tracks the timestamp of the last successful face detection
let lastFaceTime = 0;

// Indicates whether an initial pose has been established
let hasPose = false;

/* ----------------------------------------
   Helpers
---------------------------------------- */
// Checks if the calculated yaw and pitch exceed the focused thresholds
function isLookingAway(yaw, pitch) {
  return (
    yaw < YAW_NEG_THRESHOLD ||
    yaw > YAW_POS_THRESHOLD ||
    pitch < PITCH_NEG_THRESHOLD ||
    pitch > PITCH_POS_THRESHOLD
  );
}

// Calculates the yaw and pitch from facial landmarks
function calculateYawPitch(landmarks, w, h) {
  // Extract key landmark coordinates (left eye, right eye, and nose tip)
  const leftEye = { x: landmarks[33].x * w, y: landmarks[33].y * h };
  const rightEye = { x: landmarks[263].x * w, y: landmarks[263].y * h };
  const noseTip = { x: landmarks[1].x * w, y: landmarks[1].y * h };

  // Determine the midpoint between the eyes
  const eyeCenter = {
    x: (leftEye.x + rightEye.x) / 2,
    y: (leftEye.y + rightEye.y) / 2
  };

  // Calculate the difference between the nose tip and the center of the eyes
  const dx = noseTip.x - eyeCenter.x;
  const dy = noseTip.y - eyeCenter.y;

  // Compute angles (yaw and pitch) in degrees
  return {
    yaw: Math.atan2(dx, w * 0.35) * (180 / Math.PI),
    pitch: Math.atan2(dy, h * 0.35) * (180 / Math.PI)
  };
}

/* ----------------------------------------
   Public API
---------------------------------------- */
// Initializes the Mediapipe Face Landmarker model
export async function initHeadPosture() {
  // Load the required WebAssembly fileset for vision tasks
  const fileset = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32/wasm"
  );

  // Create the landmarker instance with the face model and video running mode
  landmarker = await FaceLandmarker.createFromOptions(fileset, {
    baseOptions: { 
        modelAssetPath: "/assets/ml-model/face_landmarker.task" },
    runningMode: "VIDEO",
    numFaces: 1
  });
}

// Processes a video frame to update the head posture and determine distraction status
export function updateHeadPosture(video, w, h, now) {
  // Return "NO FACE" if the landmarker hasn't finished initializing
  if (!landmarker) {
    return { status: "NO FACE" };
  }

  try {
    // Run detection on the current video frame
    const result = landmarker.detectForVideo(video, now);

    let yaw, pitch;
    let faceDetected = false;

    // Process the first detected face if available
    if (result.faceLandmarks?.length) {
      // Calculate raw yaw and pitch
      const raw = calculateYawPitch(result.faceLandmarks[0], w, h);

      // Initialize smoothing if this is the first detection
      if (!hasPose) {
        yaw = raw.yaw;
        pitch = raw.pitch;
        hasPose = true;
      } else {
        // Apply EMA smoothing to reduce jitter
        yaw = SMOOTHING_ALPHA * lastYaw + (1 - SMOOTHING_ALPHA) * raw.yaw;
        pitch = SMOOTHING_ALPHA * lastPitch + (1 - SMOOTHING_ALPHA) * raw.pitch;
      }

      // Update state tracking variables
      lastYaw = yaw;
      lastPitch = pitch;
      lastFaceTime = now;
      faceDetected = true;
    }
    // Handle short face loss tracking using the grace period
    else if (hasPose && now - lastFaceTime <= FACE_LOST_GRACE_MS) {
      // Re-use the last known positions during the grace period
      yaw = lastYaw;
      pitch = lastPitch;
      faceDetected = true;
    }

    // Determine if we still lack a valid face tracking
    if (!faceDetected) {
      return { status: "NO FACE" };
    }

    // Verify if the current posture translates to looking away
    const distracted = isLookingAway(yaw, pitch);

    // Return the updated status and current angles
    return {
      status: distracted ? "DISTRACTED" : "FOCUSED",
      yaw,
      pitch
    };
  } catch (err) {
    // Silently handle video not ready errors to prevent crashes
    return { status: "NO FACE" };
  }
}