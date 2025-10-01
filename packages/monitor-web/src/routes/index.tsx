import { createBrowserRouter } from 'react-router-dom';
import Home from '@/pages/Home';
import ErrorPage from '@/pages/Error';
import PerformancePage from '@/pages/Performance';
import BehaviorPage from '@/pages/Behavior';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Home />,
    errorElement: <ErrorPage />,
  },
  {
    path: '/error',
    element: <ErrorPage />,
  },
  {
    path: '/performance',
    element: <PerformancePage />,
  },
  {
    path: '/behavior',
    element: <BehaviorPage />,
  },
]);

export default router;
