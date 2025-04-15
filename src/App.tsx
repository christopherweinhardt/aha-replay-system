import { useCallback, useEffect, useMemo, useState } from 'react';
import './App.css'
import FileUploader from './components/FileUploader'
import NavBar from './components/NavBar'
import { ReplayContext } from './context'
import type { ReplayContextType } from './context'
import { Pan, PanLocation, PreProcessedEventData, ReplayData } from './types';
import { ReplayViewport } from './components/ReplayViewport';

function App() {

  const [replayData, setReplayData] = useState<ReplayData | undefined>(undefined);
  const [timelinePosition, setTimelinePosition] = useState<number>(0);
  const [pans, setPans] = useState<Pan[] | undefined>(undefined);
  const [keyframeData, setKeyframeData] = useState<PreProcessedEventData | undefined>(undefined);
  const [startTime, setStartTime] = useState<Date>(new Date());
  const [endTime, setEndTime] = useState<Date>(new Date());
  const [timelineResolution, setTimelineResolution] = useState<number>(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);


  const context: ReplayContextType = useMemo(() => ({
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
    startTime,
    setStartTime,
    endTime,
    setEndTime,
  }), [replayData, timelinePosition, pans, keyframeData]);


  const processData = useCallback(() => context.processData?.(), [context]);

  useEffect(() => {

    if (context.replayData) {
      
      const localPans: Pan[] = [];
      context.replayData.pan_cycles.forEach((panCycle) => {
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
          const isSpicyA = a.protein_pan.toLowerCase().includes('spicy');
          const isSpicyB = b.protein_pan.toLowerCase().includes('spicy');

          if (isSpicyA && !isSpicyB) return -1;
          if (!isSpicyA && isSpicyB) return 1;

          return a.protein_pan.localeCompare(b.protein_pan);
      });

      console.log('Pans:', localPans)
      context.pans = localPans;
      context.setPans(localPans);

      processData();
    }
  }, [context.replayData]);

  return (
    <>
      <NavBar />
      <div className="container">
        <h1>AHA Replay System</h1>

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
