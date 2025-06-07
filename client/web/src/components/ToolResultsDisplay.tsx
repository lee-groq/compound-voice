import React, { useState, useEffect } from 'react';

interface ToolResult {
  title: string;
  url: string;
  score: number;
}

interface ToolResultsDisplayProps {
  results: ToolResult[];
  onClose?: () => void;
}

interface LinkPreview {
  title: string;
  description: string;
  image?: string;
  favicon?: string;
  url: string;
  error?: string;
}

interface PreviewData {
  preview: LinkPreview | null;
  isLoading: boolean;
  error: string | null;
}

const ToolResultsDisplay: React.FC<ToolResultsDisplayProps> = ({ results, onClose }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [previewData, setPreviewData] = useState<{[key: number]: PreviewData}>({});
  const [urlCache, setUrlCache] = useState<{[key: number]: string}>({});
  
  console.log('[FRONTEND DEBUG ToolResultsDisplay] Rendering with results:', results);
  
  // Fetch only favicon for a tab
  const fetchFaviconOnly = async (url: string, index: number) => {
    console.log(`[FRONTEND DEBUG ToolResultsDisplay] Fetching favicon for tab ${index}: ${url}`);
    
    try {
      const response = await fetch(`/api/link-preview?url=${encodeURIComponent(url)}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch preview: ${response.status}`);
      }
      
      const preview: LinkPreview = await response.json();
      
      // Only update favicon, keep other data as is
      setPreviewData(prev => ({
        ...prev,
        [index]: { 
          preview: { ...preview }, 
          isLoading: false, 
          error: null 
        }
      }));
      
    } catch (error) {
      console.error('Error fetching favicon:', error);
      // Don't set error state for favicon-only fetches
    }
  };

  // Fetch link preview using our API
  const fetchLinkPreview = async (url: string, index: number) => {
    console.log(`[FRONTEND DEBUG ToolResultsDisplay] Fetching full preview for tab ${index}: ${url}`);
    
    // Set loading state, but preserve existing favicon if we have it
    setPreviewData(prev => ({
      ...prev,
      [index]: { 
        preview: prev[index]?.preview || null, 
        isLoading: true, 
        error: null 
      }
    }));

    // Update URL cache
    setUrlCache(prev => ({
      ...prev,
      [index]: url
    }));

    try {
      const response = await fetch(`/api/link-preview?url=${encodeURIComponent(url)}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch preview: ${response.status}`);
      }
      
      const preview: LinkPreview = await response.json();
      
      setPreviewData(prev => ({
        ...prev,
        [index]: { preview, isLoading: false, error: null }
      }));
      
    } catch (error) {
      console.error('Error fetching link preview:', error);
      setPreviewData(prev => ({
        ...prev,
        [index]: { 
          preview: prev[index]?.preview || null, // Preserve favicon if we have it
          isLoading: false, 
          error: 'Failed to load link preview. The website may not allow previews.' 
        }
      }));
    }
  };

  // Clear preview data when results change
  useEffect(() => {
    console.log('[FRONTEND DEBUG ToolResultsDisplay] Results changed, clearing preview cache');
    setPreviewData({});
    setUrlCache({});
    setActiveTab(0); // Reset to first tab when results change
    
    // Fetch favicons for all tabs immediately
    if (results && results.length > 0) {
      results.forEach((result, index) => {
        fetchFaviconOnly(result.url, index);
      });
    }
  }, [results]);

  // Load preview when tab becomes active or URL changes
  useEffect(() => {
    if (results && results.length > 0) {
      const currentResult = results[activeTab];
      if (currentResult) {
        const cachedUrl = urlCache[activeTab];
        const urlChanged = cachedUrl && cachedUrl !== currentResult.url;
        const hasNoUrlCached = !cachedUrl;
        
        // Only fetch full preview if we haven't cached this URL yet or URL changed
        if (hasNoUrlCached || urlChanged) {
          console.log(`[FRONTEND DEBUG ToolResultsDisplay] Loading full preview for tab ${activeTab}: hasNoUrlCached=${hasNoUrlCached}, urlChanged=${urlChanged}`);
          fetchLinkPreview(currentResult.url, activeTab);
        }
      }
    }
  }, [activeTab, results, urlCache]);
  
  if (!results || results.length === 0) {
    console.log('[FRONTEND DEBUG ToolResultsDisplay] No results, rendering null.');
    return null;
  }

  // Generate fallback content
  const generateFallbackContent = (result: ToolResult) => {
    return (
      <div className="p-6 leading-relaxed">
        <h2 className="text-groq-content-text mb-4 text-xl font-bold">
          {result.title}
        </h2>
        <div className="mb-3 text-sm text-groq-accent-text">
          <strong className="text-groq-content-text">URL:</strong> 
          <a href={result.url} target="_blank" rel="noopener noreferrer" className="text-groq-action-text hover:text-groq-accent-text-active transition-colors duration-200 ml-2 break-all">
            {result.url}
          </a>
        </div>
        <div className="mb-6 text-sm text-groq-accent-text">
          <strong className="text-groq-content-text">Relevance Score:</strong> 
          <span className="ml-2 font-semibold text-groq-action-text">{result.score.toFixed(2)}</span>
        </div>
        
        <div className="bg-groq-content-bg-darker p-5 rounded-xl border border-groq-accent-border">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-groq-action-text rounded-full flex items-center justify-center flex-shrink-0 mt-1">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <p className="text-groq-content-text mb-3 font-medium">
                This website preview couldn&apos;t be loaded. This may be due to the website&apos;s security settings 
                or privacy restrictions.
              </p>
              <p className="text-groq-content-text">
                <strong>Click the link above to visit the webpage directly.</strong>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render link preview content
  const renderPreviewContent = (result: ToolResult, index: number) => {
    const data = previewData[index];
    
    if (!data) {
      return (
        <div className="p-8 flex items-center justify-center">
          <div className="text-groq-accent-text font-medium">Click to load preview...</div>
        </div>
      );
    }

    if (data.isLoading) {
      return (
        <div className="p-6">
          {/* Enhanced skeleton loader */}
          <div className="border border-groq-accent-border rounded-xl overflow-hidden bg-white">
            {/* Image skeleton */}
            <div className="aspect-video bg-gradient-to-r from-groq-content-bg-darker via-gray-200 to-groq-content-bg-darker animate-pulse"></div>
            
            {/* Content skeleton */}
            <div className="p-5 space-y-4">
              {/* Title skeleton - 2 lines */}
              <div className="space-y-3">
                <div className="h-6 bg-gradient-to-r from-groq-content-bg-darker via-gray-200 to-groq-content-bg-darker rounded-lg animate-pulse w-3/4"></div>
                <div className="h-6 bg-gradient-to-r from-groq-content-bg-darker via-gray-200 to-groq-content-bg-darker rounded-lg animate-pulse w-1/2"></div>
              </div>
              
              {/* Description skeleton - 3 lines */}
              <div className="space-y-2">
                <div className="h-4 bg-gradient-to-r from-groq-content-bg-darker via-gray-200 to-groq-content-bg-darker rounded animate-pulse w-full"></div>
                <div className="h-4 bg-gradient-to-r from-groq-content-bg-darker via-gray-200 to-groq-content-bg-darker rounded animate-pulse w-5/6"></div>
                <div className="h-4 bg-gradient-to-r from-groq-content-bg-darker via-gray-200 to-groq-content-bg-darker rounded animate-pulse w-2/3"></div>
              </div>
              
              {/* URL skeleton */}
              <div className="h-3 bg-gradient-to-r from-groq-content-bg-darker via-gray-200 to-groq-content-bg-darker rounded animate-pulse w-1/3"></div>
              
              {/* Button skeleton */}
              <div className="h-10 bg-gradient-to-r from-groq-content-bg-darker via-gray-200 to-groq-content-bg-darker rounded-lg animate-pulse w-36"></div>
            </div>
          </div>
          
          {/* Score skeleton */}
          <div className="mt-6">
            <div className="h-5 bg-gradient-to-r from-groq-content-bg-darker via-gray-200 to-groq-content-bg-darker rounded animate-pulse w-48"></div>
          </div>
        </div>
      );
    }

    if (data.error || !data.preview) {
      return generateFallbackContent(result);
    }

    const preview = data.preview;

    return (
      <div className="p-6 leading-relaxed">
        {/* Enhanced Preview Card */}
        <div className="border border-groq-accent-border rounded-xl overflow-hidden bg-white hover:shadow-xl hover:border-groq-action-text transition-all duration-300 transform hover:-translate-y-1">
          {preview.image && (
            <div className="aspect-video bg-groq-content-bg-darker overflow-hidden relative group">
              <img 
                src={preview.image} 
                alt={preview.title}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </div>
          )}
          
          <div className="p-5">
            <h2 className="text-groq-content-text mb-3 text-xl font-bold line-clamp-2 leading-tight">
              {preview.title}
            </h2>
            
            <p className="text-groq-accent-text text-sm mb-4 line-clamp-3 leading-relaxed">
              {preview.description}
            </p>
            
            <div className="text-xs text-groq-accent-text mb-5 bg-groq-content-bg-darker px-3 py-2 rounded-lg">
              <strong className="text-groq-content-text">URL:</strong> 
              <span className="break-all ml-2">{preview.url}</span>
            </div>
            
            <a 
              href={preview.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center px-6 py-3 bg-groq-action-text text-white text-sm font-semibold rounded-lg hover:bg-groq-accent-text-active transition-all duration-200 transform hover:scale-105 hover:shadow-lg group"
            >
              <span>Visit Website</span>
              <svg className="ml-2 w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        </div>

        {/* Enhanced Score Display */}
        <div className="mt-6 flex items-center gap-3 bg-groq-content-bg-darker px-4 py-3 rounded-lg">
          <div className="w-8 h-8 bg-groq-action-text rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </div>
          <div>
            <div>
              <span className="text-groq-content-text font-semibold">Relevance Score:</span>
              <span className="ml-2 text-groq-action-text font-bold text-lg">{result.score.toFixed(2)}</span>
            </div>
            <div className="text-xs text-groq-accent-text mt-1">
              Determined by Compound-beta on Groq
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="animate-in slide-in-from-right duration-500">
      {/* Modern Header with Close Button */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-groq-content-text text-lg font-bold mb-2">Search Results</h3>
          <p className="text-groq-accent-text text-sm">Found {results.length} relevant {results.length === 1 ? 'result' : 'results'}</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-full bg-groq-content-bg-darker hover:bg-groq-accent-border text-groq-accent-text hover:text-groq-content-text transition-all duration-200 group"
            title="Close search results"
          >
            <svg 
              className="w-5 h-5 transition-transform duration-200 group-hover:scale-110" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Modern Tab Navigation */}
      <div className="bg-white rounded-xl shadow-lg border border-groq-accent-border overflow-hidden">
        <div className="flex overflow-x-auto bg-groq-neutral-bg border-b border-groq-accent-border">
          {results.map((result, index) => {
            const isActive = activeTab === index;
            
            return (
              <button
                key={index}
                onClick={() => setActiveTab(index)}
                className={`
                  flex items-center gap-3 px-6 py-4 text-sm font-medium transition-all duration-200 relative flex-shrink-0 min-w-0
                  ${isActive 
                    ? 'bg-white text-groq-content-text border-b-2 border-groq-action-text shadow-sm' 
                    : 'text-groq-accent-text hover:text-groq-content-text hover:bg-white/50'
                  }
                `}
                title={result.title}
              >
                {/* Favicon */}
                <div className="w-5 h-5 flex-shrink-0 flex items-center justify-center">
                  {previewData[index]?.preview?.favicon ? (
                    <img 
                      src={previewData[index]?.preview?.favicon} 
                      alt=""
                      className="w-5 h-5 rounded-sm"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-5 h-5 bg-groq-action-text rounded-sm flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.083 9h1.946c.089-1.546.383-2.97.837-4.118A6.004 6.004 0 004.083 9zM10 2a8 8 0 100 16 8 8 0 000-16zm0 2c-.076 0-.232.032-.465.262-.238.234-.497.623-.737 1.182-.389.907-.673 2.142-.766 3.556h3.936c-.093-1.414-.377-2.649-.766-3.556-.24-.559-.499-.948-.737-1.182C10.232 4.032 10.076 4 10 4zm3.971 5c-.089-1.546-.383-2.97-.837-4.118A6.004 6.004 0 0115.917 9h-1.946zm-2.003 2H8.032c.093 1.414.377 2.649.766 3.556.24.559.499.948.737 1.182.233.23.389.262.465.262.076 0 .232-.032.465-.262.238-.234.497-.623.737-1.182.389-.907.673-2.142.766-3.556zm1.166 4.118c.454-1.147.748-2.572.837-4.118h1.946a6.004 6.004 0 01-2.783 4.118zm-6.268 0C6.412 13.97 6.118 12.546 6.03 11H4.083a6.004 6.004 0 002.783 4.118z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>
                
                {/* Title with truncation */}
                <span className="truncate max-w-[200px]">
                  {result.title}
                </span>
                
                {/* Score badge */}
                <div className={`
                  px-2 py-1 rounded-full text-xs font-semibold flex-shrink-0
                  ${isActive 
                    ? 'bg-groq-action-text text-white' 
                    : 'bg-groq-content-bg-darker text-groq-accent-text'
                  }
                `}>
                  {result.score.toFixed(2)}
                </div>
                
                {/* Loading indicator */}
                {previewData[index]?.isLoading && (
                  <div className="w-4 h-4 flex-shrink-0">
                    <svg className="animate-spin w-4 h-4 text-groq-action-text" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                )}
              </button>
            );
          })}
        </div>
        
        {/* Content Area */}
        <div className="bg-white min-h-[400px] transition-all duration-300">
          {renderPreviewContent(results[activeTab], activeTab)}
        </div>
      </div>
    </div>
  );
};

export default ToolResultsDisplay;