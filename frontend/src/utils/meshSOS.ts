// P2P Mesh SOS Beacon — WebRTC DataChannel
// Broadcasts SOS distress signals to nearby devices without any server

import db from '../db/schema';

export interface SOSPayload {
  type: 'SOS';
  lat: number;
  lng: number;
  message: string;
  ts: number;
  sender_id: string;
}

interface PeerConnection {
  peer: RTCPeerConnection;
  channel: RTCDataChannel;
}

const openPeers: PeerConnection[] = [];
let localId = '';
let onSOSReceived: ((data: SOSPayload) => void) | null = null;

function getLocalId(): string {
  if (!localId) {
    localId = 'peer_' + Math.random().toString(36).substring(2, 10);
  }
  return localId;
}

export function setSOSCallback(callback: (data: SOSPayload) => void): void {
  onSOSReceived = callback;
}

export function broadcastSOS(lat: number, lng: number, message: string): void {
  const payload: SOSPayload = {
    type: 'SOS',
    lat,
    lng,
    message,
    ts: Date.now(),
    sender_id: getLocalId()
  };

  const data = JSON.stringify(payload);
  openPeers.forEach(p => {
    try {
      if (p.channel.readyState === 'open') {
        p.channel.send(data);
      }
    } catch {
      // Peer may have disconnected
    }
  });
}

function handleIncomingMessage(event: MessageEvent): void {
  try {
    const data = JSON.parse(event.data) as SOSPayload;
    if (data.type === 'SOS') {
      // Store in mesh log
      db.mesh_log.add({
        beacon_id: data.sender_id,
        lat: data.lat,
        lng: data.lng,
        message: data.message,
        received_at: Date.now(),
        relayed: false
      });

      if (onSOSReceived) {
        onSOSReceived(data);
      }
    }
  } catch {
    // Invalid message
  }
}

export function createPeerConnection(): RTCPeerConnection {
  const peer = new RTCPeerConnection({
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
  });

  const channel = peer.createDataChannel('sos');

  channel.onopen = () => {
    openPeers.push({ peer, channel });
  };

  channel.onmessage = handleIncomingMessage;

  channel.onclose = () => {
    const idx = openPeers.findIndex(p => p.channel === channel);
    if (idx > -1) openPeers.splice(idx, 1);
  };

  peer.ondatachannel = (event) => {
    const incomingChannel = event.channel;
    incomingChannel.onmessage = handleIncomingMessage;
    openPeers.push({ peer, channel: incomingChannel });
  };

  return peer;
}

export function getPeerCount(): number {
  return openPeers.filter(p => p.channel.readyState === 'open').length;
}

export function isMeshSupported(): boolean {
  return 'RTCPeerConnection' in window;
}
