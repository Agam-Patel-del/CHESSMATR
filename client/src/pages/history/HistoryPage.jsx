import React from "react";
import { useAuth } from "../../providers/AuthProvider";
import { GameHistoryList } from "./GameHistoryList";
import "./HistoryPage.css";

export const HistoryPage = () => {
  const { user } = useAuth();

  return (
    <div className="history-container">
      <GameHistoryList
        userId={user?.id}
        title="Match History"
        subtitle="Review and analyze your past chess matches."
        showCount={true}
        headerTag="h2"
      />
    </div>
  );
};
