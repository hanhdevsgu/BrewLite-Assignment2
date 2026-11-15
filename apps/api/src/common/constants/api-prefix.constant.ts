import { RequestMethod } from '@nestjs/common';
import type { RouteInfo } from '@nestjs/common/interfaces';

/** Global prefix applied across API controllers. */
export const API_GLOBAL_PREFIX = 'api';

/** Routes excluded from `/api` prefixing so root and health endpoints work as expected. */
export const API_PREFIX_EXCLUDES: (string | RouteInfo)[] = [
  { path: '/', method: RequestMethod.GET },
  { path: '', method: RequestMethod.GET },
  { path: 'api', method: RequestMethod.GET },
  'health',
  'api/health',
];
