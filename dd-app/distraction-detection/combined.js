// Import initialization and update functions for head posture tracking
import {
  initHeadPosture,
  updateHeadPosture
} from "./headPosture.js";

// Import update function for eye gaze tracking
import { updateGaze } from "./gaze.js";

// Import MediaPipe Task Vision dependencies for facial landmarks
import {
  FaceLandmarker,
  FilesetResolver
} from "@mediapipe/tasks-vision";

/* ----------------------------------------
   Internal state
---------------------------------------- */
// Local instance of the Mediapipe face landmarker used for gaze detection
let faceLandmarker;

/* ----------------------------------------
   Public API
---------------------------------------- */

// Asynchronously initializes the overall distraction tracking system
export async function initDistraction() {
  // Wait for the head posture tracker to initialize its own model
  await initHeadPosture();

  // Load the webassembly runtime dependencies for MediaPipe Tasks Vision
  const fileset = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32/wasm"
  );

  // Initialize a second FaceLandmarker specifically for checking gaze direction
  faceLandmarker = await FaceLandmarker.createFromOptions(fileset, {
    baseOptions: { 
      modelAssetPath: "/assets/ml-models/face_landmarker.task" 
    },
    runningMode: "VIDEO",
    numFaces: 1
  });

  // Return the resolved landmarker
  return faceLandmarker;
}

// Runs a combined check for distraction by sequentially evaluating posture then gaze
export function detectDistraction(video, width, height, timestamp) {
  try {
    // Validate that the video element is provided and has enough data to be parsed
    if (!video || video.readyState < 2) {
      return null;
    }

    // Validate that proper dimensions are provided for the calculations
    if (!width || !height || width === 0 || height === 0) {
      return null;
    }

    // Step 1: Execute head posture tracking analysis first
    const headResult = updateHeadPosture(video, width, height, timestamp);

    // If the head tracker couldn't find a face, short-circuit and return "NO FACE"
    if (headResult.status === "NO FACE") {
      return {
        status: "NO FACE",
        headPosture: null,
        gaze: null
      };
    }

    // Step 2: Initialize variables for the subsequent gaze detection phase
    let gazeResult = null;
    let finalStatus = headResult.status;

    // Proceed to check gaze only if the user's head is "FOCUSED" and the landmarker loaded
    if (headResult.status === "FOCUSED" && faceLandmarker) {
      // Analyze the video frame for facial landmarks
      const faceDetection = faceLandmarker.detectForVideo(video, timestamp);
      
      // Ensure we actually detected at least one face's landmarks
      if (faceDetection.faceLandmarks?.length) {
        // Compute gaze tracking ratios using the first detected face
        gazeResult = updateGaze(
          faceDetection.faceLandmarks[0],
          width,
          height
        );

        // If the eye gaze is pointing anywhere other than "CENTER", user is distracted
        if (gazeResult && gazeResult.gaze !== "CENTER") {
          finalStatus = "DISTRACTED";
        }
      }
    }

    // Construct and return the final combined response object for this frame
    return {
      status: finalStatus, // Outcome status: "FOCUSED", "DISTRACTED", or "NO FACE"
      headPosture: {
        yaw: headResult.yaw,   // Head rotation around vertical axis
        pitch: headResult.pitch // Head rotation around lateral axis
      },
      gaze: gazeResult // Null if user turned away; otherwise object containing gaze ratios
    };
  } catch (err) {
    // Suppress expected transient errors regarding the video element's state
    if (err.message?.includes('video') || err.message?.includes('ready')) {
      return null;
    }
    // Log unexpected exceptions for debugging
    console.error("Error in distraction detection:", err);
    
    // Return a safe error state payload
    return {
      status: "ERROR",
      headPosture: null,
      gaze: null
    };
  }
}
