import { createContext } from "react";
import { Pan, PreProcessedEventData, ReplayData } from "./types";

interface ReplayContextType {
    replayData: ReplayData | undefined;
    setReplayData: (data: ReplayData) => void;
    timelinePosition: number;
    setTimelinePosition: (value: number) => void;
    pans: Pan[] | undefined;
    setPans: (pans: Pan[]) => void;
    keyframeData: PreProcessedEventData | undefined;
    setKeyframeData: (keyframeData: PreProcessedEventData) => void;

    // constants
    timelineResolution: number;
    setTimelineResolution: (value: number) => void;
    playbackSpeed: number;
    setPlaybackSpeed: (value: number) => void;
    spicyLeftSide: boolean;
    setSpicyLeftSide: (value: boolean) => void;
    useBreadingQueue: boolean;
    setUseBreadingQueue: (value: boolean) => void;

    // variables
    startTime: Date;
    setStartTime: (value: Date) => void;
    endTime: Date;
    setEndTime: (value: Date) => void;

    initVirtualPans?: () => void;
    renderEvent?: () => void;
    processData?: () => void;
    jumpToFrame?: (frame: number) => void;
}
export const ReplayContext = createContext<ReplayContextType | undefined>(undefined);
export type { ReplayContextType };