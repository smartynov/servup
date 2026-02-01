import { openDB, type IDBPDatabase } from 'idb'
import type { Configuration, Skill } from '@/types'

const DB_NAME = 'servup'
const DB_VERSION = 1

interface ServUpDB {
  configurations: {
    key: string
    value: Configuration
  }
  skills: {
    key: string
    value: Skill
  }
}

let dbPromise: Promise<IDBPDatabase<ServUpDB>> | null = null

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<ServUpDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('configurations')) {
          db.createObjectStore('configurations', { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains('skills')) {
          db.createObjectStore('skills', { keyPath: 'id' })
        }
      },
    })
  }
  return dbPromise
}

export async function loadConfigurations(): Promise<Configuration[]> {
  const db = await getDB()
  return db.getAll('configurations')
}

export async function saveConfiguration(config: Configuration): Promise<void> {
  const db = await getDB()
  await db.put('configurations', config)
}

export async function deleteConfiguration(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('configurations', id)
}

export async function saveAllConfigurations(configs: Configuration[]): Promise<void> {
  const db = await getDB()
  const tx = db.transaction('configurations', 'readwrite')
  await Promise.all([
    tx.store.clear(),
    ...configs.map(c => tx.store.put(c)),
    tx.done,
  ])
}

export async function loadImportedSkills(): Promise<Skill[]> {
  const db = await getDB()
  return db.getAll('skills')
}

export async function saveImportedSkill(skill: Skill): Promise<void> {
  const db = await getDB()
  await db.put('skills', skill)
}

export async function deleteImportedSkill(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('skills', id)
}
