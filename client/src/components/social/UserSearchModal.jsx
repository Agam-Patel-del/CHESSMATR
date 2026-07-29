import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { PATHS } from "../../app/routes/paths";
import { SearchIcon, CrossIcon } from "../common/Icons";
import "./UserSearchModal.css";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

export const UserSearchModal = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);
  const navigate = useNavigate();

  const abortControllerRef = useRef(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
    if (!isOpen) {
      if (abortControllerRef.current) abortControllerRef.current.abort();
      setQuery("");
      setResults([]);
      setHasSearched(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  const searchUsers = async (searchQuery) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/users/search?q=${encodeURIComponent(searchQuery.trim())}`,
        {
          credentials: "include",
          signal: abortControllerRef.current.signal,
        }
      );
      if (res.ok) {
        const data = await res.json();
        setResults(data);
      } else {
        setResults([]);
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        setResults([]);
      }
    } finally {
      if (!abortControllerRef.current?.signal.aborted) {
        setIsLoading(false);
        setHasSearched(true);
      }
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setQuery(value);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      searchUsers(value);
    }, 300);
  };

  const handleUserClick = (userId) => {
    onClose();
    navigate(PATHS.PROFILE(userId));
  };

  if (!isOpen) return null;

  return (
    <div className="search-modal-overlay" onClick={onClose}>
      <div className="search-modal" onClick={(e) => e.stopPropagation()}>
        {/* Search Header */}
        <div className="search-modal-header">
          <span className="search-modal-icon">
            <SearchIcon size={18} />
          </span>
          <input
            ref={inputRef}
            type="text"
            className="search-modal-input"
            placeholder="Search players by username..."
            value={query}
            onChange={handleInputChange}
            autoComplete="off"
            spellCheck="false"
          />
          <button className="search-modal-close" onClick={onClose}>
            <CrossIcon size={16} />
          </button>
        </div>

        {/* Results */}
        <div className="search-modal-body">
          {isLoading && (
            <div className="search-modal-loading">
              <div className="search-loading-spinner" />
              Searching...
            </div>
          )}

          {!isLoading && hasSearched && results.length === 0 && (
            <div className="search-modal-empty">
              No players found matching "{query}"
            </div>
          )}

          {!isLoading &&
            results.map((resultUser) => (
              <div
                key={resultUser.id}
                className="search-result-item"
                onClick={() => handleUserClick(resultUser.id)}
              >
                <div className="search-result-avatar">
                  {resultUser.username[0].toUpperCase()}
                </div>
                <div className="search-result-info">
                  <div className="search-result-username">
                    {resultUser.username}
                  </div>
                  <div className="search-result-stats">
                    {resultUser.stats?.gamesPlayed || 0} games •{" "}
                    {resultUser.stats?.wins || 0}W /{" "}
                    {resultUser.stats?.losses || 0}L
                  </div>
                </div>
              </div>
            ))}

          {!isLoading && !hasSearched && (
            <div className="search-modal-empty">
              Start typing to find players
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="search-modal-footer">
          <kbd>Esc</kbd> to close
        </div>
      </div>
    </div>
  );
};
