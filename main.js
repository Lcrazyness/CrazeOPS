import * as THREE from 'three';

const bootStatus = document.getElementById('bootStatus');
const boot = document.getElementById('boot');
const app = document.getElementById('app');

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];

const SETTINGS_DEFAULT = {
  sensitivity: .8,
  adsSensitivity: .65,
  fov: 82,
  master: .55,
  quality: 'high',
  invert: false,
  motion: false,
  vsync: false
};

const settings = Object.assign(
  {},
  SETTINGS_DEFAULT,
  JSON.parse(localStorage.getItem('frontline-settings') || '{}')
);

const WEAPONS = {
  carbine: {
    name: 'ARC-5 CARBINE',
    cat: 'primary',
    damage: 28,
    head: 1.65,
    rate: 720,
    mag: 30,
    reserve: 120,
    reload: 2.0,
    range: 110,
    spread: .011,
    recoil: .015,
    color: 0x252a2d,
    model: 'carbine',
    ads: .12
  },

  smg: {
    name: 'VEX-9 SMG',
    cat: 'primary',
    damage: 20,
    head: 1.5,
    rate: 930,
    mag: 36,
    reserve: 144,
    reload: 1.8,
    range: 65,
    spread: .018,
    recoil: .021,
    color: 0x25282a,
    model: 'smg',
    ads: .10
  },

  shotgun: {
    name: 'BRK-12 SHOTGUN',
    cat: 'primary',
    damage: 12,
    head: 1.35,
    rate: 80,
    mag: 8,
    reserve: 48,
    reload: 2.3,
    range: 28,
    spread: .075,
    recoil: .085,
    color: 0x2a2624,
    model: 'shotgun',
    ads: .16,
    pellets: 8
  },

  marksman: {
    name: 'M-41 MARKSMAN',
    cat: 'primary',
    damage: 54,
    head: 1.8,
    rate: 270,
    mag: 12,
    reserve: 60,
    reload: 2.2,
    range: 170,
    spread: .004,
    recoil: .04,
    color: 0x25282b,
    model: 'marksman',
    ads: .26
  },

  sidearm: {
    name: 'KITE-8 SIDEARM',
    cat: 'pistol',
    damage: 31,
    head: 1.7,
    rate: 380,
    mag: 15,
    reserve: 60,
    reload: 1.5,
    range: 70,
    spread: .013,
    recoil: .022,
    color: 0x222528,
    model: 'pistol',
    ads: .1
  },

  burst: {
    name: 'R-16 BURST',
    cat: 'pistol',
    damage: 25,
    head: 1.65,
    rate: 700,
    mag: 21,
    reserve: 84,
    reload: 1.7,
    range: 75,
    spread: .012,
    recoil: .026,
    color: 0x24292b,
    model: 'pistol',
    ads: .11
  }
};

const kits = [
  {
    name: 'Recon',
    primary: 'marksman',
    secondary: 'sidearm',
    tactical: 'flash',
    lethal: 'frag'
  },
  {
    name: 'Assault',
    primary: 'carbine',
    secondary: 'sidearm',
    tactical: 'smoke',
    lethal: 'frag'
  },
  {
    name: 'Breach',
    primary: 'shotgun',
    secondary: 'burst',
    tactical: 'stun',
    lethal: 'impact'
  },
  {
    name: 'Runner',
    primary: 'smg',
    secondary: 'sidearm',
    tactical: 'emp',
    lethal: 'incendiary'
  },
  {
    name: 'Raider',
    primary: 'carbine',
    secondary: 'burst',
    tactical: 'smoke',
    lethal: 'frag'
  }
];

let selectedKit = 1;

class AudioManager {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.ready = false;
  }

  init() {
    if (this.ready) return;

    this.ctx = new (
      window.AudioContext ||
      window.webkitAudioContext
    )();

    this.master = this.ctx.createGain();
    this.master.gain.value = settings.master;
    this.master.connect(this.ctx.destination);
    this.ready = true;
  }

  tone(f, d = .05, type = 'square', vol = .05) {
    if (!this.ready) return;

    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();

    o.type = type;
    o.frequency.value = f;

    g.gain.value = vol * settings.master;

    o.connect(g).connect(this.master);

    o.start();

    g.gain.exponentialRampToValueAtTime(
      .0001,
      this.ctx.currentTime + d
    );

    o.stop(this.ctx.currentTime + d);
  }

  gun() {
    this.tone(70, .045, 'sawtooth', .22);
    this.tone(120, .028, 'square', .08);
  }

  hit() {
    this.tone(1150, .045, 'triangle', .075);
  }

  head() {
    this.tone(1500, .05, 'triangle', .11);
    setTimeout(() => this.tone(
      900,
      .05,
      'triangle',
      .06
    ), 28);
  }

  reload() {
    this.tone(240, .1, 'triangle', .08);
    setTimeout(() => this.tone(
      420,
      .08,
      'triangle',
      .07
    ), 120);
  }

  click() {
    this.tone(180, .035, 'square', .05);
  }

  step(metal = false) {
    this.tone(
      metal ? 190 : 150,
      .035,
      'triangle',
      .025
    );
  }

  explosion() {
    this.tone(45, .32, 'sawtooth', .24);
  }

  ui() {
    this.tone(540, .05, 'sine', .03);
  }
}

const audio = new AudioManager();

class InputManager {
  constructor() {
    this.keys = new Set();

    this.mouse = {
      dx: 0,
      dy: 0,
      buttons: 0
    };

    this.pointer = false;
    this.just = new Set();

    addEventListener('keydown', e => {
      if (!this.keys.has(e.code)) {
        this.just.add(e.code);
      }

      this.keys.add(e.code);

      if (['Space', 'Tab'].includes(e.code)) {
        e.preventDefault();
      }
    });

    addEventListener('keyup', e => {
      this.keys.delete(e.code);
    });

    addEventListener('mousemove', e => {
      if (this.pointer) {
        this.mouse.dx += e.movementX;
        this.mouse.dy += e.movementY;
      }
    });

    addEventListener('mousedown', e => {
      this.mouse.buttons |= (1 << e.button);

      if (e.button === 0) {
        audio.init();
      }
    });

    addEventListener('mouseup', e => {
      this.mouse.buttons &= ~(1 << e.button);
    });

    addEventListener('contextmenu', e => {
      e.preventDefault();
    });

    addEventListener('pointerlockchange', () => {
      this.pointer =
        document.pointerLockElement === document.body;
    });
  }

  down(c) {
    return this.keys.has(c);
  }

  pressed(c) {
    return this.just.has(c);
  }

  consume() {
    this.just.clear();
    this.mouse.dx = 0;
    this.mouse.dy = 0;
  }

  lock() {
    document.body.requestPointerLock?.();
  }

  unlock() {
    document.exitPointerLock?.();
  }
}

const input = new InputManager();

class ModelFactory {
  static mat(color, rough = .5, metal = .2) {
    return new THREE.MeshStandardMaterial({
      color,
      roughness: rough,
      metalness: metal
    });
  }

  static box(
    w,
    h,
    d,
    color,
    rough = .5,
    metal = .2
  ) {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      this.mat(color, rough, metal)
    );

    m.castShadow = true;
    m.receiveShadow = true;

