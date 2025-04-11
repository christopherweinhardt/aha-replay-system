import './App.css'
import FileUploader from './components/FileUploader'
import NavBar from './components/NavBar'

function App() {

  return (
    <>
      <NavBar />
      <div className="container">
        <h1>AHA Replay System</h1>

        <h2>UPLOAD .CSV FILE</h2>
        <FileUploader />
      </div>
    </>
  )
}

export default App
