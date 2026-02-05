import Dexie, { type EntityTable } from 'dexie';

// Face record interface
export interface FaceRecord {
  id?: number;
  name: string;
  descriptor: Float32Array;
  createdAt: Date;
}

// Database class extending Dexie
class NeuroMemoryDatabase extends Dexie {
  faces!: EntityTable<FaceRecord, 'id'>;

  constructor() {
    super('NeuroMemory');
    
    this.version(1).stores({
      faces: '++id, name, descriptor, createdAt'
    });
  }
}

// Singleton database instance
export const db = new NeuroMemoryDatabase();

// Helper functions for face operations
export const faceDB = {
  // Add a new face to the database
  async addFace(name: string, descriptor: Float32Array): Promise<number> {
    return await db.faces.add({
      name,
      descriptor,
      createdAt: new Date()
    });
  },

  // Get all stored faces
  async getAllFaces(): Promise<FaceRecord[]> {
    return await db.faces.toArray();
  },

  // Delete a face by ID
  async deleteFace(id: number): Promise<void> {
    await db.faces.delete(id);
  },

  // Update a face name
  async updateFaceName(id: number, name: string): Promise<void> {
    await db.faces.update(id, { name });
  },

  // Clear all faces
  async clearAllFaces(): Promise<void> {
    await db.faces.clear();
  },

  // Get face count
  async getFaceCount(): Promise<number> {
    return await db.faces.count();
  }
};
