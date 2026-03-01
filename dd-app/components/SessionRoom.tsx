'use client';

// React hooks for state and lifecycle management
import { useState, useEffect, useRef } from 'react';
// UI icons from Heroicons
import { VideoCameraIcon, VideoCameraSlashIcon, ChartBarIcon } from '@heroicons/react/24/solid';
// Import the unified distraction detection functions
import { initDistraction, detectDistraction } from '@/distraction-detection/combined';
// Dashboard component for displaying stats
import Dashboard from './Dashboard';
// Button component for ending the individual session
import EndCallButton from './EndSessionButton';


interface IndRoomProps {
    initialVideoEnabled?: boolean;
}

// Main component for the individual tracking room
const IndRoom = ({initialVideoEnabled = true }: IndRoomProps = {}) => {
    // Reference to the main video element
    const videoRef = useRef<HTMLVideoElement>(null);
    // State to hold the active media stream (video)
    const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
    // State to track if the camera is currently forced on or off by the user
    const [isVideoEnabled, setIsVideoEnabled] = useState(initialVideoEnabled);

    // Distraction detection state
    // Holds the latest distraction analysis results
    const [distractionData, setDistractionData] = useState<any>(null);
    // Tracks if the ML models have finished loading
    const [isDistractionInitialized, setIsDistractionInitialized] = useState(false);
    // Controls the visibility of the statistics dashboard panel
    const [showDashboard, setShowDashboard] = useState(false);
    // Reference to the current animation frame used for the detection loop
    const animationFrameRef = useRef<number | null>(null);

    // Focus tracking state
    // Counter for how many frames the user was evaluated as "FOCUSED"
    const [focusedCount, setFocusedCount] = useState(0);
    // Counter for total number of valid tracking frames processed
    const [totalCount, setTotalCount] = useState(0);

    // Function to initialize and request user media (camera)
    const startMediaStream = async (enableVideo: boolean) => {
        try {
            // Stop any pre-existing stream tracks to release hardware
            if (mediaStream) {
                mediaStream.getTracks().forEach(track => track.stop());
            }

            // Define the requested capabilities for the stream
            const constraints: MediaStreamConstraints = {
                video: enableVideo ? {
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                } : false,
                audio: false
            };

            // Request permission and acquire the stream from the browser
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            setMediaStream(stream);

            // Directly attach the video stream to the visual video element
            if (videoRef.current && enableVideo) {
                videoRef.current.srcObject = stream;
            }
        } catch (err) {
            console.error('Error accessing media devices:', err);
        }
    };

    // Handler to flip the camera's enabled state
    const toggleVideo = () => {
        const newVideoState = !isVideoEnabled;
        setIsVideoEnabled(newVideoState);

        // Clear distraction data history when the user turns off the camera
        if (!newVideoState) {
            setDistractionData(null);
        }
        
        // Pause/resume the video track gracefully
        if (mediaStream) {
            const videoTrack = mediaStream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = newVideoState;
                
                // Re-attach the stream when explicitly re-enabling
                if (newVideoState && videoRef.current) {
                    videoRef.current.srcObject = mediaStream;
                }
            }
        }
    };

    // Cleanup logic executed when the user leaves the room
    const handleEndCall = () => {
        // Disconnect all connected media tracks entirely
        if (mediaStream) {
            mediaStream.getTracks().forEach(track => track.stop());
        }
        // Halt any pending ML evaluation frames
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
        }
    };

    // On Initial Mount Effect
    useEffect(() => {
        // Begin capturing video
        startMediaStream(true);

        return () => {
            // Disconnect media devices when this component unmounts
            if (mediaStream) {
                mediaStream.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    // Effect to enforce video visibility when state changes
    useEffect(() => {
        if (videoRef.current && mediaStream && isVideoEnabled) {
            // Re-assign the stream object to the video element to ensure playback
            videoRef.current.srcObject = mediaStream;
        }
    }, [isVideoEnabled, mediaStream]);

    // Initializer effect for the distraction machine learning context
    useEffect(() => {
        const setupDistraction = async () => {
            try {
                // Initialize both head posture and gaze detection models
                await initDistraction();
                // Mark models as ready to begin the continuous loop
                setIsDistractionInitialized(true);
            } catch (err) {
                console.error('Error initializing distraction detection:', err);
            }
        };

        setupDistraction();
    }, []);

    // Core continuous looping effect for distraction evaluation
    useEffect(() => {
        // Halt if models aren't ready, the video tag isn't mounted, or the camera is off
        if (!isDistractionInitialized || !videoRef.current || !isVideoEnabled) {
            return;
        }

        // The recursive assessment loop
        const detectDistract = () => {
            // Ensure the video is actually available and toggled on
            if (videoRef.current && isVideoEnabled) {
                const width = videoRef.current.videoWidth;
                const height = videoRef.current.videoHeight;
                
                // Ensure dimensions are fully established by the browser engine
                if (width > 0 && height > 0) {
                    // Send current frame info for structural and gaze analysis
                    const result = detectDistraction(
                        videoRef.current,
                        width,
                        height,
                        performance.now() // current timestamp argument
                    );
                    
                    // Directly save the latest findings to component state
                    setDistractionData(result);
                                       
                    // When tracking metrics are usable (not errors or NO FACE events)
                    if (result && (result.status === "FOCUSED" || result.status === "DISTRACTED")) {
                        // Increment base sample count
                        setTotalCount(prev => prev + 1);
                        // Increment focused count selectively
                        if (result.status === "FOCUSED") {
                            setFocusedCount(prev => prev + 1);
                        }
                    }
                }
            }
            // Request the browser to invoke detectDistract on its next animation frame loop
            animationFrameRef.current = requestAnimationFrame(detectDistract);
        };

        // Bootstrap the recursive cycle
        detectDistract();

        return () => {
            // Cut off the recursive request chain when dependencies shift
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [isDistractionInitialized, isVideoEnabled]);

    return (
        <div className="fixed inset-0 flex flex-col w-full bg-gray-900 z-[60]">
                {/* Main Content Area - Video and Dashboard */}
                <div className="flex-1 flex items-center justify-center p-4 pb-30 gap-4">
                {/* Video Container */}
                <div className={`flex items-center justify-center transition-all duration-300 ${
                    showDashboard ? 'w-[65%]' : 'w-full'
                }`}>
                    <div className="relative w-full max-w-6xl rounded-2xl overflow-hidden shadow-2xl" style={{ aspectRatio: '16/9' }}>
                        {isVideoEnabled ? (
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                muted
                                className="w-full h-full object-cover bg-gray-800"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gray-800">
                                <div className="text-center">
                                    <div className="w-24 h-24 mx-auto mb-4 bg-gray-700 rounded-full flex items-center justify-center">
                                        <svg className="w-12 h-12 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <p className="text-white text-lg">Camera is off</p>    
                                </div>
                               
                            </div>
                        
                    )}
                </div>
            </div>    

                {/* Dashboard Panel */}
                {showDashboard && (
                    <div className="flex items-start justify-center">
                        <Dashboard 
                            stats={distractionData} 
                            isVideoEnabled={isVideoEnabled}
                            focusedCount={focusedCount}
                            totalCount={totalCount}
                            onClose={() => setShowDashboard(false)} 
                        />
                    </div>
                )}
            </div>

            {/* Bottom Navbar */}
            <div className="absolute bottom-0 left-0 right-0 bg-gray-800 border-t border-gray-700 px-6 py-4">
                <div className="flex items-center justify-center gap-6">
                    {/* Camera Button */}
                    <button
                        onClick={toggleVideo}
                        className="flex flex-col items-center gap-2 p-4 rounded-xl transition-all duration-300 hover:scale-105"
                        style={{ backgroundColor: isVideoEnabled ? '#C8A2E0' : '#ef4444' }}
                    >
                        {isVideoEnabled ? (
                            <VideoCameraIcon className="w-6 h-6 text-white" />
                        ) : (
                            <VideoCameraSlashIcon className="w-6 h-6 text-white" />
                        )}
                        <span className="text-white text-sm font-medium">Camera</span>
                    </button>

                    {/* Dashboard Button */}
                    <button
                        onClick={() => setShowDashboard(!showDashboard)}
                        className="flex flex-col items-center gap-2 p-4 rounded-xl transition-all duration-300 hover:scale-105 bg-gray-700 hover:bg-gray-600"
                    >
                        <ChartBarIcon className="w-6 h-6 text-white" />
                        <span className="text-white text-sm font-medium">Dashboard</span>
                    </button>

                    {/* End Session Button */}
                    <EndCallButton onEndCall={handleEndCall} />
                </div>
            </div>
           
        </div>
    );
};

export default IndRoom;