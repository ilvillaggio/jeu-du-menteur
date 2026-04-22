import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'

const SocketContext = createContext(null)

export function SocketProvider({ children }) {
  const socketRef = useRef(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    const url = import.meta.env.VITE_SOCKET_URL || window.location.origin
    socketRef.current = io(url, {
      transports: ['websocket', 'polling'], // polling fallback for restrictive networks
      reconnectionAttempts: 5,
      timeout: 10000,
    })
    socketRef.current.on('connect', () => setConnected(true))
    socketRef.current.on('disconnect', () => setConnected(false))
    return () => socketRef.current.disconnect()
  }, [])

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, connected }}>
      {children}
    </SocketContext.Provider>
  )
}

export const useSocket = () => useContext(SocketContext)
