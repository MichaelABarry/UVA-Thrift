import { useState, useEffect } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

function App() {
  const [serverStatus, setServerStatus] = useState<string>('Checking...')

  useEffect(() => {
    // Test API connection
    fetch('/api/health')
      .then(res => res.json())
      .then(data => setServerStatus(data.message))
      .catch(() => setServerStatus('Server not connected'));
  }, []);

  return (
    <>
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>UVA Thrift</h1>
      <h2>Full-stack CRUD App</h2>
      <p>Node.js + TypeScript + React + PostgreSQL + Vite</p>
      <div className="card">
        <p style={{ fontSize: '0.9em', opacity: 0.8 }}>
          Server Status: <strong>{serverStatus}</strong>
        </p>
      </div>
    </>
  )
}

export default App
