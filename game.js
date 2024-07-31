let game

const gameOptions = {
    playerGravity: 1000,
    playerSpeed: 375,
}

window.onload = function() {
    localStorage.clear()
    let gameConfig = {
        type: Phaser.AUTO,
        backgroundColor: "#005599",
        scale: {
            mode: Phaser.Scale.FIT,
            autoCenter: Phaser.Scale.CENTER_BOTH,
            width: 1920,
            height: 1000,
        },
        pixelArt: true,
        
        physics: {
            default: "arcade",
            arcade: {
                gravity: {
                    y: 0,   
                },
                //debug: true
            }
        },
        scene: PlayGame
    }
    game = new Phaser.Game(gameConfig)
    window.focus()

}

class PlayGame extends Phaser.Scene {

    constructor() {
        super("PlayGame")
        this.score = 0
        this.gameOver = false
        this.startTime = 0
        this.elapsedTime = 0
        this.bestTime = localStorage.getItem('bestTime')
        
    }

    preload() {
        this.load.spritesheet("player", "assets/playerNew.png",
            {frameWidth: 32, frameHeight: 42}
        )
        this.load.image("ground", "assets/ground.png")
        this.load.image("powerUp", "assets/powerUp.png")
        this.load.image("healthPickup", "assets/healthPickup.png")
        this.load.image("boss", "assets/boss.png")
        this.load.image("bullet", "assets/bullet.png")
        this.load.spritesheet("bossBullet", "assets/bossBullet.png",
            {frameWidth: 41.5, frameHeight: 40}
        )
        this.load.spritesheet("bossBulletWall", "assets/bossBulletWall.png",
            {frameWidth: 94, frameHeight: 88}
        )
    }