    return m;
  }

  static cyl(
    r1,
    r2,
    h,
    color,
    rough = .5,
    metal = .2,
    seg = 16
  ) {
    const m = new THREE.Mesh(
      new THREE.CylinderGeometry(
        r1,
        r2,
        h,
        seg
      ),
      this.mat(color, rough, metal)
    );

    m.castShadow = true;
    m.receiveShadow = true;

    return m;
  }

  static weapon(type) {
    const g = new THREE.Group();

    const dark = 0x1b2022;
    const rubber = 0x121516;
    const metal = 0x6d7376;

    if (
      type === 'carbine' ||
      type === 'smg' ||
      type === 'marksman'
    ) {
      const body = this.box(
        type === 'smg' ? .32 : .38,
        .22,
        type === 'marksman' ? 1.25 : 1.05,
        dark,
        .34,
        .55
      );

      body.position.z = -.55;
      g.add(body);

      const top = this.box(
        .22,
        .08,
        .7,
        metal,
        .3,
        .75
      );

      top.position.y = .13;
      top.position.z = -.48;
      g.add(top);

      const barrel = this.cyl(
        .055,
        .045,
        type === 'marksman' ? 1.05 : .68,
        metal,
        .25,
        .9,
        14
      );

      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(0, .06, -1.32);
      g.add(barrel);

      const stock = this.box(
        .18,
        .2,
        .45,
        rubber,
        .85,
        .05
      );

      stock.position.set(0, .02, .12);
      g.add(stock);

      const grip = this.box(
        .16,
        .36,
        .16,
        rubber,
        .9,
        .03
      );

      grip.rotation.x = -.18;
      grip.position.set(0, -.2, -.1);
      g.add(grip);

      const mag = this.box(
        type === 'smg' ? .17 : .2,
        .48,
        .18,
        0x22282a,
        .72,
        .15
      );

      mag.rotation.x =
        type === 'smg' ? .3 : -.06;

      mag.position.set(0, -.28, -.28);
      g.add(mag);

      if (type !== 'smg') {
        const rail = this.box(
          .08,
          .06,
          .48,
          metal,
          .4,
          .7
        );

        rail.position.set(
          0,
          .21,
          -.42
        );

        g.add(rail);
      }

      const sight = this.box(
        .1,
        .13,
        .18,
        0x090b0c,
        .7,
        .1
      );

      sight.position.set(
        0,
        .26,
        -.28
      );

      g.add(sight);

    } else if (type === 'shotgun') {
      const body = this.box(
        .34,
        .24,
        1.15,
        dark,
        .38,
        .55
      );

      body.position.z = -.46;
      g.add(body);

      const tube = this.cyl(
        .045,
        .05,
        1.05,
        metal,
        .2,
        .9,
        14
      );

      tube.rotation.x = Math.PI / 2;
      tube.position.set(
        -.08,
        .02,
        -1.18
      );

      g.add(tube);

      const barrel = this.cyl(
        .055,
        .06,
        1.12,
        metal,
        .2,
        .8,
        14
      );

      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(
        .08,
        .03,
        -1.2
      );

      g.add(barrel);

      const stock = this.box(
        .19,
        .23,
        .55,
        rubber,
        .9,
        .02
      );

      stock.position.z = .25;
      g.add(stock);

      const grip = this.box(
        .15,
        .34,
        .17,
        rubber,
        .9,
        .03
      );

      grip.rotation.x = -.2;
      grip.position.set(
        0,
        -.18,
        -.15
      );

      g.add(grip);

      const pump = this.box(
        .27,
        .13,
        .35,
        0x303436,
        .55,
        .2
      );

      pump.position.set(
        0,
        -.08,
        -.82
      );

      g.add(pump);

    } else {
      const body = this.box(
        .27,
        .18,
        .7,
        dark,
        .34,
        .55
      );

      body.position.z = -.3;
      g.add(body);

      const slide = this.box(
        .23,
        .11,
        .5,
        metal,
        .25,
        .75
      );

      slide.position.y = .1;
      slide.position.z = -.31;
      g.add(slide);

      const barrel = this.cyl(
        .04,
        .04,
        .36,
        metal,
        .25,
        .8,
        12
      );

      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(
        0,
        .05,
        -.76
      );

      g.add(barrel);

      const grip = this.box(
        .16,
        .4,
        .2,
        rubber,
        .9,
        .02
      );

      grip.rotation.x = -.16;
      grip.position.set(
        0,
        -.22,
        .05
      );

      g.add(grip);

      if (type === 'pistol') {
        const sight = this.box(
          .06,
          .08,
          .12,
          0x0b0d0e,
          .6,
          .05
        );

        sight.position.set(
          0,
          .19,
          -.2
        );

        g.add(sight);
      }
    }

    return g;
  }

  static knife() {
    const g = new THREE.Group();

    const grip = this.cyl(
      .045,
      .045,
      .28,
      0x171b1c,
      .9,
      .03,
      12
    );

    grip.rotation.x = Math.PI / 2;
    grip.position.z = .08;
    g.add(grip);

    const guard = this.box(
      .22,
      .04,
      .08,
      0x343a3c,
      .45,
      .5
    );

    guard.position.z = -.06;
    g.add(guard);

    const blade = this.box(
      .06,
      .08,
      .58,
      0x9da4a7,
      .18,
      .8
    );

    blade.position.z = -.35;
    blade.rotation.x = Math.PI / 40;
    g.add(blade);

    return g;
  }

  static grenade(type) {
    const g = new THREE.Group();

    const body = this.cyl(
      .14,
      .14,
      .33,
      type === 'flash'
        ? 0xb3b7b9
        : 0x2f3834,
      .6,
      .25,
      18
    );

    g.add(body);

    const cap = this.cyl(
      .08,
      .08,
      .07,
      0x575f61,
      .5,
      .45,
      12
    );

    cap.position.y = .2;
    g.add(cap);

    const pin = this.cyl(
      .015,
      .015,
      .14,
      0x8b9496,
      .3,
      .5,
      8
    );

    pin.position.set(
      .07,
      .23,
      0
    );

    pin.rotation.z = Math.PI / 2;

    g.add(pin);

    return g;
  }

  static character(team = 0) {
    const g = new THREE.Group();

    const skin = this.mat(
      0x8c5d42,
      .95,
      0
    );

    const fabric = this.mat(
      team ? 0x3f4748 : 0x52493d,
      .85,
      .02
    );

    const vest = this.mat(
      0x202628,
      .7,
      .1
    );

    const head = new THREE.Mesh(
      new THREE.SphereGeometry(
        .22,
        20,
        16
      ),
      skin
    );

    head.position.y = 1.72;
    head.castShadow = true;
    g.add(head);

    const neck = this.cyl(
      .09,
      .1,
      .12,
      skin
    );

    neck.position.y = 1.48;
    g.add(neck);

    const torso = new THREE.Mesh(
      new THREE.CapsuleGeometry(
        .28,
        .62,
        7,
        12
      ),
      fabric
    );

    torso.position.y = 1.1;
    torso.castShadow = true;
    g.add(torso);

    const vestM = this.box(
      .42,
      .5,
      .24,
      0x242a2c,
      .72,
      .12
    );

    vestM.position.set(
      0,
      1.13,
      -.03
    );

    g.add(vestM);

    for (const s of [-1, 1]) {
      const arm = new THREE.Mesh(
        new THREE.CapsuleGeometry(
          .10,
          .48,
          5,
          10
        ),
        fabric
      );

      arm.position.set(
        s * .4,
        1.15,
        0
      );

      arm.rotation.z = s * .12;
      arm.castShadow = true;
      g.add(arm);

      const leg = new THREE.Mesh(
        new THREE.CapsuleGeometry(
          .12,
          .58,
          5,
          10
        ),
        fabric
      );

      leg.position.set(
        s * .14,
        .5,
        0
      );

      leg.castShadow = true;
      g.add(leg);

      const boot = this.box(
        .18,
        .12,
        .3,
        0x15191a,
        .9,
        .05
      );

      boot.position.set(
        s * .14,
        .12,
        -.05
      );

      g.add(boot);
    }

    return g;
  }
}

class MapManager {
  constructor(scene) {
    this.scene = scene;
    this.colliders = [];
    this.spawn = [];
    this.decor = [];

    this.build();
  }

  addBox(
    size,
    pos,
    color,
    solid = true
  ) {
    const m = ModelFactory.box(
      ...size,
      color,
      .8,
      .05
    );

    m.position.set(...pos);
    this.scene.add(m);

    if (solid) {
      this.colliders.push({
        min: new THREE.Vector3(
          pos[0] - size[0] / 2,
          pos[1] - size[1] / 2,
          pos[2] - size[2] / 2
        ),

        max: new THREE.Vector3(
          pos[0] + size[0] / 2,
          pos[1] + size[1] / 2,
          pos[2] + size[2] / 2
        ),

        mesh: m
      });
    }

    return m;
  }

