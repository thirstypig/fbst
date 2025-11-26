import { useEffect, useState } from 'react'
import { io, Socket } from 'socket.io-client'

function Home() {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    const newSocket = io('http://localhost:5000')
    
    newSocket.on('connect', () => {
      setConnected(true)
      console.log('Connected to server')
    })

    newSocket.on('disconnect', () => {
      setConnected(false)
      console.log('Disconnected from server')
    })

    setSocket(newSocket)

    return () => {
      newSocket.close()
    }
  }, [])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-4xl font-bold mb-4 text-gray-900 dark:text-white">
        FBST
      </h1>
      <p className="text-lg mb-8 text-gray-600 dark:text-gray-400">
        Full-Stack Application
      </p>
      <div className="flex items-center gap-2">
        <div
          className={`w-3 h-3 rounded-full ${
            connected ? 'bg-green-500' : 'bg-red-500'
          }`}
        />
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {connected ? 'Connected' : 'Disconnected'}
        </span>
      </div>
    </div>
  )
}

export default Home






