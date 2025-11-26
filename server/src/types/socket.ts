import { Socket } from 'socket.io'

export interface ServerToClientEvents {
  message: (data: { message: string; timestamp: string }) => void
}

export interface ClientToServerEvents {
  message: (data: { message: string }) => void
}

export interface InterServerEvents {
  // Add inter-server events if needed
}

export interface SocketData {
  // Add socket data types if needed
}

export type TypedSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>






