// Shared world and gameplay tuning. Keep visual and simulation constants here.
export const WORLD = { width: 3600, height: 2600, beachY: 2180, waterY: 2400 };
export const STEP = 1 / 60;
export const CAMERA_ZOOM = 1.3;
export const PLAYER = { radius: 12, walkSpeed: 168, sprintSpeed: 252, health: 100, fistsRange: 34, fistsDamage: 26, fistsCooldown: 0.34 };
export const WEAPONS = {
  fists: { damage: 26, cooldown: 0.34, range: 34, spread: 0, ammoPrice: 0, price: 0, magazine: 0, reloadTime: 0 },
  pistol: { damage: 24, cooldown: 0.42, bulletSpeed: 900, range: 620, spread: 0.035, ammoPrice: 18, price: 500, magazine: 12, reloadTime: 0.9 },
  smg: { damage: 12, cooldown: 0.16, bulletSpeed: 900, range: 540, spread: 0.09, ammoPrice: 40, price: 1500, magazine: 30, reloadTime: 1.3 },
};
export const CARS = {
  sedan: { length: 78, width: 36, maxSpeed: 350, reverseSpeed: 115, accel: 220, brake: 380, grip: 4.2, health: 100, colorPool: ['#e66b55','#39a7a0','#e9c878','#667d9b'] },
  cabrio: { length: 74, width: 34, maxSpeed: 390, reverseSpeed: 120, accel: 250, brake: 390, grip: 4.8, health: 85, colorPool: ['#f1a65a','#54c5b4','#e65f78','#f0d16f'] },
  sport: { length: 84, width: 37, maxSpeed: 500, reverseSpeed: 140, accel: 320, brake: 450, grip: 5.5, health: 90, colorPool: ['#dd5577','#44bcd0','#f0c14e','#e9ecef'] },
  truck: { length: 98, width: 42, maxSpeed: 285, reverseSpeed: 95, accel: 170, brake: 340, grip: 3.5, health: 150, colorPool: ['#c8784d','#64927d','#d2b983','#8c99a8'] },
  police: { length: 80, width: 36, maxSpeed: 430, reverseSpeed: 120, accel: 280, brake: 430, grip: 5, health: 130, colorPool: ['#e9edf1'] },
};
export const POLICE = { spawnInterval: 8, maxCarsByStars: [0,2,3,4,5,6], chaseSpeedFactor: 1.12, bustRadius: 110, bustFillTime: 2.4, sightLoseTime: 9 };
export const HEAT = { steal: 1, hitPed: 1, shootNear: 0.35, hitPoliceCar: 1, ramCar: 0.4, decayPerSecond: 0.045 };
export const ECONOMY = { packageReward: 25, packageBonusAll: 1000, healCost: 25, resprayCost: 300, bustedFineRate: 0.15, wastedFineRate: 0.10 };
export const PALETTE = {
  skyTop: '#f3a77f', skyBottom: '#a77ca5', asphalt: '#343b43', asphaltEdge: '#242b32', sidewalk: '#b9a28e', sand: '#e5c27d', water: '#399caa', waterDeep: '#247486',
  buildings: ['#d9826c','#4b9b96','#e9d4ae','#d6b77c','#c8757e','#a7c7ad'], roofs: ['#9b655c','#426e70','#c7a97e','#8c6876'],
  palm: '#397c55', roadMark: '#f4d68a', neon: ['#ff5cad','#58e4ec','#ffc45b','#b9f36a'], player: '#f5c65a', carAccent: '#f7e7c2',
  panel: '#17232a', panelEdge: '#52717a', text: '#fff3df', muted: '#b8c8c5', gold: '#ffd25e', danger: '#ff6374', good: '#75e3a4',
};
export const SAVE_KEY = 'neon-palms.save.v1';
export const FONT = { heading: 'system-ui, -apple-system, "Segoe UI", sans-serif', body: 'system-ui, -apple-system, "Segoe UI", sans-serif' };
