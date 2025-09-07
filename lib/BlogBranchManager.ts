import { v4 as uuidv4 } from 'uuid';
import { escapeSqlString } from './database-utils';

export interface BlogBranch {
  branchId: string;
  postId: number;
  branchName: string;
  parentBranchId?: string;
  branchType?: 'main' | 'feature' | 'hotfix' | 'draft' | 'review';
  title: string;
  slug?: string;
  content?: string;
  excerpt?: string;
  author?: string;
  status?: string;
  tags?: string;
  publishedAt?: Date;
  scheduledDate?: Date;
  isScheduled?: boolean;
  createdBy?: string;
  createdDate: Date;
  modifiedBy?: string;
  modifiedDate?: Date;
  isActive: boolean;
  isMerged: boolean;
  mergedDate?: Date;
  mergedBy?: string;
}

export interface BlogMerge {
  mergeId: string;
  postId: number;
  fromBranchId: string;
  toBranchId: string;
  mergeStrategy: 'auto' | 'manual' | 'ai-assisted';
  conflictResolution?: string;
  mergedBy: string;
  mergedDate: Date;
  mergeCommitMessage?: string;
  aiSuggestions?: string;
  changesSummary?: string;
}

export interface CreateBranchOptions {
  postId: number;
  branchName: string;
  parentBranchId?: string;
  branchType?: BlogBranch['branchType'];
  createdBy: string;
  initialChanges?: Partial<Pick<BlogBranch, 'title' | 'content' | 'excerpt' | 'tags' | 'status'>>;
}

export interface MergeBranchOptions {
  postId: number;
  fromBranch: string;
  toBranch: string;
  mergedBy: string;
  strategy?: BlogMerge['mergeStrategy'];
  commitMessage?: string;
  conflictResolution?: string;
}

export interface BranchDiff {
  field: string;
  originalValue: string;
  newValue: string;
  changeType: 'added' | 'modified' | 'removed';
  conflicted: boolean;
}

export interface AnalysisResult {
  changesSummary: string;
  impactScore: number;
  changeTypes: string[];
  recommendedActions: string[];
  aiRecommendations?: string;
}

export type QueryExecutor = (query: string) => Promise<any>;

export class BlogBranchManager {
  constructor(private executeQuery: QueryExecutor) {}

