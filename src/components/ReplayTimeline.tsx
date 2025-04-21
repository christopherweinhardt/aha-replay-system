import { useContext, useEffect, useRef, useState } from 'react';
import './ReplayTimeline.css';

import playSVG from '../assets/play-sharp.svg';
import pauseSVG from '../assets/pause-sharp.svg';   
import skipForwardSVG from '../assets/play-forward-sharp.svg';
import skipBackwardSVG from '../assets/play-back-sharp.svg';

import { ReplayContext } from '../context';
import { getTargetZoneString, Pan, PanCycle, PanEvent, PanEventType, PanLocation, PreProcessedEventData, TargetZone, Keyframe, getCookTimeForProtein } from '../types';

export function ReplayTimeline() {
    const replayDataCtx = useContext(ReplayContext);
    const panCycles = replayDataCtx?.replayData?.pan_cycles;

    if (replayDataCtx) {
        replayDataCtx.processData = processData; // Assign the processData function to the context
    }

    const [isPlaying, setIsPlaying] = useState(false);
    const [currentCycle, setCurrentCycle] = useState<PanCycle | null>(null);


    // Replay events

    // Detect events

    const find_event = (position: number) => {
        // turn position into datetime

        if (!replayDataCtx || !panCycles) return;

        const totalDuration = replayDataCtx?.endTime.getTime() - replayDataCtx?.startTime.getTime();
        const currentTime = new Date(replayDataCtx?.startTime.getTime() + (position / replayDataCtx?.timelineResolution) * totalDuration);

        if(!panCycles)
            return;


    }

    const handleEvent = (panEvent: PanEvent) => {
        if(!replayDataCtx)
            return;
        
    
        // find pan related to event
        const pan = replayDataCtx?.pans?.find(p => p.protein_pan === panEvent.pan_cycle.protein_pan);
        if (!pan) {
            console.error('Pan not found for event:', panEvent);
            return;
        }

        // move pan to new location
        switch (panEvent.event_type) {
            case 'start':
                pan.pan_location = PanLocation.Holding;
                break;
            case 'cook':
                pan.pan_location = PanLocation.Queue;
                break;
            case 'fill':
                pan.pan_location = PanLocation.Funnel;
                break;
            case 'stop':
                pan.pan_location = PanLocation.Queue;
                break;
            default:
                console.error('Unknown event type:', panEvent.event_type);
        }
    }

    const handleSliderChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const inputValue = Number(event.target.value);

        if (!replayDataCtx) return;
        replayDataCtx.setTimelinePosition(inputValue);
        replayDataCtx.timelinePosition = inputValue;
        replayDataCtx.jumpToFrame?.(inputValue);
        
        updateSliderChange(inputValue);
        if(isPlaying) {
            handlePlayPause(); // Pause the playback when the slider is changed
        }
    };

    function updateSliderChange(value: number) {
        if (!replayDataCtx)
            return;

        
        const clampedValue = Math.min(value, replayDataCtx.timelineResolution); // Clamp to max value
        replayDataCtx.setTimelinePosition(clampedValue);
        replayDataCtx.timelinePosition = clampedValue;
        
        replayDataCtx.renderEvent?.(); // Call the renderEvents function with the new value
    }
    const intervalRef = useRef<number | undefined>(undefined);
    const latestTimelinePositionRef = useRef<number>(replayDataCtx?.timelinePosition || 0);

    useEffect(() => {
        latestTimelinePositionRef.current = replayDataCtx?.timelinePosition || 0;
    }, [replayDataCtx?.timelinePosition]);

    function getEarliestTime() {
        if (!panCycles) {
            return new Date(Date.now());
        }
        const earliestTime = panCycles[0].start_timestamp;
        return new Date(earliestTime.getTime() - 5 * 60 * 1000); // Subtract 5 minutes as a buffer
    }

    function getLatestTime() {
        if (!panCycles) {
            return new Date(Date.now());
        }
        const latestCycle = panCycles.reduce((latest, cycle) => {
            return cycle.stop_timestamp > latest.stop_timestamp ? cycle : latest;
        });

        const latestTime = latestCycle.stop_timestamp;
        
        return new Date(latestTime.getTime() + 5 * 60 * 1000); // Add 5 minutes as a buffer
    }

    function processData() {
        console.log("Processing data...")
        
        if (!replayDataCtx)
            return;

        
        // set start and end times
        const startTime = getEarliestTime();
        const endTime = getLatestTime();
        replayDataCtx.startTime = startTime;
        replayDataCtx.endTime = endTime;
        
        replayDataCtx.setStartTime(startTime);
        replayDataCtx.setEndTime(endTime);
        

        const totalSeconds = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
        replayDataCtx.timelineResolution = totalSeconds
        replayDataCtx.setTimelineResolution(totalSeconds);

        // create keyframe array populated with empty keyframes with size of totalSeconds
        const keyframes: Keyframe[] = Array.from({ length: totalSeconds }, () => ({ events: [] }));
        
        // loop through pan cycles
        panCycles?.forEach((cycle) => {
            // diff between cycle start and sim start time in seconds
            const startDiff = Math.round((cycle.start_timestamp.getTime() - startTime.getTime()) / 1000);
            const endDiff = Math.round((cycle.stop_timestamp.getTime() - startTime.getTime()) / 1000);
            
            const cookDuration = getCookTimeForProtein(cycle);
            const cook_timestamp = new Date(cycle.start_timestamp.getTime() - (cookDuration + 10) * 1000);
            const cookDiff = Math.round((cook_timestamp.getTime() - startTime.getTime()) / 1000);
            
            const fill_timestamp = new Date(cycle.start_timestamp.getTime() - 10 * 1000);
            const fillDiff = Math.round((fill_timestamp.getTime() - startTime.getTime()) / 1000);

            keyframes[startDiff].events.push({
                event_type: PanEventType.Start,
                timestamp: cycle.start_timestamp,
                pan_cycle: cycle,
            });
            keyframes[endDiff].events.push({
                event_type: PanEventType.Stop,
                timestamp: cycle.stop_timestamp,
                pan_cycle: cycle,
            });
            keyframes[cookDiff].events.push({
                event_type: PanEventType.Cook,
                timestamp: cook_timestamp,
                pan_cycle: cycle,
            });
            keyframes[fillDiff].events.push({
                event_type: PanEventType.Fill,
                timestamp: fill_timestamp,
                pan_cycle: cycle,
            });

        });
        replayDataCtx.setKeyframeData({ keyframes, keyframe_count: keyframes.length });
    };

    const handlePlayPause = () => {
        const _isPlaying = !isPlaying;
        setIsPlaying(_isPlaying);
        if (!replayDataCtx) return;

        if (_isPlaying) {
            if (intervalRef.current != undefined) return;

            // if timeline position is at the end, reset to start
            if (replayDataCtx?.timelinePosition >= replayDataCtx?.timelineResolution - 1) {
                replayDataCtx.setTimelinePosition(0);
                latestTimelinePositionRef.current = 0;
            }

            intervalRef.current = window.setInterval(() => {
                const prev = latestTimelinePositionRef.current;
                if (prev >= replayDataCtx?.timelineResolution - 1) {
                    clearInterval(intervalRef.current);
                    setIsPlaying(false); // Stop playback when reaching the end
                    intervalRef.current = undefined;
                    return;
                }
                updateSliderChange(prev);
                
                const newValue = prev + 1;
                latestTimelinePositionRef.current = newValue;
                replayDataCtx.setTimelinePosition(newValue);
            }, 50 / replayDataCtx?.playbackSpeed); // Adjust the interval duration as needed
        } else {
            clearInterval(intervalRef.current); // Clear the interval when paused
            intervalRef.current = undefined;
        }
    };

    const handleSkipForward = () => {
        if (!replayDataCtx) return;
        const prevValue = replayDataCtx?.timelinePosition || 0;
        const newValue = Math.min(prevValue + 10, replayDataCtx?.timelineResolution);
        replayDataCtx.setTimelinePosition(newValue);
        replayDataCtx.timelinePosition = newValue;
        replayDataCtx.jumpToFrame?.(newValue);
        updateSliderChange(newValue);
    };

    const handleSkipBackward = () => {
        if (!replayDataCtx) return;
        const prevValue = replayDataCtx?.timelinePosition || 0;
        const newValue = Math.max(prevValue - 10, 0)
        replayDataCtx.setTimelinePosition(newValue);
        replayDataCtx.timelinePosition = newValue;
        replayDataCtx.jumpToFrame?.(newValue);
        updateSliderChange(newValue);
    };

    const redDotPositions = useRef<{position: number}[]>([]);
    const greenDotPositions = useRef<{position: number}[]>([]);
    const yellowDotPositions = useRef<{position: number}[]>([]);

    useEffect(() => {
        if (!panCycles) {
            return;
        }

        redDotPositions.current = panCycles
            .filter((cycle) => cycle.tzi_target_zone === 0 || cycle.tzi_target_zone === 4)
            .map((cycle) => {
                const endDate = new Date(cycle.stop_timestamp);
                const startDate = replayDataCtx?.startTime;
                const totalDuration = replayDataCtx?.endTime.getTime() - startDate.getTime();
                const position = ((endDate.getTime() - startDate.getTime()) / totalDuration) * replayDataCtx?.timelineResolution;
                return { position, cycle };
            });

        greenDotPositions.current = panCycles
            .filter((cycle) => cycle.tzi_target_zone === 2)
            .map((cycle) => {
                const endDate = new Date(cycle.stop_timestamp);
                const startDate = replayDataCtx?.startTime;
                const totalDuration = replayDataCtx?.endTime.getTime() - startDate.getTime();
                const position = ((endDate.getTime() - startDate.getTime()) / totalDuration) * replayDataCtx?.timelineResolution;
                return { position, cycle };
            });

        yellowDotPositions.current = panCycles
            .filter((cycle) => cycle.tzi_target_zone === 1 || cycle.tzi_target_zone === 3)
            .map((cycle) => {
                const endDate = new Date(cycle.stop_timestamp);
                const startDate = replayDataCtx?.startTime;
                const totalDuration = replayDataCtx?.endTime.getTime() - startDate.getTime();
                const position = ((endDate.getTime() - startDate.getTime()) / totalDuration) * replayDataCtx?.timelineResolution;
                return { position, cycle };
            });
    });


    function interpolateTimestringFromSliderValue(value: number) {
        if (!panCycles) {
            return "";
        }
        const totalDuration = replayDataCtx?.endTime.getTime() - replayDataCtx?.startTime.getTime();
        const currentTime = new Date(replayDataCtx?.startTime.getTime() + (value / replayDataCtx?.timelineResolution) * totalDuration);
        return currentTime;
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
                    <div className="timeline-container">
                        <span className="timeline-label">
                            {replayDataCtx?.startTime.toLocaleTimeString('en-US', { timeStyle: 'short' })}
                        </span>
                        <div className="input-wrapper">
                            <input
                                type="range"
                                className="timeline"
                                min={0}
                                max={replayDataCtx?.timelineResolution - 1}
                                step={1}
                                value={replayDataCtx?.timelinePosition}
                                onChange={handleSliderChange}
                            />
                        </div>
                        <>
                            {redDotPositions.current.map((position, index) => (
                                <div
                                    key={index}
                                    className="timeline-marker red-marker"
                                    style={{ left: `${(position.position / replayDataCtx?.timelineResolution) * 100}%` }}
                                ></div>
                            ))}
                        </>
                        <>
                            {greenDotPositions.current.map((position, index) => (
                                <div
                                    key={index}
                                    className="timeline-marker green-marker"
                                    style={{ left: `${(position.position / replayDataCtx?.timelineResolution) * 100}%` }}
                                ></div>
                            ))}
                        </>
                        <>
                            {yellowDotPositions.current.map((position, index) => (
                                <div
                                    key={index}
                                    className="timeline-marker yellow-marker"
                                    style={{ left: `${(position.position / replayDataCtx?.timelineResolution) * 100}%` }}
                                ></div>
                            ))}
                        </>
                        <div
                            className="slider-thumb-label"
                            style={{ left: `${(replayDataCtx?.timelinePosition / replayDataCtx?.timelineResolution) * 100}%` }}
                        >
                            {interpolateTimestringFromSliderValue(replayDataCtx?.timelinePosition).toLocaleString('en-US', {
                                timeStyle: 'short',
                            })}
                        </div>
                        <div
                            className="slider-thumb-label-below"
                            style={{ left: `${(replayDataCtx?.timelinePosition / replayDataCtx?.timelineResolution) * 100}%` }}
                        >
                            {getTargetZoneString(currentCycle?.tzi_target_zone as TargetZone)}
                        </div>
                        <span className="timeline-label">
                            {replayDataCtx?.endTime.toLocaleTimeString('en-US', { timeStyle: 'short' })}
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