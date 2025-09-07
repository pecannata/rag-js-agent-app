/**
 * Branch-aware caching and state management for blog posts
 * Handles caching of different branch versions and their content
 */

interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
  branchId?: string;
  version?: string;
}

interface BranchState {
  postId: number;
  branchId: string;
  branchName: string;
  branchType: string;
  title: string;
  content?: string;
  excerpt?: string;
  tags?: string;
  status?: string;
  lastModified?: Date;
  isActive?: boolean;
  parentBranchId?: string;
}

class BranchAwareCache {
  private cache = new Map<string, CacheEntry>();
  private branchStates = new Map<string, BranchState>();
  
  // Cache TTL configurations
  private static readonly TTL = {
    BRANCH_LIST: 5 * 60 * 1000,        // 5 minutes for branch list
    BRANCH_CONTENT: 10 * 60 * 1000,     // 10 minutes for branch content
    DIFF_RESULTS: 2 * 60 * 1000,        // 2 minutes for diff results
    MERGE_HISTORY: 15 * 60 * 1000       // 15 minutes for merge history
  };

  /**
   * Generate cache key for branch-specific data
   */
  private generateKey(type: string, postId: number, branchId?: string, extra?: string): string {
    const parts = [type, postId.toString()];
    if (branchId) parts.push(branchId);
    if (extra) parts.push(extra);
    return parts.join(':');
  }

  /**
   * Cache branch list for a post
   */
  setBranchList(postId: number, branches: any[]): void {
    const key = this.generateKey('branches', postId);
    this.cache.set(key, {
      data: branches,
      timestamp: Date.now(),
      ttl: BranchAwareCache.TTL.BRANCH_LIST
    });

    // Update individual branch states
    branches.forEach(branch => {
      this.setBranchState(postId, branch.branchId, {
        postId,
        branchId: branch.branchId,
        branchName: branch.branchName,
        branchType: branch.branchType,
        title: branch.title,
        content: branch.content,
        excerpt: branch.excerpt,
        tags: branch.tags,
        status: branch.status,
        lastModified: branch.modifiedDate ? new Date(branch.modifiedDate) : undefined,
        isActive: branch.isActive,
        parentBranchId: branch.parentBranchId
      });
    });

    console.log(`🗄️ Cached branch list for post ${postId}: ${branches.length} branches`);
  }

  /**
   * Get cached branch list
   */
  getBranchList(postId: number): any[] | null {
    const key = this.generateKey('branches', postId);
    const entry = this.cache.get(key);
    
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }

  /**
   * Cache branch content
   */
  setBranchContent(postId: number, branchId: string, content: any): void {
    const key = this.generateKey('branch_content', postId, branchId);
    this.cache.set(key, {
      data: content,
      timestamp: Date.now(),
      ttl: BranchAwareCache.TTL.BRANCH_CONTENT,
      branchId
    });

    // Update branch state
    this.setBranchState(postId, branchId, {
      ...this.getBranchState(postId, branchId),
      content: content.content,
      title: content.title,
      excerpt: content.excerpt,
      tags: content.tags,
      status: content.status,
      lastModified: new Date()
    });

    console.log(`🗄️ Cached content for branch ${branchId} of post ${postId}`);
  }

  /**
   * Get cached branch content
   */
  getBranchContent(postId: number, branchId: string): any | null {
    const key = this.generateKey('branch_content', postId, branchId);
    const entry = this.cache.get(key);
    
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }

  /**
   * Cache diff results between branches
   */
  setDiffResult(postId: number, fromBranch: string, toBranch: string, diffData: any): void {
    const key = this.generateKey('diff', postId, undefined, `${fromBranch}-${toBranch}`);
    this.cache.set(key, {
      data: diffData,
      timestamp: Date.now(),
      ttl: BranchAwareCache.TTL.DIFF_RESULTS
    });

    console.log(`🗄️ Cached diff result: ${fromBranch} → ${toBranch} for post ${postId}`);
  }

  /**
   * Get cached diff results
   */
  getDiffResult(postId: number, fromBranch: string, toBranch: string): any | null {
    const key = this.generateKey('diff', postId, undefined, `${fromBranch}-${toBranch}`);
    const entry = this.cache.get(key);
    
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }

  /**
   * Set branch state
   */
  setBranchState(postId: number, branchId: string, state: Partial<BranchState>): void {
    const key = `${postId}:${branchId}`;
    const currentState = this.branchStates.get(key) || {
      postId,
      branchId,
      branchName: '',
      branchType: 'feature',
      title: ''
    };

    this.branchStates.set(key, { ...currentState, ...state });
  }

  /**
   * Get branch state
   */
  getBranchState(postId: number, branchId: string): BranchState | null {
    const key = `${postId}:${branchId}`;
    return this.branchStates.get(key) || null;
  }

