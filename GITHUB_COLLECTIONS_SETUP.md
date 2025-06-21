# GitHub Collections Setup Guide

## 🚨 **Error Fix: Missing GitHub Collections**

The error "Collection with the requested ID could not be found" occurs because the GitHub-related collections don't exist in your Appwrite database yet.

## 📋 **Required Collections to Create**

You need to create these 3 collections in your Appwrite console:

### 1. github_connections
- **Collection ID**: `github_connections`
- **Name**: `GitHub Connections`
- **Permissions**: 
  - Read: Users can read their own connections
  - Write: Users can write their own connections
  - Create: Users can create connections
  - Delete: Users can delete their own connections

**Attributes**:
- `user_id` (string, required)
- `username` (string, required)
- `access_token` (string, required)

### 2. github_repositories
- **Collection ID**: `github_repositories`
- **Name**: `GitHub Repositories`
- **Permissions**:
  - Read: Users can read their own repositories
  - Write: Users can write their own repositories
  - Create: Users can create repositories
  - Delete: Users can delete their own repositories

**Attributes**:
- `repo_id` (string, required)
- `name` (string, required)
- `full_name` (string, required)
- `description` (string, optional)
- `html_url` (string, required)
- `user_id` (string, required)
- `project_id` (string, optional)

### 3. github_commits
- **Collection ID**: `github_commits`
- **Name**: `GitHub Commits`
- **Permissions**:
  - Read: Users can read commits for repositories they have access to
  - Write: Users can write commits they created
  - Create: Users can create commits
  - Delete: Users can delete commits they created

**Attributes**:
- `commit_id` (string, required)
- `message` (string, required)
- `author` (string, required)
- `html_url` (string, required)
- `repository_id` (string, required)
- `task_id` (string, optional)
- `committed_at` (string, required)

## 🔧 **Step-by-Step Creation**

### Step 1: Go to Appwrite Console
1. Open your Appwrite console
2. Navigate to your project
3. Go to **Databases** → **code-cue-db**

### Step 2: Create github_connections Collection
1. Click **Create Collection**
2. Collection ID: `github_connections`
3. Name: `GitHub Connections`
4. Set permissions as specified above
5. Add the 3 attributes listed above

### Step 3: Create github_repositories Collection
1. Click **Create Collection**
2. Collection ID: `github_repositories`
3. Name: `GitHub Repositories`
4. Set permissions as specified above
5. Add the 7 attributes listed above

### Step 4: Create github_commits Collection
1. Click **Create Collection**
2. Collection ID: `github_commits`
3. Name: `GitHub Commits`
4. Set permissions as specified above
5. Add the 7 attributes listed above

## 🔄 **Update Collection IDs**

After creating the collections, you'll get new collection IDs. Update the `COLLECTION_IDS` in `lib/appwrite.ts`:

```typescript
export const COLLECTION_IDS = {
  // ... existing collections ...
  GITHUB_REPOSITORIES: 'your-new-github-repositories-id',
  GITHUB_COMMITS: 'your-new-github-commits-id',
  GITHUB_CONNECTIONS: 'your-new-github-connections-id',
  // ... rest of collections ...
};
```

## ✅ **Verify Setup**

After creating the collections:

1. **Test GitHub Connection**: Try connecting a GitHub account
2. **Check for Errors**: Verify no more "Collection not found" errors
3. **Test Repository Fetching**: Try fetching repositories from GitHub

## 🚀 **Alternative: Disable GitHub Features**

If you don't need GitHub integration right now, you can temporarily disable it by:

1. **Comment out GitHub-related code** in components that use it
2. **Add error handling** to gracefully handle missing collections
3. **Hide GitHub UI elements** until collections are set up

## 📞 **Need Help?**

If you continue to have issues:
1. Check that all collection IDs are correct
2. Verify permissions are set correctly
3. Ensure the database ID is correct
4. Test with a simple query to verify connectivity

The GitHub integration will work once these collections are properly created in your Appwrite database! 