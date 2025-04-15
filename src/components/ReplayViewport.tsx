import { ReplayTimeline } from "./ReplayTimeline";
import { ReplayContext } from '../context';
import { useContext } from 'react';
import ReplayCanvas from "./ReplayCanvas";
import './ReplayViewport.css';

export function ReplayViewport() {
    
    const replayData = useContext(ReplayContext);
    
    return (
        <>
            { replayData?.replayData != undefined &&
                <div className="replay-viewport">
                    <h2>TIMELINE</h2>
                    <ReplayTimeline />
                    <ReplayCanvas />
                </div>
            }
        </>
    );
}