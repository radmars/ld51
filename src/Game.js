'use strict';

const Global = {
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
};

const StageVars = {
    initialGerms: Global.initialGerms,
    maxInitialGermSpeed: Global.maxInitialGermSpeed,
    spawnChance: Global.spawnChance,
};

const center = {
    x: Global.width / 2,
    y: Global.height / 2,
}

let ticking = false; // Whether or not the 10-second timer is firing.
let player;
let freezeBullets;
let lasers;

let mouseX;
let mouseY;
let freezeLastFired = 0;
let laserReady = true;
let fireFreeze = false;
let fireLaser = false;

let germsBlue;
let germsGreen;
let germsOrange;
let germsPink;
let allGerms;
const poolMap = new Map();

let tenSecondTimer;
let countdownText;
let gameOverText;
let stageText;

let gameOver = false;
let clickToRestart = false;
let currentStage = 1;

class TitleScreen extends Phaser.Scene {
    constructor() {
        super('TitleScreen');
    }

    preload() {
        this.load.image('titlescreen', 'assets/splash.png');
        this.load.audio('intro', ['assets/ld51-intro.m4a', 'assets/ld51-intro.ogg']);
    }

    create() {
        this.add.image(400, 400, 'titlescreen');
        this.sound.play('intro', { volume: 0.5 });

        this.input.on('pointerdown', (pointer) => {
            this.sound.stopAll();
            this.scene.start('Main');
        });
    }
}

class Main extends Phaser.Scene {
    constructor() {
        super('Main');
    }

