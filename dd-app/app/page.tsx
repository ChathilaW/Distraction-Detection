'use client';

import { useState } from 'react';
import SetUp from '@/components/SessionSetup';
import SessionRoom from '@/components/SessionRoom';

export default function Home() {
  const [view, setView] = useState<'start' | 'setup' | 'room'>('start');
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);

  if (view === 'room') {
    return <SessionRoom initialVideoEnabled={isVideoEnabled} onEndSession={() => setView('start')} />;
  }

  if (view === 'setup') {
    return (
      <SetUp
        onJoinRoom={() => setView('room')}
        isVideoEnabled={isVideoEnabled}
        setIsVideoEnabled={setIsVideoEnabled}
      />
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
      <button
        onClick={() => setView('setup')}
        className="rounded-full bg-foreground px-8 py-4 text-lg font-semibold text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
      >
        Start
      </button>
    </div>
  );
}
