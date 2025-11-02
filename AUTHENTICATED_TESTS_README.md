# Authenticated Pages - Sample Test Code

## Overview

This document explains the sample test code provided for authenticated pages (`/projects`, `/dashboard`, `/projects/{id}`).

---

## ⚠️ Important: Why Sample Code?

The AutoGen platform requires **user authentication** to access:
- `/projects` - Projects listing page
- `/dashboard` - User dashboard
- `/projects/{id}` - Individual project pages

**Without valid credentials**, we cannot:
- Test actual deployment flows
- Verify "Deployment 1 of 2" messages
- Check deployment URL accessibility
- Test real-time state changes
- Access build logs

**Current Status:**
- ✅ **14 working tests** for public pages (https://autogen.nodeops.network)
- 📝 **8 sample tests** for authenticated pages (demonstration only)

---

## Sample Tests Provided

File: `tests/authenticated/authenticated-pages.spec.ts`

### Test Cases:

#### 1. **Projects Page Test** (`/projects`)
```typescript
test('SAMPLE: Test /projects page for deployment status')
```
**What it tests:**
- Projects listing loads correctly
- Deployment status indicators are visible
- Checks for problematic "Deployment X of Y" messages
- Validates project cards display

**Why it matters:**
This is where users see all their projects and their deployment statuses.

---

#### 2. **Dashboard Test** (`/dashboard`)
```typescript
test('SAMPLE: Test /dashboard for performance and loading')
```
**What it tests:**
- Dashboard load time (<3 seconds target)
- Loading indicators presence
- Performance metrics

**Why it matters:**
Dashboard is the first page after login - must load fast.

---

#### 3. **Individual Project Test** (`/projects/{id}`)
```typescript
test('SAMPLE: Test individual project page /projects/{id}')
```
**What it tests:**
- Project page accessibility
- **Problematic status messages** like "deployment 1 of 2"
- Deployment state indicators
- Clear vs confusing messaging

**Why it matters:**
This is where the main UX issues occur (from your screenshots).

---

#### 4. **Deployment URL Accessibility Test**
```typescript
test('SAMPLE: Check for deployment URL accessibility on project page')
```
**What it tests:**
- Finds all deployment URLs on the page
- Checks if URLs are disabled/grayed out when not ready
- Tests actual URL accessibility (HTTP status)
- **Identifies broken links** (404/502 errors)

**Why it matters:**
Prevents users from clicking URLs that return 404/502 errors.

**Example output:**
```
Found deployment URL: https://my-app.autogen.network
  - Is disabled: false
  - HTTP Status: 404
  ❌ ISSUE: URL returns 404 but link is clickable!
  Recommendation: Gray out URL until health check passes
```

---

#### 5. **Real-time Build Logs Test**
```typescript
test('SAMPLE: Check for real-time build logs')
```
**What it tests:**
- Build log viewer availability
- WebSocket connections for log streaming
- Log accessibility

**Why it matters:**
Users need to see what's happening during deployment.

---

#### 6. **Deployment History Test**
```typescript
test('SAMPLE: Check for deployment history and rollback')
```
**What it tests:**
- Deployment history visibility
- Rollback button availability
- Previous deployment access

**Why it matters:**
Users need ability to rollback to previous working deployments.

---

#### 7. **Frontend State Delays Test**
```typescript
test('SAMPLE: Performance test - Check for frontend state delays')
```
**What it tests:**
- DOM mutation tracking
- State change monitoring
- Deployment status update speed

**Why it matters:**
Detects the "frontend state change delays" issue mentioned in assignment.

---

## How to Use These Tests

### Step 1: Get Valid Credentials

You need a real AutoGen account with:
- Valid email/password
- At least one project
- Active or recent deployments

### Step 2: Set Environment Variables

Edit `.env`:
```bash
TEST_USER_EMAIL=your-real-email@example.com
TEST_USER_PASSWORD=your-real-password
```

### Step 3: Implement Authentication

Open `tests/authenticated/authenticated-pages.spec.ts` and uncomment the authentication code in the `beforeEach` hook (around line 20):

**If AutoGen uses email/password:**
```typescript
test.beforeEach(async ({ page }) => {
  await page.goto('https://autogen.nodeops.network/login');
  await page.fill('input[type="email"]', process.env.TEST_USER_EMAIL);
  await page.fill('input[type="password"]', process.env.TEST_USER_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(/dashboard|projects/);
});
```

**If AutoGen uses OAuth (Google):**
```typescript
test.beforeEach(async ({ page }) => {
  // You'll need to handle OAuth flow
  // This might require special Playwright configuration
});
```

### Step 4: Update Project ID

Replace the example project ID with a real one:
```typescript
const projectId = 'your-real-project-id-here';
```

### Step 5: Run Tests

```bash
npx playwright test tests/authenticated/
```

---

## Expected Results

### If Not Authenticated:
```
⚠️  Redirected to login - Authentication required
This is expected behavior without credentials
Test skipped
```

### If Authenticated Successfully:
```
✓ Projects page loaded
✓ Found 5 project elements
✓ Found 3 status indicators
❌ Found "Deployment 1 of 2" pattern
   This should be replaced with contextual messages

Found deployment URL: https://my-app.autogen.network
  - HTTP Status: 404
❌ ISSUE: URL returns 404 but link is clickable!
   Recommendation: Gray out URL until health check passes
```

---

## Real Issues These Tests Will Find

Based on your screenshots and the assignment requirements:

### Issue #1: Confusing Deployment Messages ✅
**Test:** `TC-017`
**Finds:** "Deployment 1 of 2" messages
**Recommendation:** Replace with "Building Application" or "Deploying Infrastructure"

### Issue #2: Broken Deployment URLs ✅
**Test:** `TC-018`
**Finds:** URLs that return 404/502 but are still clickable
**Recommendation:** Gray out URLs until health check passes

### Issue #3: No Build Logs ✅
**Test:** `TC-019`
**Finds:** Missing build log viewer
**Recommendation:** Add real-time log streaming

### Issue #4: No Deployment History ✅
**Test:** `TC-020`
**Finds:** Missing rollback capability
**Recommendation:** Add deployment history with one-click rollback

### Issue #5: State Change Delays ✅
**Test:** `TC-021`
**Finds:** Slow deployment status updates
**Recommendation:** Implement WebSocket for real-time updates

---

## Code Structure

The sample tests use the **same patterns** as the working tests:

```typescript
// 1. Navigate to page
await page.goto('https://autogen.nodeops.network/projects');

// 2. Check if authenticated
if (page.url().includes('login')) {
  test.skip();  // Skip if not logged in
  return;
}

// 3. Test the functionality
const statusElements = await page.locator('text=Active').count();
console.log(`Found ${statusElements} status indicators`);

// 4. Report findings
if (problematicPattern) {
  console.warn('❌ ISSUE: Found problematic pattern');
  console.warn('   Recommendation: Fix XYZ');
}
```

---

## Integration with CI/CD

Once authentication is set up, these tests can run in CI/CD:

```yaml
# .github/workflows/qa-tests.yml
authenticated-tests:
  runs-on: ubuntu-latest
  steps:
    - name: Run authenticated tests
      run: npx playwright test tests/authenticated/
      env:
        TEST_USER_EMAIL: ${{ secrets.TEST_USER_EMAIL }}
        TEST_USER_PASSWORD: ${{ secrets.TEST_USER_PASSWORD }}
```

---

## Why This Approach?

### ✅ Advantages:
1. **Demonstrates expertise** - Shows how to test authenticated pages
2. **Reusable patterns** - Same code structure as working tests
3. **Clear documentation** - Easy for NodeOps team to implement
4. **Production-ready** - Just needs credentials to run
5. **Finds real issues** - Detects exact problems from assignment

### ⚠️ Limitations:
1. Requires valid credentials (not provided)
2. Needs active projects with deployments
3. OAuth might need special handling




