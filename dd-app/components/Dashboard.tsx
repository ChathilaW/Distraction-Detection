'use client'

// Speedometer component for visualizing the distraction score
import Speedometer from './Speedometer';

// Define expected properties for the Dashboard component
type Props = {
  stats: any; // Raw ML distraction tracking results
  isVideoEnabled: boolean; // Camera status to conditionally render UI
  focusedCount: number; // Number of frames where the user was focused
  totalCount: number; // Total valid frames tracked
  onClose: () => void; // Callback to hide the dashboard
};

export default function Dashboard({ stats, isVideoEnabled, focusedCount, totalCount, onClose }: Props) {
  // Derive a 0-100 score indicating how frequently the user was historically focused
  const focusPercentage = totalCount > 0 ? (focusedCount / totalCount) * 100 : 0;

   // Helper function to interpret raw yaw/pitch angles into readable directions
  const getHeadDirection = (yaw: number, pitch: number): string => {
    const YAW_THRESHOLD = 5.0; // Left/Right movement boundary
    const PITCH_LOW_THRESHOLD = 6.5; // Upward movement boundary
    const PITCH_HIGH_THRESHOLD = 18.0; // Downward movement boundary

    // Match thresholds against actual tracked numbers
    if (yaw < -YAW_THRESHOLD) return "RIGHT";
    if (yaw > YAW_THRESHOLD) return "LEFT";
    if (pitch < PITCH_LOW_THRESHOLD) return "UP";
    if (pitch > PITCH_HIGH_THRESHOLD) return "DOWN";
    return "CENTER";
  };

  return (
    <div className="w-80 bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl p-4">
      {/* Dashboard header with a functional close button */}
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-white font-semibold">Distraction Detection</h3>
        <button 
          onClick={onClose} 
          className="text-gray-400 hover:text-white">
          ✕
        </button>
      </div>
      {/* Gauge displaying the aggregate percent focused */}
      <Speedometer percentage={focusPercentage} />

      {/* Visual separator line */}
      <div className="border-t border-gray-700 my-3"></div>

      {/* Current real-time ML state display */}

      {/* Verify hardware is active first */}
      {!isVideoEnabled ? (
        <p className="text-gray-400 text-sm">Camera turned off</p>
      ) : !stats || stats === null ? (
        // Indicate loading while models spin up for the first few frames
        <p className="text-gray-400 text-sm">Initializing...</p>
      ) : stats.status === "NO FACE" ? (
        // Face detection has explicitly failed or the user walked away
        <p className="text-yellow-400 text-sm font-semibold">⚠️ No face detected</p>
      ) : stats.status === "ERROR" ? (
        // Track error state fallback from ML loops
        <p className="text-red-400 text-sm font-semibold">❌ Detection error</p>
      ) : (
        <div className="space-y-3 text-sm">
          {/* Main tracking status badge mapping true status to color context */}
          <div className="flex items-center gap-2">
            <span className="text-gray-300">Status:</span>
            <span className={`px-3 py-1 rounded-full font-semibold ${
              stats.status === "FOCUSED" 
                ? "bg-green-500/20 text-green-400" 
                : "bg-red-500/20 text-red-400"
            }`}>
              {stats.status === "FOCUSED" ? "✓ FOCUSED" : "⚠ DISTRACTED"}
            </span>
          </div>

          {/* Detailed metrics for Head Posture if available */}
          {stats.headPosture && (
            <div className="border-t border-gray-700 pt-2">
              <p className="text-gray-400 mb-1">Head Direction:</p>
              <div className="bg-gray-800 rounded p-2">
                <p className={`font-semibold text-center ${
                  getHeadDirection(stats.headPosture.yaw, stats.headPosture.pitch) === "CENTER"
                    ? "text-green-400"
                    : "text-red-400"
                }`}>
                  {getHeadDirection(stats.headPosture.yaw, stats.headPosture.pitch)}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {/* Break out raw orientation telemetry variables */}
                 <div className="bg-gray-800 rounded p-2">
                  <p className="text-gray-500 text-xs">Horizontal</p>
                  <p className="text-white font-mono text-xs">{stats.headPosture.yaw?.toFixed(2)}</p>
                </div>
                <div className="bg-gray-800 rounded p-2">
                  <p className="text-gray-500 text-xs">Vertical</p>
                  <p className="text-white font-mono text-xs">{stats.headPosture.pitch?.toFixed(2)}</p>
                </div>
                <div className="bg-gray-800 rounded p-2">
                  <p className="text-gray-500 text-xs">Yaw</p>
                  <p className="text-white font-mono text-xs">{stats.headPosture.yaw?.toFixed(1)}°</p>
                </div>
                <div className="bg-gray-800 rounded p-2">
                  <p className="text-gray-500 text-xs">Pitch</p>
                   <p className="text-white font-mono text-xs">{stats.headPosture.pitch?.toFixed(1)}°</p>
                </div>
              </div>
            </div>
          )}

          {/* Detailed metrics for Gaze only render when looking somewhat towards the screen */}
          {stats.gaze && (
            <div className="border-t border-gray-700 pt-2">
              <p className="text-gray-400 mb-1">Gaze Direction:</p>
              <div className="bg-gray-800 rounded p-2">
                <p className={`font-semibold text-center ${
                  stats.gaze.gaze === "CENTER" ? "text-green-400" : "text-red-400"
                }`}>
                  {stats.gaze.gaze}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div className="bg-gray-800 rounded p-2">
                  <p className="text-gray-500 text-xs">Horizontal</p>
                  <p className="text-white font-mono text-xs">{stats.gaze.horizontalRatio?.toFixed(2)}</p>
                </div>
                <div className="bg-gray-800 rounded p-2">
                  <p className="text-gray-500 text-xs">Vertical</p>
                  <p className="text-white font-mono text-xs">{stats.gaze.verticalRatio?.toFixed(4)}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}