import { createBrowserRouter } from 'react-router';
import Home from '../page/home';
import Error from '../page/error';
import Behavior from '../page/behavior';
import Performance from '../page/performance';
import Exception from '../page/exception';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Home />,
    children: [
      {
        path: 'behavior',
        element: <Behavior />,
      },
      {
        path: 'performance',
        element: <Performance />,
      },
      {
        path: 'exception',
        element: <Exception />,
      },
      {
        path: 'error',
        element: <Error />,
      },
    ],
  },
]);

export default router;
