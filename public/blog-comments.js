/**
 * Blog Comments Handler
 * Handles comment form submission and display for blog posts
 */

(function() {
    'use strict';

    // Configuration
    const API_BASE = '/api/blog';
    
    // State
    let currentBlogPostId = null;
    let isSubmitting = false;

    /**
     * Initialize comment system
     */
    function init() {
        console.log('🔵 Initializing blog comments system...');
        
        // Try to get blog post ID from the page
        currentBlogPostId = getBlogPostId();
        
        if (!currentBlogPostId) {
            console.log('⚠️ No blog post ID found, comment system not initialized');
            return;
        }

        console.log('📝 Blog post ID detected:', currentBlogPostId);
        
        // Setup comment form handler
        setupCommentForm();
        
        // Load existing comments
        loadComments();
    }

    /**
     * Get the current blog post ID from the page
     * This could be from a data attribute, URL parameter, or global variable
     */
    function getBlogPostId() {
        // Method 1: Check for data attribute on body or specific element
        const bodyId = document.body.getAttribute('data-blog-post-id');
        if (bodyId) return parseInt(bodyId);

        // Method 2: Check for global variable (if set by the page)
        if (typeof window.blogPostId !== 'undefined') {
            return parseInt(window.blogPostId);
        }

        // Method 3: Parse from URL (if the blog system uses URLs like /blog/123)
        const urlMatch = window.location.pathname.match(/\/blog\/(\d+)/);
        if (urlMatch) return parseInt(urlMatch[1]);

        // Method 4: Check for query parameter
        const urlParams = new URLSearchParams(window.location.search);
        const idParam = urlParams.get('id');
        if (idParam) return parseInt(idParam);

        return null;
    }

    /**
     * Setup the comment form submission handler
     */
    function setupCommentForm() {
        const commentForm = document.getElementById('commentform') || document.querySelector('form[id*="comment"]');
        
        if (!commentForm) {
            console.log('⚠️ Comment form not found');
            return;
        }

        console.log('✅ Comment form found, setting up handler');

        // Add submit event listener
        commentForm.addEventListener('submit', handleCommentSubmission);

        // Add real-time validation
        const requiredFields = commentForm.querySelectorAll('input[required], textarea[required]');
        requiredFields.forEach(field => {
            field.addEventListener('blur', validateField);
            field.addEventListener('input', clearFieldError);
        });
    }

    /**
     * Handle comment form submission
     */
    async function handleCommentSubmission(event) {
        event.preventDefault();

        if (isSubmitting) {
            console.log('⏳ Already submitting, ignoring duplicate request');
            return;
        }

        const form = event.target;
        const formData = new FormData(form);

        // Extract form data
        const commentData = {
            authorName: formData.get('author') || formData.get('name') || '',
            authorEmail: formData.get('email') || '',
            authorWebsite: formData.get('url') || formData.get('website') || '',
            commentContent: formData.get('comment') || formData.get('message') || '',
            notifyFollowUp: form.querySelector('input[name*="follow"]')?.checked || false,
            notifyNewPosts: form.querySelector('input[name*="new"]')?.checked || false,
            saveInfo: form.querySelector('input[name*="save"]')?.checked || false
        };

        // Validate required fields
        const validation = validateCommentData(commentData);
        if (!validation.isValid) {
            showError(validation.message);
            highlightErrorFields(form, validation.fields);
            return;
        }

        // Show loading state
        isSubmitting = true;
        setLoadingState(form, true);

        try {
            console.log('📤 Submitting comment for blog post:', currentBlogPostId);

            const response = await fetch(`${API_BASE}/${currentBlogPostId}/comments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(commentData)
            });

            const result = await response.json();

            if (response.ok && result.success) {
                console.log('✅ Comment submitted successfully');
                showSuccess(result.message);
                form.reset();
                clearAllErrors(form);
                
                // Optionally reload comments to show pending status
                // Note: Since comments need approval, they won't appear in public view
                setTimeout(() => {
                    hideMessages();
                }, 5000);
            } else {
                console.error('❌ Comment submission failed:', result.error);
                showError(result.error || 'Failed to submit comment');
            }

        } catch (error) {
            console.error('❌ Network error submitting comment:', error);
            showError('Network error. Please check your connection and try again.');
        } finally {
            isSubmitting = false;
            setLoadingState(form, false);
        }
    }

    /**
     * Validate comment data
     */
    function validateCommentData(data) {
        const errors = [];
        const errorFields = [];

        if (!data.authorName.trim()) {
            errors.push('Name is required');
            errorFields.push('author', 'name');
        }

        if (!data.authorEmail.trim()) {
            errors.push('Email is required');
            errorFields.push('email');
        } else if (!isValidEmail(data.authorEmail)) {
            errors.push('Please enter a valid email address');
            errorFields.push('email');
        }

        if (!data.commentContent.trim()) {
            errors.push('Comment is required');
            errorFields.push('comment', 'message');
        } else if (data.commentContent.trim().length < 10) {
            errors.push('Comment must be at least 10 characters long');
            errorFields.push('comment', 'message');
        }

        return {
            isValid: errors.length === 0,
            message: errors.join(', '),
            fields: errorFields
        };
    }

    /**
     * Validate email format
     */
    function isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    /**
     * Validate individual field
     */
    function validateField(event) {
        const field = event.target;
        const value = field.value.trim();
        
        clearFieldError(field);

        if (field.required && !value) {
            showFieldError(field, `${field.name} is required`);
        } else if (field.type === 'email' && value && !isValidEmail(value)) {
            showFieldError(field, 'Please enter a valid email address');
        }
    }

    /**
     * Load and display existing comments
     */
    async function loadComments() {
        try {
            console.log('🔄 Loading comments for blog post:', currentBlogPostId);

            const response = await fetch(`${API_BASE}/${currentBlogPostId}/comments`);
            const result = await response.json();

            if (response.ok && result.success) {
                console.log('✅ Comments loaded:', result.comments.length, 'comments');
                displayComments(result.comments);
            } else {
                console.log('⚠️ No comments or failed to load comments');
            }

        } catch (error) {
            console.error('❌ Error loading comments:', error);
        }
    }

    /**
     * Display comments on the page
     */
    function displayComments(comments) {
        if (!comments || comments.length === 0) {
            console.log('📝 No approved comments to display');
            return;
        }

        // Find where to insert comments (look for common comment container IDs/classes)
        let commentsContainer = document.getElementById('comments') || 
                               document.querySelector('.comments') ||
                               document.querySelector('.comment-list') ||
                               document.querySelector('#respond');

        if (!commentsContainer) {
            console.log('⚠️ Comments container not found, creating one');
            // Create comments container before the comment form
            const commentForm = document.getElementById('commentform') || document.querySelector('form[id*="comment"]');
            if (commentForm) {
                commentsContainer = document.createElement('div');
                commentsContainer.id = 'comments';
                commentsContainer.className = 'comments-section';
                commentForm.parentNode.insertBefore(commentsContainer, commentForm);
            }
        }

        if (!commentsContainer) {
            console.log('❌ Could not find or create comments container');
            return;
        }

        // Build comments HTML
        const commentsHTML = comments.map(comment => `
            <div class="comment" id="comment-${comment.id}">
                <div class="comment-meta">
                    <strong class="comment-author">${escapeHtml(comment.author_name)}</strong>
                    <span class="comment-date">${formatDate(comment.created_at)}</span>
                </div>
                <div class="comment-content">
                    ${escapeHtml(comment.comment_content).replace(/\n/g, '<br>')}
                </div>
            </div>
        `).join('');

        commentsContainer.innerHTML = `
            <h3>Comments (${comments.length})</h3>
            <div class="comments-list">
                ${commentsHTML}
            </div>
        `;

        console.log('✅ Comments displayed successfully');
    }

    /**
     * Utility functions
     */
    function setLoadingState(form, isLoading) {
        const submitButton = form.querySelector('button[type="submit"], input[type="submit"]');
        if (submitButton) {
            if (isLoading) {
                submitButton.disabled = true;
                submitButton.dataset.originalText = submitButton.textContent || submitButton.value;
                if (submitButton.tagName === 'BUTTON') {
                    submitButton.textContent = 'Submitting...';
                } else {
                    submitButton.value = 'Submitting...';
                }
            } else {
                submitButton.disabled = false;
                const originalText = submitButton.dataset.originalText || 'Post Comment';
                if (submitButton.tagName === 'BUTTON') {
                    submitButton.textContent = originalText;
                } else {
                    submitButton.value = originalText;
                }
            }
        }
    }

    function showError(message) {
        hideMessages();
        const errorDiv = createMessageDiv('error', message);
        insertMessage(errorDiv);
    }

    function showSuccess(message) {
        hideMessages();
        const successDiv = createMessageDiv('success', message);
        insertMessage(successDiv);
    }

    function createMessageDiv(type, message) {
        const div = document.createElement('div');
        div.className = `comment-message comment-${type}`;
        div.style.cssText = `
            padding: 15px;
            margin: 10px 0;
            border: 1px solid;
            border-radius: 4px;
            font-weight: bold;
            ${type === 'error' ? 
                'background: #fee; border-color: #fcc; color: #900;' : 
                'background: #efe; border-color: #cfc; color: #060;'
            }
        `;
        div.textContent = message;
        return div;
    }

    function insertMessage(messageDiv) {
        const form = document.getElementById('commentform') || document.querySelector('form[id*="comment"]');
        if (form) {
            form.parentNode.insertBefore(messageDiv, form);
        }
    }

    function hideMessages() {
        const messages = document.querySelectorAll('.comment-message');
        messages.forEach(msg => msg.remove());
    }

    function highlightErrorFields(form, fieldNames) {
        fieldNames.forEach(name => {
            const field = form.querySelector(`[name="${name}"]`);
            if (field) {
                field.style.borderColor = '#f00';
            }
        });
    }

    function clearAllErrors(form) {
        const fields = form.querySelectorAll('input, textarea');
        fields.forEach(field => {
            field.style.borderColor = '';
            clearFieldError(field);
        });
    }

    function showFieldError(field, message) {
        // Remove existing error
        clearFieldError(field);
        
        // Add error styling
        field.style.borderColor = '#f00';
        
        // Create error message
        const errorDiv = document.createElement('div');
        errorDiv.className = 'field-error';
        errorDiv.style.cssText = 'color: #900; font-size: 12px; margin-top: 5px;';
        errorDiv.textContent = message;
        
        // Insert after field
        field.parentNode.insertBefore(errorDiv, field.nextSibling);
    }

    function clearFieldError(field) {
        field.style.borderColor = '';
        const existingError = field.parentNode.querySelector('.field-error');
        if (existingError) {
            existingError.remove();
        }
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Expose functions for manual initialization if needed
    window.BlogComments = {
        init: init,
        setBlogPostId: function(id) {
            currentBlogPostId = parseInt(id);
            console.log('📝 Blog post ID set to:', currentBlogPostId);
        }
    };

})();
