import { createBrowserRouter } from 'react-router-dom';
import Layout from '@/pages/Home/components/Layout';
import HomePage from '@/pages/Home';
import ErrorPage from '@/pages/Error';
import PerformancePage from '@/pages/Performance';
import BehaviorPage from '@/pages/Behavior';
import TrackingTestPage from '@/pages/TrackingTest';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: 'error',
        element: <ErrorPage />,
      },
      {
        path: 'performance',
        element: <PerformancePage />,
      },
      {
        path: 'behavior',
        element: <BehaviorPage />,
      },
      {
        path: 'tracking-test',
        element: <TrackingTestPage />,
      },
    ],
  },
]);

export default router;
