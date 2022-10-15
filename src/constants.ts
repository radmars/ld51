export { constants, center };

const constants = {
  size: 800,
  width: 800,
  height: 800,
  playerSpeed: Math.PI / 5 / 1000,
  freezeCooldown: 400,
  initialGerms: 3,
  maxGerms: 40,
  maxInitialGermSpeed: 0.08,
  germGravityFactor: 0.00001,
  freezeSpeed: 600,
  laserSpeed: 1200,
  spawnChance: 0.25,
} as const;

const center = {
  x: constants.width / 2,
  y: constants.height / 2,
}