  /**
   * Create a new branch from an existing branch or main
   */
  async createBranch(options: CreateBranchOptions): Promise<BlogBranch> {
    console.log('🌿 BlogBranchManager.createBranch called with:', options);
    const branchId = uuidv4();
    const now = new Date();
    console.log('🆔 Generated branch ID:', branchId);

    // Get parent branch data (default to main branch if not specified)
    let parentData: any = {};
    if (options.parentBranchId) {
      const parentResult = await this.executeQuery(`
        SELECT * FROM blog_post_branches 
        WHERE branch_id = '${options.parentBranchId}' AND post_id = ${options.postId}
      `);
      if (parentResult?.results?.[0]?.items?.[0]) {
        parentData = parentResult.results[0].items[0];
      }
    } else {
      // Get from main blog_posts table
      const postResult = await this.executeQuery(`
        SELECT * FROM blog_posts WHERE id = ${options.postId}
      `);
      if (postResult?.results?.[0]?.items?.[0]) {
        const post = postResult.results[0].items[0];
        parentData = {
          title: post.title,
          slug: post.slug,
          content: post.content,
          excerpt: post.excerpt,
          author: post.author,
          status: post.status,
          tags: Array.isArray(post.tags) ? post.tags.join(',') : post.tags,
          published_at: post.published_at,
          scheduled_date: post.scheduled_date,
          is_scheduled: post.is_scheduled ? 1 : 0
        };
      }
    }

    // Apply initial changes if provided
    const branchData = {
      ...parentData,
      ...options.initialChanges
    };

    // Escape all string values to prevent SQL injection
    const escapedBranchName = escapeSqlString(options.branchName);
    const escapedTitle = escapeSqlString(branchData.title || 'Untitled Branch');
    const escapedSlug = escapeSqlString(branchData.slug || '');
    const escapedContent = escapeSqlString(branchData.content || '');
    const escapedExcerpt = escapeSqlString(branchData.excerpt || '');
    const escapedAuthor = escapeSqlString(branchData.author || '');
    const escapedStatus = escapeSqlString(branchData.status || 'draft');
    const escapedTags = escapeSqlString(branchData.tags || '');
    const escapedCreatedBy = escapeSqlString(options.createdBy);
    
    // Format timestamps for Oracle
    const formatTimestamp = (date: Date) => {
      return date.toISOString().replace('T', ' ').replace('Z', '').substring(0, 19);
    };
    
    const insertQuery = `
      INSERT INTO blog_post_branches (
        branch_id, post_id, branch_name, parent_branch_id, branch_type,
        title, slug, content, excerpt, author, status, tags,
        published_at, scheduled_date, is_scheduled,
        created_by, created_date, modified_by, modified_date,
        is_active, is_merged
      ) VALUES (
        '${branchId}',
        ${options.postId},
        '${escapedBranchName}',
        ${options.parentBranchId ? `'${escapeSqlString(options.parentBranchId)}'` : 'NULL'},
        '${escapeSqlString(options.branchType || 'feature')}',
        '${escapedTitle}',
        '${escapedSlug}',
        '${escapedContent}',
        '${escapedExcerpt}',
        '${escapedAuthor}',
        '${escapedStatus}',
        '${escapedTags}',
        ${branchData.published_at ? `TO_TIMESTAMP('${formatTimestamp(new Date(branchData.published_at))}', 'YYYY-MM-DD HH24:MI:SS')` : 'NULL'},
        ${branchData.scheduled_date ? `TO_TIMESTAMP('${formatTimestamp(new Date(branchData.scheduled_date))}', 'YYYY-MM-DD HH24:MI:SS')` : 'NULL'},
        ${branchData.is_scheduled ? 1 : 0},
        '${escapedCreatedBy}',
        TO_TIMESTAMP('${formatTimestamp(now)}', 'YYYY-MM-DD HH24:MI:SS'),
        '${escapedCreatedBy}',
        TO_TIMESTAMP('${formatTimestamp(now)}', 'YYYY-MM-DD HH24:MI:SS'),
        1,
        0
      )
    `;

    console.log('📋 Executing branch INSERT query:', insertQuery);
    const insertResult = await this.executeQuery(insertQuery);
    console.log('📋 INSERT query result:', insertResult);

    // Log the branch creation
    await this.logChange({
      postId: options.postId,
      branchId,
      changeType: 'branch_created',
      changedBy: options.createdBy,
      changeDescription: `Created branch '${options.branchName}' of type '${options.branchType || 'feature'}'`,
      oldValue: null,
      newValue: branchId
    });

    // Small delay to ensure the database transaction is fully committed
    console.log('⏳ Waiting for transaction commit...');
    await new Promise(resolve => setTimeout(resolve, 100));
    
    console.log('🔄 Attempting to retrieve newly created branch...');
    return this.getBranch(options.postId, branchId);
  }

  /**
   * Get all branches for a post
   */
  async listBranches(postId: number): Promise<BlogBranch[]> {
    const query = `
      SELECT * FROM blog_post_branches 
      WHERE post_id = ${postId} AND is_active = 1
      ORDER BY created_date DESC
    `;
    
    const result = await this.executeQuery(query);
    const branches = result?.results?.[0]?.items || [];
    
    return branches.map((branch: any) => this.mapDbRowToBranch(branch));
  }

  /**
   * Get a specific branch
   */
  async getBranch(postId: number, branchId: string): Promise<BlogBranch> {
    console.log(`🔍 Getting branch ${branchId} for post ${postId}`);
    
    const query = `
      SELECT * FROM blog_post_branches 
      WHERE post_id = ${postId} AND branch_id = '${escapeSqlString(branchId)}'
    `;
    
    console.log(`📊 Executing getBranch query: ${query}`);
    const result = await this.executeQuery(query);
    console.log(`📊 getBranch query result:`, {
      hasResults: !!result?.results,
      resultCount: result?.results?.length || 0,
      hasItems: !!result?.results?.[0]?.items,
      itemCount: result?.results?.[0]?.items?.length || 0
    });
    
    const branch = result?.results?.[0]?.items?.[0];
    
    if (!branch) {
      console.error(`❌ Branch not found in database. Query result:`, JSON.stringify(result, null, 2));
      throw new Error(`Branch ${branchId} not found for post ${postId}`);
    }
    
    console.log(`✅ Found branch ${branchId}`);
    return this.mapDbRowToBranch(branch);
  }

