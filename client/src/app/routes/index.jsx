import React from "react";
import { createBrowserRouter } from "react-router-dom";
import { PATHS } from "./paths";

import { RootLayout } from "../layouts/RootLayout";
import { PublicLayout } from "../layouts/PublicLayout";
import { AuthLayout } from "../layouts/AuthLayout";
import { AppLayout } from "../layouts/AppLayout";
import { GameLayout } from "../layouts/GameLayout";

import { ProtectedRoute } from "./guards/ProtectedRoute";
import { GuestRoute } from "./guards/GuestRoute";

import { LandingPage } from "../../pages/landing/LandingPage";
import { LoginPage } from "../../pages/auth/LoginPage";
import { RegisterPage } from "../../pages/auth/RegisterPage";
import { ForgotPasswordPage } from "../../pages/auth/ForgotPasswordPage";
import { VerifyEmailPage } from "../../pages/auth/VerifyEmailPage";
import { ResetPasswordPage } from "../../pages/auth/ResetPasswordPage";
import { LobbyPage } from "../../pages/lobby/LobbyPage";
import { GamePage } from "../../pages/game/GamePage";
import { HistoryPage } from "../../pages/history/HistoryPage";
import { ProfilePage } from "../../pages/profile/ProfilePage";
import { FriendsPage } from "../../pages/friends/FriendsPage";
import { ReviewPage } from "../../pages/review/ReviewPage";
import { SettingsPage } from "../../pages/settings/SettingsPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    children: [
      {
        element: <PublicLayout />,
        children: [{ path: PATHS.HOME, element: <LandingPage /> }],
      },
      {
        element: <GuestRoute />,
        children: [
          {
            element: <AuthLayout />,
            children: [
              { path: PATHS.LOGIN, element: <LoginPage /> },
              { path: PATHS.REGISTER, element: <RegisterPage /> },
              { path: PATHS.FORGOT, element: <ForgotPasswordPage /> },
              { path: PATHS.VERIFY, element: <VerifyEmailPage /> },
              { path: PATHS.RESET, element: <ResetPasswordPage /> },
            ],
          },
        ],
      },
      {
        element: <ProtectedRoute />,
        children: [
          {
            element: <AppLayout />,
            children: [
              { path: PATHS.LOBBY, element: <LobbyPage /> },
              { path: PATHS.FRIENDS, element: <FriendsPage /> },
              { path: PATHS.HISTORY, element: <HistoryPage /> },
              { path: PATHS.PROFILE_PATTERN, element: <ProfilePage /> },
              { path: PATHS.REVIEW_PATTERN, element: <ReviewPage /> },
              { path: PATHS.SETTINGS, element: <SettingsPage /> },
            ],
          },
          {
            element: <GameLayout />,
            children: [{ path: PATHS.GAME_PATTERN, element: <GamePage /> }],
          },
        ],
      },
    ],
  },
]);