  build() {
    const floor = this.addBox(
      [86, 1, 86],
      [0, -.5, 0],
      0x51575a,
      true
    );

    floor.material =
      new THREE.MeshStandardMaterial({
        color: 0x51575a,
        roughness: .92,
        metalness: .03
      });

    for (
      let x = -40;
      x <= 40;
      x += 8
    ) {
      for (
        let z = -40;
        z <= 40;
        z += 8
      ) {
        const tile = this.addBox(
          [.03, .015, 7.95],
          [x, 0, z],
          0x646a6d,
          false
        );

        tile.material =
          new THREE.MeshStandardMaterial({
            color: 0x646a6d,
            roughness: 1
          });
      }
    }

    const walls = [
      [[86,5,1], [0,2.5,-43]],
      [[86,5,1], [0,2.5,43]],
      [[1,5,86], [-43,2.5,0]],
      [[1,5,86], [43,2.5,0]],

      [[12,3,7], [-20,1.5,-14]],
      [[8,3,16], [18,1.5,-16]],
      [[12,3,7], [18,1.5,17]],
      [[18,3,5], [-18,1.5,21]],
      [[5,3,14], [2,1.5,2]],
      [[12,3,5], [-12,1.5,-2]],
      [[5,3,11], [30,1.5,0]],
      [[10,3,4], [-31,1.5,4]]
    ];

    walls.forEach(([s, p]) => {
      this.addBox(
        s,
        p,
        0x30373a,
        true
      );
    });

    const containers = [
      [-27,1.3,-29,10,2.6,3,0x6b4f34],
      [24,1.3,29,10,2.6,3,0x384f4a],
      [31,1.3,-28,5,2.6,3,0x625036],
      [-3,1.3,-29,7,2.6,3,0x454d50]
    ];

    containers.forEach(c => {
      this.addBox(
        [c[3], c[4], c[5]],
        [c[0], c[1], c[2]],
        c[6],
        true
      );
    });

    for (let i = 0; i < 18; i++) {
      const x = rand(-38, 38);
      const z = rand(-38, 38);

      if (Math.hypot(x, z) < 8) {
        continue;
      }

      const m = this.addBox(
        [
          rand(.5, 1.5),
          rand(.5, 1.2),
          rand(.5, 1.5)
        ],
        [
          x,
          rand(.25, .6),
          z
        ],
        pick([
          0x3e4648,
          0x52595b,
          0x6d6250
        ]),
        false
      );

      this.decor.push(m);
    }

    this.spawn = [
      [34,0,34],
      [-34,0,-34],
      [34,0,-34],
      [-34,0,34],
      [0,0,-34],
      [34,0,0],
      [-34,0,0],
      [0,0,34]
    ];

    const hemi =
      new THREE.HemisphereLight(
        0xb7c2cc,
        0x1a1d1e,
        .95
      );

    this.scene.add(hemi);

    const sun =
      new THREE.DirectionalLight(
        0xffe6c0,
        2.2
      );

    sun.position.set(
      -18,
      35,
      8
    );

    sun.castShadow = true;

    sun.shadow.mapSize.set(
      2048,
      2048
    );

    sun.shadow.camera.left = -50;
    sun.shadow.camera.right = 50;
    sun.shadow.camera.top = 50;
    sun.shadow.camera.bottom = -50;

    this.scene.add(sun);

    const fill =
      new THREE.DirectionalLight(
        0x8ab3ff,
        .65
      );

    fill.position.set(
      25,
      16,
      -20
    );

    this.scene.add(fill);

    const fog =
      new THREE.FogExp2(
        0x8b9496,
        .009
      );

    this.scene.fog = fog;

    this.scene.background =
      new THREE.Color(0x8b9496);
  }

  collides(
    pos,
    r = .35
  ) {
    for (const c of this.colliders) {
      if (
        pos.x > c.min.x - r &&
        pos.x < c.max.x + r &&
        pos.y > c.min.y - .9 &&
        pos.y < c.max.y + .1 &&
        pos.z > c.min.z - r &&
        pos.z < c.max.z + r
      ) {
        return c;
      }
    }

    return null;
  }

  nearestSafeSpawn() {
    const shuffled =
      [...this.spawn].sort(
        () => Math.random() - .5
      );

    for (const p of shuffled) {
      const v = new THREE.Vector3(
        p[0],
        1.01,
        p[2]
      );

      let ok = true;

      for (const b of game.bots) {
        if (
          b.alive &&
          b.group.position.distanceTo(v) < 10
        ) {
          ok = false;
        }
      }

      if (ok) {
        return v;
      }
    }

    const p = pick(this.spawn);

    return new THREE.Vector3(
      p[0],
      1.01,
      p[2]
    );
  }
}

class WeaponManager {
  constructor(game) {
    this.game = game;
    this.currentKey = 'carbine';
    this.current = null;
    this.ammo = {};
    this.reloadT = 0;
    this.fireT = 0;
    this.switchT = 0;
    this.throwT = 0;
    this.view = new THREE.Group();

    game.camera.add(this.view);

    this.muzzle = null;
    this.set = '';
  }

  init() {
    for (const k of Object.keys(WEAPONS)) {
      this.ammo[k] = {
        mag: WEAPONS[k].mag,
        reserve: WEAPONS[k].reserve
      };
    }

    this.equip(
      'carbine',
      true
    );
  }

  categoryKeys() {
    return [
      'primary',
      'melee',
      'pistol',
      'tactical',
      'lethal'
    ];
  }

  catKey(cat) {
    if (cat === 'primary') {
      return this.game.kit.primary;
    }

    if (cat === 'pistol') {
      return this.game.kit.secondary;
    }

    if (cat === 'melee') {
      return 'knife';
    }

    if (cat === 'tactical') {
      return this.game.kit.tactical;
    }

    if (cat === 'lethal') {
      return this.game.kit.lethal;
    }
  }

  equip(
    key,
    instant = false
  ) {
    if (
      this.switchT > 0 &&
      !instant
    ) {
      return;
    }

    this.reloadT = 0;

    this.switchT =
      instant ? 0 : .18;

    this.view.clear();

    this.currentKey = key;

    this.current =
      this.makeView(key);

    if (this.current) {
      this.view.add(
        this.current.group
      );
    }

    this.set = key;

    this.updateHud();

    const cat =
      this.catOf(key);

    game.showWeaponToast(
      `${cat.toUpperCase()} // ${this.name(key)}`
    );

    audio.ui();
  }

  name(k) {
    if (k === 'knife') {
      return 'COMBAT KNIFE';
    }

    if (
      [
        'frag',
        'incendiary',
        'impact',
        'flash',
        'smoke',
        'emp',
        'stun'
      ].includes(k)
    ) {
      return (
        k.toUpperCase() +
        ' GRENADE'
      );
    }

    return (
      WEAPONS[k]?.name ||
      k.toUpperCase()
    );
  }

  catOf(k) {
    if (k === 'knife') {
      return 'melee';
    }

    if (
      [
        'frag',
        'incendiary',
        'impact'
      ].includes(k)
    ) {
      return 'lethal';
    }

    if (
      [
        'flash',
        'smoke',
        'emp',
        'stun'
      ].includes(k)
    ) {
      return 'tactical';
    }

    return (
      WEAPONS[k]?.cat ||
      'primary'
    );
  }

  makeView(key) {
    const g = new THREE.Group();

    g.position.set(
      .38,
      -.42,
      -.72
    );

    const body =
      ModelFactory.character(0);

    body.scale.setScalar(.58);

    body.position.set(
      .03,
      -.36,
      .28
    );

    body.rotation.y =
      Math.PI;

    g.add(body);

    let item;

    if (key === 'knife') {
      item =
        ModelFactory.knife();

    } else if (
      [
        'frag',
        'incendiary',
        'impact',
        'flash',
        'smoke',
        'emp',
        'stun'
      ].includes(key)
    ) {
      item =
        ModelFactory.grenade(key);

    } else {
      item =
        ModelFactory.weapon(
          WEAPONS[key]?.model ||
          'pistol'
        );
    }

    item.scale.setScalar(
      key === 'knife'
        ? .65
        : 1
    );

    item.position.set(
      0,
      .02,
      0
    );

    g.add(item);

    this.muzzle =
      new THREE.Mesh(
        new THREE.SphereGeometry(
          .03,
          8,
          8
        ),
        new THREE.MeshBasicMaterial({
          color: 0xffffcc,
          transparent: true,
          opacity: 0
        })
      );

    this.muzzle.position.set(
      0,
      .04,
      -.68
    );

    g.add(this.muzzle);

    return {
      group: g,
      item
    };
  }

  switchCategory(dir = 1) {
    const cats =
      this.categoryKeys();

    let i =
      cats.indexOf(
        this.catOf(
          this.currentKey
        )
      );

    for (
      let n = 0;
      n < cats.length;
      n++
    ) {
      i =
        (i + dir + cats.length) %
        cats.length;

      const key =
        this.catKey(cats[i]);

      if (key) {
        this.equip(key);
        return;
      }
    }
  }

