import { promises as fs } from "fs"
import path from "path"

const DATA_FILE = path.join(process.cwd(), "data", "user-data.json")

// Ensure data directory exists
async function ensureDataDir() {
  try {
    await fs.mkdir(path.dirname(DATA_FILE), { recursive: true })
  } catch {}
}

// Load user data
export async function loadUserData(userId: string) {
  await ensureDataDir()
  try {
    const data = await fs.readFile(DATA_FILE, "utf-8")
    const allData = JSON.parse(data)
    return allData[userId] || { profile: null, finances: [] }
  } catch {
    return { profile: null, finances: [] }
  }
}

// Save user data
export async function saveUserData(userId: string, data: any) {
  await ensureDataDir()
  try {
    const fileData = await fs.readFile(DATA_FILE, "utf-8")
    const allData = JSON.parse(fileData)
    allData[userId] = data
    await fs.writeFile(DATA_FILE, JSON.stringify(allData, null, 2))
  } catch {
    const allData = { [userId]: data }
    await fs.writeFile(DATA_FILE, JSON.stringify(allData, null, 2))
  }
}
