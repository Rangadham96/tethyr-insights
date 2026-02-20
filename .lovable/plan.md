

# Implement Auth: Route Protection, Trigger, and Sign-Out

## What's Already Done
- Auth page (`/auth`) with login/signup form -- fully styled
- `useAuth` hook with `signIn`, `signUp`, `signOut`, session tracking
- Route at `/auth` in App.tsx
- `handle_new_user()` database function exists (creates profile + team)

## What's Missing

### 1. Database trigger not attached
The `handle_new_user()` function exists but has no trigger connecting it to `auth.users`. New signups won't create profiles or teams, which will cause errors.

**Fix:** Create the trigger via migration:
```sql
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### 2. No route protection
The Index page is accessible without login. Anyone can use the app without signing in.

**Fix:** Create a `ProtectedRoute` component that checks auth state and redirects to `/auth` if not authenticated. Wrap the `/` route with it.

### 3. No sign-out button
Once logged in, there's no way to sign out.

**Fix:** Add a small sign-out button to the `LeftPanel` footer area (near the existing brand section), using the `signOut` function from `useAuth`.

### 4. Auth page should redirect if already logged in
If a user is already signed in and visits `/auth`, they should be redirected to `/`.

## Files to Change

| File | Change |
|------|--------|
| Migration SQL | Attach `handle_new_user` trigger to `auth.users` |
| `src/components/ProtectedRoute.tsx` | New component -- checks auth, redirects to `/auth` |
| `src/App.tsx` | Wrap `/` route with `ProtectedRoute` |
| `src/pages/Auth.tsx` | Redirect to `/` if already authenticated |
| `src/components/LeftPanel.tsx` | Add sign-out button in footer |

## Technical Details

**ProtectedRoute** will use `useAuth()` to check `loading` and `isAuthenticated`. While loading, show a simple centered spinner. If not authenticated, redirect to `/auth` via `<Navigate>`.

**Auth page redirect** will use `useAuth()` and `useNavigate()` in a `useEffect` to redirect authenticated users away from the login page.

**Sign-out button** will be a small text link in the LeftPanel footer styled consistently with the existing design (mono uppercase, subtle).
