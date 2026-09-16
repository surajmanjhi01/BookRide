import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import  {BrowserRouter} from 'react-router-dom'
import UserContext from './context/userContext.jsx'
import CaptainContext from './context/CaptainContext.jsx'
import "maplibre-gl/dist/maplibre-gl.css";
import { Toaster } from "react-hot-toast";

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.error('Service worker registration failed:', error)
    })
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <CaptainContext>
      <UserContext>
        <BrowserRouter>
          <App />
          <Toaster position="top-center" toastOptions={{ duration: 3500 }} />
        </BrowserRouter>
      </UserContext>
    </CaptainContext>
  </StrictMode>,
)
