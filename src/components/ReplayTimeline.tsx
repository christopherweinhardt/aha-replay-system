import { useContext, useState } from 'react';
import './ReplayTimeline.css';
import { ReplayContext } from '../context';
import { getTargetZoneString, PanCycle, TargetZone } from '../types';


export function ReplayTimeline() {

    const replayDataCtx = useContext(ReplayContext);
    const panCycles = replayDataCtx?.replayData?.pan_cycles;

    const [sliderValue, setSliderValue] = useState(0);
    const [closestCycle, setClosestCycle] = useState<PanCycle | null>(null);

    const snapThreshold = 2;
    const timelineResolution = 1000;

    const handleSliderChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const inputValue = Number(event.target.value);
        setSliderValue(inputValue);
        // Check if the input value is close enough to any red dot position
        const closestValue = redDotPositions.concat(yellowDotPositions).concat(greenDotPositions).find(
            (position) => Math.abs(position.position - inputValue) <= snapThreshold
        );

        setClosestCycle(closestValue?.cycle || null);
    };

    if(!panCycles) {
        return null; // or some loading state
    }

    const redDotPositions = panCycles
        .filter((cycle) => cycle.tzi_target_zone === 0 || cycle.tzi_target_zone === 4)
        .map((cycle) => {
            const endDate = new Date(cycle.stop_timestamp);
            const startDate = new Date(panCycles[0].start_timestamp);
            const totalDuration = new Date(panCycles[panCycles.length - 1].stop_timestamp).getTime() - startDate.getTime();
            const position = ((endDate.getTime() - startDate.getTime()) / totalDuration) * timelineResolution;
            return { position, cycle };
        });

    const greenDotPositions = panCycles
        .filter((cycle) => cycle.tzi_target_zone === 2)
        .map((cycle) => {
            const endDate = new Date(cycle.stop_timestamp);
            const startDate = new Date(panCycles[0].start_timestamp);
            const totalDuration = new Date(panCycles[panCycles.length - 1].stop_timestamp).getTime() - startDate.getTime();
            const position = ((endDate.getTime() - startDate.getTime()) / totalDuration) * timelineResolution;
            return { position, cycle };
        });

    const yellowDotPositions = panCycles
        .filter((cycle) => cycle.tzi_target_zone === 1 || cycle.tzi_target_zone === 3)
        .map((cycle) => {
            const endDate = new Date(cycle.stop_timestamp);
            const startDate = new Date(panCycles[0].start_timestamp);
            const totalDuration = new Date(panCycles[panCycles.length - 1].stop_timestamp).getTime() - startDate.getTime();
            const position = ((endDate.getTime() - startDate.getTime()) / totalDuration) * timelineResolution;
            return { position, cycle };
        });


    function interpolateTimestringFromSliderValue(value: number) {
        
        if(!panCycles) {
            return ""; 
        }

        const totalDuration = getLatestTime().getTime() - getEarliestTime().getTime();
        const currentTime = new Date(getEarliestTime().getTime() + (value / timelineResolution) * totalDuration);
        return currentTime;
    }

    function getEarliestTime() {
        if(!panCycles) {
            return new Date(Date.now()); 
        }
        return panCycles[0].start_timestamp;
    }

    function getLatestTime() {
        if(!panCycles) {
            return new Date(Date.now()); 
        }
        // search through panCycles for the latest date
        const latestCycle = panCycles.reduce((latest, cycle) => {
            return cycle.stop_timestamp > latest.stop_timestamp ? cycle : latest;
        });

        return latestCycle.stop_timestamp;
    }

    return (
        <>{panCycles &&
            <div className="timeline-container">
                <span className="timeline-label">{getEarliestTime().toLocaleTimeString('en-US', {timeStyle: 'short'})}</span>
                <div className='input-wrapper'>
                    <input
                            type="range"
                            className="timeline"
                            defaultValue={0}
                            min={0}
                            max={timelineResolution}
                            step={1}
                            value={sliderValue}
                            onChange={handleSliderChange}
                    />
                </div>
                <>{
                    redDotPositions.map((position, index) => (
                        <div
                            key={index}
                            className="timeline-marker red-marker"
                            style={{ left: `${(position.position / timelineResolution) * 100}%` }}
                        ></div>
                    ))
                }
                </>
                <>{
                    greenDotPositions.map((position, index) => (
                        <div
                            key={index}
                            className="timeline-marker green-marker"
                            style={{ left: `${(position.position / timelineResolution) * 100}%` }}
                        ></div>
                    ))
                }
                </>
                <>{
                    yellowDotPositions.map((position, index) => (
                        <div
                            key={index}
                            className="timeline-marker yellow-marker"
                            style={{ left: `${(position.position / timelineResolution) * 100}%` }}
                        ></div>
                    ))
                }
                </>
                <div
                    className="slider-thumb-label"
                    style={{ left: `${(sliderValue / timelineResolution) * 100}%` }}
                >
                    {interpolateTimestringFromSliderValue(sliderValue).toLocaleString('en-US', {timeStyle: 'short'})}
                </div>
                <div
                    className="slider-thumb-label-below"
                    style={{ left: `${(sliderValue / timelineResolution) * 100}%` }}
                >
                    {getTargetZoneString((closestCycle?.tzi_target_zone as TargetZone))}
                </div>
                <span className="timeline-label">{getLatestTime().toLocaleTimeString('en-US', {timeStyle: 'short'})}</span>

            </div>
        }
        </>
    );
}