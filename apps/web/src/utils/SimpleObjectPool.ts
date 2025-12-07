/**
 * Simple Object Pool - Simplified Three.js object pooling for performance
 *
 * Provides basic object pooling without complex type constraints
 * Focuses on performance gains over type safety
 */

import * as THREE from 'three';

// Pool configuration
interface PoolConfig {
  initialSize: number;
  maxSize: number;
  autoExpand: boolean;
}

// Default pool configuration
const DEFAULT_CONFIG: PoolConfig = {
  initialSize: 50,
  maxSize: 500,
  autoExpand: true,
};

/**
 * Simple object pool for Three.js objects
 */
class SimpleObjectPool {
  private pool: unknown[] = [];
  private inUse: Set<unknown> = new Set();
  private config: PoolConfig;
  private stats: { created: number; reused: number } = { created: 0, reused: 0 };

  constructor(
    private createFn: () => unknown,
    private resetFn: (obj: unknown) => void,
    config: Partial<PoolConfig> = {}
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Pre-populate pool
    for (let i = 0; i < this.config.initialSize; i++) {
      const obj = this.createFn();
      if (obj && typeof obj === 'object' && 'visible' in obj) {
        obj.visible = false;
      }
      this.pool.push(obj);
    }
  }

  acquire(): unknown {
    let obj: unknown;

    if (this.pool.length > 0) {
      obj = this.pool.pop() as unknown;
      this.stats.reused++;
    } else if (this.config.autoExpand) {
      obj = this.createFn();
      this.stats.created++;
    } else {
      throw new Error('Object pool exhausted and auto-expand is disabled');
    }

    if (obj && typeof obj === 'object' && 'visible' in obj) {
      (obj as Record<string, unknown>).visible = true;
    }
    this.inUse.add(obj);
    return obj;
  }

  release(obj: unknown): void {
    if (!this.inUse.has(obj)) {
      return; // Already released or not from this pool
    }

    this.inUse.delete(obj);

    // Reset object state
    if (this.resetFn) {
      this.resetFn(obj);
    } else {
      if (obj && typeof obj === 'object') {
        if ('visible' in obj) {
          obj.visible = false;
        }
        if (obj instanceof THREE.Mesh) {
          obj.position.set(0, 0, 0);
          obj.rotation.set(0, 0, 0);
          obj.scale.set(1, 1, 1);
        }
      }
    }

    // Return to pool if not at max capacity
    if (this.pool.length < this.config.maxSize) {
      this.pool.push(obj);
    } else {
      // Dispose of object if pool is full
      this.disposeObject(obj);
    }
  }

  private disposeObject(obj: THREE.Object3D | THREE.Material | THREE.BufferGeometry): void {
    if (obj instanceof THREE.Mesh) {
      obj.geometry?.dispose();
      if (Array.isArray(obj.material)) {
        obj.material.forEach(mat => mat.dispose());
      } else if (obj.material) {
        obj.material.dispose();
      }
    } else if (obj instanceof THREE.Material) {
      obj.dispose();
    } else if (obj instanceof THREE.BufferGeometry) {
      obj.dispose();
    }
  }

  getStats() {
    return {
      ...this.stats,
      poolSize: this.pool.length,
      inUse: this.inUse.size,
    };
  }

  clear(): void {
    // Dispose all objects
    [...this.pool, ...this.inUse].forEach(obj => this.disposeObject(obj));
    this.pool = [];
    this.inUse.clear();
    this.stats = { created: 0, reused: 0 };
  }
}

/**
 * Manager for multiple object pools
 */
export class SimpleThreeObjectPool {
  private pools: Map<string, SimpleObjectPool> = new Map();