  fire() {
    if (
      !this.currentKey ||
      this.catOf(this.currentKey) === 'melee' ||
      this.catOf(this.currentKey) === 'tactical' ||
      this.catOf(this.currentKey) === 'lethal'
    ) {
      return false;
    }

    const w =
      WEAPONS[this.currentKey];

    const a =
      this.ammo[this.currentKey];

    if (
      this.reloadT > 0 ||
      this.fireT > 0
    ) {
      return false;
    }

    if (a.mag <= 0) {
      audio.click();
      return false;
    }

    this.fireT =
      60 / w.rate;

    a.mag--;

    this.updateHud();

    audio.gun();

    this.flash();

    this.game.player.fireRecoil =
      w.recoil;

    const pellets =
      w.pellets || 1;

    for (
      let i = 0;
      i < pellets;
      i++
    ) {
      this.shootRay(w);
    }

    if (a.mag === 0) {
      game.showWeaponToast(
        'EMPTY MAGAZINE'
      );
    }

    return true;
  }

  shootRay(w) {
    const ray =
      new THREE.Raycaster();

    const spread =
      w.spread *
      (
        this.game.player.ads
          ? 0.5
          : 1
      );

    const ndc =
      new THREE.Vector2(
        rand(-spread, spread),
        rand(-spread, spread)
      );

    ray.setFromCamera(
      ndc,
      this.game.camera
    );

    const targets = [
      ...this.game.bots
        .filter(b => b.alive)
        .map(b => b.hitMeshes)
        .flat(),

      ...this.game.map.colliders
        .map(c => c.mesh)
    ];

    const hit =
      ray.intersectObjects(
        targets,
        false
      )[0];

    const from =
      ray.ray.origin.clone();

    const to =
      from.clone().add(
        ray.ray.direction
          .clone()
          .multiplyScalar(
            hit
              ? hit.distance
              : w.range
          )
      );

    this.game.vfx.tracer(
      from,
      to,
      hit
        ? 0xd6f85a
        : 0xb8d8ff
    );

    if (hit) {
      const bot =
        hit.object.userData.bot;

      if (bot) {
        const mult =
          hit.object.userData.part === 'head'
            ? w.head
            : (
              hit.object.userData.part === 'limb'
                ? .75
                : 1
            );

        const dmg =
          w.damage * mult;

        const killed =
          bot.takeDamage(
            dmg,
            this.game.player
          );

        this.game.hitFeedback(
          hit.object.userData.part === 'head',
          killed
        );
      }
    }
  }

  flash() {
    if (!this.muzzle) {
      return;
    }

    this.muzzle.material.opacity = 1;

    setTimeout(() => {
      if (this.muzzle) {
        this.muzzle.material.opacity = 0;
      }
    }, 38);

    game.vfx.puff(
      this.cameraMuzzleWorld()
    );
  }

  cameraMuzzleWorld() {
    const v =
      new THREE.Vector3();

    this.muzzle?.getWorldPosition(v);

    return v;
  }

  reload() {
    const key =
      this.currentKey;

    if (
      !WEAPONS[key] ||
      this.reloadT > 0
    ) {
      return;
    }

    if (
      this.ammo[key].mag >=
      WEAPONS[key].mag ||
      this.ammo[key].reserve <= 0
    ) {
      return;
    }

    this.reloadT =
      WEAPONS[key].reload;

    audio.reload();
  }

  update(dt) {
    if (this.fireT > 0) {
      this.fireT =
        Math.max(
          0,
          this.fireT - dt
        );
    }

    if (this.reloadT > 0) {
      this.reloadT -= dt;

      if (this.reloadT <= 0) {
        const w =
          WEAPONS[
            this.currentKey
          ];

        const a =
          this.ammo[
            this.currentKey
          ];

        const need =
          w.mag - a.mag;

        const take =
          Math.min(
            need,
            a.reserve
          );

        a.mag += take;
        a.reserve -= take;

        this.updateHud();
      }
    }

    if (this.switchT > 0) {
      this.switchT =
        Math.max(
          0,
          this.switchT - dt
        );
    }

    this.updateView(dt);
  }

  updateView(dt) {
    if (!this.current) {
      return;
    }

    const moving =
      this.game.player.velocity.length() > 1;

    const ads =
      this.game.player.ads;

    const targetX =
      ads ? .18 : .38;

    const targetY =
      ads ? -.33 : -.42;

    this.view.position.x =
      lerp(
        this.view.position.x,
        targetX,
        .08
      );

    this.view.position.y =
      lerp(
        this.view.position.y,
        targetY,
        .08
      );

    this.view.position.z =
      lerp(
        this.view.position.z,
        ads ? -.58 : -.72,
        .08
      );

    const bob =
      moving
        ? Math.sin(
            performance.now() *
            .012
          ) * .012
        : 0;

    this.view.rotation.z =
      lerp(
        this.view.rotation.z,
        bob,
        .1
      );
  }

  updateHud() {
    const key =
      this.currentKey;

    const w =
      WEAPONS[key];

    document.getElementById(
      'weaponName'
    ).textContent =
      this.name(key);

    if (w) {
      document.getElementById(
        'ammoMain'
      ).textContent =
        this.ammo[key].mag;

      document.getElementById(
        'ammoReserve'
      ).textContent =
        this.ammo[key].reserve;
    } else {
      document.getElementById(
        'ammoMain'
      ).textContent = '—';

      document.getElementById(
        'ammoReserve'
      ).textContent = '—';
    }
  }
}

class VFX {
  constructor(scene) {
    this.scene = scene;
    this.tracers = [];
    this.particles = [];
  }

  tracer(a, b, color) {
    const geo =
      new THREE.BufferGeometry()
        .setFromPoints([
          a,
          b
        ]);

    const line =
      new THREE.Line(
        geo,
        new THREE.LineBasicMaterial({
          color,
          transparent: true,
          opacity: .75
        })
      );

    this.scene.add(line);

    this.tracers.push({
      obj: line,
      t: .045
    });
  }

  puff(pos) {
    for (let i = 0; i < 6; i++) {
      const p =
        ModelFactory.box(
          .035,
          .035,
          .035,
          0xffd9a2,
          .5,
          .2
        );

      p.position.copy(pos);

      p.userData.vel =
        new THREE.Vector3(
          rand(-1,1),
          rand(-.2,1),
          rand(-1,1)
        );

      this.scene.add(p);

      this.particles.push({
        obj: p,
        t: .22
      });
    }
  }

  hit(pos, head = false) {
    for (
      let i = 0;
      i < (head ? 10 : 5);
      i++
    ) {
      const p =
        ModelFactory.box(
          .04,
          .04,
          .04,
          head
            ? 0xffffcc
            : 0xaeb6bb,
          .5,
          .2
        );

      p.position.copy(pos);

      p.userData.vel =
        new THREE.Vector3(
          rand(-2,2),
          rand(.5,2),
          rand(-2,2)
        );

      this.scene.add(p);

      this.particles.push({
        obj: p,
        t: .35
      });
    }
  }

  update(dt) {
    for (
      let i = this.tracers.length - 1;
      i >= 0;
      i--
    ) {
      const x =
        this.tracers[i];

      x.t -= dt;

      x.obj.material.opacity =
        clamp(
          x.t / .045,
          0,
          1
        );

      if (x.t <= 0) {
        this.scene.remove(x.obj);

        x.obj.geometry.dispose();
        x.obj.material.dispose();

        this.tracers.splice(i, 1);
      }
    }

    for (
      let i = this.particles.length - 1;
      i >= 0;
      i--
    ) {
      const x =
        this.particles[i];

      x.t -= dt;

      x.obj.position.addScaledVector(
        x.obj.userData.vel,
        dt
      );

      x.obj.userData.vel.y -=
        7 * dt;

      x.obj.scale.multiplyScalar(.98);

      if (x.t <= 0) {
        this.scene.remove(x.obj);
        this.particles.splice(i, 1);
      }
    }
  }
}

class Player {
  constructor(game) {
    this.game = game;

    this.position =
      new THREE.Vector3(
        0,
        1.01,
        0
      );

    this.velocity =
      new THREE.Vector3();

    this.yaw = 0;
    this.pitch = 0;

    this.health = 100;
    this.maxHealth = 100;

    this.ground = true;
    this.crouch = false;
    this.sprint = false;
    this.ads = false;

    this.fireRecoil = 0;
    this.alive = true;

    this.stepT = 0;
    this.headBob = 0;
    this.radius = .34;
  }

