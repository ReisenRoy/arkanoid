const KEYS = {
	LEFT: 37,
	RIGHT: 39,
	SPACE: 32,
};

let game = {
	running: true,
	context: null,
	ball: null,
	platform: null,
	blocks: [],
	score: 0,
	rows: 4,
	cols: 8,
	width: 640,
	height: 360,
	sprites: {
		background: null,
		ball: null,
		platform: null,
		block: null,
	},
	sounds: {
		bump: null,
	},

	init() {
		// init (api for rendering)
		this.context = document.getElementById("mycanvas").getContext("2d");
		this.setEvents();
	},

	setEvents() {
		window.addEventListener("keydown", e => {
			if (e.keyCode === KEYS.SPACE) {
				this.platform.fire();
			} else if (e.keyCode === KEYS.LEFT || e.keyCode === KEYS.RIGHT) {
				this.platform.start(e.keyCode);
			}
		});

		window.addEventListener("keyup", e => {
			this.platform.stop();
		});
	},

	preload(callback) {
		let loaded = 0;
		let required = Object.keys(this.sprites).length;
		required += Object.keys(this.sounds).length;

		let onResourceLoad = () => {
			++loaded;
			if (loaded >= required) {
				callback();
			}
		};

		this.preloadSprites(onResourceLoad);
		this.preloadAudio(onResourceLoad);
	},

	preloadSprites(onResourceLoad) {
		for (let key in this.sprites) {
			this.sprites[key] = new Image();
			this.sprites[key].src = `./img/${key}.png`;
			this.sprites[key].addEventListener("load", onResourceLoad);
		}
	},

	preloadAudio(onResourceLoad) {
		for (let key in this.sounds) {
			this.sounds[key] = new Audio(`./sounds/${key}.mp3`);
			this.sounds[key].addEventListener("canplaythrough", onResourceLoad, {once: true});
		}
	},

	create() {
		for (let row = 0; row < this.rows; row++) {
			for (let col = 0; col < this.cols; col++) {
				this.blocks.push({
					active: true,
					width: 60,
					height: 20,
					x: 64 * col + 65,
					y: 24 * row + 35,
				})
			}
		}
	},

	update() {
		this.collideBlocks();
		this.collidePlatform();
		this.ball.collideWorldBounds();
		this.platform.collideWorldBounds();
		// реализация движения
		this.platform.move();
		this.ball.move();
	},

	addScore() {
		++this.score;

		if (this.score >= this.blocks.length) {
			this.addScore("You Win!");
		}
	},

	collideBlocks() {
		for (let block of this.blocks) {
			if (block.active && this.ball.collide(block)) {
					this.ball.bumbBlock(block);
					this.addScore();
					this.sounds.bump.play();
			}
		}
	},

	collidePlatform() {
		if (this.ball.collide(this.platform)) {
			this.ball.bumbPlatform(this.platform);
			this.sounds.bump.play();
		}
	},

	run() {
		if (this.running) {
			window.requestAnimationFrame(() => {
				this.update();
				this.render();
				this.run();
			});
		}
	},

	render() {
		this.context.clearRect(0, 0, this.width, this.height);

		this.context.drawImage(this.sprites.background, 0, 0);
		this.context.drawImage(this.sprites.ball,
													 0, 0, 
													 this.ball.width, this.ball.height, 
													 this.ball.x, this.ball.y, 
													 this.ball.width, this.ball.height);
		this.context.drawImage(this.sprites.platform, this.platform.x, this.platform.y);
		this.renderBlocks();
	},
	
	renderBlocks() {
		for (let block of this.blocks) {
			if (block.active) {
				this.context.drawImage(this.sprites.block, block.x, block.y);
			}
		}
	},

	start() {
		// run
		this.init();
		this.preload(() => {
			this.create(); 
			this.run();
		});
	},

	end(message) {
		this.running = false;
		alert(message);
		window.location.reload();
	},

	random(min, max) {
		return Math.floor(Math.random() * (max - min + 1) + min);
	}
};

game.ball = {
	x: 320,
	y: 280,
	width: 20,
	height: 20,
	dy: 0,
	dx: 0,
	velocity: 3,

	start() {
		this.dy = -this.velocity;
		this.dx = game.random(-this.velocity, this.velocity);
	},

	move() {
		if (this.dy) {
			// обновляем координату с учетом смещения
			this.y += this.dy;
		}
		if (this.dx) {
			this.x += this.dx;
		}
	},

	collide(el) {
		let x = this.x + this.dx;
		let y = this.y + this.dy;

		if (x + this.width > el.x &&
				x < el.x + el.width &&
				y + this.height > el.y &&
				y < el.y + el.height) {
				return true;
		}
		return false;
	},

	collideWorldBounds() {
		let x = this.x + this.dx;
		let y = this.y + this.dy;

		let ballLeft = x;
		let ballRight = x + this.width;
		let ballTop = y;
		let ballBottom = y + this.height;

		let worldLeft = 0;
		let worldRight = game.width;
		let worldTop = 0;
		let worldBottom = game.height;

		if (ballLeft < worldLeft) {
			this.x = 0;
			this.dx = this.velocity;
			game.sounds.bump.play();
		} else if (ballRight > worldRight) {
			this.x = worldRight - this.width;
			this.dx = -this.velocity;
			game.sounds.bump.play();
		} else if (ballTop < worldTop) {
			this.y = 0;
			this.dy = this.velocity;
			game.sounds.bump.play();
		} else if (ballBottom > worldBottom) {
			game.end("Game Over");
		}
	},

	bumbBlock(block) {
		this.dy = -this.dy;
		block.active = false;
	},

	bumbPlatform(platform) {
		if (platform.dx) {
			this.x += platform.dx;
		}
		// если мяч уже оттолкнулся, снова не выполняем
		if (this.dy > 0) {
			this.dy = -this.velocity;
			// координата касания с платформой
			let touchX = this.x + this.width / 2;
			this.dx = this.velocity * platform.getTochOffset(touchX);
		}
	}
};

game.platform = {
	x: 280,
	y: 300,
	width: 100,
	height: 14,
	velocity: 6,
	// первоначально в сост покоя
	dx: 0,
	ball: game.ball,

	start(direction) {
		if (direction === KEYS.LEFT) {
			this.dx = -this.velocity;
		} else if (direction === KEYS.RIGHT) {
			this.dx = this.velocity;
		}
	},

	stop() {
		this.dx = 0;
	},

	move() {
		if (this.dx) {
			this.x += this.dx;
			if (this.ball) {
				this.ball.x += this.dx;
			}
		}
	},

	// Метод "платформа запускает мяч",
	// после того, как мы запустили мяч,
	// платформа мяч теряет, т.е. ничего о нем не знает
	fire() {
		if (this.ball) {
			this.ball.start();
			this.ball = null;
		}
	},

	getTochOffset(x) {
		// "кусочек" от касания мяча до правой части платформы
		let diff = this.x + this.width - x;
		let offset = this.width - diff;
		// значение координаты касания в частях (от 0 до 2)
		let result = 2 * offset / this.width;
		return result - 1
	},

	collideWorldBounds() {
		let x = this.x + this.dx;

		let platformLeft = x;
		let platformRight = x + this.width;

		let worldLeft = 0;
		let worldRight = game.width;

		if (platformLeft < worldLeft || platformRight > worldRight) {
			this.stop();
		}
	}
};

window.addEventListener("load", () => {
	game.start();
});