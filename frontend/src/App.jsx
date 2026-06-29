import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import heroImg from './assets/hero.png'
import './App.css'
import { Routes, Route } from 'react-router-dom'
import Start from './pages/Start'
import Home from './pages/Home'
import UserLogin from './pages/UserLogin'
import UserSignup from './pages/UserSignup'
import CaptainLogin from './pages/CaptainLogin'
import CaptainHome from './pages/captainHome'
import CaptainSignup from './pages/CaptainSignup'
import UserProtectedWrapped from './pages/userProtectedWrapped'

function App() {
  const [count, setCount] = useState(0)
  return (
    <>
    <Routes>
      <Route path="/" element={< Start/>} />
       <Route path="/login" element={< UserLogin/>} />
        <Route path="/signup" element={< UserSignup/>} />
         <Route path="/captain-login" element={< CaptainLogin/>} />
          <Route path="/captain-signup" element={< CaptainSignup/>} />
          <Route path='/home' element={
            <UserProtectedWrapped>
              <Home/>
            </UserProtectedWrapped>
          } />
          <Route path='/captain-home' element={<CaptainHome/>} />
          <Route path="*" element={<h1>404 Not Found</h1>} />
          
    </Routes>
    </>
  )
}

export default App