  reset(pos) {
    this.position.copy(pos);
    this.velocity.set(0,0,0);

    this.health = 100;
    this.alive = true;

    this.pitch = 0;
    this.yaw = 0;

    this.ads = false;
    this.crouch = false;
  }

  update(dt) {
    if (!this.alive) {
      return;
    }

    const lookScale =
      (
        this.ads
          ? settings.adsSensitivity
          : settings.sensitivity
      ) * .0019;

    this.yaw -=
      input.mouse.dx *
      lookScale;

    this.pitch -=
      input.mouse.dy *
      lookScale *
      (
        settings.invert
          ? -1
          : 1
      );

    this.pitch =
      clamp(
        this.pitch,
        -1.52,
        1.52
      );

    this.game.camera.rotation.order =
      'YXZ';

    this.game.camera.rotation.y =
      this.yaw;

    this.game.camera.rotation.x =
      this.pitch;

    const forward =
      new THREE.Vector3(
        -Math.sin(this.yaw),
        0,
        -Math.cos(this.yaw)
      );

    const right =
      new THREE.Vector3(
        Math.cos(this.yaw),
        0,
        -Math.sin(this.yaw)
      );

    const wish =
      new THREE.Vector3();

    if (input.down('KeyW')) {
      wish.add(forward);
    }

    if (input.down('KeyS')) {
      wish.sub(forward);
    }

    if (input.down('KeyD')) {
      wish.add(right);
    }

    if (input.down('KeyA')) {
      wish.sub(right);
    }

    if (wish.lengthSq()) {
      wish.normalize();
    }

    this.crouch =
      input.down('Control');

    this.sprint =
      input.down('ShiftLeft') ||
      input.down('ShiftRight');

    if (this.crouch) {
      this.sprint = false;
    }

    const base =
      this.crouch
        ? 3.0
        : (
          this.sprint && !this.ads
            ? 8.7
            : 5.3
        );

    wish.multiplyScalar(base);

    const accel =
      this.ground
        ? 18
        : 8;

    this.velocity.x =
      lerp(
        this.velocity.x,
        wish.x,
        clamp(
          accel * dt,
          0,
          1
        )
      );

    this.velocity.z =
      lerp(
        this.velocity.z,
        wish.z,
        clamp(
          accel * dt,
          0,
          1
        )
      );

    if (
      this.ground &&
      input.pressed('Space')
    ) {
      this.velocity.y = 6.4;
      this.ground = false;
    }

    this.velocity.y -=
      18 * dt;

    let next =
      this.position
        .clone()
        .addScaledVector(
          this.velocity,
          dt
        );

    if (next.y <= 1.01) {
      next.y = 1.01;

      if (this.velocity.y < 0) {
        this.velocity.y = 0;
      }

      this.ground = true;
    } else {
      this.ground = false;
    }

    const c =
      this.game.map.collides(
        new THREE.Vector3(
          next.x,
          next.y - .7,
          next.z
        ),
        this.radius
      );

    if (!c) {
      this.position.x =
        next.x;

      this.position.z =
        next.z;
    } else {
      const cx =
        clamp(
          next.x,
          c.min.x - this.radius,
          c.max.x + this.radius
        );

      const cz =
        clamp(
          next.z,
          c.min.z - this.radius,
          c.max.z + this.radius
        );

      const dx =
        Math.abs(
          next.x - cx
        );

      const dz =
        Math.abs(
          next.z - cz
        );

      if (dx > dz) {
        this.position.z =
          next.z;
      } else {
        this.position.x =
          next.x;
      }

      this.velocity.multiplyScalar(.1);
    }

    this.position.y = next.y;

    this.position.x =
      clamp(
        this.position.x,
        -41.5,
        41.5
      );

    this.position.z =
      clamp(
        this.position.z,
        -41.5,
        41.5
      );

    const speed =
      Math.hypot(
        this.velocity.x,
        this.velocity.z
      );

    this.headBob +=
      speed * dt;

    const camY =
      this.position.y +
      (
        this.crouch
          ? .56
          : .72
      );

    const bob =
      (
        this.ground &&
        speed > 1
      )
        ? Math.sin(
            this.headBob * 7
          ) * .028
        : 0;

    this.game.camera.position.set(
      this.position.x,
      camY + bob,
      this.position.z
    );

    const baseFov =
      this.ads
        ? lerp(
            settings.fov,
            52,
            .8
          )
        : settings.fov;

    this.game.camera.fov =
      lerp(
        this.game.camera.fov,
        baseFov,
        .08
      );

    this.fireRecoil =
      lerp(
        this.fireRecoil,
        0,
        .18
      );

    this.game.camera.rotation.x +=
      this.fireRecoil *
      (Math.random() - .35);

    this.stepT -= dt;

    if (
      this.ground &&
      speed > 3 &&
      this.stepT <= 0
    ) {
      this.stepT =
        this.sprint
          ? .26
          : .42;

      audio.step(false);
    }

    this.ads =
      input.mouse.buttons & 2;
  }

  takeDamage(
    dmg,
    sourcePos
  ) {
    if (!this.alive) {
      return;
    }

    this.health -= dmg;

    this.game.damageFeedback(
      sourcePos
    );

    document.getElementById(
      'healthValue'
    ).textContent =
      Math.ceil(
        Math.max(
          0,
          this.health
        )
      );

    document.getElementById(
      'healthBar'
    ).style.width =
      clamp(
        this.health,
        0,
        100
      ) + '%';

    if (this.health <= 0) {
      this.die();
    }
  }

  die() {
    if (!this.alive) {
      return;
    }

    this.alive = false;

    input.unlock();

    this.game.stats.deaths++;

    this.game.updateScoreboard();

    document.getElementById(
      'death'
    ).classList.remove('hidden');

    let t = 2.5;

    const tick =
      setInterval(() => {
        t -= .5;

        document.getElementById(
          'deathStats'
        ).textContent =
          `Respawning in ${Math.max(
            0,
            t
          ).toFixed(1)}s`;

        if (t <= 0) {
          clearInterval(tick);

          document.getElementById(
            'death'
          ).classList.add('hidden');

          this.respawn();
        }
      }, 500);
  }

  respawn() {
    const p =
      this.game.map.nearestSafeSpawn();

    this.reset(p);

    this.game.weapon.init();

    input.lock();
  }
}

class EnemyAI {
  constructor(game, id) {
    this.game = game;
    this.id = id;

    this.group =
      ModelFactory.character(
        id % 2
      );

    this.group.position.copy(
      game.map.nearestSafeSpawn()
    );

    this.group.scale.setScalar(.98);

    game.scene.add(
      this.group
    );

    this.health = 100;
    this.maxHealth = 100;
    this.alive = true;

    this.state = 'PATROL';

    this.weapon =
      WEAPONS[
        pick([
          'carbine',
          'smg',
          'sidearm'
        ])
      ];

    this.fireT =
      rand(.4, 1);

    this.reloadT = 0;

    this.target =
      new THREE.Vector3();

    this.hitMeshes = [];

    this.group.traverse(o => {
      if (o.isMesh) {
        if (
          o.geometry.type.includes(
            'Sphere'
          ) ||
          o.position.y > 1.4
        ) {
          o.userData.part = 'head';
        } else if (
          o.position.y < .8
        ) {
          o.userData.part = 'limb';
        } else {
          o.userData.part = 'body';
        }

        o.userData.bot = this;

        this.hitMeshes.push(o);
      }
    });
  }

  takeDamage(
    dmg,
    source
  ) {
    if (!this.alive) {
      return false;
    }

    this.health -= dmg;

    const pos =
      this.group.position
        .clone()
        .add(
          new THREE.Vector3(
            0,
            1.3,
            0
          )
        );

    this.game.vfx.hit(
      pos,
      this.health <= 0
    );

    if (this.health <= 0) {
      this.die(source);
      return true;
    }

    this.state = 'ATTACK';

    this.target.copy(
      source.position
    );

    return false;
  }

  die(killer) {
    this.alive = false;
    this.group.visible = false;

    this.game.stats.kills++;
    this.game.teamScore[0]++;

    this.game.addKill(
      `${killer.name || 'PLAYER'} > ${
        this.id % 2
          ? 'RAVEN'
          : 'WARDEN'
      }`
    );

    this.game.updateScore();

    setTimeout(
      () => {
        this.respawn();
      },
      rand(3,6)
    );
  }

  respawn() {
    this.health = 100;
    this.alive = true;

    this.group.position.copy(
      this.game.map.nearestSafeSpawn()
    );

    this.group.visible = true;
    this.state = 'PATROL';
  }