  // Get sphere geometry
  getSphereGeometry(segments: number = 16): THREE.SphereGeometry {
    const key = `sphere_${segments}`;
    let pool = this.pools.get(key);

    if (!pool) {
      pool = new SimpleObjectPool(
        () => new THREE.SphereGeometry(1, segments, segments),
        () => {}, // No reset needed for geometry
        { initialSize: 20, maxSize: 100 }
      );
      this.pools.set(key, pool);
    }

    return pool.acquire();
  }

  releaseSphereGeometry(geometry: THREE.SphereGeometry, segments: number = 16): void {
    const key = `sphere_${segments}`;
    const pool = this.pools.get(key);
    if (pool) {
      pool.release(geometry);
    } else {
      geometry.dispose();
    }
  }

  // Get material
  getMaterial(color: number = 0x4287F5): THREE.MeshStandardMaterial {
    const key = `material_${color.toString(16)}`;
    let pool = this.pools.get(key);

    if (!pool) {
      pool = new SimpleObjectPool(
        () => new THREE.MeshStandardMaterial({ color }),
        (mat) => {
          mat.color.setHex(color);
          mat.emissive.setHex(0x000000);
          mat.roughness = 0.5;
          mat.metalness = 0.5;
          mat.opacity = 1;
          mat.transparent = false;
        },
        { initialSize: 30, maxSize: 200 }
      );
      this.pools.set(key, pool);
    }

    return pool.acquire();
  }

  releaseMaterial(material: THREE.MeshStandardMaterial, color: number): void {
    const key = `material_${color.toString(16)}`;
    const pool = this.pools.get(key);
    if (pool) {
      pool.release(material);
    } else {
      material.dispose();
    }
  }

  // Get mesh (sphere + material)
  getNodeMesh(radius: number = 1, color: number = 0x4287F5, segments: number = 16): THREE.Mesh {
    const key = `mesh_${radius}_${color.toString(16)}_${segments}`;
    let pool = this.pools.get(key);

    if (!pool) {
      pool = new SimpleObjectPool(
        () => {
          const geometry = new THREE.SphereGeometry(radius, segments, segments);
          const material = new THREE.MeshStandardMaterial({ color });
          return new THREE.Mesh(geometry, material);
        },
        (mesh) => {
          mesh.position.set(0, 0, 0);
          mesh.rotation.set(0, 0, 0);
          mesh.scale.set(1, 1, 1);
          mesh.visible = true;
          if (mesh.material instanceof THREE.MeshStandardMaterial) {
            mesh.material.color.setHex(color);
            mesh.material.emissive.setHex(0x000000);
          }
        },
        { initialSize: 100, maxSize: 1000 }
      );
      this.pools.set(key, pool);
    }

    return pool.acquire();
  }

  releaseNodeMesh(mesh: THREE.Mesh, radius: number, color: number, segments: number): void {
    const key = `mesh_${radius}_${color.toString(16)}_${segments}`;
    const pool = this.pools.get(key);
    if (pool) {
      pool.release(mesh);
    } else {
      // Dispose manually
      mesh.geometry?.dispose();
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach(mat => mat.dispose());
      } else if (mesh.material) {
        mesh.material.dispose();
      }
    }
  }

  // Get statistics for all pools
  getAllStats(): Record<string, { created: number; reused: number; poolSize: number; inUse: number }> {
    const stats: Record<string, { created: number; reused: number; poolSize: number; inUse: number }> = {};
    this.pools.forEach((pool, key) => {
      stats[key] = pool.getStats();
    });
    return stats;
  }

  // Clear all pools
  clearAll(): void {
    this.pools.forEach(pool => pool.clear());
    this.pools.clear();
  }

  // Estimate memory usage (rough approximation)
  estimateMemoryUsage(): number {
    let totalObjects = 0;
    this.pools.forEach(pool => {
      const stats = pool.getStats();
      totalObjects += stats.poolSize + stats.inUse;
    });
    return totalObjects * 1024; // Rough estimate: 1KB per object
  }
}

// Global instance
export const globalSimpleObjectPool = new SimpleThreeObjectPool();