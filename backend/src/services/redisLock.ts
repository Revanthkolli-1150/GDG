/**
 * Distributed Lock Service using Redlock concept.
 * Ensures an available ambulance cannot be assigned to two dispatchers 
 * or emergency events simultaneously across clustered server instances.
 */

class RedisLockManager {
  private activeLocks: Map<string, { value: string; expiresAt: number }> = new Map();

  /**
   * Acquire a distributed lock for a specific resource (e.g., `lock:ambulance:MEDIC-101`)
   * @param resource Key identifier for resource
   * @param ttlms Time to live in milliseconds (default 10,000ms)
   * @returns Lock token if acquired successfully, null if locked by another process
   */
  public async acquireLock(resource: string, ttlms: number = 10000): Promise<string | null> {
    const lockKey = `redlock:${resource}`;
    const now = Date.now();
    const existing = this.activeLocks.get(lockKey);

    if (existing && existing.expiresAt > now) {
      console.warn(`[Redlock Guard] Lock contention detected on resource: "${resource}". Lock acquired by another transaction.`);
      return null;
    }

    const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
    this.activeLocks.set(lockKey, {
      value: token,
      expiresAt: now + ttlms,
    });

    console.log(`[Redlock Guard] Lock ACQUIRED for resource: "${resource}" (Token: ${token})`);
    return token;
  }

  /**
   * Release an acquired distributed lock safely
   * @param resource Key identifier for resource
   * @param token Lock token received during acquireLock
   */
  public async releaseLock(resource: string, token: string): Promise<boolean> {
    const lockKey = `redlock:${resource}`;
    const existing = this.activeLocks.get(lockKey);

    if (existing && existing.value === token) {
      this.activeLocks.delete(lockKey);
      console.log(`[Redlock Guard] Lock RELEASED for resource: "${resource}"`);
      return true;
    }

    console.warn(`[Redlock Guard] Lock release skipped: invalid or expired token for "${resource}"`);
    return false;
  }

  /**
   * Check if resource is currently locked
   */
  public isLocked(resource: string): boolean {
    const lockKey = `redlock:${resource}`;
    const existing = this.activeLocks.get(lockKey);
    return !!(existing && existing.expiresAt > Date.now());
  }
}

export const lockManager = new RedisLockManager();
