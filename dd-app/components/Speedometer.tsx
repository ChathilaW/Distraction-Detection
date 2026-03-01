import ReactSpeedometer from 'react-d3-speedometer';

// Define the expected properties for the Speedometer component
type SpeedometerProps = {
  percentage: number; // Represents the focus score from 0 to 100
};

export default function Speedometer({ percentage }: SpeedometerProps) {
  // Ensure the percentage strictly stays within natural bounds (0 to 100)
  const clampedPercentage = Math.max(0, Math.min(100, percentage));
  
  // Helper to resolve the gauge color based on the current score
  const getColor = (pct: number) => {
    // Scores below 40 are colored red to indicate high distraction
    if (pct < 40) return '#ef4444';
    // Scores below 70 are colored yellow to indicate moderate distraction
    if (pct < 70) return '#eab308';
    // Scores 70 and above indicate good focus
    return '#22c55e';
  };

  // Determine the color for the current render frame
  const color = getColor(clampedPercentage);

  return (
    <div className="flex flex-col items-center mb-4">
      {/* 
        Render the third-party speedometer chart.
        The 'key={color}' prop forces the component to re-mount when color changes,
        ensuring smooth color transitions on the needle and track.
      */}
      <ReactSpeedometer
        key={color}
        value={clampedPercentage}
        minValue={0}
        maxValue={100}
        width={260}
        height={180}
        needleColor={color}
        startColor={color}
        segments={1}
        endColor={color}
        segmentColors={[color]}
        ringWidth={30}
        needleHeightRatio={0.7}
        needleTransitionDuration={0}
        currentValueText=""
        textColor="transparent"
      />
      
      {/* Display the numerical percentage immediately below the gauge */}
      <div className="text-center -mt-6">
        <div className="text-3xl font-bold" style={{ color }}>
          {clampedPercentage.toFixed(0)}%
        </div>
        <div className="text-xs text-gray-400 mt-1">Focus Score</div>
      </div>
    </div>
  );
}