  canSeePlayer() {
    const eye =
      this.group.position
        .clone()
        .add(
          new THREE.Vector3(
            0,
            1.45,
            0
          )
        );

    const to =
      this.game.player.position
        .clone()
        .sub(eye);

    const dist = to.length();

    if (dist > 42) {
      return false;
    }

    to.normalize();

    const forward =
      new THREE.Vector3(
        0,
        0,
        -1
      ).applyQuaternion(
        this.group.quaternion
      );

    if (forward.dot(to) < .12) {
      return false;
    }

    const ray =
      new THREE.Raycaster(
        eye,
        to,
        0,
        dist
      );

    const blockers =
      ray.intersectObjects(
        this.game.map.colliders.map(
          c => c.mesh
        ),
        false
      );

    return blockers.length === 0;
  }

  update(dt) {
    if (!this.alive) {
      return;
    }

    const p =
      this.game.player.position;

    const dist =
      this.group.position.distanceTo(p);

    if (this.canSeePlayer()) {
      this.state =
        dist < 30
          ? 'ATTACK'
          : 'SEARCH';

      this.target.copy(p);

    } else if (
      this.state === 'ATTACK'
    ) {
      this.state = 'SEARCH';
    }

    if (this.state === 'PATROL') {
      if (
        this.group.position.distanceTo(
          this.target
        ) < 1
      ) {
        this.target.copy(
          this.game.map.nearestSafeSpawn()
        );
      }
    }

    if (
      this.state === 'SEARCH' &&
      this.group.position.distanceTo(
        this.target
      ) > 1
    ) {
      this.moveToward(
        this.target,
        dt,
        2.3
      );
    }

    if (
      this.state === 'ATTACK'
    ) {
      this.moveToward(
        this.target,
        dt,
        2.0
      );

      this.aimAt(p);

      this.fireT -= dt;

      if (
        this.fireT <= 0 &&
        dist < 34
      ) {
        this.fireT =
          60 / this.weapon.rate +
          rand(.08, .3);

        this.shootAtPlayer();
      }
    }
  }

  moveToward(
    target,
    dt,
    speed
  ) {
    const dir =
      new THREE.Vector3(
        target.x -
          this.group.position.x,
        0,
        target.z -
          this.group.position.z
      );

    if (dir.lengthSq() > .01) {
      dir.normalize();

      const next =
        this.group.position
          .clone()
          .addScaledVector(
            dir,
            speed * dt
          );

      if (
        !this.game.map.collides(
          new THREE.Vector3(
            next.x,
            .5,
            next.z
          ),
          .3
        )
      ) {
        this.group.position.x =
          next.x;

        this.group.position.z =
          next.z;
      }
    }
  }

  aimAt(p) {
    const dx =
      p.x -
      this.group.position.x;

    const dz =
      p.z -
      this.group.position.z;

    this.group.rotation.y =
      Math.atan2(
        -dx,
        -dz
      );
  }

  shootAtPlayer() {
    const ray =
      new THREE.Raycaster();

    const eye =
      this.group.position
        .clone()
        .add(
          new THREE.Vector3(
            0,
            1.4,
            0
          )
        );

    const target =
      predictPlayer(
        this.game.player
      );

    const dir =
      target
        .sub(eye)
        .normalize();

    dir.x +=
      rand(-.04, .04);

    dir.z +=
      rand(-.04, .04);

    ray.set(
      eye,
      dir
    );

    const hit =
      ray.intersectObjects(
        [
          this.game.map.colliders.map(
            c => c.mesh
          ),
          this.game.playerMesh
        ].flat(),
        false
      )[0];

    if (
      hit &&
      hit.object ===
        this.game.playerMesh
    ) {
      this.game.player.takeDamage(
        this.weapon.damage * .48,
        this.group.position
      );
    }
  }
}

function predictPlayer(p) {
  return p.position
    .clone()
    .add(
      new THREE.Vector3(
        0,
        .65,
        0
      )
    );
}

class Game {
  constructor() {
    this.scene =
      new THREE.Scene();

    this.camera =
      new THREE.PerspectiveCamera(
        settings.fov,
        innerWidth / innerHeight,
        .05,
        250
      );

    this.renderer =
      new THREE.WebGLRenderer({
        antialias: true,
        powerPreference:
          'high-performance'
      });

    this.renderer.setPixelRatio(
      Math.min(
        devicePixelRatio,
        settings.quality === 'high'
          ? 1.75
          : 1.2
      )
    );

    this.renderer.setSize(
      innerWidth,
      innerHeight
    );

    this.renderer.shadowMap.enabled =
      settings.quality !== 'low';

    this.renderer.shadowMap.type =
      THREE.PCFSoftShadowMap;

    document.getElementById(
      'game'
    ).replaceWith(
      this.renderer.domElement
    );

    this.renderer.domElement.id =
      'game';

    this.player =
      new Player(this);

    this.camera.position.copy(
      this.player.position
    );

    this.scene.add(
      this.camera
    );

    this.map =
      new MapManager(
        this.scene
      );

    this.vfx =
      new VFX(
        this.scene
      );

    this.bots = [];

    this.weapon =
      new WeaponManager(
        this
      );

    this.kit =
      kits[selectedKit];

    this.stats = {
      kills: 0,
      deaths: 0,
      score: 0
    };

    this.teamScore = [
      0,
      0
    ];

    this.matchTime = 600;
    this.running = false;
    this.paused = false;
    this.debug = false;

    this.last =
      performance.now();

    this.playerMesh =
      ModelFactory.character(0);

    this.playerMesh.visible =
      false;

    this.scene.add(
      this.playerMesh
    );

    this.buildArenaProps();
    this.buildUI();

    addEventListener(
      'resize',
      () => this.resize()
    );
  }

  buildArenaProps() {
    for (let i = 0; i < 12; i++) {
      const p =
        new THREE.PointLight(
          0xffbf80,
          .8,
          10
        );

      p.position.set(
        rand(-35,35),
        rand(2.5,6),
        rand(-35,35)
      );

      this.scene.add(p);
    }
  }

  buildUI() {
    this.populateLoadout();
    this.populateArmory();
    this.bindSettings();

    document
      .querySelectorAll(
        '[data-action]'
      )
      .forEach(b => {
        b.addEventListener(
          'click',
          () => this.action(
            b.dataset.action
          )
        );
      });
  }

  populateLoadout() {
    const c =
      document.getElementById(
        'loadoutGrid'
      );

    c.innerHTML = '';

    kits.forEach((k, i) => {
      const d =
        document.createElement(
          'div'
        );

      d.className =
        'loadout-card' +
        (
          i === selectedKit
            ? ' active'
            : ''
        );

      d.innerHTML = `
        <h3>${k.name}</h3>
        <div>
          <b>${WEAPONS[k.primary].name}</b>
        </div>
        <small>
          ${WEAPONS[k.secondary].name}
          <br>
          ${k.tactical.toUpperCase()}
          /
          ${k.lethal.toUpperCase()}
        </small>
      `;

      d.onclick = () => {
        selectedKit = i;
        this.kit = k;
        this.populateLoadout();
        audio.ui();
      };

      c.appendChild(d);
    });
  }

  populateArmory() {
    const tabs =
      document.getElementById(
        'weaponTabs'
      );

    tabs.innerHTML = '';

    Object.keys(
      WEAPONS
    ).forEach(k => {
      const b =
        document.createElement(
          'button'
        );

      b.textContent =
        WEAPONS[k].name;

      b.onclick = () =>
        this.showArmory(k);

      tabs.appendChild(b);
    });

    this.showArmory(
      'carbine'
    );
  }

