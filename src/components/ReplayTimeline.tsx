import { useContext, useRef, useState } from 'react';
import './ReplayTimeline.css';

import playSVG from '../assets/play-sharp.svg';
import pauseSVG from '../assets/pause-sharp.svg';   
import skipForwardSVG from '../assets/play-forward-sharp.svg';
import skipBackwardSVG from '../assets/play-back-sharp.svg';

import { ReplayContext } from '../context';
import { getTargetZoneString, PanCycle, TargetZone } from '../types';

export function ReplayTimeline() {
    const replayDataCtx = useContext(ReplayContext);
    const panCycles = replayDataCtx?.replayData?.pan_cycles;

    const [sliderValue, setSliderValue] = useState(0);
    const [closestCycle, setClosestCycle] = useState<PanCycle | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);

    const snapThreshold = 2;
    const timelineResolution = 1000;

    const handleSliderChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const inputValue = Number(event.target.value);
        updateSliderChange(inputValue);

        if(isPlaying) {
            handlePlayPause(); // Pause the playback when the slider is changed
        }
    };

    function updateSliderChange(value: number) {
        setSliderValue(value);
        const closestValue = redDotPositions.concat(yellowDotPositions).concat(greenDotPositions).find(
            (position) => Math.abs(position.position - value) <= snapThreshold
        );
        setClosestCycle(closestValue?.cycle || null);
    }

    const intervalRef = useRef<number | undefined>(undefined);
    const handlePlayPause = () => {
        const _isPlaying = !isPlaying;
        setIsPlaying(_isPlaying);
        if (_isPlaying) {
            console.log("PLAY");
            intervalRef.current = window.setInterval(() => {
                setSliderValue((prev) => {
                    const newValue = prev + 1;
                    updateSliderChange(newValue);
                    if (newValue >= timelineResolution) {
                        clearInterval(intervalRef.current);
                        return timelineResolution;
                    }
                    return newValue;
                });
            }, 250); // Adjust the interval duration as needed
            console.log(intervalRef.current);
        } else {
            console.log("PAUSE");
            clearInterval(intervalRef.current); // Clear the interval when paused
        }
    };

    const handleSkipForward = () => {
        setSliderValue((prev) => Math.min(prev + 10, timelineResolution));
    };

    const handleSkipBackward = () => {
        setSliderValue((prev) => Math.max(prev - 10, 0));
    };

    if (!panCycles) {
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
        if (!panCycles) {
            return "";
        }
        const totalDuration = getLatestTime().getTime() - getEarliestTime().getTime();
        const currentTime = new Date(getEarliestTime().getTime() + (value / timelineResolution) * totalDuration);
        return currentTime;
    }

    function getEarliestTime() {
        if (!panCycles) {
            return new Date(Date.now());
        }
        return panCycles[0].start_timestamp;
    }

    function getLatestTime() {
        if (!panCycles) {
            return new Date(Date.now());
        }
        const latestCycle = panCycles.reduce((latest, cycle) => {
            return cycle.stop_timestamp > latest.stop_timestamp ? cycle : latest;
        });
        return latestCycle.stop_timestamp;
    }

    function getDurationString(cycle: PanCycle | null) {
        if (!cycle) {
            return "";
        }
        const duration = cycle.duration;
        const minutes = Math.floor((duration % 3600) / 60);
        const seconds = duration % 60;
        return `${minutes} minutes and ${seconds} seconds`;
    }

    return (
        <>
            {panCycles && (
                <>
                    <div className="timeline-header">
                        <h2>Replay Timeline</h2>
                        <span className="cycle-info">Protein Name: {closestCycle?.protein_name} </span>
                        <br />
                        <span className="cycle-info">Duration: {getDurationString(closestCycle)}</span>
                        <br />
                        <span className="cycle-info">Breader ID: {closestCycle?.breader_id} </span>
                    </div>
                    <div className="timeline-container">
                        <span className="timeline-label">
                            {getEarliestTime().toLocaleTimeString('en-US', { timeStyle: 'short' })}
                        </span>
                        <div className="input-wrapper">
                            <input
                                type="range"
                                className="timeline"
                                min={0}
                                max={timelineResolution}
                                step={1}
                                value={sliderValue}
                                onChange={handleSliderChange}
                            />
                        </div>
                        <>
                            {redDotPositions.map((position, index) => (
                                <div
                                    key={index}
                                    className="timeline-marker red-marker"
                                    style={{ left: `${(position.position / timelineResolution) * 100}%` }}
                                ></div>
                            ))}
                        </>
                        <>
                            {greenDotPositions.map((position, index) => (
                                <div
                                    key={index}
                                    className="timeline-marker green-marker"
                                    style={{ left: `${(position.position / timelineResolution) * 100}%` }}
                                ></div>
                            ))}
                        </>
                        <>
                            {yellowDotPositions.map((position, index) => (
                                <div
                                    key={index}
                                    className="timeline-marker yellow-marker"
                                    style={{ left: `${(position.position / timelineResolution) * 100}%` }}
                                ></div>
                            ))}
                        </>
                        <div
                            className="slider-thumb-label"
                            style={{ left: `${(sliderValue / timelineResolution) * 100}%` }}
                        >
                            {interpolateTimestringFromSliderValue(sliderValue).toLocaleString('en-US', {
                                timeStyle: 'short',
                            })}
                        </div>
                        <div
                            className="slider-thumb-label-below"
                            style={{ left: `${(sliderValue / timelineResolution) * 100}%` }}
                        >
                            {getTargetZoneString(closestCycle?.tzi_target_zone as TargetZone)}
                        </div>
                        <span className="timeline-label">
                            {getLatestTime().toLocaleTimeString('en-US', { timeStyle: 'short' })}
                        </span>
                    </div>
                    <div className="timeline-controls">
                        <a onClick={handleSkipBackward}><img src={skipBackwardSVG} className='media-control-icon'/></a>
                        <a onClick={handlePlayPause}><img src={isPlaying ? pauseSVG : playSVG} className='media-control-icon'/></a>
                        <a onClick={handleSkipForward}><img src={skipForwardSVG} className='media-control-icon'/></a>
                    </div>
                </>
            )}
        </>
    );
}