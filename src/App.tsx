import { useState } from 'react';
import './App.css'
import FileUploader from './components/FileUploader'
import NavBar from './components/NavBar'
import { ReplayContext } from './context'
import { ReplayData } from './types';
import { ReplayViewport } from './components/ReplayViewport';

function App() {

  const [replayData, setReplayData] = useState<ReplayData | undefined>(undefined);

  return (
    <>
      <NavBar />
      <div className="container">
        <h1>AHA Replay System</h1>

        <h2>UPLOAD .CSV FILE</h2>
        <ReplayContext.Provider value={{ replayData, setReplayData }}>
          <FileUploader />
          <ReplayViewport />
        </ReplayContext.Provider>
      </div>
    </>
  )
}

export default App