  /**
   * Get all branch states for a post
   */
  getAllBranchStates(postId: number): BranchState[] {
    const states: BranchState[] = [];
    
    for (const [key, state] of this.branchStates.entries()) {
      if (state.postId === postId) {
        states.push(state);
      }
    }
    
    return states.sort((a, b) => a.branchName.localeCompare(b.branchName));
  }

  /**
   * Invalidate cache for a specific post
   */
  invalidatePost(postId: number): void {
    const keysToDelete: string[] = [];
    
    // Find all cache keys related to this post
    for (const key of this.cache.keys()) {
      if (key.startsWith(`branches:${postId}`) || 
          key.startsWith(`branch_content:${postId}`) ||
          key.startsWith(`diff:${postId}`)) {
        keysToDelete.push(key);
      }
    }
    
    // Delete cache entries
    keysToDelete.forEach(key => this.cache.delete(key));
    
    // Remove branch states
    const stateKeysToDelete: string[] = [];
    for (const key of this.branchStates.keys()) {
      if (key.startsWith(`${postId}:`)) {
        stateKeysToDelete.push(key);
      }
    }
    stateKeysToDelete.forEach(key => this.branchStates.delete(key));
    
    console.log(`🧹 Invalidated all cache for post ${postId}`);
  }

  /**
   * Invalidate cache for a specific branch
   */
  invalidateBranch(postId: number, branchId: string): void {
    const keysToDelete: string[] = [];
    
    // Find cache keys that include the specific branch
    for (const key of this.cache.keys()) {
      if (key.includes(branchId) && key.includes(postId.toString())) {
        keysToDelete.push(key);
      }
    }
    
    // Also invalidate the branch list cache since it contains this branch
    const branchListKey = this.generateKey('branches', postId);
    keysToDelete.push(branchListKey);
    
    keysToDelete.forEach(key => this.cache.delete(key));
    
    // Remove branch state
    const stateKey = `${postId}:${branchId}`;
    this.branchStates.delete(stateKey);
    
    console.log(`🧹 Invalidated cache for branch ${branchId} of post ${postId}`);
  }

  /**
   * Clear all cache
   */
  clearAll(): void {
    this.cache.clear();
    this.branchStates.clear();
    console.log('🧹 Cleared all branch-aware cache');
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    cacheSize: number;
    branchStateCount: number;
    cacheKeys: string[];
    branchKeys: string[];
  } {
    return {
      cacheSize: this.cache.size,
      branchStateCount: this.branchStates.size,
      cacheKeys: Array.from(this.cache.keys()),
      branchKeys: Array.from(this.branchStates.keys())
    };
  }

  /**
   * Get active branch for a post (most recently modified)
   */
  getActiveBranch(postId: number): BranchState | null {
    const states = this.getAllBranchStates(postId);
    
    if (states.length === 0) return null;
    
    // Find main branch first
    const mainBranch = states.find(s => s.branchType === 'main');
    if (mainBranch) return mainBranch;
    
    // Otherwise, return most recently modified
    return states.sort((a, b) => {
      const aTime = a.lastModified?.getTime() || 0;
      const bTime = b.lastModified?.getTime() || 0;
      return bTime - aTime;
    })[0];
  }

  /**
   * Mark branch as recently accessed for better caching decisions
   */
  markBranchAccessed(postId: number, branchId: string): void {
    const state = this.getBranchState(postId, branchId);
    if (state) {
      this.setBranchState(postId, branchId, {
        ...state,
        lastModified: new Date()
      });
    }
  }
}

// Global cache instance
export const branchAwareCache = new BranchAwareCache();

// Helper functions for React components
export const useBranchCache = () => {
  return {
    setBranchList: branchAwareCache.setBranchList.bind(branchAwareCache),
    getBranchList: branchAwareCache.getBranchList.bind(branchAwareCache),
    setBranchContent: branchAwareCache.setBranchContent.bind(branchAwareCache),
    getBranchContent: branchAwareCache.getBranchContent.bind(branchAwareCache),
    setDiffResult: branchAwareCache.setDiffResult.bind(branchAwareCache),
    getDiffResult: branchAwareCache.getDiffResult.bind(branchAwareCache),
    getBranchState: branchAwareCache.getBranchState.bind(branchAwareCache),
    getAllBranchStates: branchAwareCache.getAllBranchStates.bind(branchAwareCache),
    getActiveBranch: branchAwareCache.getActiveBranch.bind(branchAwareCache),
    markBranchAccessed: branchAwareCache.markBranchAccessed.bind(branchAwareCache),
    invalidatePost: branchAwareCache.invalidatePost.bind(branchAwareCache),
    invalidateBranch: branchAwareCache.invalidateBranch.bind(branchAwareCache)
  };
};

export default branchAwareCache;