  /**
   * Update a branch with new content
   */
  async updateBranch(
    postId: number, 
    branchId: string, 
    changes: Partial<Pick<BlogBranch, 'title' | 'content' | 'excerpt' | 'tags' | 'status'>>,
    modifiedBy: string
  ): Promise<BlogBranch> {
    console.log(`🔄 Updating branch ${branchId} for post ${postId}:`, Object.keys(changes));
    
    const now = new Date();
    const setClauses: string[] = [];
    
    // Format timestamp for Oracle
    const formatTimestamp = (date: Date) => {
      return date.toISOString().replace('T', ' ').replace('Z', '').substring(0, 19);
    };
    
    // Use proper SQL escaping for each field
    if (changes.title !== undefined) {
      setClauses.push(`title = '${escapeSqlString(changes.title)}'`);
    }
    if (changes.content !== undefined) {
      setClauses.push(`content = '${escapeSqlString(changes.content)}'`);
    }
    if (changes.excerpt !== undefined) {
      setClauses.push(`excerpt = '${escapeSqlString(changes.excerpt)}'`);
    }
    if (changes.tags !== undefined) {
      setClauses.push(`tags = '${escapeSqlString(changes.tags)}'`);
    }
    if (changes.status !== undefined) {
      setClauses.push(`status = '${escapeSqlString(changes.status)}'`);
    }
    
    setClauses.push(`modified_by = '${escapeSqlString(modifiedBy)}'`);
    setClauses.push(`modified_date = TO_TIMESTAMP('${formatTimestamp(now)}', 'YYYY-MM-DD HH24:MI:SS')`);

    const updateQuery = `
      UPDATE blog_post_branches 
      SET ${setClauses.join(', ')}
      WHERE post_id = ${postId} AND branch_id = '${escapeSqlString(branchId)}'
    `;

    console.log(`📝 Executing branch update query:`, updateQuery);
    const result = await this.executeQuery(updateQuery);
    console.log(`✅ Branch update result:`, result);

    // Log the changes
    for (const [field, value] of Object.entries(changes)) {
      await this.logChange({
        postId,
        branchId,
        changeType: 'content_modified',
        changedBy: modifiedBy,
        changeDescription: `Modified ${field}`,
        fieldName: field,
        newValue: String(value)
      });
    }

    return this.getBranch(postId, branchId);
  }

