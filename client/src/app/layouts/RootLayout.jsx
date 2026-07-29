import React from 'react';
import { Outlet } from 'react-router-dom';
import { NotificationProvider } from '../../providers/NotificationProvider';

export const RootLayout = () => {
  return (
    <NotificationProvider>
      <Outlet />
    </NotificationProvider>
  );
};
