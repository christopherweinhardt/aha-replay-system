import { useCallback, useEffect, useMemo, useState } from 'react';
import './App.css'

import remove from './assets/remove-sharp.svg'
import checkmark from './assets/checkmark-sharp.svg'

import FileUploader from './components/FileUploader'
import NavBar from './components/NavBar'
import { ReplayContext } from './context'
import type { ReplayContextType } from './context'
import { Pan, PanLocation, PreProcessedEventData, ReplayData } from './types';
import { ReplayViewport } from './components/ReplayViewport';

const getLocalStorageValue = (key: string, defaultValue: boolean) => {
    // Get from local storage by key
    const saved = localStorage.getItem(key);
    if (saved) {
        return JSON.parse(saved);
    }
    // If not in local storage, return default value
    return defaultValue;
}

function App() {

    const [replayData, setReplayData] = useState<ReplayData | undefined>(undefined);
    const [timelinePosition, setTimelinePosition] = useState<number>(0);
    const [pans, setPans] = useState<Pan[] | undefined>(undefined);
    const [keyframeData, setKeyframeData] = useState<PreProcessedEventData | undefined>(undefined);
    const [startTime, setStartTime] = useState<Date>(new Date());
    const [endTime, setEndTime] = useState<Date>(new Date());
    const [timelineResolution, setTimelineResolution] = useState<number>(0);
    const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
    const [spicyLeftSide, setSpicyLeftSide] = useState<boolean>(getLocalStorageValue('spicyLeftSide', false));
    const [useBreadingQueue, setUseBreadingQueue] = useState<boolean>(getLocalStorageValue('useBreadingQueue', false));

    const context: ReplayContextType = useMemo(() => {
        return {
            replayData,
            setReplayData,
            timelinePosition,
            setTimelinePosition,
            pans,
            setPans,
            keyframeData,
            setKeyframeData,
            timelineResolution,
            setTimelineResolution,
            playbackSpeed,
            setPlaybackSpeed,
            spicyLeftSide,
            setSpicyLeftSide,
            useBreadingQueue,
            setUseBreadingQueue,
            startTime,
            setStartTime,
            endTime,
            setEndTime,
        };
    }, [replayData, timelinePosition, pans, keyframeData, timelineResolution, playbackSpeed, spicyLeftSide, useBreadingQueue, startTime, endTime]);

    const createPans = useCallback(() => {
        if (replayData) {
            const localPans: Pan[] = [];
            replayData.pan_cycles.forEach((panCycle) => {
                const pan: Pan = {
                    protein_name: panCycle.protein_name,
                    protein_pan: panCycle.protein_pan,
                    expire_date: new Date(panCycle.start_timestamp.getTime() + 20 * 60 * 1000),
                    pan_location: PanLocation.Queue,
                };

                // Add the pan to the pans array if it doesn't already exist
                if (!localPans.some(existingPan => existingPan.protein_pan === pan.protein_pan)) {
                    localPans.push(pan);
                }
            });

            // Sort Pans alphabetically by protein_pan, spicy first
            localPans.sort((a, b) => {
                if (spicyLeftSide) {
                    const isSpicyA = a.protein_pan.toLowerCase().includes('spicy');
                    const isSpicyB = b.protein_pan.toLowerCase().includes('spicy');

                    if (isSpicyA && !isSpicyB) return -1;
                    if (!isSpicyA && isSpicyB) return 1;
                }

                return a.protein_pan.localeCompare(b.protein_pan);
            });

            console.log('Pans:', localPans);
            setPans(localPans);
        } 
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [replayData, spicyLeftSide, useBreadingQueue]);

    useEffect(() => {
        createPans();
    }, [replayData, createPans]);

    
    const processData = useCallback(() => context.processData?.(), [context]);

    useEffect(() => {
        processData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pans]);

    const [showRipple, setShowRipple] = useState<string | null>(null);

    function toggleSpicyLeftSide() {
        setSpicyLeftSide(prev => !prev);
    }

    function toggleUseBreadingQueue() {
        setUseBreadingQueue(prev => !prev);
    }

    useEffect(() => {
        // Save the state to localStorage whenever it changes
        localStorage.setItem('spicyLeftSide', JSON.stringify(spicyLeftSide));
        localStorage.setItem('useBreadingQueue', JSON.stringify(useBreadingQueue));
    }, [spicyLeftSide, useBreadingQueue]);

    return (
        <>
            <NavBar />
            <div className="container">
                <h1>AHA Replay System</h1>

                <div className="input-container">
                    <div 
                        className={`toggle-container ${spicyLeftSide ? 'enabled' : ''}`} 
                        onClick={toggleSpicyLeftSide} 
                        onMouseEnter={() => setShowRipple('spicyLeftSide')} 
                        onMouseLeave={() => setShowRipple(null)}
                    >
                        <div className="toggle-circle">
                            <img src={spicyLeftSide ? checkmark : remove} className="checkmark-icon" />
                            {showRipple === 'spicyLeftSide' && <div className="ripple-circle" />}
                        </div>
                    </div>
                    <span className="toggle-label">Left-side Spicy Machines</span>
                </div>
                <div className="input-container">
                    <div 
                        className={`toggle-container ${useBreadingQueue ? 'enabled' : ''}`} 
                        onClick={toggleUseBreadingQueue} 
                        onMouseEnter={() => setShowRipple('useBreadingQueue')} 
                        onMouseLeave={() => setShowRipple(null)}
                    >
                        <div className="toggle-circle">
                            <img src={useBreadingQueue ? checkmark : remove} className="checkmark-icon" />
                            {showRipple === 'useBreadingQueue' && <div className="ripple-circle" />}
                        </div>
                    </div>
                    <span className="toggle-label">Use Breading Queue</span>
                </div>
                

                <h2>UPLOAD .CSV FILE</h2>
                <ReplayContext.Provider value={context}>
                    <FileUploader />
                    <ReplayViewport />
                </ReplayContext.Provider>
            </div>
        </>
    )
}

export default App