  showArmory(k) {
    const w =
      WEAPONS[k];

    document.getElementById(
      'armoryTitle'
    ).textContent =
      w.name;

    const host =
      document.getElementById(
        'armoryPreview'
      );

    host.innerHTML = '';

    const sc =
      new THREE.Scene();

    sc.background =
      new THREE.Color(
        0x101517
      );

    const cam =
      new THREE.PerspectiveCamera(
        40,
        2,
        .1,
        20
      );

    cam.position.set(
      2,
      1.5,
      3.3
    );

    cam.lookAt(
      0,
      0,
      -.3
    );

    const r =
      new THREE.WebGLRenderer({
        antialias: true
      });

    r.setPixelRatio(1);

    r.setSize(
      Math.max(
        320,
        host.clientWidth
      ),
      340
    );

    host.appendChild(
      r.domElement
    );

    const l =
      new THREE.HemisphereLight(
        0xcad7e0,
        0x192023,
        2
      );

    sc.add(l);

    const d =
      new THREE.DirectionalLight(
        0xffffff,
        2
      );

    d.position.set(
      3,
      5,
      2
    );

    sc.add(d);

    const g =
      ModelFactory.weapon(
        w.model
      );

    g.rotation.y =
      -.65;

    sc.add(g);

    const spin = () => {
      g.rotation.y += .006;
      r.render(
        sc,
        cam
      );
      requestAnimationFrame(
        spin
      );
    };

    spin();

    const s =
      document.getElementById(
        'armoryStats'
      );

    s.innerHTML = '';

    [
      ['Damage', w.damage / 60 * 100],
      [
        'Accuracy',
        (1 - w.spread * 5) * 100
      ],
      [
        'Range',
        clamp(
          w.range / 170 * 100,
          0,
          100
        )
      ],
      [
        'Fire rate',
        clamp(
          w.rate / 1000 * 100,
          0,
          100
        )
      ],
      [
        'Mobility',
        w.cat === 'pistol'
          ? 92
          : (
            w.cat === 'primary' &&
            w.model === 'marksman'
              ? 62
              : 76
          )
      ],
      [
        'Recoil',
        clamp(
          100 - w.recoil * 800,
          20,
          96
        )
      ]
    ].forEach(
      ([name, val]) => {
        const d =
          document.createElement(
            'div'
          );

        d.className =
          'stat-row';

        d.innerHTML = `
          <span>${name}</span>
          <div class="stat-bar">
            <span style="width:${clamp(
              val,
              0,
              100
            )}%"></span>
          </div>
          <b>${Math.round(
            clamp(val,0,100)
          )}</b>
        `;

        s.appendChild(d);
      }
    );
  }

  bindSettings() {
    const map = {
      sens: 'sensitivity',
      adsSens: 'adsSensitivity',
      fov: 'fov',
      masterVol: 'master'
    };

    for (
      const [id, k]
      of Object.entries(map)
    ) {
      const e =
        document.getElementById(
          id
        );

      e.value =
        settings[k];

      e.addEventListener(
        'input',
        () => {
          settings[k] =
            Number(e.value);

          this.saveSettings();

          if (audio.master) {
            audio.master.gain.value =
              settings.master;
          }

          this.camera.fov =
            settings.fov;
        }
      );
    }

    for (
      const [id, k]
      of [
        ['quality','quality'],
        ['invert','invert'],
        ['motion','motion'],
        ['vsync','vsync']
      ]
    ) {
      const e =
        document.getElementById(
          id
        );

      e.value =
        settings[k];

      if (
        e.type === 'checkbox'
      ) {
        e.checked =
          settings[k];
      }

      e.addEventListener(
        'change',
        () => {
          settings[k] =
            e.type === 'checkbox'
              ? e.checked
              : e.value;

          this.saveSettings();
        }
      );
    }
  }

  saveSettings() {
    localStorage.setItem(
      'frontline-settings',
      JSON.stringify(
        settings
      )
    );
  }

  action(a) {
    audio.init();

    if (a === 'play') {
      this.startMatch();
    }

    if (
      a === 'loadout' ||
      a === 'armory' ||
      a === 'settings' ||
      a === 'controls'
    ) {
      this.hideScreens();

      document.getElementById(
        a
      ).classList.add(
        'active'
      );
    }

    if (a === 'back') {
      this.hideScreens();

      document.getElementById(
        'menu'
      ).classList.add(
        'active'
      );
    }

    if (a === 'resume') {
      this.paused = false;

      document.getElementById(
        'pause'
      ).classList.add(
        'hidden'
      );

      input.lock();
    }

    if (a === 'mainMenu') {
      this.stopMatch();
      this.hideScreens();

      document.getElementById(
        'menu'
      ).classList.add(
        'active'
      );
    }
  }

  hideScreens() {
    for (
      const id of [
        'menu',
        'loadout',
        'armory',
        'settings',
        'controls'
      ]
    ) {
      document.getElementById(
        id
      ).classList.remove(
        'active'
      );
    }
  }

  startMatch() {
    this.kit =
      kits[selectedKit];

    this.running = true;
    this.paused = false;
    this.matchTime = 600;

    this.stats = {
      kills: 0,
      deaths: 0,
      score: 0
    };

    this.teamScore = [
      0,
      0
    ];

    this.hideScreens();

    document.getElementById(
      'hud'
    ).classList.remove(
      'hidden'
    );

    document.getElementById(
      'matchEnd'
    ).classList.add(
      'hidden'
    );

    this.player.reset(
      this.map.nearestSafeSpawn()
    );

    this.weapon =
      new WeaponManager(
        this
      );

    this.weapon.init();

    this.spawnBots();

    input.lock();

    audio.init();

    this.updateScoreboard();
    this.updateScore();
  }

  stopMatch() {
    this.running = false;

    input.unlock();

    document.getElementById(
      'hud'
    ).classList.add(
      'hidden'
    );

    document.getElementById(
      'pause'
    ).classList.add(
      'hidden'
    );

    document.getElementById(
      'death'
    ).classList.add(
      'hidden'
    );

    for (
      const b of this.bots
    ) {
      this.scene.remove(
        b.group
      );
    }

    this.bots = [];
  }

  spawnBots() {
    for (
      let i = 0;
      i < 9;
      i++
    ) {
      this.bots.push(
        new EnemyAI(
          this,
          i
        )
      );
    }
  }

  addKill(text) {
    const e =
      document.createElement(
        'div'
      );

    e.className =
      'kill-item';

    e.textContent =
      text;

    document.getElementById(
      'killFeed'
    ).appendChild(e);

    setTimeout(
      () => e.remove(),
      2800
    );
  }

  hitFeedback(
    head,
    killed
  ) {
    const h =
      document.getElementById(
        'hitmarker'
      );

    h.classList.add(
      'hit'
    );

    setTimeout(
      () =>
        h.classList.remove(
          'hit'
        ),
      95
    );

    head
      ? audio.head()
      : audio.hit();

    if (killed) {
      this.showWeaponToast(
        'ELIMINATION +100'
      );
    }
  }

  damageFeedback(
    pos
  ) {
    const a =
      document.createElement(
        'div'
      );

    a.className =
      'damage-arrow';

    a.textContent = '▼';

    document.getElementById(
      'damageDir'
    ).appendChild(a);

    setTimeout(
      () => a.remove(),
      300
    );

    const d =
      document.getElementById(
        'damageVignette'
      );

    d.style.opacity = '.8';

    setTimeout(
      () =>
        d.style.opacity = '0',
      180
    );
  }

  updateScore() {
    document.getElementById(
      'scoreMini'
    ).textContent =
      `${this.teamScore[0]} — ${this.teamScore[1]}`;

    if (
      this.teamScore[0] >= 30
    ) {
      this.endMatch(
        true
      );
    }
  }

  updateScoreboard() {
    const rows =
      document.getElementById(
        'scoreRows'
      );

    const entries = [
      {
        n: 'YOU',
        k: this.stats.kills,
        d: this.stats.deaths,
        s: this.stats.kills * 100
      }
    ];

    for (
      const b of this.bots
    ) {
      entries.push({
        n:
          `${b.id % 2 ? 'RAVEN' : 'WARDEN'}-${
            String(b.id + 11).padStart(
              2,
              '0'
            )
          }`,
        k:
          b.alive
            ? rand(2,14) | 0
            : rand(4,16) | 0,
        d:
          rand(2,12) | 0,
        s:
          rand(200,1600) | 0
      });
    }

    entries.sort(
      (a,b) => b.s - a.s
    );

    rows.innerHTML =
      entries.map(
        e => `
          <div class="score-row ${
            e.n === 'YOU'
              ? 'you'
              : ''
          }">
            <span>${e.n}</span>
            <span>${e.k}</span>
            <span>${e.d}</span>
            <span>${e.s}</span>
          </div>
        `
      ).join('');
  }

  showWeaponToast(t) {
    const e =
      document.getElementById(
        'weaponToast'
      );

    e.textContent = t;

    e.classList.add(
      'toast-on'
    );

    clearTimeout(
      this.toastT
    );

    this.toastT =
      setTimeout(
        () =>
          e.classList.remove(
            'toast-on'
          ),
        850
      );
  }