    create() {
        if (!this.gameOver) {
            this.startTime = this.time.now // Start the timer
            this.elapsedTimeText = this.add.text(game.config.width/2, 50, 'Time: 0', { fontSize: '32px', fill: '#FFF' })
            this.cursors = this.input.keyboard.createCursorKeys()

            this.keys = this.input.keyboard.addKeys({
                w: Phaser.Input.Keyboard.KeyCodes.W,
                a: Phaser.Input.Keyboard.KeyCodes.A,
                s: Phaser.Input.Keyboard.KeyCodes.S,
                d: Phaser.Input.Keyboard.KeyCodes.D
            })

            this.groundGroup = this.physics.add.group({
                immovable: true,
                allowGravity: false
            })
            this.groundGroup.create(game.config.width / 2, game.config.height - 50, "ground")
            
            this.bullets = this.physics.add.group({
                defaultKey: "bullet",
            })
            this.bossBullets = this.physics.add.group({
                defaultKey: "bossBullet",
            })
            this.bossBulletWall = this.physics.add.group({
                defaultKey: "bossBulletWall",
            })
            this.input.on('pointerdown', function(pointer) {
                this.shootBullet()
            }, this)
        
            this.physics.add.collider(this.bullets, this.groundGroup, function(bullet, ground){
                bullet.setActive(false)
                bullet.setVisible(false)
                bullet.body.stop()
                bullet.destroy()
            })
            this.physics.add.collider(this.bossBullets, this.groundGroup, function(bossBullet, ground){
                bossBullet.setActive(false)
                bossBullet.setVisible(false)
                bossBullet.body.stop()
                bossBullet.destroy()
            })

            

            this.player = this.physics.add.sprite(game.config.width / 2, game.config.height / 2, "player")
            this.player.scale = 2
            this.player.body.gravity.y = gameOptions.playerGravity
            this.player.setCollideWorldBounds(true)
            this.player.hp = 100
            this.bulletDamage = 5
            this.player.immunity = false




            this.boss = this.physics.add.sprite(game.config.width / 2, 100, "boss")
            this.boss.scale = 0.2
            //this.boss.body.gravity.y = gameOptions.playerGravity
            this.boss.setCollideWorldBounds(true)
            //this.boss.setVelocity(Phaser.Math.Between(-300, 300), Phaser.Math.Between(-300, 300 ))
            //this.boss.setBounce(1)
            this.boss.hp = 1000
            this.physics.add.overlap(this.bullets, this.boss, this.hitBoss, null, this)
            this.moveBoss(0)
            this.powerUpGroup = this.physics.add.group({})
            this.physics.add.collider(this.powerUpGroup, this.groundGroup)
            this.physics.add.overlap(this.player, this.powerUpGroup, this.collectPowerUp, null, this)
            this.add.image(22, 22, "powerUp").scale = 0.12

            this.healthPickupGroup = this.physics.add.group({})
            this.physics.add.collider(this.healthPickupGroup, this.groundGroup)
            this.physics.add.overlap(this.player, this.healthPickupGroup, this.collectHealthPickup, null, this)


            this.physics.add.collider(this.player, this.groundGroup)
            this.physics.add.collider(this.boss, this.groundGroup)
            this.physics.add.collider(this.player, this.boss, this.hitPlayer, null, this)
            this.physics.add.overlap(this.player, this.bossBullets, this.hitPlayerBullet, null, this)
            this.physics.add.overlap(this.player, this.bossBulletWall, this.hitPlayerBullet, null, this)

            // ALL TEXT UI
            this.playerHPText = this.add.text(0, game.config.height - 50, "Player HP: 100", {fontSize: "50px", fill: "red"})
            this.powerText = this.add.text(42, 2, "LVL: " + this.bulletDamage, {fontSize: "50px", fill: "#000000"})
            //this.bossHPtext = this.add.text(40, 40, "Boss HP: 1000", {fontSize: "32px", fill: "white"})


            this.bossHealthbarX = 500
            this.bossHealthbarWidth = 1000
            this.bossHealthBarBackground = this.add.graphics()
            this.bossHealthBarBackground.fillStyle(0x000000, 1)
            this.bossHealthBarBackground.fillRect(this.bossHealthbarX, 20, this.bossHealthbarWidth, 20)
        
            this.bossHealthBar = this.add.graphics()
            this.bossHealthBar.fillStyle(0xff0000, 1)
            this.bossHealthBar.fillRect(this.bossHealthbarX, 20, this.bossHealthbarWidth, 20)


            if(!this.anims.get("left") || !this.anims.get("right") || !this.anims.get("turn") || !this.anims.get("rotation") || !this.anims.get("bulletWallRotation")){
                this.anims.create({
                    key: "left",
                    frames: this.anims.generateFrameNumbers("player",
                    {start: 0, end: 3}),
                    frameRate: 10,
                    repeat: -1
                })
                    this.anims.create({
                        key: "turn",
                        frames: [{key: "player", frame: 4}],
                        frameRate: 10
                    })
                this.anims.create({
                    key: "rotation",
                    frames: this.anims.generateFrameNumbers("bossBullet",
                    {start: 0, end: 3}),
                    frameRate: 10,
                    repeat: -1
                })
                this.anims.create({
                    key: "bulletWallRotation",
                    frames: this.anims.generateFrameNumbers("bossBulletWall",
                    {start: 0, end: 3}),
                    frameRate: 15,
                    repeat: -1
                })

                this.anims.create({
                    key: "right",
                    frames: this.anims.generateFrameNumbers("player",
                    {start: 5, end: 8}),
                    frameRate: 10,
                    repeat: -1
                })
            }            

            this.triggerTimer = this.time.addEvent({
                callback: this.addPowerUp,
                callbackScope: this,
                delay: 5000,
                loop: true
            })
            this.triggerTimer = this.time.addEvent({
                callback: this.addHealthPickup,
                callbackScope: this,
                delay: 15000,
                loop: true
            })
            this.anims.resumeAll()
        }
    }