  /**
   * Generate diff between two branches or between a branch and main post
   */
  async generateDiff(postId: number, fromBranch: string, toBranch: string): Promise<BranchDiff[]> {
    console.log(`🔍 Generating diff between '${fromBranch}' and '${toBranch}' for post ${postId}`);
    
    // Helper function to get data (either from branch or main post)
    const getData = async (branchId: string) => {
      if (branchId === 'main') {
        console.log('📄 Getting main post data');
        // Get main post data
        const result = await this.executeQuery(`
          SELECT * FROM blog_posts WHERE id = ${postId}
        `);
        if (result?.results?.[0]?.items?.[0]) {
          const post = result.results[0].items[0];
          return {
            title: post.title || '',
            content: post.content || '',
            excerpt: post.excerpt || '',
            tags: Array.isArray(post.tags) ? post.tags.join(',') : (post.tags || ''),
            status: post.status || ''
          };
        }
        return { title: '', content: '', excerpt: '', tags: '', status: '' };
      } else {
        console.log(`🌿 Getting branch data for: ${branchId}`);
        // Get branch data
        const branch = await this.getBranch(postId, branchId);
        return {
          title: branch.title || '',
          content: branch.content || '',
          excerpt: branch.excerpt || '',
          tags: branch.tags || '',
          status: branch.status || ''
        };
      }
    };

    const [fromData, toData] = await Promise.all([
      getData(fromBranch),
      getData(toBranch)
    ]);

    console.log('📊 Diff data comparison:', {
      fromTitle: fromData.title?.substring(0, 50) + '...',
      toTitle: toData.title?.substring(0, 50) + '...',
      fromContentLength: fromData.content?.length || 0,
      toContentLength: toData.content?.length || 0
    });

    const diffs: BranchDiff[] = [];
    const fieldsToCompare = ['title', 'content', 'excerpt', 'tags', 'status'];

    for (const field of fieldsToCompare) {
      const fromValue = (fromData as any)[field] || '';
      const toValue = (toData as any)[field] || '';
      
      if (fromValue !== toValue) {
        console.log(`📝 Found difference in field '${field}': ${fromValue.length} vs ${toValue.length} chars`);
        diffs.push({
          field,
          originalValue: fromValue,
          newValue: toValue,
          changeType: !fromValue ? 'added' : !toValue ? 'removed' : 'modified',
          conflicted: false // Will be determined during merge
        });
      }
    }

    console.log(`✅ Generated ${diffs.length} diffs`);
    return diffs;
  }

  /**
   * Merge branches with conflict detection
   */
  async mergeBranches(options: MergeBranchOptions): Promise<{ success: boolean; conflicts?: BranchDiff[]; mergeId?: string }> {
    const mergeId = uuidv4();
    const now = new Date();
    let diffs: BranchDiff[] = [];

    try {
      diffs = await this.generateDiff(options.postId, options.fromBranch, options.toBranch);
      
      if (diffs.length === 0) {
        return { success: true, mergeId };
      }

      // For now, implement auto-merge (can be enhanced with AI assistance later)
      const fromBranch = await this.getBranch(options.postId, options.fromBranch);
      
      await this.updateBranch(options.postId, options.toBranch, {
        title: fromBranch.title,
        content: fromBranch.content || undefined,
        excerpt: fromBranch.excerpt || undefined,
        tags: fromBranch.tags || undefined,
        status: fromBranch.status || undefined
      }, options.mergedBy);

      // Mark source branch as merged
      const formatTimestamp = (date: Date) => {
        return date.toISOString().replace('T', ' ').replace('Z', '').substring(0, 19);
      };
      
      await this.executeQuery(`
        UPDATE blog_post_branches 
        SET is_merged = 1, merged_date = TO_TIMESTAMP('${formatTimestamp(now)}', 'YYYY-MM-DD HH24:MI:SS'), merged_by = '${escapeSqlString(options.mergedBy)}'
        WHERE post_id = ${options.postId} AND branch_id = '${escapeSqlString(options.fromBranch)}'
      `);

      // Log the merge
      const insertMergeQuery = `
        INSERT INTO blog_post_merges (
          merge_id, post_id, from_branch_id, to_branch_id, merge_strategy,
          merged_by, merged_date, merge_commit_message, changes_summary
        ) VALUES (
          '${mergeId}',
          ${options.postId},
          '${escapeSqlString(options.fromBranch)}',
          '${escapeSqlString(options.toBranch)}',
          '${escapeSqlString(options.strategy || 'auto')}',
          '${escapeSqlString(options.mergedBy)}',
          TO_TIMESTAMP('${formatTimestamp(now)}', 'YYYY-MM-DD HH24:MI:SS'),
          '${escapeSqlString(options.commitMessage || 'Merged branch ' + options.fromBranch)}',
          'Merged ${diffs.length} changes'
        )
      `;

      await this.executeQuery(insertMergeQuery);

      return { success: true, mergeId };
    } catch (error) {
      console.error('Merge failed:', error);
      return { success: false, conflicts: diffs };
    }
  }

