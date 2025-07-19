class BlogSearch {
  constructor() {
    this.searchIndex = null;
    this.selectedTags = []; // Start with no tags to show all articles
    this.searchInput = null;
    this.activeSuggestionIndex = -1;
    this.init();
  }

  async init() {
    await this.loadSearchIndex();
    this.createSearchUI();
    this.bindEvents();
    this.performSearch(); // Initial search with default tag
  }

  async loadSearchIndex() {
    try {
      const response = await fetch('/search-index.json');
      this.searchIndex = await response.json();
      console.log('Search index loaded:', this.searchIndex.posts.length, 'articles');
    } catch (error) {
      console.error('Failed to load search index:', error);
      // Fallback - create empty index to prevent errors
      this.searchIndex = { posts: [], tags: [], categories: [], difficulties: [] };
    }
  }

  createSearchUI() {
    const container = document.getElementById('search-container');
    if (!container) return;

    container.innerHTML = `
      <div class="search-wrapper">
        <div class="tag-input-box">
          ${this.selectedTags.map(tag => 
            `<span class="tag" data-tag="${tag}">
              ${tag} <button class="tag-remove" onclick="blogSearch.removeTag('${tag}')">×</button>
            </span>`
          ).join('')}
          <input 
            type="text" 
            id="search-input" 
            placeholder="type tags separated by spaces..." 
            autocomplete="off"
          />
        </div>
        <div class="search-hint">
          Training, Features, and Beginner are good starting points.
        </div>
        <div class="tag-suggestions" id="tag-suggestions"></div>
      </div>
      <div class="search-results" id="search-results"></div>
    `;

    this.searchInput = document.getElementById('search-input');
  }

  bindEvents() {
    // Handle typing in search input
    this.searchInput.addEventListener('input', (e) => {
      this.showSuggestions(e.target.value);
    });

    // Show suggestions when clicking in input
    this.searchInput.addEventListener('focus', (e) => {
      this.showSuggestions(e.target.value);
    });

    // Handle keyboard navigation and tag selection
    this.searchInput.addEventListener('keydown', (e) => {
      const suggestionsEl = document.getElementById('tag-suggestions');
      const suggestions = suggestionsEl.querySelectorAll('.suggestion-item');
      
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        // If dropdown is hidden, show it again
        if (suggestionsEl.style.display === 'none' || !suggestionsEl.style.display) {
          this.showSuggestions(this.searchInput.value);
        } else {
          this.activeSuggestionIndex = Math.min(this.activeSuggestionIndex + 1, suggestions.length - 1);
          this.updateActiveSuggestion();
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.activeSuggestionIndex = Math.max(this.activeSuggestionIndex - 1, -1);
        this.updateActiveSuggestion();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (this.activeSuggestionIndex >= 0 && suggestions[this.activeSuggestionIndex]) {
          const tagText = suggestions[this.activeSuggestionIndex].querySelector('.suggestion-tag').textContent;
          this.addTag(tagText);
          this.hideSuggestions();
        } else if (e.target.value.trim()) {
          this.addTag(e.target.value.trim());
          e.target.value = '';
          this.hideSuggestions();
        }
      } else if (e.key === ' ' && e.target.value.trim()) {
        e.preventDefault();
        this.addTag(e.target.value.trim());
        e.target.value = '';
        this.hideSuggestions();
      } else if (e.key === 'Escape') {
        this.hideSuggestions();
      } else if (e.key === 'Backspace' && e.target.value === '' && this.selectedTags.length > 0) {
        e.preventDefault();
        const lastTag = this.selectedTags[this.selectedTags.length - 1];
        this.removeTag(lastTag);
      }
    });

    // Handle clicking outside to hide suggestions
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.search-wrapper')) {
        this.hideSuggestions();
      }
    });
  }

  showSuggestions(query) {
    if (!this.searchIndex) return this.hideSuggestions();

    let suggestions = [];
    
    if (!query || query.length === 0) {
      // Show popular/category tags when no query
      suggestions = ['Training', 'Features', 'Beginner', 'intermediate', 'advanced', 'ftp', 'zone2', 'intervals', 'zwift', 'indoor']
        .filter(tag => !this.selectedTags.some(selected => selected.toLowerCase() === tag.toLowerCase()))
        .slice(0, 8);
    } else {
      // Filter tags that match the query
      suggestions = this.searchIndex.tags
        .filter(tag => 
          tag.toLowerCase().includes(query.toLowerCase()) && 
          !this.selectedTags.some(selected => selected.toLowerCase() === tag.toLowerCase())
        )
        .slice(0, 8);
      
      // If no matches, show popular tags
      if (suggestions.length === 0) {
        suggestions = ['Training', 'Features', 'Beginner', 'ftp', 'zone2', 'intervals']
          .filter(tag => !this.selectedTags.some(selected => selected.toLowerCase() === tag.toLowerCase()))
          .slice(0, 4);
      }
    }

    const suggestionsEl = document.getElementById('tag-suggestions');
    
    if (suggestions.length === 0) {
      return this.hideSuggestions();
    }

    suggestionsEl.innerHTML = suggestions
      .map(tag => `
        <div class="suggestion-item" onclick="blogSearch.addTag('${tag}')">
          <span class="suggestion-tag">${tag}</span>
          <span class="suggestion-count">${this.getTagCount(tag)}</span>
        </div>
      `).join('');
    
    this.activeSuggestionIndex = -1; // Reset active index
    suggestionsEl.style.display = 'block';
  }

  updateActiveSuggestion() {
    const suggestions = document.querySelectorAll('.suggestion-item');
    suggestions.forEach((item, index) => {
      if (index === this.activeSuggestionIndex) {
        item.classList.add('active');
        item.scrollIntoView({ block: 'nearest' });
      } else {
        item.classList.remove('active');
      }
    });
  }

  getTagCount(tag) {
    if (!this.searchIndex) return 0;
    return this.searchIndex.posts.filter(post => 
      post.tags.some(postTag => postTag.toLowerCase().includes(tag.toLowerCase())) ||
      post.category.toLowerCase().includes(tag.toLowerCase()) ||
      post.difficulty.toLowerCase().includes(tag.toLowerCase())
    ).length;
  }

  hideSuggestions() {
    const suggestionsEl = document.getElementById('tag-suggestions');
    if (suggestionsEl) {
      suggestionsEl.style.display = 'none';
    }
  }

  addTag(tag) {
    // Normalize tag: trim whitespace and handle case sensitivity
    const normalizedTag = tag.trim();
    
    // Check for duplicates (case-insensitive)
    const isDuplicate = this.selectedTags.some(existingTag => 
      existingTag.toLowerCase() === normalizedTag.toLowerCase()
    );
    
    if (!isDuplicate && normalizedTag.length > 0) {
      this.selectedTags.push(normalizedTag);
      this.updateTagsUI();
      this.performSearch();
    }
    this.searchInput.value = '';
  }

  removeTag(tag) {
    this.selectedTags = this.selectedTags.filter(t => t !== tag);
    this.updateTagsUI();
    this.performSearch();
  }

  updateTagsUI() {
    const tagContainer = document.querySelector('.tag-input-box');
    const input = this.searchInput;
    
    // Remove existing tag elements but keep the input
    const existingTags = tagContainer.querySelectorAll('.tag');
    existingTags.forEach(tag => tag.remove());
    
    // Add new tag elements before the input
    this.selectedTags.forEach(tag => {
      const tagElement = document.createElement('span');
      tagElement.className = 'tag';
      tagElement.setAttribute('data-tag', tag);
      tagElement.innerHTML = `${tag} <button class="tag-remove" onclick="blogSearch.removeTag('${tag}')">×</button>`;
      tagContainer.insertBefore(tagElement, input);
    });
    
    input.focus();
  }

  performSearch() {
    if (!this.searchIndex) {
      this.displayResults([]);
      return;
    }

    // If no tags selected, show all articles
    if (this.selectedTags.length === 0) {
      this.displayResults(this.searchIndex.posts);
      return;
    }

    // Filter posts that contain ALL selected tags (AND logic) - case insensitive
    const results = this.searchIndex.posts.filter(post => {
      return this.selectedTags.every(selectedTag => {
        const tagLower = selectedTag.toLowerCase();
        return post.tags.some(postTag => 
          postTag.toLowerCase().includes(tagLower) ||
          post.title.toLowerCase().includes(tagLower)
        ) ||
        post.category.toLowerCase().includes(tagLower) ||
        post.difficulty.toLowerCase().includes(tagLower);
      });
    });

    this.displayResults(results);
  }

  displayResults(results) {
    const resultsEl = document.getElementById('search-results');
    
    if (results.length === 0) {
      const tagText = this.selectedTags.length > 0 ? this.selectedTags.join(', ') : 'your search';
      resultsEl.innerHTML = `
        <div class="no-results">
          <p>No articles found for: ${tagText}</p>
          <p>${this.selectedTags.length > 0 ? 'Try removing some tags or using different terms.' : 'Try adding some search tags above.'}</p>
        </div>
      `;
      return;
    }

    resultsEl.innerHTML = `
      <div class="results-header">
        <h3>${results.length} article${results.length === 1 ? '' : 's'} found</h3>
      </div>
      <div class="results-grid">
        ${results.map(post => `
          <article class="result-card">
            <div class="result-content">
              <h4><a href="/${post.slug}">${post.title}</a></h4>
              <p class="result-excerpt">${post.excerpt}</p>
              <div class="result-meta">
                <span class="category-badge category-${post.category.toLowerCase()}">${post.category}</span>
                ${post.category.toLowerCase() !== post.difficulty.toLowerCase() ? 
                  `<span class="difficulty-badge difficulty-${post.difficulty}">${post.difficulty}</span>` : 
                  ''
                }
              </div>
              <div class="result-tags">
                ${post.tags.slice(0, 4).map(tag => 
                  `<span class="result-tag" onclick="blogSearch.addTag('${tag}')">${tag}</span>`
                ).join('')}
                ${post.tags.length > 4 ? '<span class="more-tags">...</span>' : ''}
              </div>
            </div>
          </article>
        `).join('')}
      </div>
    `;
  }
}

// Initialize search when DOM is loaded
let blogSearch;
document.addEventListener('DOMContentLoaded', () => {
  blogSearch = new BlogSearch();
});