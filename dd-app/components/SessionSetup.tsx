'use client';

import { useState, useEffect, useRef } from 'react';
import { VideoCameraIcon, VideoCameraSlashIcon } from '@heroicons/react/24/solid';

interface IndSetUpProps {
    onJoinRoom: () => void;
    isVideoEnabled: boolean;
    setIsVideoEnabled: (enabled: boolean) => void;
}

const SetUp = ({ 
    onJoinRoom, 
    isVideoEnabled, 
    setIsVideoEnabled
}: IndSetUpProps) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
    const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
    const [selectedVideoDevice, setSelectedVideoDevice] = useState<string>('');
    const [error, setError] = useState<string>('');

    // Get available media devices
    const getDevices = async () => {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoInputs = devices.filter(device => device.kind === 'videoinput');
            
            setVideoDevices(videoInputs);
            
            if (videoInputs.length > 0 && !selectedVideoDevice) {
                setSelectedVideoDevice(videoInputs[0].deviceId);
            }
        } catch (err) {
            console.error('Error enumerating devices:', err);
            setError('Failed to get media devices');
        }
    };

    // Start media stream
    const startMediaStream = async () => {
        try {
            // Stop existing stream first
            if (mediaStream) {
                mediaStream.getTracks().forEach(track => track.stop());
            }

            const constraints: MediaStreamConstraints = {
                video: isVideoEnabled ? {
                    deviceId: selectedVideoDevice ? { exact: selectedVideoDevice } : undefined,
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                } : false,
                audio: false
            };

            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            setMediaStream(stream);

            // Attach video stream to video element
            if (videoRef.current && isVideoEnabled) {
                videoRef.current.srcObject = stream;
            }

            setError('');
        } catch (err: any) {
            console.error('Error accessing media devices:', err);
            setError(err.message || 'Failed to access camera/microphone');
        }
    };

    // Toggle video
    const toggleVideo = () => {
        setIsVideoEnabled(!isVideoEnabled);
    };

    // Change video device
    const handleVideoDeviceChange = (deviceId: string) => {
        setSelectedVideoDevice(deviceId);
    };

    // Initialize devices on mount
    useEffect(() => {
        getDevices();
        
        // Request permissions to get device labels
        navigator.mediaDevices.getUserMedia({ video: true })
            .then(stream => {
                stream.getTracks().forEach(track => track.stop());
                getDevices();
            })
            .catch(err => console.error('Permission error:', err));

        return () => {
            // Cleanup on unmount
            if (mediaStream) {
                mediaStream.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    // Update stream when settings change
    useEffect(() => {
        if (isVideoEnabled) {
            startMediaStream();
        } else {
            // Stop stream if video is disabled
            if (mediaStream) {
                mediaStream.getTracks().forEach(track => track.stop());
                setMediaStream(null);
                if (videoRef.current) {
                    videoRef.current.srcObject = null;
                }
            }
        }
    }, [isVideoEnabled, selectedVideoDevice]);

    const handleJoinMeeting = () => {
        // Clean up media stream before joining
        if (mediaStream) {
            mediaStream.getTracks().forEach(track => track.stop());
        }
        onJoinRoom();
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 p-8">
            <div className="w-full max-w-4xl bg-gray-800 rounded-2xl shadow-2xl p-8">
                <h1 className="text-4xl font-bold text-center mb-8 text-white">
                    Individual Learning Setup
                </h1>

                {/* Video Preview */}
                <div className="relative mb-8 rounded-xl overflow-hidden border border-gray-600" style={{ backgroundColor: '#1e293b', aspectRatio: '16/9' }}>
                    {isVideoEnabled ? (
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="flex items-center justify-center h-full">
                            <p className="text-white text-lg">Video is disabled</p>
                        </div>
                    )}
                    
                    {/* Video Controls Overlay */}
                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-4">
                        <button
                            onClick={toggleVideo}
                            className="p-4 rounded-full transition-all duration-300 hover:scale-110"
                            style={{ backgroundColor: isVideoEnabled ? '#C8A2E0' : '#ef4444' }}
                        >
                            {isVideoEnabled ? (
                                <VideoCameraIcon className="w-6 h-6 text-white" />
                            ) : (
                                <VideoCameraSlashIcon className="w-6 h-6 text-white" />
                            )}
                        </button>
                    </div>
                </div>

                {/* Device Selection */}
                <div className="flex flex-col items-center gap-6 mb-8">
                    {/* Camera Selection */}
                    <div className="w-full max-w-md">
                        <label className="block text-sm font-semibold text-gray-300 mb-2 text-center">
                            Camera
                        </label>
                        <select
                            value={selectedVideoDevice}
                            onChange={(e) => handleVideoDeviceChange(e.target.value)}
                            className="w-full px-4 py-3 rounded-lg border border-gray-600 bg-gray-700 text-gray-200 focus:ring-2 focus:ring-purple-400 focus:border-transparent outline-none transition-all"
                            disabled={videoDevices.length === 0}
                        >
                            {videoDevices.map((device) => (
                                <option key={device.deviceId} value={device.deviceId}>
                                    {device.label || `Camera ${device.deviceId.slice(0, 5)}`}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Join with camera off */}
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={!isVideoEnabled}
                            onChange={() => setIsVideoEnabled(!isVideoEnabled)}
                            className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                        />
                        <span className="text-gray-300 font-medium">Join with camera off</span>
                    </label>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mb-6 p-4 bg-red-900/30 border border-red-500 text-red-400 rounded-lg">
                        {error}
                    </div>
                )}

                {/* Join Button */}
                <div className="flex justify-center">
                    <button
                        onClick={handleJoinMeeting}
                        className="px-12 py-4 text-lg font-semibold text-white rounded-lg shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-105 active:scale-95"
                        style={{ backgroundColor: '#3B82F6' }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#2563EB';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#3B82F6';
                        }}
                    >
                        Join Learning Session
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SetUp;