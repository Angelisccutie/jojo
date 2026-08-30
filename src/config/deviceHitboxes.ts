/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface DeviceHitboxConfig {
  id: string;
  name: string;
  type: 'light' | 'door' | 'appliance';
  position: [number, number, number];
  hitboxSize?: [number, number, number];
  maxIntensity?: number;
  lightColor?: string;
  lightDistance?: number;
  lightDecay?: number;
}
