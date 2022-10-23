export { Main, germPoolMap, gameOver, particleManager };

import Phaser from 'phaser';
import { devMode } from '../index';
import { constants, center } from '../constants';
import { Germ, GermBlue, GermGreen, GermOrange, GermPink } from '../Germs';
import { FreezeBullet, Laser } from '../Bullets';
import { StageVars } from '../StageVars';

let ticking = false; // Whether or not the 10-second timer is firing.
let player: Phaser.Physics.Arcade.Sprite;
let freezeBullets: Phaser.Physics.Arcade.Group;
let lasers: Phaser.Physics.Arcade.Group;

let mouseX: number;
let mouseY: number;
let freezeLastFired = 0;
let laserReady = true;
let fireFreeze = false;
let fireLaser = false;
let particleManager: Phaser.GameObjects.Particles.ParticleEmitterManager;

let germsBlue: Phaser.Physics.Arcade.Group;
let germsGreen: Phaser.Physics.Arcade.Group;
let germsOrange: Phaser.Physics.Arcade.Group;
let germsPink: Phaser.Physics.Arcade.Group;
let allGerms: Phaser.Physics.Arcade.Group[];
const germPoolMap = new Map();

let tenSecondTimer: Phaser.Time.TimerEvent;
let countdownText: Phaser.GameObjects.Text;
let gameOverText: Phaser.GameObjects.Text;
let stageText: Phaser.GameObjects.Text;

let gameOver = false;
let clickToRestart = false;
let currentStage = 1;

class Main extends Phaser.Scene {
    constructor() {
        super('Main');
    }

    preload() {
        this.load.image('background', 'assets/background.png');
        this.load.image('yellowParticle', 'assets/yellow_particle.png');

        this.load.spritesheet('player', 'assets/player.png', { frameWidth: 32, frameHeight: 32 });
        this.load.spritesheet('germBlue', 'assets/germ_blue.png', { frameWidth: 32, frameHeight: 32 });
        this.load.spritesheet('germOrange', 'assets/germ_orange.png', { frameWidth: 32, frameHeight: 32 });
        this.load.spritesheet('germGreen', 'assets/germ_green.png', { frameWidth: 32, frameHeight: 32 });
        this.load.spritesheet('germPink', 'assets/germ_pink.png', { frameWidth: 32, frameHeight: 32 });
        this.load.spritesheet('freezeBullet', 'assets/freezeBullet.png', { frameWidth: 16, frameHeight: 16 });
        this.load.spritesheet('laser', 'assets/laser.png', { frameWidth: 128, frameHeight: 32 });

        this.load.audio('music', ['assets/ld51-main.m4a', 'assets/ld51-main.ogg']);
        this.load.audio('gameover', ['assets/ld51-gameover.m4a', 'assets/ld51-gameover.ogg']);
        this.load.audio('ice1', ['assets/sfx/ice1.m4a', 'assets/sfx/ice1.ogg']);
        this.load.audio('ice2', ['assets/sfx/ice2.m4a', 'assets/sfx/ice2.ogg']);
        this.load.audio('freezeshot', ['assets/sfx/freezeshot.m4a', 'assets/sfx/freezeshot.ogg']);
        this.load.audio('laser', ['assets/sfx/laser.m4a', 'assets/sfx/laser.ogg']);
        this.load.audio('laserfail', ['assets/sfx/laserfail.m4a', 'assets/sfx/laserfail.ogg']);
        this.load.audio('reload', ['assets/sfx/reload.m4a', 'assets/sfx/reload.ogg']);
        this.load.audio('split', ['assets/sfx/split.m4a', 'assets/sfx/split.ogg']);
        this.load.audio('hit', ['assets/sfx/hit.m4a', 'assets/sfx/hit.ogg']);

    }

    addGerms() {
        for (let i = 0; i < StageVars.initialGerms; i++) {
            germsBlue.get();
            germsGreen.get();
            germsOrange.get();
            germsPink.get();
        }
        const placementCircle = new Phaser.Geom.Circle(constants.width / 2, constants.height / 2, 250);
        allGerms.forEach((i) => {
            // Can't find a way to do this globally, so will need to do this for each germ spawned afterward.
            // Also, the germs only collide with themselves after this is set for some reason.
            const children = i.children as Phaser.Structs.Set<Germ>;
            children.each((germ) => {
                germ.setCircle(16);
                germ.setActive(true);
                germ.enableBody(true, 0.0, 0.0, true, true);
                germ.readyToReproduce = false;
                germ.unfreeze();
            });

            // Put germs randomly within a central circle
            Phaser.Actions.RandomCircle(i.getChildren(), placementCircle);
        });
    }

