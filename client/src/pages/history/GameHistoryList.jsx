import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { PATHS } from "../../app/routes/paths";
import { useNotificationStore } from "../../hooks/useNotification";
import "./GameHistoryList.css";

const API_BASE = import.meta.env.VITE_API_BASE_URL;
const GAMES_PER_PAGE = 10;

export const GameHistoryList = ({
  userId,
  title = "Match History",
  subtitle = "Review and analyze past chess matches.",
  showCount = false,
  headerTag = "h3",
}) => {
  const [games, setGames] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalGames, setTotalGames] = useState(0);
  const [activeFilter, setActiveFilter] = useState("all");
  const addToast = useNotificationStore((s) => s.addToast);

  useEffect(() => {
    if (!userId) return;
    const controller = new AbortController();
    setIsLoading(true);

    const fetchGames = async () => {
      try {
        const queryParams = new URLSearchParams({
          page: currentPage,
          limit: GAMES_PER_PAGE,
        });
        if (activeFilter && activeFilter !== "all") {
          queryParams.append("result", activeFilter);
        }

        const res = await fetch(
          `${API_BASE}/api/users/${userId}/games?${queryParams.toString()}`,
          {
            credentials: "include",
            signal: controller.signal,
          }
        );

        if (res.ok) {
          const data = await res.json();
          setGames(data.games);
          setTotalPages(data.totalPages);
          setCurrentPage(data.currentPage);
          setTotalGames(data.totalGames);
        } else {
          addToast("Failed to fetch game history", "error");
        }
      } catch (err) {
        if (err.name !== "AbortError") {
          console.error("Error fetching games:", err);
          addToast("Connection error. Could not fetch games.", "error");
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    fetchGames();

    return () => {
      controller.abort();
    };
  }, [userId, currentPage, activeFilter]);

  const handlePageChange = (page) => {
    if (page < 1 || page > totalPages || page === currentPage) return;
    setCurrentPage(page);
  };

  const handleFilterChange = (filter) => {
    if (filter === activeFilter) return;
    setCurrentPage(1);
    setActiveFilter(filter);
  };

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      let start = Math.max(1, currentPage - 2);
      let end = Math.min(totalPages, start + maxVisible - 1);
      if (end - start < maxVisible - 1) {
        start = Math.max(1, end - maxVisible + 1);
      }

      if (start > 1) {
        pages.push(1);
        if (start > 2) pages.push("...");
      }

      for (let i = start; i <= end; i++) pages.push(i);

      if (end < totalPages) {
        if (end < totalPages - 1) pages.push("...");
        pages.push(totalPages);
      }
    }

    return pages;
  };

  const HeaderHeading = headerTag;

  return (
    <div className="game-history-card">
      <div className="game-history-header">
        <div className="game-history-header-top">
          <HeaderHeading>{title}</HeaderHeading>
          {showCount && totalGames > 0 && (
            <span className="game-history-count">{totalGames} games</span>
          )}
        </div>
        {subtitle && <p>{subtitle}</p>}
      </div>

      {/* Filter Tabs */}
      <div className="game-history-filters">
        <button
          className={`game-history-filter-btn ${activeFilter === "all" ? "active" : ""}`}
          onClick={() => handleFilterChange("all")}
        >
          All
        </button>
        <button
          className={`game-history-filter-btn ${activeFilter === "win" ? "active" : ""}`}
          onClick={() => handleFilterChange("win")}
        >
          Wins
        </button>
        <button
          className={`game-history-filter-btn ${activeFilter === "loss" ? "active" : ""}`}
          onClick={() => handleFilterChange("loss")}
        >
          Losses
        </button>
        <button
          className={`game-history-filter-btn ${activeFilter === "draw" ? "active" : ""}`}
          onClick={() => handleFilterChange("draw")}
        >
          Draws
        </button>
      </div>

      {/* Table Wrapper */}
      <div className="game-history-table-wrapper">
        {isLoading ? (
          <div className="game-history-loading-state">Loading game history...</div>
        ) : games.length > 0 ? (
          <>
            <table className="game-history-table">
              <thead>
                <tr>
                  <th>Opponent</th>
                  <th>Result</th>
                  <th>Reason</th>
                  <th>Moves</th>
                  <th>Time Control</th>
                  <th>Date Played</th>
                  <th>Review</th>
                </tr>
              </thead>
              <tbody>
                {games.map((g) => (
                  <tr key={g.id}>
                    <td>
                      {g.opponentId ? (
                        <Link
                          to={PATHS.PROFILE(g.opponentId)}
                          className="opponent-link"
                        >
                          {g.opponent}
                        </Link>
                      ) : (
                        <span style={{ fontWeight: 500 }}>{g.opponent}</span>
                      )}
                    </td>
                    <td>
                      <span className={`history-badge ${g.result}`}>
                        {g.result.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ color: "var(--text-secondary, #5C504D)" }}>
                      {g.reason === "checkmate"
                        ? "Checkmate"
                        : g.reason === "timeout"
                          ? "On time"
                          : g.reason === "resignation"
                            ? "Resignation"
                            : g.reason === "abandonment"
                              ? "Abandonment"
                              : g.reason === "draw_agreement"
                                ? "Draw offer"
                                : g.reason.replace(/_/g, " ")}
                    </td>
                    <td>{g.moves} moves</td>
                    <td>{g.timeControl}</td>
                    <td style={{ color: "var(--text-secondary, #5C504D)" }}>
                      {g.date}
                    </td>
                    <td>
                      <Link
                        to={PATHS.REVIEW(g.id)}
                        className="history-review-btn"
                      >
                        ♟ Analyze
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="game-history-pagination">
                <button
                  className="pagination-btn pagination-arrow"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  ◀ Prev
                </button>

                <div className="pagination-pages">
                  {getPageNumbers().map((p, i) =>
                    p === "..." ? (
                      <span
                        key={`ellipsis-${i}`}
                        className="pagination-ellipsis"
                      >
                        …
                      </span>
                    ) : (
                      <button
                        key={p}
                        className={`pagination-btn pagination-page ${currentPage === p ? "active" : ""}`}
                        onClick={() => handlePageChange(p)}
                      >
                        {p}
                      </button>
                    ),
                  )}
                </div>

                <button
                  className="pagination-btn pagination-arrow"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Next ▶
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="game-history-empty-state">
            {activeFilter === "all"
              ? "No matches recorded yet."
              : `No ${activeFilter} matches found.`}
          </div>
        )}
      </div>
    </div>
  );
};
