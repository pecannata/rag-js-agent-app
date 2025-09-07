# 🌿 Branch Editing Workflow - Step by Step

## 🎯 **How Branch Association Works**

The key is **switching to a branch** - that's when your edits become associated with the branch rather than the main post.

### **📋 Step-by-Step Workflow:**

#### **1. Start Editing a Post**
- Go to http://localhost:3000/blogs
- Click "Edit" on any existing post
- You'll see the normal editing interface

#### **2. Open Branch Manager**
- Click the "🌿 Branches" button in the editing toolbar
- This opens the branch management modal

#### **3. Create a New Branch (First Time)**
- Click "➕ New Branch" in the modal
- Fill in:
  - **Branch Name**: e.g., "feature/update-content"
  - **Branch Type**: Feature, Hotfix, Draft, or Review
  - **Parent Branch**: Leave as "From main post" 
  - **Initial Title**: (optional) Override the post title for this branch
- Click "Create Branch"

#### **4. Switch to the Branch** 
- After creating, click the "🔄" icon next to your new branch
- **OR** select an existing branch and click "🔄"
- This is the **KEY STEP** - switching loads the branch content and associates all saves with that branch

#### **5. Notice the Visual Changes**
Once you switch to a branch, you'll see:
- **Green branch indicator** at the top showing which branch you're on
- **Green borders** around input fields
- **"Save to Branch"** instead of "Save Draft"  
- **"Publish Branch"** instead of "Publish"
- **Branch status bar** showing current editing context

#### **6. Make Your Edits**
- Edit the title, content, tags, etc.
- All changes are now associated with the selected branch
- Auto-save will save to the branch, not the main post

#### **7. Save Changes**
- Click "Save to Branch" - saves go to `/api/blog/branches` endpoint
- Click "Publish Branch" - publishes the branch version
- **Main post remains unchanged**

#### **8. Switch Back to Main**
- Click the "✕" on the green branch indicator
- **OR** go back to branch manager and switch to main
- Now edits affect the main post again

---

## 🔍 **Let's Test This Together**

### **Quick Test Steps:**
1. **Edit any existing post** - click Edit button
2. **Click "🌿 Branches"** - opens branch modal  
3. **Create a branch** - use "feature/test-branch"
4. **Switch to it** - click the 🔄 button
5. **Watch the interface change** - green styling appears
6. **Edit something** - change the title
7. **Save** - notice it says "Save to Branch"
8. **Check the branch** - your changes are stored separately

Would you like to walk through this step-by-step right now? I can help troubleshoot if anything isn't working as expected.

---

## 🚨 **Common Issues**

### **"I don't see the green styling"**
- Make sure you clicked the 🔄 switch button on the branch
- The branch indicator should appear at the top
- Check browser console for any JavaScript errors

### **"My saves aren't going to the branch"** 
- Verify the green "Save to Branch" button text
- Check that `selectedBranch` state is set (visible in branch indicator)
- Look at browser network tab to see which API endpoint is called

### **"Branch button doesn't work"**
- Make sure you're editing an existing post (not creating new)
- Check that the post has an ID
- Verify you're signed in as admin

Let me know what you see when you try this workflow!