    create() {
        this.cameras.main.fadeIn(1000);
        gameOver = false;
        clickToRestart = false;
        this.sound.stopAll();

        StageVars.spawnChance = constants.spawnChance;
        StageVars.maxInitialGermSpeed = constants.maxInitialGermSpeed;
        StageVars.initialGerms = constants.initialGerms;
        currentStage = 1;

        //
        // Sound
        //
        this.sound.pauseOnBlur = false;
        if (!devMode) {
            const music = this.sound.add('music', { volume: 0.75, loop: true });
            music.play();
        }

        //
        // Global state
        //

        this.input.setDefaultCursor('url(assets/reticle.png), pointer');
        this.add.image(400, 400, 'background');
        tenSecondTimer = this.time.addEvent({
            delay: 10000,
            callback: () => {
                ticking = true;
            },
            callbackScope: this,
            loop: true,
        })

        //
        // Animations
        //

        this.anims.create({
            key: 'playerLaserReady',
            frames: [{ key: 'player', frame: 0 }],
        })
        this.anims.create({
            key: 'playerLaserEmpty',
            frames: [{ key: 'player', frame: 1 }],
        })
        this.anims.create({
            key: 'freezeIdle',
            frames: [{ key: 'freezeBullet', frame: 0 }],
        })
        this.anims.create({
            key: 'freezeExplode',
            frames: this.anims.generateFrameNumbers('freezeBullet', { start: 1, end: 2 }),
            frameRate: 7,
        });
        this.anims.create({
            key: 'laser',
            frames: this.anims.generateFrameNumbers('laser', {}),
            frameRate: 20,
            repeat: -1,
        });
        ['Blue', 'Green', 'Orange', 'Pink'].forEach(i => {
            this.anims.create({
                key: `germ${i}Idle`,
                frames: this.anims.generateFrameNumbers(`germ${i}`, { start: 0, end: 1 }),
                frameRate: 3,
                repeat: -1,
            });
            this.anims.create({
                key: `germ${i}Splitting`,
                frames: this.anims.generateFrameNumbers(`germ${i}`, { start: 2, end: 3 }),
                frameRate: 3,
                repeat: -1,
            });
        });

        countdownText = this.add.text(0, 0, '10.0', { color: '#00ff00' });
        stageText = this.add.text(0, 0, 'Stage 1', { color: '#00ff00' });
        stageText.x = constants.width - stageText.width - 20;
        // dumb hack to make it taller because it doesn't know how to deal with descenders apparently
        stageText.setFixedSize(stageText.width + 10, stageText.height + 10);

        germsBlue = this.physics.add.group({
            classType: GermBlue,
            maxSize: constants.maxGerms,
            runChildUpdate: true,
        });
        germsGreen = this.physics.add.group({
            classType: GermGreen,
            maxSize: constants.maxGerms,
            runChildUpdate: true,
        });
        germsOrange = this.physics.add.group({
            classType: GermOrange,
            maxSize: constants.maxGerms,
            runChildUpdate: true,
        });
        germsPink = this.physics.add.group({
            classType: GermPink,
            maxSize: constants.maxGerms,
            runChildUpdate: true,
        });

        germPoolMap.set('GermBlue', germsBlue);
        germPoolMap.set('GermGreen', germsGreen);
        germPoolMap.set('GermOrange', germsOrange);
        germPoolMap.set('GermPink', germsPink);

        allGerms = [germsBlue, germsGreen, germsOrange, germsPink];

        this.addGerms();

        freezeBullets = this.physics.add.group({
            classType: FreezeBullet,
            maxSize: 5,
            runChildUpdate: true,
        });

        lasers = this.physics.add.group({
            classType: Laser,
            maxSize: 2, // In case player fires at the end of a timer and then at the beginning of the next.
            runChildUpdate: true,
        });

        //
        // Player code + controls
        //

        player = this.physics.add.sprite(constants.width / 2, 50, 'player').setDepth(1).setCircle(16);

        particleManager = this.add.particles('yellowParticle');

        this.input.mouse.disableContextMenu();
        this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
            mouseX = pointer.x;
            mouseY = pointer.y;
        });
        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            if (pointer.rightButtonDown()) {
                fireLaser = true;
            }
            else {
                if (clickToRestart) {
                    this.scene.start('Main');
                }
                fireFreeze = true;
            }
        });

        //
        // Collision code
        //

        for (const germGroup of allGerms) {
            this.physics.add.collider(freezeBullets, germGroup, (bullet, germ) => {
                (bullet as FreezeBullet).explode();
                (germ as Germ).freeze();
            });
            this.physics.add.collider(lasers, germGroup, (laser, germ) => {
                (germ as Germ).die();
                this.sound.play('hit', { volume: 0.75 });
            });
            this.physics.add.collider(player, germGroup, (player, germ) => {
                if (!(germ as Germ).frozen()) {
                    this.endGame(false);
                }
            });

            // Allow germs to collide with all other germs
            for (const otherGermGroup of allGerms) {
                this.physics.add.collider(germGroup, otherGermGroup);
            }
        }
    }

    update(time: number, delta: number) {
        if (gameOver) {
            return;
        }

        // Player rotates around center.
        Phaser.Actions.RotateAroundDistance([player], center, constants.playerSpeed * delta, constants.size / 2 - 50);
        const playerAngle = Phaser.Math.Angle.BetweenPoints(player, { x: mouseX, y: mouseY });
        player.rotation = playerAngle - (3 / 4) * Math.PI; // source image is rotated

        if (fireFreeze) {
            fireFreeze = false;

            if (time > freezeLastFired + constants.freezeCooldown) {
                const bullet = freezeBullets.get();

                if (bullet) {
                    freezeLastFired = time;
                    const angle = Phaser.Math.Angle.BetweenPoints(player, { x: mouseX, y: mouseY });
                    bullet.fire(player.x, player.y, angle);
                }
            }
        }

        if (fireLaser) {
            fireLaser = false;

            if (laserReady) {
                laserReady = false;
                player.play('playerLaserEmpty');

                const laser = lasers.get();

                if (laser) {
                    const angle = Phaser.Math.Angle.BetweenPoints(player, { x: mouseX, y: mouseY });
                    laser.fire(player.x, player.y, angle);
                }
            }
            else {
                this.sound.play('laserfail');
            }
        }

        countdownText.setText(tenSecondTimer.getRemainingSeconds().toString().substring(0, 4));

        if (ticking) {
            laserReady = true;
            player.play('playerLaserReady');
            this.sound.play('reload');

            allGerms.forEach(i => {
                i.getChildren().forEach(j => {
                    (j as Germ).tickBehavior();
                })
            })

            ticking = false;
        }

        let anyAlive = false;
        allGerms.forEach(group => {
            group.getChildren().forEach(germ => {
                if (germ.active == true) {
                    anyAlive = true;
                }
            });
        });
        if (anyAlive == false) {
            this.nextStage();
        }
    }

    endGame(didWin: boolean) {
        gameOver = true;
        gameOverText = this.add.text(
            constants.width / 2 - 250,
            constants.height / 2 - 250,
            didWin ? 'YOU WIN!' : 'GAME OVER',
            {
                color: '#00ff00',
                fontSize: '96px',
                fontStyle: 'bold',
            },
        );
        gameOverText.setDepth(10);

        this.time.addEvent({
            delay: 2000,
            callback: () => {
                clickToRestart = true;
            },
            callbackScope: this,
            loop: false,
        });

        if (!didWin) {
            this.sound.stopAll();
            this.sound.play('gameover', { volume: 0.5 });
        }
    }

    nextStage() {
        currentStage++;
        if (currentStage == 6) {
            this.endGame(true);
            return;
        }
        StageVars.maxInitialGermSpeed += 0.05;

        if (StageVars.spawnChance < 0.8) {
            StageVars.spawnChance += 0.05;
        }

        StageVars.initialGerms++;

        stageText.setText('Stage ' + currentStage);
        this.addGerms();
    }
}
