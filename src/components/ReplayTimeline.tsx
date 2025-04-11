import { useContext, useState } from 'react';
import './ReplayTimeline.css';
import { ReplayContext } from '../context';


export function ReplayTimeline() {

    const replayDataCtx = useContext(ReplayContext);
    const panCycles = replayDataCtx?.replayData?.pan_cycles;

    const [sliderValue, setSliderValue] = useState(0);
    const snapThreshold = 25;
    const timelineResolution = 10000;

    const handleSliderChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const inputValue = Number(event.target.value);
        setSliderValue(inputValue);
        // // Check if the input value is close enough to any red dot position
        // const closestValue = redDotPositions.find(
        //     (position) => Math.abs(position - inputValue) <= snapThreshold
        // );

        // // Snap to the closest value if within the threshold, otherwise use the input value
        // setSliderValue(closestValue !== undefined ? closestValue : inputValue);
    };

    if(!panCycles) {
        return null; // or some loading state
    }

    const redDotPositions = panCycles.map((cycle) => {
        const endDate = new Date(cycle.stop_timestamp);
        const startDate = new Date(panCycles[0].start_timestamp);
        const totalDuration = new Date(panCycles[panCycles.length - 1].stop_timestamp).getTime() - startDate.getTime();
        return ((endDate.getTime() - startDate.getTime()) / totalDuration) * timelineResolution;
    });

    function interpolateTimestringFromSliderValue(value: number) {
        
        if(!panCycles) {
            return ""; 
        }

        const startDate = new Date(panCycles[0].start_timestamp);
        const endDate = new Date(panCycles[panCycles.length - 1].stop_timestamp);
        const totalDuration = endDate.getTime() - startDate.getTime();
        const currentTime = new Date(startDate.getTime() + (value / timelineResolution) * totalDuration);
        return currentTime.toLocaleTimeString('en-US', {timeStyle: 'short'});
    }

    return (
        <>{panCycles &&
            <div className="timeline-container">
                <span className="timeline-label">{panCycles[0].start_timestamp.toLocaleTimeString('en-US', {timeStyle: 'short'})}</span>
                <div className='input-wrapper'>
                    <input
                            type="range"
                            className="timeline"
                            defaultValue={0}
                            min={0}
                            max={timelineResolution}
                            value={sliderValue}
                            onChange={handleSliderChange}
                            list='pan-cycles'
                    />
                </div>
                <div className="red-dot" style={{ left: `${(1000 / timelineResolution) * 100}%` }}></div>

                <div
                    className="slider-thumb-label"
                    style={{ left: `${(sliderValue / timelineResolution) * 100}%` }}
                >
                    {(sliderValue)}
                </div>
                <span className="timeline-label">{panCycles[panCycles.length - 1].start_timestamp.toLocaleTimeString('en-US', {timeStyle: 'short'})}</span>

            </div>
        }
        </>
    );
}