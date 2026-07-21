// ============================================================
//  game.js — Полная логика игры "Танки СССР"
// ============================================================

(function() {
    'use strict';

    // ─── CANVAS ───────────────────────────────────────────────────
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const wrapper = document.getElementById('canvasWrapper');
    const GAME_W = 600;
    const GAME_H = 340;

    function resizeCanvas() {
        const rect = wrapper.getBoundingClientRect();
        const w = rect.width;
        const h = rect.height;
        const ratio = GAME_W / GAME_H;
        let displayW = w;
        let displayH = w / ratio;
        if (displayH > h) {
            displayH = h;
            displayW = h * ratio;
        }
        canvas.width = GAME_W;
        canvas.height = GAME_H;
        canvas.style.width = displayW + 'px';
        canvas.style.height = displayH + 'px';
        canvas.style.position = 'absolute';
        canvas.style.left = '50%';
        canvas.style.top = '50%';
        canvas.style.transform = 'translate(-50%, -50%)';
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // ─── DOM ЭЛЕМЕНТЫ ──────────────────────────────────────────
    const scoreDisplay = document.getElementById('scoreDisplay');
    const moneyDisplay = document.getElementById('moneyDisplay');
    const tankNameDisplay = document.getElementById('tankNameDisplay');
    const tankHealthDisplay = document.getElementById('tankHealthDisplay');
    const levelDisplay = document.getElementById('levelDisplay');
    const timeDisplay = document.getElementById('timeDisplay');
    const finalScore = document.getElementById('finalScore');
    const shopOverlay = document.getElementById('shopOverlay');
    const shopList = document.getElementById('shopList');
    const shopMoney = document.getElementById('shopMoney');
    const gameoverOverlay = document.getElementById('gameoverOverlay');
    const pauseOverlay = document.getElementById('pauseOverlay');
    const pauseTime = document.getElementById('pauseTime');
    const bossHud = document.getElementById('bossHud');
    const bossHpDisplay = document.getElementById('bossHpDisplay');

    // ─── ОПРЕДЕЛЕНИЯ ТАНКОВ ────────────────────────────────────
    const TANK_DEFS = {
        't26': { id: 't26', name: 'Т-26', cost: 0, speed: 2.4, fireRate: 28, damage: 1, health: 3,
            bulletSpeed: 4.5, color: '#5a7a3a', trackColor: '#3a4a2a', turretColor: '#6a8a4a', star: true },
        'bt7': { id: 'bt7', name: 'БТ-7', cost: 60, speed: 3.6, fireRate: 22, damage: 1, health: 3,
            bulletSpeed: 5.0, color: '#6a8a4a', trackColor: '#4a5a3a', turretColor: '#7a9a5a', star: true },
        't34': { id: 't34', name: 'Т-34', cost: 120, speed: 3.0, fireRate: 18, damage: 2, health: 5,
            bulletSpeed: 5.5, color: '#4a7a3a', trackColor: '#2a4a2a', turretColor: '#5a8a4a', star: true },
        'kv1': { id: 'kv1', name: 'КВ-1', cost: 220, speed: 2.0, fireRate: 22, damage: 2, health: 8,
            bulletSpeed: 4.8, color: '#3a6a3a', trackColor: '#2a3a2a', turretColor: '#4a7a4a', star: true },
        'is2': { id: 'is2', name: 'ИС-2', cost: 350, speed: 2.2, fireRate: 24, damage: 3, health: 7,
            bulletSpeed: 5.2, color: '#2a5a2a', trackColor: '#1a3a1a', turretColor: '#3a6a3a', star: true },
        't54': { id: 't54', name: 'Т-54', cost: 550, speed: 4.0, fireRate: 14, damage: 3, health: 6,
            bulletSpeed: 6.0, color: '#4a7a5a', trackColor: '#2a4a3a', turretColor: '#5a8a6a', star: true },
        't62': { id: 't62', name: 'Т-62', cost: 800, speed: 3.8, fireRate: 12, damage: 4, health: 8,
            bulletSpeed: 6.2, color: '#4a6a5a', trackColor: '#2a4a3a', turretColor: '#5a7a6a', star: true }
    };

    // ─── СОСТОЯНИЕ ИГРЫ ──────────────────────────────────────
    const state = {
        player: {
            x: 70,
            y: 180,
            w: 36,
            h: 20,
            health: 3,
            maxHealth: 3,
            speed: 2.4,
            fireRate: 28,
            damage: 1,
            bulletSpeed: 4.5,
            fireCooldown: 0,
            alive: true,
            invincible: 0,
            trackOffset: 0,
            barrelAngle: 0
        },
        bullets: [],
        enemyBullets: [],
        enemies: [],
        coins: [],
        explosions: [],
        money: 0,
        score: 0,
        level: 1,
        spawnTimer: 0,
        spawnInterval: 120,
        maxEnemies: 2,
        gameOver: false,
        shopOpen: false,
        paused: false,
        frame: 0,
        timeSeconds: 0,
        ownedTanks: ['t26'],
        currentTankId: 't26',
        enemiesKilled: 0,
        boss: null,
        bossSpawned: false,
        bossDefeated: false,
        buildings: [],
        roadPoints: []
    };

    // ─── ГЕНЕРАЦИЯ КАРТЫ ──────────────────────────────────────
    function generateMap() {
        state.buildings = [];
        for (let i = 0; i < 8; i++) {
            let x = 60 + i * 70 + Math.random() * 30;
            let y = 10 + Math.random() * 70;
            let w = 25 + Math.random() * 35;
            let h = 30 + Math.random() * 45;
            if (x + w > GAME_W) break;
            state.buildings.push({
                x: x,
                y: y,
                w: w,
                h: h,
                destroyed: Math.random() > 0.4,
                color: `hsl(${30 + Math.random()*20}, 20%, ${35 + Math.random()*15}%)`
            });
        }
        state.roadPoints = [];
        for (let i = 0; i <= 20; i++) {
            let x = i * (GAME_W / 20);
            let y = GAME_H - 20 + Math.sin(i * 0.5) * 4 + Math.sin(i * 1.3 + 1) * 3;
            state.roadPoints.push({ x, y });
        }
    }
    generateMap();

    // ─── ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ──────────────────────────────
    function rand(min, max) { return Math.random() * (max - min) + min; }
    function randInt(min, max) { return Math.floor(rand(min, max + 1)); }
    function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
    function getTankDef(id) { return TANK_DEFS[id] || TANK_DEFS['t26']; }
    function getPlayerTankDef() { return getTankDef(state.currentTankId); }

    // ─── ОБНОВИТЬ HUD ──────────────────────────────────────────
    function updateHUD() {
        const def = getPlayerTankDef();
        scoreDisplay.textContent = state.score;
        moneyDisplay.textContent = state.money;
        tankNameDisplay.textContent = def.name;
        const hp = state.player.health;
        const maxHp = state.player.maxHealth;
        tankHealthDisplay.textContent = '❤️ ' + hp + '/' + maxHp;
        levelDisplay.textContent = state.level;
        const mins = Math.floor(state.timeSeconds / 60);
        const secs = Math.floor(state.timeSeconds % 60);
        timeDisplay.textContent = String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0');
        if (state.paused) {
            pauseTime.textContent = timeDisplay.textContent;
        }
        if (state.boss && state.boss.alive) {
            bossHud.style.display = 'flex';
            bossHpDisplay.textContent = Math.ceil(state.boss.health);
        } else {
            bossHud.style.display = 'none';
        }
    }

    // ─── СПАВН ВРАГА ──────────────────────────────────────────
    function spawnEnemy() {
        if (state.enemies.length >= state.maxEnemies || state.gameOver || state.paused) return;

        const r = Math.random();
        let enemyType = r < 0.6 ? 'light' : (r < 0.85 ? 'medium' : 'heavy');
        let health, speed, w, h, color, turretColor, trackColor, damage, bulletSpeed, fireRate;
        const baseSpeed = 0.5 + state.level * 0.02;
        const enemyDamage = 1;

        if (enemyType === 'light') {
            health = 1;
            speed = baseSpeed * 1.3;
            w = 24;
            h = 14;
            color = '#5a6a4a';
            turretColor = '#6a7a5a';
            trackColor = '#3a4a2a';
            damage = enemyDamage;
            bulletSpeed = 1.5 + state.level * 0.03;
            fireRate = 70 - Math.min(state.level, 15);
        } else if (enemyType === 'medium') {
            health = 2;
            speed = baseSpeed * 1.0;
            w = 30;
            h = 18;
            color = '#6a5a3a';
            turretColor = '#7a6a4a';
            trackColor = '#4a3a2a';
            damage = enemyDamage;
            bulletSpeed = 1.8 + state.level * 0.03;
            fireRate = 60 - Math.min(state.level, 12);
        } else {
            health = 3;
            speed = baseSpeed * 0.7;
            w = 36;
            h = 22;
            color = '#4a4a3a';
            turretColor = '#5a5a4a';
            trackColor = '#2a2a1a';
            damage = enemyDamage;
            bulletSpeed = 1.6 + state.level * 0.025;
            fireRate = 50 - Math.min(state.level, 10);
        }

        state.enemies.push({
            x: GAME_W + 10,
            y: 40 + rand(0, GAME_H - 70 - h),
            w: w,
            h: h,
            health: health,
            maxHealth: health,
            speed: Math.max(0.15, speed),
            color: color,
            turretColor: turretColor,
            trackColor: trackColor,
            damage: damage,
            bulletSpeed: Math.max(1.2, bulletSpeed),
            fireRate: Math.max(30, fireRate),
            fireCooldown: randInt(20, 50),
            reward: 5,
            alive: true,
            hitFlash: 0,
            trackOffset: rand(0, 100)
        });
    }

    // ─── СПАВН БОССА ──────────────────────────────────────────
    function spawnBoss() {
        if (state.bossSpawned || state.gameOver) return;
        state.bossSpawned = true;
        state.boss = {
            x: GAME_W + 20,
            y: GAME_H / 2 - 30,
            w: 60,
            h: 40,
            health: 1000,
            maxHealth: 1000,
            speed: 0.2,
            damage: 1,
            bulletSpeed: 1.8,
            fireRate: 240,
            fireCooldown: randInt(0, 50),
            color: '#4a2a2a',
            turretColor: '#6a3a3a',
            trackColor: '#2a1a1a',
            alive: true,
            hitFlash: 0,
            trackOffset: rand(0, 100),
            star: true
        };
        for (let i = 0; i < 15; i++) {
            state.explosions.push({
                x: state.boss.x + rand(0, state.boss.w),
                y: state.boss.y + rand(0, state.boss.h),
                r: rand(3, 10),
                life: randInt(12, 25),
                maxLife: 25,
                color: ['#ff6644', '#ffaa44', '#ffdd66', '#ff8844'][randInt(0, 3)],
                vx: rand(-1.5, 1.5),
                vy: rand(-2.5, 0),
                gravity: 0.04
            });
        }
        updateHUD();
    }

    // ─── ВЫСТРЕЛ ИГРОКА ──────────────────────────────────────
    function playerShoot() {
        if (state.gameOver || state.paused) return;
        const p = state.player;
        if (!p.alive || p.fireCooldown > 0) return;
        const def = getPlayerTankDef();
        p.fireCooldown = def.fireRate;
        const angle = p.barrelAngle;
        state.bullets.push({
            x: p.x + p.w - 2,
            y: p.y + p.h / 2 - 2,
            w: 7,
            h: 3,
            vx: Math.cos(angle) * def.bulletSpeed,
            vy: Math.sin(angle) * def.bulletSpeed,
            damage: def.damage,
            friendly: true
        });
        state.explosions.push({
            x: p.x + p.w - 6,
            y: p.y + p.h / 2 - 4,
            r: 5,
            life: 6,
            maxLife: 6,
            color: '#ffdd44'
        });
    }

    // ─── ВЫСТРЕЛ ВРАГА ──────────────────────────────────────
    function enemyShoot(enemy) {
        if (enemy.fireCooldown > 0 || !enemy.alive) return;
        const p = state.player;
        if (!p.alive) return;
        enemy.fireCooldown = enemy.fireRate;
        const angle = Math.PI + rand(-0.15, 0.15);
        const speed = enemy.bulletSpeed * 0.5;
        state.enemyBullets.push({
            x: enemy.x - 4,
            y: enemy.y + enemy.h / 2 - 2,
            w: 5,
            h: 3,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            damage: enemy.damage
        });
    }

    // ─── ВЗРЫВ ────────────────────────────────────────────────
    function createExplosion(x, y, size, color) {
        const count = Math.min(6 + randInt(0, 4), 10);
        for (let i = 0; i < count; i++) {
            const angle = rand(0, Math.PI * 2);
            const speed = rand(0.3, 1.8 + size * 0.3);
            const life = randInt(8, 16);
            state.explosions.push({
                x: x + rand(-3, 3),
                y: y + rand(-3, 3),
                r: rand(2, 4 + size * 1.5),
                life: life,
                maxLife: life,
                color: color || ['#ff6644', '#ffaa44', '#ff8844', '#ff5533'][randInt(0, 3)],
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 0.3,
                gravity: 0.05
            });
        }
    }

    // ─── УНИЧТОЖЕНИЕ ВРАГА ──────────────────────────────────
    function destroyEnemy(enemy) {
        if (!enemy.alive) return;
        enemy.alive = false;
        state.score += 10 + state.level * 2;
        state.money += 5;
        if (state.player.health < state.player.maxHealth) {
            state.player.health += 1;
            if (state.player.health > state.player.maxHealth) state.player.health = state.player.maxHealth;
        }
        createExplosion(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, 0.7, '#ffdd44');
        state.enemiesKilled++;
        if (state.enemiesKilled >= 60 && !state.bossSpawned && !state.bossDefeated) {
            spawnBoss();
        }
        const newLevel = Math.floor(state.score / 100) + 1;
        if (newLevel > state.level) {
            state.level = newLevel;
            state.maxEnemies = Math.min(2 + Math.floor(state.level / 2), 5);
            state.spawnInterval = Math.max(50, 120 - state.level * 3);
        }
        updateHUD();
    }

    // ─── УНИЧТОЖЕНИЕ БОССА ──────────────────────────────────
    function destroyBoss() {
        const boss = state.boss;
        if (!boss || !boss.alive) return;
        boss.alive = false;
        state.bossDefeated = true;
        state.score += 500;
        state.money += 200;
        for (let i = 0; i < 30; i++) {
            state.explosions.push({
                x: boss.x + rand(0, boss.w),
                y: boss.y + rand(0, boss.h),
                r: rand(3, 14),
                life: randInt(12, 30),
                maxLife: 30,
                color: ['#ff6644', '#ffaa44', '#ffdd66', '#ff8844', '#ff5533', '#ff3333'][randInt(0, 5)],
                vx: rand(-2.5, 2.5),
                vy: rand(-3.5, 0.5),
                gravity: 0.04
            });
        }
        for (let i = 0; i < 6; i++) {
            state.coins.push({
                x: boss.x + rand(0, boss.w),
                y: boss.y + rand(0, boss.h),
                w: 8,
                h: 8,
                value: 20,
                vy: -2 - rand(0, 1.5),
                life: 150,
                bob: rand(0, 5),
                collected: false
            });
        }
        updateHUD();
    }

    // ─── СБРОС ИГРЫ ──────────────────────────────────────────
    function resetGame() {
        const def = getTankDef(state.currentTankId);
        state.player.x = 70;
        state.player.y = 180;
        state.player.w = 36;
        state.player.h = 20;
        state.player.health = def.health;
        state.player.maxHealth = def.health;
        state.player.speed = def.speed;
        state.player.fireRate = def.fireRate;
        state.player.damage = def.damage;
        state.player.bulletSpeed = def.bulletSpeed;
        state.player.fireCooldown = 0;
        state.player.alive = true;
        state.player.invincible = 60;
        state.player.trackOffset = 0;
        state.player.barrelAngle = 0;
        state.bullets = [];
        state.enemyBullets = [];
        state.enemies = [];
        state.coins = [];
        state.explosions = [];
        state.money = Math.max(0, state.money);
        state.score = 0;
        state.level = 1;
        state.spawnTimer = 0;
        state.spawnInterval = 120;
        state.maxEnemies = 2;
        state.gameOver = false;
        state.paused = false;
        state.frame = 0;
        state.timeSeconds = 0;
        state.enemiesKilled = 0;
        state.boss = null;
        state.bossSpawned = false;
        state.bossDefeated = false;
        gameoverOverlay.classList.remove('active');
        pauseOverlay.classList.remove('active');
        updateHUD();
    }

    function fullRestart() {
        state.money = 0;
        state.score = 0;
        state.ownedTanks = ['t26'];
        state.currentTankId = 't26';
        state.level = 1;
        state.maxEnemies = 2;
        state.spawnInterval = 120;
        state.timeSeconds = 0;
        state.enemiesKilled = 0;
        state.bossSpawned = false;
        state.bossDefeated = false;
        resetGame();
        renderShop();
    }

    // ─── ПАУЗА ──────────────────────────────────────────────────
    function togglePause() {
        if (state.gameOver) return;
        state.paused = !state.paused;
        pauseOverlay.classList.toggle('active', state.paused);
        if (state.paused) {
            pauseTime.textContent = timeDisplay.textContent;
        }
    }

    function resumeGame() {
        if (state.paused) {
            state.paused = false;
            pauseOverlay.classList.remove('active');
        }
    }

    // ─── КЛАВИАТУРА ─────────────────────────────────────────────
    const keys = {
        left: false,
        right: false,
        up: false,
        down: false,
        fire: false,
        barrelUp: false,
        barrelDown: false
    };

    document.addEventListener('keydown', (e) => {
        switch (e.key) {
            case 'ArrowLeft':
            case 'a':
            case 'A':
                keys.left = true;
                e.preventDefault();
                break;
            case 'ArrowRight':
            case 'd':
            case 'D':
                keys.right = true;
                e.preventDefault();
                break;
            case 'ArrowUp':
            case 'w':
            case 'W':
                keys.up = true;
                e.preventDefault();
                break;
            case 'ArrowDown':
            case 's':
            case 'S':
                keys.down = true;
                e.preventDefault();
                break;
            case ' ':
            case 'Space':
                keys.fire = true;
                e.preventDefault();
                break;
            case 'q':
            case 'Q':
                keys.barrelUp = true;
                e.preventDefault();
                break;
            case 'e':
            case 'E':
                keys.barrelDown = true;
                e.preventDefault();
                break;
            case 'p':
            case 'P':
                togglePause();
                e.preventDefault();
                break;
            case 'Enter':
                if (state.gameOver) { fullRestart();
                    e.preventDefault(); }
                break;
        }
    });

    document.addEventListener('keyup', (e) => {
        switch (e.key) {
            case 'ArrowLeft':
            case 'a':
            case 'A':
                keys.left = false;
                e.preventDefault();
                break;
            case 'ArrowRight':
            case 'd':
            case 'D':
                keys.right = false;
                e.preventDefault();
                break;
            case 'ArrowUp':
            case 'w':
            case 'W':
                keys.up = false;
                e.preventDefault();
                break;
            case 'ArrowDown':
            case 's':
            case 'S':
                keys.down = false;
                e.preventDefault();
                break;
            case ' ':
            case 'Space':
                keys.fire = false;
                e.preventDefault();
                break;
            case 'q':
            case 'Q':
                keys.barrelUp = false;
                e.preventDefault();
                break;
            case 'e':
            case 'E':
                keys.barrelDown = false;
                e.preventDefault();
                break;
        }
    });

    // ─── ОБНОВЛЕНИЕ ──────────────────────────────────────────
    function update() {
        if (state.gameOver || state.paused) return;

        state.frame++;
        if (state.frame % 60 === 0) {
            state.timeSeconds++;
            updateHUD();
        }

        const p = state.player;
        const def = getPlayerTankDef();

        p.speed = def.speed;
        p.fireRate = def.fireRate;
        p.damage = def.damage;
        p.bulletSpeed = def.bulletSpeed;
        p.maxHealth = def.health;
        if (p.health > p.maxHealth) p.health = p.maxHealth;
        if (p.invincible > 0) p.invincible--;
        if (p.fireCooldown > 0) p.fireCooldown--;

        let dx = 0,
            dy = 0;
        if (keys.left) dx = -p.speed;
        if (keys.right) dx = p.speed;
        if (keys.up) dy = -p.speed * 0.6;
        if (keys.down) dy = p.speed * 0.6;
        if (dx !== 0) p.trackOffset += 0.3;
        p.x = clamp(p.x + dx, 10, GAME_W - p.w - 10);
        p.y = clamp(p.y + dy, 30, GAME_H - p.h - 10);

        if (keys.barrelUp) p.barrelAngle = Math.max(-0.5, p.barrelAngle - 0.03);
        if (keys.barrelDown) p.barrelAngle = Math.min(0.5, p.barrelAngle + 0.03);
        if (keys.fire) playerShoot();

        // ── Пули игрока ──
        for (let i = state.bullets.length - 1; i >= 0; i--) {
            const b = state.bullets[i];
            b.x += b.vx;
            b.y += b.vy;
            if (b.x > GAME_W + 20 || b.x < -20 || b.y < -20 || b.y > GAME_H + 20) {
                state.bullets.splice(i, 1);
                continue;
            }
            let hit = false;
            for (const enemy of state.enemies) {
                if (!enemy.alive) continue;
                if (b.x < enemy.x + enemy.w && b.x + b.w > enemy.x &&
                    b.y < enemy.y + enemy.h && b.y + b.h > enemy.y) {
                    enemy.health -= b.damage;
                    enemy.hitFlash = 6;
                    createExplosion(b.x, b.y, 0.3, '#ffaa44');
                    if (enemy.health <= 0) destroyEnemy(enemy);
                    hit = true;
                    break;
                }
            }
            if (!hit && state.boss && state.boss.alive) {
                const boss = state.boss;
                if (b.x < boss.x + boss.w && b.x + b.w > boss.x &&
                    b.y < boss.y + boss.h && b.y + b.h > boss.y) {
                    boss.health -= b.damage;
                    boss.hitFlash = 6;
                    createExplosion(b.x, b.y, 0.4, '#ff8844');
                    if (boss.health <= 0) destroyBoss();
                    hit = true;
                    updateHUD();
                }
            }
            if (hit) state.bullets.splice(i, 1);
        }

        // ── Пули врагов ──
        for (let i = state.enemyBullets.length - 1; i >= 0; i--) {
            const b = state.enemyBullets[i];
            b.x += b.vx;
            b.y += b.vy;
            if (b.x < -20 || b.x > GAME_W + 20 || b.y < -20 || b.y > GAME_H + 20) {
                state.enemyBullets.splice(i, 1);
                continue;
            }
            if (p.alive && p.invincible === 0) {
                if (b.x < p.x + p.w && b.x + b.w > p.x &&
                    b.y < p.y + p.h && b.y + b.h > p.y) {
                    p.health -= b.damage;
                    p.invincible = 30;
                    createExplosion(b.x, b.y, 0.4, '#ff5533');
                    state.enemyBullets.splice(i, 1);
                    updateHUD();
                    if (p.health <= 0) {
                        p.alive = false;
                        createExplosion(p.x + p.w / 2, p.y + p.h / 2, 1.5, '#ff6644');
                        state.gameOver = true;
                        finalScore.textContent = state.score;
                        gameoverOverlay.classList.add('active');
                    }
                    continue;
                }
            }
        }

        // ── Враги ──
        for (let i = state.enemies.length - 1; i >= 0; i--) {
            const enemy = state.enemies[i];
            if (!enemy.alive) { state.enemies.splice(i, 1); continue; }
            if (enemy.hitFlash > 0) enemy.hitFlash--;
            const targetY = state.player.y + state.player.h / 2 - enemy.h / 2;
            const dy2 = targetY - enemy.y;
            const moveSpeed = enemy.speed * 0.3;
            if (Math.abs(dy2) > 6) {
                enemy.y += Math.sign(dy2) * Math.min(Math.abs(dy2) * 0.02, moveSpeed);
            }
            enemy.y = clamp(enemy.y, 30, GAME_H - enemy.h - 10);
            enemy.x -= enemy.speed * 0.25;
            if (enemy.x < -60) { state.enemies.splice(i, 1); continue; }
            if (enemy.fireCooldown > 0) enemy.fireCooldown--;
            if (Math.random() < 0.15) enemyShoot(enemy);
            if (p.alive && p.invincible === 0) {
                if (enemy.x < p.x + p.w && enemy.x + enemy.w > p.x &&
                    enemy.y < p.y + p.h && enemy.y + enemy.h > p.y) {
                    p.health -= 1;
                    p.invincible = 40;
                    createExplosion(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, 0.5, '#ff6644');
                    enemy.x += 30;
                    updateHUD();
                    if (p.health <= 0) {
                        p.alive = false;
                        createExplosion(p.x + p.w / 2, p.y + p.h / 2, 1.5, '#ff6644');
                        state.gameOver = true;
                        finalScore.textContent = state.score;
                        gameoverOverlay.classList.add('active');
                    }
                }
            }
            enemy.trackOffset += 0.12;
        }

        // ── Босс ──
        if (state.boss && state.boss.alive) {
            const boss = state.boss;
            if (boss.hitFlash > 0) boss.hitFlash--;
            const targetY = state.player.y + state.player.h / 2 - boss.h / 2;
            const dyBoss = targetY - boss.y;
            const moveSpeedBoss = boss.speed * 0.4;
            if (Math.abs(dyBoss) > 5) {
                boss.y += Math.sign(dyBoss) * Math.min(Math.abs(dyBoss) * 0.02, moveSpeedBoss);
            }
            boss.y = clamp(boss.y, 30, GAME_H - boss.h - 10);
            boss.x -= boss.speed * 0.2;
            if (boss.fireCooldown > 0) boss.fireCooldown--;
            if (boss.fireCooldown === 0 && Math.random() < 0.3) {
                const p2 = state.player;
                if (p2.alive) {
                    boss.fireCooldown = boss.fireRate;
                    const angle = Math.PI + rand(-0.12, 0.12);
                    const speed = boss.bulletSpeed * 0.4;
                    state.enemyBullets.push({
                        x: boss.x - 4,
                        y: boss.y + boss.h / 2 - 2,
                        w: 7,
                        h: 4,
                        vx: Math.cos(angle) * speed,
                        vy: Math.sin(angle) * speed,
                        damage: boss.damage,
                        isBoss: true
                    });
                    state.explosions.push({
                        x: boss.x - 6,
                        y: boss.y + boss.h / 2 - 4,
                        r: 4,
                        life: 5,
                        maxLife: 5,
                        color: '#ff8844'
                    });
                }
            }
            if (p.alive && p.invincible === 0) {
                if (boss.x < p.x + p.w && boss.x + boss.w > p.x &&
                    boss.y < p.y + p.h && boss.y + boss.h > p.y) {
                    p.health -= 1;
                    p.invincible = 40;
                    createExplosion(boss.x + boss.w / 2, boss.y + boss.h / 2, 0.6, '#ff6644');
                    boss.x += 20;
                    updateHUD();
                    if (p.health <= 0) {
                        p.alive = false;
                        createExplosion(p.x + p.w / 2, p.y + p.h / 2, 1.5, '#ff6644');
                        state.gameOver = true;
                        finalScore.textContent = state.score;
                        gameoverOverlay.classList.add('active');
                    }
                }
            }
            boss.trackOffset += 0.1;
        }

        // ── Спавн врагов ──
        state.spawnTimer++;
        if (state.spawnTimer >= state.spawnInterval) {
            state.spawnTimer = 0;
            spawnEnemy();
            if (state.level > 8 && Math.random() < 0.05) spawnEnemy();
        }

        // ── Взрывы ──
        for (let i = state.explosions.length - 1; i >= 0; i--) {
            const e = state.explosions[i];
            e.x += e.vx || 0;
            e.y += e.vy || 0;
            if (e.gravity) e.vy += e.gravity;
            e.life--;
            if (e.life <= 0) state.explosions.splice(i, 1);
        }

        // ── Монеты ──
        for (let i = state.co
