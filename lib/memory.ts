// lib/memory.ts - Client-side memory management for AI
const MEMORY_KEY_PREFIX = "aida_memory_"

export function getUserId(): string {
  // For demo, use a fixed ID or from localStorage
  return localStorage.getItem("user") ? JSON.parse(localStorage.getItem("user")!).id || "demo_user" : "demo_user"
}

export function getMemory(): string {
  const key = `${MEMORY_KEY_PREFIX}${getUserId()}`
  return localStorage.getItem(key) || "No prior memory available."
}

export function setMemory(memory: string): void {
  const key = `${MEMORY_KEY_PREFIX}${getUserId()}`
  localStorage.setItem(key, memory)
}

export function updateMemory(newData: string): void {
  const current = getMemory()
  const updated = current === "No prior memory available." ? newData : `${current}\n${newData}`
  setMemory(updated)
}
