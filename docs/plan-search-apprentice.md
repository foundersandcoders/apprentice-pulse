# Search Apprentice Feature - Implementation Plan

## Overview
Add a Search Apprentice card to the admin dashboard that allows users to quickly search for apprentices by name and navigate directly to their detail page.

## User Flow
1. User types in search field on admin dashboard
2. System shows live search results matching the query
3. User clicks on an apprentice from results
4. System navigates to apprentice detail page (`/admin/apprentices/[id]`)

## Technical Architecture

### 1. Search API Endpoint
**File**: `src/routes/api/apprentices/search/+server.ts`

- **Method**: GET
- **Query params**: `q` (search query)
- **Returns**: Array of matching apprentices with id, name, email, cohort
- **Search logic**:
  - Case-insensitive search
  - Matches against apprentice name
  - Returns up to 10 results
  - Orders by relevance/alphabetical

### 2. Search Component
**File**: `src/lib/components/SearchApprentice.svelte`

**Features**:
- Text input field with search icon
- Debounced search (300ms) to avoid excessive API calls
- Loading state while searching
- Dropdown results list
- Keyboard navigation (arrow keys + enter)
- Click outside to close
- Empty state when no results
- Error handling

**Props**:
- No props needed (self-contained)

**State**:
- `searchQuery`: Current search text
- `searchResults`: Array of apprentice results
- `isSearching`: Loading state
- `showResults`: Dropdown visibility
- `selectedIndex`: For keyboard navigation

### 3. Dashboard Integration
**File**: `src/routes/admin/+page.svelte`

**Add new card**:
```svelte
<a href="/admin/apprentices" class="group block...">
  <SearchApprentice />
</a>
```

**Card design**:
- Title: "Search Apprentice"
- Description: "Find and view apprentice details"
- Icon: 🔍 (magnifying glass)
- Color scheme: Purple (to differentiate from other cards)

### 4. Data Types
**File**: `src/lib/types/apprentice.ts`

```typescript
interface ApprenticeSearchResult {
  id: string;
  name: string;
  email: string;
  cohortNumber?: number;
  status: 'Active' | 'On Leave' | 'Off-boarded';
}
```

## Implementation Steps

### Phase 1: Backend
1. Create search API endpoint
2. Implement Airtable search logic
3. Add proper error handling
4. Test with various search queries

### Phase 2: Search Component
1. Create SearchApprentice component structure
2. Implement search input with debouncing
3. Add API integration
4. Implement results dropdown
5. Add keyboard navigation
6. Style component to match existing design

### Phase 3: Dashboard Integration
1. Add new card to admin dashboard
2. Integrate SearchApprentice component
3. Style card to match existing cards
4. Test navigation to apprentice details

### Phase 4: Polish & Testing
1. Add loading states
2. Implement error handling
3. Add empty states
4. Test edge cases
5. Ensure mobile responsiveness

## Component Structure

```svelte
<div class="search-apprentice">
  <div class="search-input-wrapper">
    <input
      type="text"
      placeholder="Search apprentices..."
      bind:value={searchQuery}
      on:input={handleSearch}
    />
    <svg class="search-icon">...</svg>
  </div>

  {#if showResults}
    <div class="search-results">
      {#if isSearching}
        <div class="loading">Searching...</div>
      {:else if searchResults.length > 0}
        <ul>
          {#each searchResults as result, index}
            <li>
              <a href="/admin/apprentices/{result.id}">
                <span class="name">{result.name}</span>
                <span class="email">{result.email}</span>
                {#if result.cohortNumber}
                  <span class="cohort">Cohort {result.cohortNumber}</span>
                {/if}
              </a>
            </li>
          {/each}
        </ul>
      {:else if searchQuery}
        <div class="no-results">No apprentices found</div>
      {/if}
    </div>
  {/if}
</div>
```

## Styling Considerations
- Match existing card styles (rounded corners, shadows, hover effects)
- Use purple color scheme for differentiation
- Dropdown should have z-index to appear above other content
- Mobile-first responsive design
- Smooth transitions for dropdown appearance

## API Response Example
```json
{
  "success": true,
  "apprentices": [
    {
      "id": "recXXXXXXXXXXXXX",
      "name": "John Doe",
      "email": "john.doe@example.com",
      "cohortNumber": 12,
      "status": "Active"
    }
  ]
}
```

## Error Handling
- Network errors: Show "Failed to search" message
- Empty results: Show "No apprentices found"
- Rate limiting: Implement debouncing
- Invalid input: Minimum 2 characters to search

## Performance Considerations
- Debounce search input (300ms)
- Limit results to 10 items
- Cancel previous search requests if new one initiated
- Cache recent searches (optional enhancement)

## Accessibility
- Proper ARIA labels for search input
- Keyboard navigation support
- Screen reader announcements for results
- Focus management when opening/closing dropdown

## Testing Checklist
- [ ] Search returns correct results
- [ ] Clicking result navigates to apprentice page
- [ ] Keyboard navigation works
- [ ] Click outside closes dropdown
- [ ] Debouncing prevents excessive API calls
- [ ] Error states display correctly
- [ ] Loading state shows during search
- [ ] Mobile responsive design works
- [ ] Accessibility features work

## Future Enhancements
- Search by email as well as name
- Search by cohort number
- Recent searches history
- Advanced filters (status, cohort, etc.)
- Fuzzy matching for typos