    preload() {
        this.load.image('background', 'assets/background.png');

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
            germsBlue.get({
                key: 'germBlue', // Not sure why I need to specify this
                visible: true,
                x: 0.0,
                y: 0.0,
                frame: 0,
            });
            germsGreen.get({
                key: 'germGreen',
                visible: true,
                x: 0.0,
                y: 0.0,
                frame: 0,
            });
            germsOrange.get({
                key: 'germOrange',
                visible: true,
                x: 0.0,
                y: 0.0,
                frame: 0,
            });
            germsPink.get({
                key: 'germPink',
                visible: true,
                x: 0.0,
                y: 0.0,
                frame: 0,
            });
        }
        const placementCircle = new Phaser.Geom.Circle(Global.width / 2, Global.height / 2, 250);
        allGerms.forEach((i) => {
            // Can't find a way to do this globally, so will need to do this for each germ spawned afterward.
            // Also, the germs only collide with themselves after this is set for some reason.
            i.children.each((germ) => {
                germ.setCircle(16);
                germ.setActive(true);
                germ.enableBody(true, 0.0, 0.0, true, true);
                germ.unfreeze();
                germ.readyToReproduce = false;
            });

            // Put germs randomly within a central circle
            Phaser.Actions.RandomCircle(i.getChildren(), placementCircle);
        });
    }

    create() {
        gameOver = false;
        clickToRestart = false;
        this.sound.stopAll();

        StageVars.spawnChance = Global.spawnChance;
        StageVars.maxInitialGermSpeed = Global.maxInitialGermSpeed;
        StageVars.initialGerms = Global.initialGerms;
        currentStage = 1;

        //
        // Sound
        //
        this.sound.pasueOnBlur = false;
        let music = this.sound.add('music', { volume: 0.75, loop: true });
        music.play();

        //
        // Global state
        //

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
            frames: this.anims.generateFrameNumbers('laser'),
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

        countdownText = this.add.text(0, 0, '10.0', { fill: '#00ff00' });
        stageText = this.add.text(0, 0, 'Stage 1', { fill: '#00ff00' });
        stageText.x = Global.width - stageText.width - 20;
        // dumb hack to make it taller because it doesn't know how to deal with descenders apparently
        stageText.setFixedSize(stageText.width + 10, stageText.height + 10);

        //
        // Germ code
        //

        class Germ extends Phaser.Physics.Arcade.Sprite {
            constructor(scene, x, y) {
                super(scene, x, y);
                // Constructor is only used for initial setup, and we don't want germs immediately reproducing
                this.readyToReproduce = false;
                this.unfreeze();
            }
            color() {
                // Meant as an abstract method.
                console.log("Error: called 'color()' on Germ class!");
            }

            freeze() {
                if(this.unfreezeTimer) this.unfreezeTimer.destroy();
                this.frozen = true;
                this.setTint(0x5555ff);
                this.scene.sound.play('ice1');
                this.scene.sound.play('hit', { volume: 0.75 });
                this.stop();
                this.unfreezeTimer = this.scene.time.addEvent({
                    delay: 5000,
                    callback: () => {
                        this.unfreeze();
                    },
                    callbackScope: this,
                    loop: false,
                });

            }

            unfreeze() {
                if(this.unfreezeTimer) this.unfreezeTimer.destroy();
                this.frozen = false;
                this.setTint(0xffffff);
                if(this.readyToReproduce) this.play(`germ${this.color()}Splitting`);       
                else this.play(`germ${this.color()}Idle`);

            }

            // Initializer for new germ produced via reproduction.
            spawn(parent) {
                this.readyToReproduce = false;
                this.unfreeze();

                let x = parent.x;
                let y = parent.y;
                this.enableBody(true, x, y, true, true);
                this.setCircle(16);
            }

            tickBehavior() {
                if (!this.active) {
                    return;
                }
                
                if (this.frozen) {
                    return;
                }

                if (this.readyToReproduce) {
                    this.readyToReproduce = false;
                    this.play(`germ${this.color()}Idle`);

                    let germ = poolMap.get(this.constructor.name).get();

                    if (germ) {
                        germ.spawn(this);
                        this.scene.sound.play('split');
                    }
                } else {
                    if (Phaser.Math.FloatBetween(0.0, 1.0) <= StageVars.spawnChance) {
                        this.readyToReproduce = true;
                        this.play(`germ${this.color()}Splitting`);
                    }
                }
            }
        };

        class GermBlue extends Germ {
            constructor(scene, x, y) {
                super(scene, x, y);
                this.velX = Phaser.Math.FloatBetween(-StageVars.maxInitialGermSpeed, StageVars.maxInitialGermSpeed);
                this.velY = Phaser.Math.FloatBetween(-StageVars.maxInitialGermSpeed, StageVars.maxInitialGermSpeed);
                this.play('germBlueIdle');
            }

            color() {
                return 'Blue';
            }

            update(time, delta) {
                if (gameOver) {
                    this.stop();
                    return;
                }

                super.update(time, delta);
                if (this.frozen) {
                    return;
                }
                // Pull toward the center
                this.velX += (center.x - this.x) * Global.germGravityFactor;
                this.velY += (center.y - this.y) * Global.germGravityFactor;
                this.x += this.velX * delta;
                this.y += this.velY * delta;
            }

            spawn(parent) {
                this.velX = parent.velX;
                this.velY = parent.velY;
                super.spawn(parent);
            }
        };
        class GermGreen extends Germ {
            constructor(scene, x, y) {
                super(scene, x, y);
                this.velX = Phaser.Math.FloatBetween(-2 * StageVars.maxInitialGermSpeed, 2 * StageVars.maxInitialGermSpeed);
                this.play('germGreenIdle');
            }

            color() {
                return 'Green';
            }

            update(time, delta) {
                if (gameOver) {
                    this.stop();
                    return;
                }

                super.update(time, delta);
                if (this.frozen) {
                    return;
                }
                this.velX += (center.x - this.x) * 2 * Global.germGravityFactor;
                this.x += this.velX * delta;
            }

            spawn(parent) {
                this.velX = parent.velX;
                super.spawn(parent);
            }
        };
        class GermOrange extends Germ {
            constructor(scene, x, y) {
                super(scene, x, y);
                this.velY = Phaser.Math.FloatBetween(-2 * StageVars.maxInitialGermSpeed, 2 * StageVars.maxInitialGermSpeed);
                this.play('germOrangeIdle');
            }

            color() {
                return 'Orange';
            }

            update(time, delta) {
                if (gameOver) {
                    this.stop();
                    return;
                }

                super.update(time, delta);
                if (this.frozen) {
                    return;
                }
                this.velY += (center.y - this.y) * 2 * Global.germGravityFactor;
                this.y += this.velY * delta;
            }

            spawn(parent) {
                this.velY = parent.velY;
                super.spawn(parent);
            }
        };
        class GermPink extends Germ {
            constructor(scene, x, y) {
                super(scene, x, y);
                this.velR = Phaser.Math.FloatBetween(-0.012 * StageVars.maxInitialGermSpeed, 0.012 * StageVars.maxInitialGermSpeed);
                this.play('germPinkIdle');
            }

            color() {
                return 'Pink';
            }

            update(time, delta) {
                if (gameOver) {
                    this.stop();
                    return;
                }

                super.update(time, delta);
                if (this.frozen) {
                    return;
                }
                // Rotate around center
                Phaser.Actions.RotateAroundDistance([this], center, this.velR * delta, Phaser.Math.Distance.BetweenPoints(center, this));
            }

            spawn(parent) {
                this.velR = parent.velR;
                super.spawn(parent);
            }
        };

        germsBlue = this.physics.add.group({
            classType: GermBlue,
            maxSize: Global.maxGerms,
            runChildUpdate: true,
        });
        germsGreen = this.physics.add.group({
            classType: GermGreen,
            maxSize: Global.maxGerms,
            runChildUpdate: true,
        });
        germsOrange = this.physics.add.group({
            classType: GermOrange,
            maxSize: Global.maxGerms,
            runChildUpdate: true,
        });
        germsPink = this.physics.add.group({
            classType: GermPink,
            maxSize: Global.maxGerms,
            runChildUpdate: true,
        });

        poolMap.set('GermBlue', germsBlue);
        poolMap.set('GermGreen', germsGreen);
        poolMap.set('GermOrange', germsOrange);
        poolMap.set('GermPink', germsPink);

        allGerms = [germsBlue, germsGreen, germsOrange, germsPink];

        this.addGerms();

        //
        // Bullet code
        //

        class Bullet extends Phaser.Physics.Arcade.Sprite {
            constructor(scene, x, y) {
                super(scene, x, y)

                this.velX = 0;
                this.velY = 0;
            }

            fire(x, y, angle) {
                this.enableBody(true, x, y, true, true)
                this.setActive(true);
                this.setVisible(true);

                this.setRotation(angle);
                this.velX = this.speed * Math.sin(this.rotation);
                this.velY = this.speed * Math.cos(this.rotation);
            }

            update(time, delta) {
                super.update(time, delta);

                this.x += delta * this.velY;
                this.y += delta * this.velX;

                if (this.y < 0 || this.y > Global.height || this.x < 0 || this.x > Global.width) {
                    this.disableBody(true, true);
                }
            }
        };

        class FreezeBullet extends Bullet {
            constructor(scene, x, y) {
                super(scene, x, y)

                this.speed = Phaser.Math.GetSpeed(Global.freezeSpeed, 1);
                Phaser.GameObjects.Image.call(this, scene, 0, 0, 'freezeBullet');
            }

            fire(x, y, angle) {
                this.setCircle(8);
                super.fire(x, y, angle);
                this.scene.sound.play('freezeshot', { volume: 0.75 });
                this.play('freezeIdle');
            }

            explode() {
                let that = this;
                this.disableBody();
                // Feels like an event listener would be best for this, but it keeps triggering after the animation completes.
                // this.on(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
                //     this.setActive(false);
                //     this.setVisible(false);
                // })
                this.scene.time.addEvent({
                    delay: 300,
                    callback: () => {
                        this.setActive(false);
                        that.setVisible(false);
                    },
                });
                this.velX = 0;
                this.velY = 0;
                this.play('freezeExplode');
            }
        };

        class Laser extends Bullet {
            constructor(scene, x, y) {
                super(scene, x, y)

                this.speed = Phaser.Math.GetSpeed(Global.laserSpeed, 1);
                this.play('laser');
            }

            fire(x, y, angle) {
                super.fire(x, y, angle);
                this.scene.sound.play('laser', { volume: 0.5 });
                // Need to do lots of adjustments of the bounding box because arcade physics and
                // rotated rectangles don't get along. Only the leading tip of the laser will
                // trigger a collision.
                this.setCircle(10);
                const yOffset = 55 * Math.sin(angle);
                const xOffset = 55 + 55 * Math.cos(angle);
                this.setOffset(xOffset, yOffset);
            }
        };

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

        player = this.physics.add.sprite(Global.width / 2, 50, 'player').setDepth(1).setCircle(16);

        this.input.mouse.disableContextMenu();
        this.input.on('pointerdown', (pointer) => {
            mouseX = pointer.x;
            mouseY = pointer.y;

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

        for (let i = 0; i < allGerms.length; i++) {
            // Allow germs to collide with others of the same type
            this.physics.add.collider(allGerms[i]);

            this.physics.add.collider(freezeBullets, allGerms[i], (bullet, germ) => {
                bullet.explode();
                germ.freeze();
            });
            this.physics.add.collider(lasers, allGerms[i], (laser, germ) => {
                germ.disableBody(true, true);
                germ.setActive(false);
                this.sound.play('hit', { volume: 0.75 });
            });
            this.physics.add.collider(player, allGerms[i], (player, germ) => {
                if (!germ.frozen) {
                    this.endGame(false);
                }
            });

            // Allow germs to collide with all other types
            for (let j = 1; j < allGerms.length; j++) {
                this.physics.add.collider(allGerms[i], allGerms[j]);
            }
        }
    }

    update(time, delta) {
        if (gameOver) {
            return;
        }

        // Player rotates around center.
        Phaser.Actions.RotateAroundDistance([player], center, Global.playerSpeed * delta, Global.size / 2 - 50);
        const angleDeg = Math.atan2(player.y - center.y, player.x - center.x) * 180 / Math.PI;
        player.angle = angleDeg + 45; // should face the center point, and the source image is rotated 45 degrees.

        if (fireFreeze) {
            fireFreeze = false;

            if (time > freezeLastFired + Global.freezeCooldown) {
                let bullet = freezeBullets.get();

                if (bullet) {
                    freezeLastFired = time;
                    let angle = Phaser.Math.Angle.BetweenPoints(player, { x: mouseX, y: mouseY });
                    bullet.fire(player.x, player.y, angle);
                }
            }
        }

        if (fireLaser) {
            fireLaser = false;

            if (laserReady) {
                laserReady = false;
                player.play('playerLaserEmpty');

                let laser = lasers.get();

                if (laser) {
                    let angle = Phaser.Math.Angle.BetweenPoints(player, { x: mouseX, y: mouseY });
                    laser.fire(player.x, player.y, angle);
                }
            }
            else {
                this.sound.play('laserfail');
            }
        }

        countdownText.setText(tenSecondTimer.getRemainingSeconds().toString().substr(0, 4));

        if (ticking) {
            laserReady = true;
            player.play('playerLaserReady');
            this.sound.play('reload');

            allGerms.forEach(i => {
                i.getChildren().forEach(j => {
                    j.tickBehavior();
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

    endGame(didWin) {
        gameOver = true;
        gameOverText = this.add.text(
            Global.width / 2 - 250,
            Global.height / 2 - 250,
            didWin ? 'YOU WIN!' : 'GAME OVER',
            {
                fill: '#00ff00',
                fontSize: '96px',
                fontStyle: 'bold',
            },
        );
        gameOverText.setDepth(10);

        this.gameOverTimer = this.time.addEvent({
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

const config = {
    type: Phaser.AUTO,
    width: Global.width,
    height: Global.height,
    scene: [TitleScreen, Main],
    physics: {
        default: 'arcade',
    },
};

const game = new Phaser.Game(config);