  /**
   * Delete a branch (soft delete)
   */
  async deleteBranch(postId: number, branchId: string, deletedBy: string): Promise<boolean> {
    if (branchId === 'main') {
      throw new Error('Cannot delete main branch');
    }

    const now = new Date();
    const deleteQuery = `
      UPDATE blog_post_branches 
      SET is_active = 0, modified_by = '${deletedBy}', modified_date = TIMESTAMP '${now.toISOString().slice(0, -1)}'
      WHERE post_id = ${postId} AND branch_id = '${branchId}'
    `;

    await this.executeQuery(deleteQuery);

    await this.logChange({
      postId,
      branchId,
      changeType: 'branch_deleted',
      changedBy: deletedBy,
      changeDescription: `Deleted branch ${branchId}`
    });

    return true;
  }

  /**
   * Get branch history and changes
   */
  async getBranchHistory(postId: number, branchId?: string): Promise<any[]> {
    const whereClause = branchId 
      ? `WHERE post_id = ${postId} AND branch_id = '${branchId}'`
      : `WHERE post_id = ${postId}`;

    const query = `
      SELECT * FROM blog_post_change_log 
      ${whereClause}
      ORDER BY changed_date DESC
    `;

    const result = await this.executeQuery(query);
    return result?.results?.[0]?.items || [];
  }

  /**
   * Analyze changes for AI insights
   */
  async analyzeChanges(postId: number, fromBranch: string, toBranch: string): Promise<AnalysisResult> {
    const diffs = await this.generateDiff(postId, fromBranch, toBranch);
    
    // Simple analysis (can be enhanced with AI)
    const changeTypes = [...new Set(diffs.map(d => d.changeType))];
    const impactScore = Math.min(diffs.length * 20, 100); // Simple scoring
    
    return {
      changesSummary: `${diffs.length} changes detected across ${changeTypes.length} change types`,
      impactScore,
      changeTypes: changeTypes.map(t => t.charAt(0).toUpperCase() + t.slice(1)),
      recommendedActions: [
        'Review changes carefully',
        'Test functionality after merge',
        'Update documentation if needed'
      ]
    };
  }

  private async logChange(options: {
    postId: number;
    branchId?: string;
    changeType: string;
    changedBy: string;
    changeDescription: string;
    fieldName?: string;
    oldValue?: string | null;
    newValue?: string | null;
  }): Promise<void> {
    const changeId = uuidv4();
    const now = new Date();

    const insertQuery = `
      INSERT INTO blog_post_change_log (
        change_id, post_id, branch_id, change_type, field_name,
        old_value, new_value, changed_by, changed_date, change_description
      ) VALUES (
        '${changeId}',
        ${options.postId},
        ${options.branchId ? `'${options.branchId}'` : 'NULL'},
        '${options.changeType}',
        ${options.fieldName ? `'${options.fieldName}'` : 'NULL'},
        ${options.oldValue ? `'${options.oldValue}'` : 'NULL'},
        ${options.newValue ? `'${options.newValue}'` : 'NULL'},
        '${options.changedBy}',
        TIMESTAMP '${now.toISOString().slice(0, -1)}',
        '${options.changeDescription}'
      )
    `;

    await this.executeQuery(insertQuery);
  }

  private mapDbRowToBranch(row: any): BlogBranch {
    return {
      branchId: row.branch_id,
      postId: row.post_id,
      branchName: row.branch_name,
      parentBranchId: row.parent_branch_id || undefined,
      branchType: row.branch_type,
      title: row.title,
      slug: row.slug || undefined,
      content: row.content || undefined,
      excerpt: row.excerpt || undefined,
      author: row.author || undefined,
      status: row.status || undefined,
      tags: row.tags || undefined,
      publishedAt: row.published_at ? new Date(row.published_at) : undefined,
      scheduledDate: row.scheduled_date ? new Date(row.scheduled_date) : undefined,
      isScheduled: Boolean(row.is_scheduled),
      createdBy: row.created_by || undefined,
      createdDate: new Date(row.created_date),
      modifiedBy: row.modified_by || undefined,
      modifiedDate: row.modified_date ? new Date(row.modified_date) : undefined,
      isActive: Boolean(row.is_active),
      isMerged: Boolean(row.is_merged),
      mergedDate: row.merged_date ? new Date(row.merged_date) : undefined,
      mergedBy: row.merged_by || undefined
    };
  }
}
