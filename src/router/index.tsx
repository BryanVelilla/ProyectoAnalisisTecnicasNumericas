import { createBrowserRouter } from 'react-router-dom';
import { MainLayout } from '../components/layout/MainLayout';
import { Dashboard } from '../pages/Dashboard';
import { DataManagement } from '../pages/DataManagement';
import { LinearFit } from '../pages/methods/LinearFit';
import { ExponentialFit } from '../pages/methods/ExponentialFit';
import { GeometricFit } from '../pages/methods/GeometricFit';
import { HyperbolicFit } from '../pages/methods/HyperbolicFit';
import { AsymptoticFit } from '../pages/methods/AsymptoticFit';
import { LogisticFit } from '../pages/methods/LogisticFit';
import { LogarithmicFit } from '../pages/methods/LogarithmicFit';
import { PowerFit }       from '../pages/methods/PowerFit';
import { PolynomialFit }  from '../pages/methods/PolynomialFit';
import { Comparison } from '../pages/Comparison';
import { Reports } from '../pages/Reports';
import { Settings } from '../pages/Settings';
import { About } from '../pages/About';
import { ROUTES } from './routes';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    children: [
      { index: true,                    element: <Dashboard /> },
      { path: ROUTES.DATA_MANAGEMENT,   element: <DataManagement /> },

      { path: ROUTES.LINEAR,            element: <LinearFit /> },
      { path: ROUTES.EXPONENTIAL,       element: <ExponentialFit /> },
      { path: ROUTES.GEOMETRIC,         element: <GeometricFit /> },
      { path: ROUTES.HYPERBOLIC,        element: <HyperbolicFit /> },
      { path: ROUTES.ASYMPTOTIC,        element: <AsymptoticFit /> },
      { path: ROUTES.LOGISTIC,          element: <LogisticFit /> },
      { path: ROUTES.LOGARITHMIC,       element: <LogarithmicFit /> },
      { path: ROUTES.POWER,             element: <PowerFit /> },
      { path: ROUTES.POLYNOMIAL,        element: <PolynomialFit /> },

      { path: ROUTES.COMPARISON,        element: <Comparison /> },
      { path: ROUTES.REPORTS,           element: <Reports /> },
      { path: ROUTES.SETTINGS,          element: <Settings /> },
      { path: ROUTES.ABOUT,             element: <About /> },
    ],
  },
]);
