import type { ProjectOptions } from './types.js';

export const LAYER_REQUIREMENTS: Record<string, string[]> = {
  'auth-jwt': ['db-mongo'],
  testing: ['base'],
};

export function assertLayerRequirements(layers: string[]): void {
  const availableLayers = new Set(layers);

  for (const [layer, requirements] of Object.entries(LAYER_REQUIREMENTS)) {
    if (!availableLayers.has(layer)) {
      continue;
    }

    for (const requirement of requirements) {
      if (!availableLayers.has(requirement)) {
        throw new Error(`Layer "${layer}" requires layer "${requirement}".`);
      }
    }
  }
}

export function resolveLayers(options: ProjectOptions): string[] {
  const layers = ['base', 'db-mongo'];

  if (options.auth === 'jwt') {
    layers.push('auth-jwt');
  }

  if (options.testing) {
    layers.push('testing');
  }

  if (options.docker) {
    layers.push('docker');
  }

  layers.push('readme');
  assertLayerRequirements(layers);

  return layers;
}