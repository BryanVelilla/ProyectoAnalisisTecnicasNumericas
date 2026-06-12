export const ROUTES = {
  DASHBOARD:          '/',
  DATA_MANAGEMENT:    '/datos',

  LINEAR:             '/metodos/lineal',
  EXPONENTIAL:        '/metodos/exponencial',
  GEOMETRIC:          '/metodos/geometrico',
  HYPERBOLIC:         '/metodos/hiperbolico',
  ASYMPTOTIC:         '/metodos/exponencial-asintotico',
  LOGISTIC:           '/metodos/logistico',
  LOGARITHMIC:        '/metodos/logaritmico',
  POWER:              '/metodos/potencial',
  POLYNOMIAL:         '/metodos/polinomial',

  COMPARISON:         '/comparacion',
  REPORTS:            '/reportes',
  SETTINGS:           '/configuracion',
  ABOUT:              '/acerca-de',
} as const;

export type Route = typeof ROUTES[keyof typeof ROUTES];