    shootBullet(){
        if (!this.gameOver) {
            let bullet = this.bullets.get(this.player.x, this.player.y)
            if(bullet){
                bullet.hasHit = false

                bullet.scale = 0.03
                bullet.setActive(true)
                bullet.setVisible(true)
                
                let pointer = this.input.activePointer
                let direction = new Phaser.Math.Vector2(pointer.x - this.player.x, pointer.y - this.player.y)
                direction.normalize()

                let bulletSpeed = 1000
                bullet.body.velocity.x = direction.x * bulletSpeed
                bullet.body.velocity.y = direction.y * bulletSpeed
                
                let angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, pointer.x, pointer.y)
                bullet.setRotation(angle)
            }
        }
    }

    bossShoot() {
        if (!this.gameOver) {
            let bullet = this.bossBullets.get(this.boss.x, this.boss.y)
        
            if (bullet) {
                bullet.hasHit = false
        
                bullet.setActive(true)
                bullet.setVisible(true)
                
                bullet.anims.play("rotation", true)
                let direction = new Phaser.Math.Vector2(this.player.x - this.boss.x, this.player.y - this.boss.y)
                direction.normalize()
                let bulletVelocity = 500
                bullet.setVelocity(direction.x * bulletVelocity, direction.y * bulletVelocity)
            }
        }

    }



    moveBoss(repeats) {
        if (!this.gameOver) {
            // Boss movement max and min values
            let minX = 50
            let maxX = game.config.width - 100
            let minY = 100
            let maxY = game.config.height - 200
            
            let targetX = Phaser.Math.Between(minX, maxX)
            let targetY = Phaser.Math.Between(minY, maxY)
        
            this.tweens.add({
                targets: this.boss,
                x: targetX,
                y: targetY,
                duration: 800,
                ease: 'power1',
                onComplete: () => {
                    if (repeats < 9){
                        repeats++
                        for (let i = 0; i < 2; i++){
                            this.time.delayedCall(100 * i, () => {
                                this.bossShoot()
                            })
                        }
                        this.moveBoss(repeats)
                    }else{
                        this.bossBulletWallShoot()
                        
                    }
                }
            })
        }

    }

    bossBulletWallShoot() {
        if (!this.gameOver) {
            const bulletSpacing = -70 // the spacing between bullets
            const startX = game.config.width // Start from the right side of the screen
            const startY = game.config.height - 230
            const bulletVelocity = -300
            for (let wallCount = 1; wallCount < 8; wallCount++){
                this.time.delayedCall(1500 * wallCount, () => {
                    for (let i = 0; i < wallCount; i++) {
                        if (wallCount > 5 && i == 2 || i == 3 || i == 4){
                            
                            continue
                        }else{
                            let targetX = Phaser.Math.Between(70, game.config.width - 70)
                            this.tweens.add({
                                targets: this.boss,
                                x: targetX,
                                y: 200,
                                duration: 500,
                                ease: 'power1',

                                
                            })
                            let bullet = this.bossBulletWall.get(startX, startY + i * bulletSpacing)
                            if (bullet) {
                                bullet.hasHit = false
                                bullet.setActive(true)
                                bullet.setVisible(true)
                                bullet.anims.play("bulletWallRotation", true)
                                bullet.setVelocity(bulletVelocity, 0)
                            }
                        }
                    }
                })
            }
            this.time.delayedCall(10000, () => {
                this.moveBoss(0)
            })
        }
        
        
    }
    hitPlayer(player, boss) {
        if (!player.immunity) {
            this.player.hp -= 10 
            this.playerHPText.setText("Player HP: " + this.player.hp)
            
            
            player.immunity = true // Set the player to be immune
            
            // Reset immunity after one second
            this.time.delayedCall(500, () => {
                player.immunity = false
            })
        }
    }

    hitPlayerBullet(player, bullet) {
        if (!this.gameOver) {
            bullet.setActive(false)
            bullet.setVisible(false)
            bullet.destroy()
            if (!player.immunity) {
                bullet.hasHit = true
                this.player.hp -= 10
                this.playerHPText.setText("Player HP: " + this.player.hp)
                
                
                player.immunity = true // Set the player to be immune
        
                // Reset immunity after one second
                this.time.delayedCall(1000, () => {
                    player.immunity = false
                })
            }
        }
    }

    hitBoss(boss, bullet){
        if (!bullet.hasHit) {
            bullet.hasHit = true
            bullet.setActive(false)
            bullet.setVisible(false)    
            this.boss.hp -= this.bulletDamage
            //this.bossHPtext.setText("Boss HP: " +this.boss.hp)
            let healthPercentage = this.boss.hp / 1000
            this.bossHealthBar.clear()
            this.bossHealthBar.fillStyle(0xff0000, 1)
            this.bossHealthBar.fillRect(this.bossHealthbarX, 20, this.bossHealthbarWidth * healthPercentage, 20)
        }
    }

    addPowerUp() {
        if (!this.gameOver) {
            this.powerUpGroup.create(Phaser.Math.Between(0, game.config.width), 0, "powerUp").scale = 0.1
            this.powerUpGroup.setVelocityY(gameOptions.playerSpeed)
        }

    }

    collectPowerUp(player, powerUp) {
        powerUp.disableBody(true, true)
        this.bulletDamage += 2
        this.powerText.setText("LVL: " + this.bulletDamage)
    }

    addHealthPickup() {
        this.healthPickupGroup.create(Phaser.Math.Between(0, game.config.width), 0, "healthPickup").scale = 0.3
        this.healthPickupGroup.setVelocityY(gameOptions.playerSpeed)

    }

    collectHealthPickup(player, healthPickup) {
        healthPickup.disableBody(true, true)
        this.player.hp += 10
        this.playerHPText.setText("Player HP: " + this.player.hp)
    }

    gameOverWin() {
        this.gameOver = true
        // Win text
        this.add.text(game.config.width / 2, game.config.height / 2, "You Win!", {
            fontSize: "64px",
            fill: "#00ff00"
        }).setOrigin(0.5)

        this.physics.pause()
        this.anims.pauseAll()
        
        // Provide an option to restart the game
        this.input.keyboard.once('keydown-SPACE', () => {
            this.scene.restart()
            this.gameOver = false
        })

        if(this.bestTime == null || parseFloat(this.bestTime) > parseFloat(this.elapsedTime.toFixed(2))){
            this.bestTime = this.elapsedTime.toFixed(2)
            localStorage.setItem('bestTime', this.bestTime)
            this.add.text(game.config.width / 2, game.config.height / 2 + 150, "New Best Time: " + this.bestTime + "\n Press Spacebar to Play Again", {
                fontSize: "64px",
                fill: "#00ff00",
                align: "center"
            }).setOrigin(0.5)
        }else{
            this.elapsedTime = (this.time.now - this.startTime) / 1000
            this.elapsedTimeText.setText('Final Time: ' + this.elapsedTime.toFixed(2))
            this.elapsedTimeText.setPosition(game.config.width / 2 - 150, game.config.height / 2 + 50)
            this.add.text(game.config.width / 2, game.config.height / 2 + 150, "Previous Best Time: " + this.bestTime + "\n Press Spacebar to Play Again", {
                fontSize: "44px",
                fill: "#00ff00",
                align: "center"
            }).setOrigin(0.5)
        }
        console.log(this.bestTime)
    }

    gameOverLose() {
        this.gameOver = true
        // Display lose message
        this.add.text(game.config.width / 2, game.config.height / 2, "Game Over\nPress Spacebar to Play Again", {
            fontSize: "64px",
            fill: "#ff0000",
            align: "center"
        }).setOrigin(0.5)
    
        // Stop game physics and animations
        this.physics.pause()
        
    
        // Provide an option to restart the game
        this.input.keyboard.once('keydown-SPACE', () => {
            this.scene.restart()
            this.gameOver = false
        })
    }

    update() {
        if (!this.gameOver) {
            this.elapsedTime = (this.time.now - this.startTime) / 1000 // Convert to seconds
            this.elapsedTimeText.setText('Time: ' + this.elapsedTime.toFixed(2))

            if (this.keys.a.isDown) {
                this.player.body.velocity.x = -gameOptions.playerSpeed
                this.player.anims.play("left", true)
            } else if (this.keys.d.isDown) {
                this.player.body.velocity.x = gameOptions.playerSpeed
                this.player.anims.play("right", true)
            } else {
                this.player.body.velocity.x = 0
                this.player.anims.play("turn", true)
            }
            if (this.keys.w.isDown && this.player.body.touching.down) {
                this.player.body.velocity.y = -gameOptions.playerSpeed * 2
            }
            
            if (this.keys.s.isDown && !this.player.body.touching.down) {
                this.player.body.velocity.y = gameOptions.playerSpeed * 2
            }  
            if (this.cursors.up.isDown){
                this.shootBullet()
            }
            if(this.boss.hp <= 0){
                //this.bossHPtext.setText("Boss HP: 0")
                this.boss.setActive(false)
                this.boss.setVisible(false)
                this.boss.destroy()
                this.bossHealthBar.clear()
                this.gameOverWin()
            }
            if(this.player.hp <= 0){
                this.player.setActive(false)
                this.player.setVisible(false)
                this.player.destroy()
                this.gameOverLose()
                this.playerHPText.setText("Player HP: 0")
                
            }
        }
    }
}