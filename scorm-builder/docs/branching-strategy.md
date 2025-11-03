# SCORM Builder - Branching Strategy & Template Development Guide

## 🎯 Overview

This document outlines the comprehensive branching strategy and development workflow for the SCORM Builder project, designed to support parallel development of multiple template versions while maintaining production stability.

## 📋 Table of Contents

1. [Branch Structure Overview](#branch-structure-overview)
2. [Setup Instructions](#setup-instructions)
3. [Branching Workflow](#branching-workflow)
4. [Development Guidelines](#development-guidelines)
5. [Merge Procedures](#merge-procedures)
6. [Emergency Procedures](#emergency-procedures)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)

## 🌳 Branch Structure Overview

### Primary Branches

```
main (PRODUCTION)
├── 🎯 Current stable template (topic-template.html)
├── 🛡️ Production-ready code only
├── 🔒 Protected - direct commits disabled
└── 📦 Deployed version

develop (INTEGRATION)
├── 🔄 Feature integration branch
├── 🧪 Testing environment
├── 📋 Staging area for completed features
└── 🎯 Merges to main after testing
```

### Feature Branches

```
feature/template-v2 (NEW DEVELOPMENT)
├── 🚀 Component-based template architecture
├── 🏗️ New template requirements implementation
├── 🔬 Experimental features
└── 📝 Documentation updates

feature/template-v1-maintenance (HOTFIXES)
├── 🔧 Emergency fixes only
├── 🚨 Critical bug fixes
├── ⚡ Quick patches for production issues
└── 🎯 Can merge directly to main
```

### Release Branches (When Needed)

```
release/v2.0 (PRE-PRODUCTION)
├── 🎭 Final testing before release
├── 🐛 Last-minute bug fixes
├── 📋 Release preparation
└── 🏷️ Tagging and versioning
```

## 🚀 Setup Instructions

### Initial Repository Setup

#### Step 1: Prepare Current State
```bash
# Save current work
git status
git add .
git commit -m "Initial commit before branching setup - current template ready"

# Ensure clean main branch
git checkout main
git pull origin main
```

#### Step 2: Create Core Branches
```bash
# Create develop branch
git checkout -b develop
git push -u origin develop

# Create new template feature branch
git checkout -b feature/template-v2
git push -u origin feature/template-v2

# Create maintenance branch
git checkout develop
git checkout -b feature/template-v1-maintenance
git push -u origin feature/template-v1-maintenance
```

#### Step 3: Verify Setup
```bash
# List all branches
git branch -a

# Check remote configuration
git remote -v

# Verify current branch
git branch --show-current
```

### New Repository Migration

#### Step 1: Create New Repository
1. Create new repository "scorm-builder" on GitHub/GitLab
2. Do NOT initialize with README
3. Copy the repository URL

#### Step 2: Configure New Remote
```bash
# Navigate to scorm-builder directory
cd path/to/scorm-builder

# Remove old remote
git remote remove origin

# Add new remote
git remote add origin YOUR_NEW_REPOSITORY_URL

# Push all branches
git push -u origin main
git push -u origin develop
git push -u origin feature/template-v2
git push -u origin feature/template-v1-maintenance

# Set main as default
git branch --set-upstream-to=origin/main main
```

## 🔄 Branching Workflow

### Daily Development Workflow

#### Working on New Template (Primary Development)
```bash
# Switch to new template branch
git checkout feature/template-v2

# Work and commit frequently
git add .
git commit -m "feat: implement header component"

# Push changes
git push origin feature/template-v2

# Regular sync with develop
git checkout develop
git pull origin develop
git checkout feature/template-v2
git merge develop
```

#### Using Current Template (Production Version)
```bash
# Switch to main branch
git checkout main

# Pull latest changes
git pull origin main

# Current template works exactly as before
# No modifications, no risks
```

#### Emergency Fixes to Current Template
```bash
# Switch to maintenance branch
git checkout feature/template-v1-maintenance

# Make urgent fix
git add .
git commit -m "fix: resolve quiz modal critical bug"

# Test fix thoroughly
npm run test:topic -- --topic=YourTestTopic

# For critical fixes, merge to main directly
git checkout main
git merge feature/template-v1-maintenance
git push origin main

# Also merge to develop to keep branches synced
git checkout develop
git merge feature/template-v1-maintenance
git push origin develop
```

### Feature Development Process

#### For New Template Features
```bash
# 1. Start on feature branch
git checkout feature/template-v2

# 2. Create feature sub-branch (optional for large features)
git checkout -b feature/template-v2-header-component

# 3. Develop and test
# ... your development work ...

# 4. Commit with conventional messages
git add .
git commit -m "feat: add responsive header component
- Implement mobile-first design
- Add company logo integration
- Include navigation menu
- Style with Tailwind CSS"

# 5. Push and create PR (if using PRs)
git push origin feature/template-v2-header-component

# 6. Merge back to feature branch
git checkout feature/template-v2
git merge feature/template-v2-header-component

# 7. Delete feature sub-branch
git branch -d feature/template-v2-header-component
git push origin --delete feature/template-v2-header-component
```

## 🔄 Merge Procedures

### Standard Merge Flow (New Template to Production)

#### Step 1: Merge to Develop (Testing Integration)
```bash
# Switch to develop branch
git checkout develop
git pull origin develop

# Merge new template feature
git merge feature/template-v2

# Resolve any conflicts (if any)
# Test thoroughly

# Push to develop
git push origin develop
```

#### Step 2: Create Release Branch
```bash
# From develop, create release branch
git checkout -b release/v2.0

# Final testing and bug fixes
# ... testing process ...

# Push release branch
git push origin release/v2.0
```

#### Step 3: Deploy to Production
```bash
# Switch to main
git checkout main
git pull origin main

# Merge release branch
git merge release/v2.0

# Tag the release
git tag -a v2.0 -m "Release new template v2.0
- Component-based architecture
- Improved responsive design
- Enhanced performance
- Better accessibility support"

# Push to main
git push origin main
git push origin main --tags
```

#### Step 4: Clean Up
```bash
# Delete release branch
git branch -d release/v2.0
git push origin --delete release/v2.0

# Sync branches
git checkout develop
git merge main  # Bring main changes back to develop
git push origin develop
```

### Hotfix Flow (Emergency Production Fixes)

#### Step 1: Create Hotfix Branch
```bash
# From main, create hotfix branch
git checkout main
git pull origin main
git checkout -b hotfix/critical-quiz-fix
```

#### Step 2: Fix and Test
```bash
# Make the fix
# ... development work ...

# Test thoroughly
npm run test:topic -- --topic=ProblematicTopic
npm run validate

# Commit fix
git add .
git commit -m "hotfix: resolve quiz modal critical issue affecting production"
```

#### Step 3: Deploy Hotfix
```bash
# Merge to main
git checkout main
git merge hotfix/critical-quiz-fix
git push origin main

# Tag hotfix version
git tag -a v1.0.1 -m "Hotfix release for quiz modal issue"
git push origin main --tags
```

#### Step 4: Sync Other Branches
```bash
# Merge hotfix to develop
git checkout develop
git merge hotfix/critical-quiz-fix
git push origin develop

# Also merge to maintenance if needed
git checkout feature/template-v1-maintenance
git merge hotfix/critical-quiz-fix
git push origin feature/template-v1-maintenance

# Delete hotfix branch
git branch -d hotfix/critical-quiz-fix
git push origin --delete hotfix/critical-quiz-fix
```

## 📝 Development Guidelines

### Commit Message Convention

Use conventional commit messages:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

#### Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

#### Examples:
```bash
feat(template): add component-based architecture
fix(quiz): resolve modal display issue on mobile
docs(readme): update installation instructions
refactor(css): organize styles into logical modules
test(quiz): add unit tests for question validation
chore(deps): update npm dependencies
```

### Branch Naming Convention

```
feature/<description>           # New features
feature/template-v2-<component> # Template v2 specific features
feature/v1-maintenance-<fix>   # Current template fixes
hotfix/<description>           # Production hotfixes
release/<version>              # Release preparation
```

### Working Directory Management

#### Before Switching Branches:
```bash
# Save current work
git stash push -m "WIP: current work in progress"

# Or commit work
git add .
git commit -m "WIP: temporary save before branch switch"
```

#### After Switching Branches:
```bash
# Restore stashed work
git stash pop

# Or continue from where you left off
```

## 🚨 Emergency Procedures

### Production Issue Response

#### Step 1: Immediate Assessment
```bash
# Check current production state
git checkout main
git log --oneline -10  # Recent commits
git tag -l             # Current version tags
```

#### Step 2: Quick Fix
```bash
# Create hotfix branch
git checkout -b hotfix/emergency-production-fix

# Make minimal fix
# ... only necessary changes ...

# Test locally
npm run test:topic -- --topic=AffectedTopic

# Commit and deploy
git add .
git commit -m "hotfix: emergency fix for production issue [IMPACT-XXX]"
git checkout main
git merge hotfix/emergency-production-fix
git push origin main
```

#### Step 3: Rollback (If Needed)
```bash
# Identify last known good version
git log --oneline --grep="Release" --all

# Rollback to previous tag
git checkout v1.0.0
git checkout -b rollback-to-v1.0.0

# Force push rollback (DANGEROUS - use with caution)
git push origin main --force-with-lease
```

### Branch Recovery Procedures

#### If Branch is Deleted Accidentally:
```bash
# Recover from remote
git fetch origin
git checkout -b recovered-branch origin/feature/template-v2

# Or from reflog
git reflog
git checkout -b recovered-branch <commit-hash>
```

#### If Merge Goes Wrong:
```bash
# Abort merge
git merge --abort

# Or reset to before merge
git reset --hard HEAD~1

# Or use reflog to find previous state
git reflog
git reset --hard <commit-hash-before-merge>
```

## ✅ Best Practices

### Code Quality

#### Before Any Merge:
```bash
# Run tests
npm test

# Validate topics
npm run validate

# Build project
npm run build:all

# Lint code
npm run lint

# Test specific functionality
npm run test:topic -- --topic=YourTopic
```

#### Code Review Checklist:
- [ ] Tests pass
- [ ] No linting errors
- [ ] Documentation updated
- [ ] Breaking changes noted
- [ ] Security implications considered
- [ ] Performance impact assessed

### Branch Hygiene

#### Regular Maintenance:
```bash
# Clean up stale branches
git remote prune origin

# Delete merged local branches
git branch --merged | grep -v "main\|develop" | xargs git branch -d

# Sync with remote
git fetch --prune
```

#### Keep Main Clean:
- **NEVER** commit directly to main
- **ALWAYS** merge through PR or careful review
- **ALWAYS** test before merging to main
- **ALWAYS** tag releases

### Collaboration Guidelines

#### Before Starting Work:
1. Pull latest changes
2. Check if someone is already working on similar feature
3. Create descriptive branch names
4. Update documentation

#### During Development:
1. Commit frequently with clear messages
2. Push regularly to backup work
3. Run tests locally before pushing
4. Update README/docs as needed

#### Before Merging:
1. All tests must pass
2. Code must be reviewed
3. Documentation must be updated
4. Breaking changes must be communicated

## 🔧 Troubleshooting

### Common Issues

#### Merge Conflicts
```bash
# Identify conflict files
git status

# Resolve conflicts manually
# Edit conflicted files

# Mark as resolved
git add <conflicted-file>

# Continue merge
git merge --continue

# Or abort if needed
git merge --abort
```

#### Push Rejected
```bash
# If push is rejected (non-fast-forward)
git pull --rebase origin <branch-name>

# Or
git pull origin <branch-name>
git push origin <branch-name>
```

#### Detached HEAD
```bash
# If you're in detached HEAD state
git checkout main  # or any other branch

# Or create new branch from current state
git checkout -b new-branch-name
```

#### Remote Branch Issues
```bash
# Update remote information
git remote update origin --prune

# Check remote branches
git branch -r

# Track remote branch
git checkout --track origin/feature/template-v2
```

### Getting Help

#### Useful Commands:
```bash
# Show branch graph
git log --graph --oneline --all

# Show who changed what
git blame <file>

# Show commit details
git show <commit-hash>

# Search commits
git log --grep="search term"

# Show changes between branches
git diff main..feature/template-v2
```

#### Reset to Known Good State:
```bash
# Hard reset to last commit (DANGEROUS)
git reset --hard HEAD

# Reset to specific commit
git reset --hard <commit-hash>

# Soft reset (keep changes)
git reset --soft HEAD~1
```

## 📋 Quick Reference

### Essential Commands
```bash
# Branch operations
git branch -a                          # List all branches
git checkout <branch>                  # Switch branch
git checkout -b <new-branch>           # Create and switch
git push -u origin <branch>            # Push new branch

# Sync operations
git pull origin <branch>               # Pull changes
git push origin <branch>               # Push changes
git fetch --prune                      # Update remote info

# Merge operations
git merge <branch>                     # Merge branch
git merge --abort                      # Abort merge
git rebase <branch>                    # Rebase branch

# Status and history
git status                             # Working directory status
git log --oneline -10                  # Recent commits
git diff                               # Show changes
```

### Branch Switching Flow
```bash
# Save work
git stash push -m "WIP message"

# Switch branch
git checkout <target-branch>

# Restore work
git stash pop

# Or commit before switching
git add .
git commit -m "WIP: save before branch switch"
git checkout <target-branch>
```

### Emergency Rollback
```bash
# Identify last good version
git tag -l
git log --oneline -5

# Reset to tag
git checkout v1.0.0
git checkout -b emergency-rollback

# Force push (EXTREME CAUTION)
git push origin main --force-with-lease
```

---

## 📞 Support & Maintenance

This document should be updated whenever:
- New branch types are introduced
- Workflow processes change
- New team members join
- Emergency procedures are tested

**Last Updated**: [Current Date]
**Maintainer**: [Your Name/Team]
**Version**: 1.0

For questions or issues with this branching strategy, please contact the development team or create an issue in the project repository.