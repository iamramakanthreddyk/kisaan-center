import React, { useState, useRef, useEffect } from 'react';
import { Search, Clock, ArrowRight, Hash, User, Package, FileText } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Link } from 'react-router-dom';

interface SearchResult {
  id: string;
  title: string;
  description: string;
  url: string;
  type: 'transaction' | 'user' | 'product' | 'page';
  metadata?: string;
}

// TODO: Implement real search functionality
// Available API endpoints: /plans/search, product search in services
// For now, search is simplified - would need proper implementation

const getSearchIcon = (type: string) => {
  switch (type) {
    case 'transaction': return <Hash className="h-4 w-4 text-emerald-500" />;
    case 'user': return <User className="h-4 w-4 text-blue-500" />;
    case 'product': return <Package className="h-4 w-4 text-orange-500" />;
    case 'page': return <FileText className="h-4 w-4 text-purple-500" />;
    default: return <Search className="h-4 w-4 text-gray-500" />;
  }
};

// Recent searches would come from localStorage or user preferences
const recentSearches: string[] = [];

export const SearchDropdown: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // TODO: Implement real search API calls here
    // For now, clear results when searching
    if (query.trim()) {
      // Would call API endpoints like /plans/search, /products/search, etc.
      setResults([]);
    } else {
      setResults([]);
    }
  }, [query]);

  const handleOpen = () => {
    setIsOpen(true);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleClose = () => {
    setIsOpen(false);
    setQuery('');
    setResults([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleClose();
    }
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={handleOpen}
        title="Search"
      >
        <Search className="h-4 w-4" />
      </Button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={handleClose}
          />
          
          {/* Search Dropdown */}
          <div className="absolute right-0 top-full mt-2 w-96 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 max-h-96 flex flex-col">
            {/* Search Input */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  ref={inputRef}
                  type="text"
                  placeholder="Search transactions, products, users..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="pl-10 pr-4"
                />
              </div>
            </div>

            {/* Search Results */}
            <div className="flex-1 overflow-y-auto">
              {query.trim() === '' ? (
                // Recent searches when no query
                <div className="p-4">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3 flex items-center">
                    <Clock className="h-4 w-4 mr-2" />
                    Recent Searches
                  </h4>
                  <div className="space-y-2">
                    {recentSearches.map((search, index) => (
                      <button
                        key={index}
                        onClick={() => setQuery(search)}
                        className="w-full text-left px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
                      >
                        {search}
                      </button>
                    ))}
                  </div>
                </div>
              ) : results.length === 0 ? (
                // No results - search functionality needs API implementation
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                  <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Search functionality coming soon</p>
                  <p className="text-xs mt-1">Would search transactions, products, and users</p>
                </div>
              ) : (
                // Search results
                <div className="p-2">
                  <div className="space-y-1">
                    {results.map((result) => (
                      <Link
                        key={result.id}
                        to={result.url}
                        onClick={handleClose}
                        className="flex items-center gap-3 p-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors group"
                      >
                        {getSearchIcon(result.type)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {result.title}
                            </h4>
                            {result.metadata && (
                              <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                                {result.metadata}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-300 truncate">
                            {result.description}
                          </p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300" />
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-gray-200 dark:border-gray-700 text-center">
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Press <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">Esc</kbd> to close
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};