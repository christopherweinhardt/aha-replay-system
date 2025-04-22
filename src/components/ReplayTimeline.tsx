import { useContext, useEffect, useRef, useState } from 'react';
import './ReplayTimeline.css';

import playSVG from '../assets/play-sharp.svg';
import pauseSVG from '../assets/pause-sharp.svg';   
import skipForwardSVG from '../assets/play-forward-sharp.svg';
import skipBackwardSVG from '../assets/play-back-sharp.svg';

import { ReplayContext } from '../context';
import { PanEventType, Keyframe, getCookTimeForProtein } from '../types';

export function ReplayTimeline() {
    const context = useContext(ReplayContext);
    const redDotPositions = useRef<{position: number}[]>([]);
    const greenDotPositions = useRef<{position: number}[]>([]);
    const yellowDotPositions = useRef<{position: number}[]>([]);

    if (context) {
        context.processData = processData; // Assign the processData function to the context
    }

    const [isPlaying, setIsPlaying] = useState(false);

    const handleSliderChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const inputValue = Number(event.target.value);

        if (!context) return;
        context.setTimelinePosition(inputValue);
        context.timelinePosition = inputValue;
        context.jumpToFrame?.(inputValue);
        
        updateSliderChange(inputValue);
        if(isPlaying) {
            handlePlayPause(); // Pause the playback when the slider is changed
        }
    };

    function updateSliderChange(value: number) {
        if (!context)
            return;

        
        const clampedValue = Math.min(value, context.timelineResolution); // Clamp to max value
        context.setTimelinePosition(clampedValue);
        context.timelinePosition = clampedValue;
        
        context.renderEvent?.(); // Call the renderEvents function with the new value
    }
    const intervalRef = useRef<number | undefined>(undefined);
    const latestTimelinePositionRef = useRef<number>(context?.timelinePosition || 0);

    useEffect(() => {
        latestTimelinePositionRef.current = context?.timelinePosition || 0;
    }, [context?.timelinePosition]);

    function getEarliestTime() {
        if (!context?.replayData?.pan_cycles) {
            return new Date(Date.now());
        }
        const earliestTime = context?.replayData?.pan_cycles[0].start_timestamp;
        return new Date(earliestTime.getTime() - 5 * 60 * 1000); // Subtract 5 minutes as a buffer
    }

    function getLatestTime() {
        if (!context?.replayData?.pan_cycles) {
            return new Date(Date.now());
        }
        const latestCycle = context?.replayData?.pan_cycles.reduce((latest, cycle) => {
            return cycle.stop_timestamp > latest.stop_timestamp ? cycle : latest;
        });

        const latestTime = latestCycle.stop_timestamp;
        
        return new Date(latestTime.getTime() + 5 * 60 * 1000); // Add 5 minutes as a buffer
    }

    function processData() {
        console.log("Processing data...")
        
        if (!context)
            return;

        
        // set start and end times
        const startTime = getEarliestTime();
        const endTime = getLatestTime();
        context.startTime = startTime;
        context.endTime = endTime;
        
        context.setStartTime(startTime);
        context.setEndTime(endTime);
        

        const totalSeconds = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
        context.timelineResolution = totalSeconds
        context.setTimelineResolution(totalSeconds);

        // create keyframe array populated with empty keyframes with size of totalSeconds
        const keyframes: Keyframe[] = Array.from({ length: totalSeconds }, () => ({ events: [] }));
        
        // loop through pan cycles
        context?.replayData?.pan_cycles?.forEach((cycle) => {
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
        context.setKeyframeData({ keyframes, keyframe_count: keyframes.length });
        context.keyframeData = { keyframes, keyframe_count: keyframes.length };

        context.initVirtualPans?.(); // Call the initVirtualPans function to initialize the pans

        if(!context?.replayData?.pan_cycles)
            return;

        // load marker positions
        redDotPositions.current = context?.replayData?.pan_cycles
            .filter((cycle) => cycle.tzi_target_zone === 0 || cycle.tzi_target_zone === 4)
            .map((cycle) => {
                const endDate = new Date(cycle.stop_timestamp);
                const startDate = context?.startTime;
                const totalDuration = context?.endTime.getTime() - startDate.getTime();
                const position = ((endDate.getTime() - startDate.getTime()) / totalDuration) * context?.timelineResolution;
                return { position, cycle };
            });

        greenDotPositions.current = context?.replayData?.pan_cycles
            .filter((cycle) => cycle.tzi_target_zone === 2)
            .map((cycle) => {
                const endDate = new Date(cycle.stop_timestamp);
                const startDate = context?.startTime;
                const totalDuration = context?.endTime.getTime() - startDate.getTime();
                const position = ((endDate.getTime() - startDate.getTime()) / totalDuration) * context?.timelineResolution;
                return { position, cycle };
            });

        yellowDotPositions.current = context?.replayData?.pan_cycles
            .filter((cycle) => cycle.tzi_target_zone === 1 || cycle.tzi_target_zone === 3)
            .map((cycle) => {
                const endDate = new Date(cycle.stop_timestamp);
                const startDate = context?.startTime;
                const totalDuration = context?.endTime.getTime() - startDate.getTime();
                const position = ((endDate.getTime() - startDate.getTime()) / totalDuration) * context?.timelineResolution;
                return { position, cycle };
            });

        console.log("Finished processing data.");

        updateSliderChange(0); // Update the slider to the start position
    };

    const handlePlayPause = () => {
        const _isPlaying = !isPlaying;
        setIsPlaying(_isPlaying);
        if (!context) return;

        if (_isPlaying) {
            if (intervalRef.current != undefined) return;

            // if timeline position is at the end, reset to start
            if (context?.timelinePosition >= context?.timelineResolution - 1) {
                context.setTimelinePosition(0);
                latestTimelinePositionRef.current = 0;
            }

            intervalRef.current = window.setInterval(() => {
                const prev = latestTimelinePositionRef.current;
                if (prev >= context?.timelineResolution - 1) {
                    clearInterval(intervalRef.current);
                    setIsPlaying(false); // Stop playback when reaching the end
                    intervalRef.current = undefined;
                    return;
                }
                updateSliderChange(prev);
                
                const newValue = prev + 1;
                latestTimelinePositionRef.current = newValue;
                context.setTimelinePosition(newValue);
            }, 50 / context?.playbackSpeed); // Adjust the interval duration as needed
        } else {
            clearInterval(intervalRef.current); // Clear the interval when paused
            intervalRef.current = undefined;
        }
    };

    const handleSkipForward = () => {
        if (!context) return;
        const prevValue = context?.timelinePosition || 0;
        const newValue = Math.min(prevValue + 15, context?.timelineResolution);
        context.setTimelinePosition(newValue);
        context.timelinePosition = newValue;
        context.jumpToFrame?.(newValue);
        updateSliderChange(newValue);
    };

    const handleSkipBackward = () => {
        if (!context) return;
        const prevValue = context?.timelinePosition || 0;
        const newValue = Math.max(prevValue - 15, 0)
        context.setTimelinePosition(newValue);
        context.timelinePosition = newValue;
        context.jumpToFrame?.(newValue);
        updateSliderChange(newValue);
    };

    function interpolateTimestringFromSliderValue(value: number) {
        if (!context?.replayData?.pan_cycles) {
            return "";
        }
        const totalDuration = context?.endTime.getTime() - context?.startTime.getTime();
        const currentTime = new Date(context?.startTime.getTime() + (value / context?.timelineResolution) * totalDuration);
        return currentTime;
    }

    return (
        <>
            {context?.replayData?.pan_cycles && (
                <>
                    <div className="timeline-container">
                        <span className="timeline-label">
                            {context?.startTime.toLocaleTimeString('en-US', { timeStyle: 'short' })}
                        </span>
                        <div className="input-wrapper">
                            <input
                                type="range"
                                className="timeline"
                                min={0}
                                max={context?.timelineResolution - 1}
                                step={1}
                                value={context?.timelinePosition}
                                onChange={handleSliderChange}
                            />
                        </div>
                        <>
                            {redDotPositions.current.map((position, index) => (
                                <div
                                    key={index}
                                    className="timeline-marker red-marker"
                                    style={{ left: `${(position.position / context?.timelineResolution) * 100}%` }}
                                ></div>
                            ))}
                        </>
                        <>
                            {greenDotPositions.current.map((position, index) => (
                                <div
                                    key={index}
                                    className="timeline-marker green-marker"
                                    style={{ left: `${(position.position / context?.timelineResolution) * 100}%` }}
                                ></div>
                            ))}
                        </>
                        <>
                            {yellowDotPositions.current.map((position, index) => (
                                <div
                                    key={index}
                                    className="timeline-marker yellow-marker"
                                    style={{ left: `${(position.position / context?.timelineResolution) * 100}%` }}
                                ></div>
                            ))}
                        </>
                        <div
                            className="slider-thumb-label"
                            style={{ left: `${(context?.timelinePosition / context?.timelineResolution) * 100}%` }}
                        >
                            {interpolateTimestringFromSliderValue(context?.timelinePosition).toLocaleString('en-US', {
                                timeStyle: 'short',
                            })}
                        </div>
                        <span className="timeline-label">
                            {context?.endTime.toLocaleTimeString('en-US', { timeStyle: 'short' })}
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