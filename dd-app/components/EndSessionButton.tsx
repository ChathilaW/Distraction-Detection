'use client';

import { useRouter } from 'next/navigation';

interface EndCallButtonProps {
    onEndCall: () => void;
}

const EndCallButton = ({ onEndCall }: EndCallButtonProps) => {
    const router = useRouter();

    const handleEndSession = () => {
        // Call cleanup function passed from parent
        onEndCall();
        
        // Navigate to home page
        router.push('/');
    };

    return (
        <button
            onClick={handleEndSession}
            className="flex items-center justify-center px-6 py-4 rounded-xl transition-all duration-300 hover:scale-105"
            style={{ backgroundColor: '#ef4444' }}
        >
            <span className="text-white text-sm font-medium">End Session</span>
        </button>
    );
};

export default EndCallButton;