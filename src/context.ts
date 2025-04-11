import { createContext } from "react";
import { ReplayData } from "./types";

interface ReplayContextType {
    replayData: ReplayData | undefined;
    setReplayData: (data: ReplayData) => void;
}

export const ReplayContext = createContext<ReplayContextType | undefined>(undefined);