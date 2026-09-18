export interface HealthStatus {
  status: 'ok';
  timestamp: string;
}

export function getHealthStatus(): HealthStatus {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
  };
}