  endMatch(win) {
    if (!this.running) {
      return;
    }

    this.running = false;

    input.unlock();

    document.getElementById(
      'matchEnd'
    ).classList.remove(
      'hidden'
    );

    document.getElementById(
      'winnerText'
    ).textContent =
      win
        ? 'VICTORY'
        : 'DEFEAT';

    document.getElementById(
      'finalScore'
    ).textContent =
      `${this.teamScore[0]} — ${this.teamScore[1]}`;
  }

  resize() {
    this.camera.aspect =
      innerWidth / innerHeight;

    this.camera.updateProjectionMatrix();

    this.renderer.setSize(
      innerWidth,
      innerHeight
    );
  }

  update(dt) {
    if (!this.running) {
      return;
    }

    if (
      input.pressed('Escape')
    ) {
      this.paused =
        !this.paused;

      document.getElementById(
        'pause'
      ).classList.toggle(
        'hidden',
        !this.paused
      );

      if (this.paused) {
        input.unlock();
      } else {
        input.lock();
      }
    }

    if (this.paused) {
      return;
    }

    if (
      input.pressed('Tab')
    ) {
      document.getElementById(
        'scoreboard'
      ).classList.remove(
        'hidden'
      );

      this.updateScoreboard();

    } else if (
      !input.down('Tab')
    ) {
      document.getElementById(
        'scoreboard'
      ).classList.add(
        'hidden'
      );
    }

    if (
      input.pressed('KeyQ')
    ) {
      this.weapon.switchCategory(
        1
      );
    }

    if (
      input.pressed('Digit1')
    ) {
      this.weapon.equip(
        this.kit.primary
      );
    }

    if (
      input.pressed('Digit2')
    ) {
      this.weapon.equip(
        this.kit.secondary
      );
    }

    if (
      input.pressed('Digit3')
    ) {
      this.weapon.equip(
        'knife'
      );
    }

    if (
      input.pressed('Digit4')
    ) {
      this.weapon.equip(
        this.kit.tactical
      );
    }

    if (
      input.pressed('Digit5')
    ) {
      this.weapon.equip(
        this.kit.lethal
      );
    }

    if (
      input.pressed('KeyR')
    ) {
      this.weapon.reload();
    }

    if (
      input.pressed('KeyF')
    ) {
      this.doMelee();
    }

    if (
      input.pressed('KeyG')
    ) {
      this.throwGrenade(
        this.kit.tactical
      );
    }

    if (
      input.pressed('KeyH')
    ) {
      this.throwGrenade(
        this.kit.lethal
      );
    }

    if (
      input.pressed('KeyF3')
    ) {
      this.debug =
        !this.debug;

      document.getElementById(
        'debug'
      ).classList.toggle(
        'hidden',
        !this.debug
      );
    }

    if (
      input.mouse.buttons & 1
    ) {
      this.weapon.fire();
    }

    this.matchTime -= dt;

    if (
      this.matchTime <= 0
    ) {
      this.endMatch(
        this.teamScore[0] >=
        this.teamScore[1]
      );
    }

    this.player.update(dt);

    this.playerMesh.position.set(
      this.player.position.x,
      this.player.position.y - .72,
      this.player.position.z
    );

    this.playerMesh.rotation.y =
      this.player.yaw;

    this.weapon.update(dt);

    for (
      const b of this.bots
    ) {
      b.update(dt);
    }

    this.vfx.update(dt);

    document.getElementById(
      'timer'
    ).textContent =
      new Date(
        this.matchTime * 1000
      ).toISOString().slice(
        14,
        19
      );

    this.updateDebug(dt);
  }

  doMelee() {
    if (
      this.weapon.catOf(
        this.weapon.currentKey
      ) !== 'melee'
    ) {
      this.weapon.equip(
        'knife'
      );

      return;
    }

    const ray =
      new THREE.Raycaster();

    ray.setFromCamera(
      new THREE.Vector2(0,0),
      this.camera
    );

    for (
      const b of this.bots.filter(
        x => x.alive
      )
    ) {
      const h =
        ray.intersectObjects(
          b.hitMeshes,
          false
        )[0];

      if (
        h &&
        h.distance < 2.6
      ) {
        const killed =
          b.takeDamage(
            70,
            this.player
          );

        this.hitFeedback(
          h.object.userData.part === 'head',
          killed
        );

        break;
      }
    }
  }

  throwGrenade(type) {
    const g =
      ModelFactory.grenade(
        type
      );

    const pos =
      this.player.position
        .clone()
        .add(
          new THREE.Vector3(
            0,
            .4,
            0
          )
        );

    g.position.copy(pos);

    this.scene.add(g);

    const dir =
      new THREE.Vector3(
        0,
        0,
        -1
      )
        .applyEuler(
          this.camera.rotation
        )
        .normalize();

    g.userData.vel =
      dir
        .multiplyScalar(13)
        .add(
          new THREE.Vector3(
            0,
            5,
            0
          )
        );

    g.userData.t =
      type === 'flash'
        ? .9
        : (
          type === 'smoke'
            ? 2
            : 1.4
        );

    g.userData.type =
      type;

    const tick = () => {
      if (!g.parent) {
        return;
      }

      g.userData.t -=
        .033;

      g.userData.vel.y -=
        9 * .033;

      g.position.addScaledVector(
        g.userData.vel,
        .033
      );

      if (
        g.position.y < .15
      ) {
        g.position.y = .15;

        g.userData.vel.y *=
          -.45;

        g.userData.vel.x *=
          .78;

        g.userData.vel.z *=
          .78;
      }

      if (
        g.userData.t <= 0
      ) {
        this.explode(g);
        return;
      }

      requestAnimationFrame(
        tick
      );
    };

    tick();
  }

  explode(g) {
    const pos =
      g.position.clone();

    this.scene.remove(g);

    audio.explosion();

    const radius =
      typeRadius(
        g.userData.type
      );

    for (
      const b of this.bots.filter(
        x => x.alive
      )
    ) {
      const d =
        b.group.position.distanceTo(
          pos
        );

      if (d < radius) {
        b.takeDamage(
          (
            1 - d / radius
          ) * 100,
          this.player
        );
      }
    }

    for (
      let i = 0;
      i < 18;
      i++
    ) {
      const p =
        ModelFactory.box(
          .07,
          .07,
          .07,
          0xffa34a,
          .7,
          .1
        );

      p.position.copy(pos);

      p.userData.vel =
        new THREE.Vector3(
          rand(-4,4),
          rand(1,5),
          rand(-4,4)
        );

      this.scene.add(p);

      this.vfx.particles.push({
        obj: p,
        t: .7
      });
    }
  }

  updateDebug(dt) {
    if (!this.debug) {
      return;
    }

    document.getElementById(
      'debug'
    ).textContent =
      `FPS ${(1 / dt).toFixed(0)}
POS ${this.player.position.x.toFixed(1)}, ${this.player.position.y.toFixed(1)}, ${this.player.position.z.toFixed(1)}
VEL ${this.player.velocity.length().toFixed(2)}
WEAPON ${this.weapon.currentKey}
AMMO ${
  WEAPONS[this.weapon.currentKey]
    ? `${this.weapon.ammo[this.weapon.currentKey].mag}/${this.weapon.ammo[this.weapon.currentKey].reserve}`
    : 'N/A'
}
BOTS ${this.bots.filter(b => b.alive).length}`;
  }

  loop(now) {
    const dt =
      Math.min(
        .033,
        (now - this.last) / 1000
      );

    this.last = now;

    this.update(dt);

    this.renderer.render(
      this.scene,
      this.camera
    );

    input.consume();

    requestAnimationFrame(
      n => this.loop(n)
    );
  }
}

function typeRadius(type) {
  return (
    type === 'frag' ||
    type === 'impact' ||
    type === 'incendiary'
  )
    ? 6
    : (
      type === 'stun' ||
      type === 'emp'
        ? 4.5
        : 4
    );
}

let game;

try {
  game = new Game();

  bootStatus.textContent =
    'Loading tactical systems…';

  setTimeout(() => {
    bootStatus.textContent =
      'Ready';

    boot.style.opacity = '0';
    boot.style.pointerEvents =
      'none';

    setTimeout(() => {
      boot.remove();
      app.classList.remove(
        'hidden'
      );
    }, 450);

  }, 500);

  requestAnimationFrame(
    t => game.loop(t)
  );

} catch (err) {
  console.error(err);

  bootStatus.textContent =
    'Renderer error — see console';
}
