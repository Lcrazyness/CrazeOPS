import * as THREE from 'three';

const $ = (id) => document.getElementById(id);

const clamp = (v, min, max) =>
  Math.max(min, Math.min(max, v));

const lerp = (a, b, t) =>
  a + (b - a) * t;

const rand = (min, max) =>
  min + Math.random() * (max - min);

const pick = (arr) =>
  arr[Math.floor(Math.random() * arr.length)];

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
  JSON.parse(
    localStorage.getItem(
      'crazeops-settings'
    ) || '{}'
  )
);

const WEAPONS = {
  carbine: {
    name: 'ARC-5 CARBINE',
    category: 'PRIMARY',
    model: 'carbine',
    damage: 28,
    head: 1.65,
    rate: 720,
    mag: 30,
    reserve: 120,
    reload: 2.0,
    range: 115,
    spread: .010,
    recoil: .018
  },

  smg: {
    name: 'VEX-9 SMG',
    category: 'PRIMARY',
    model: 'smg',
    damage: 20,
    head: 1.5,
    rate: 930,
    mag: 36,
    reserve: 144,
    reload: 1.75,
    range: 65,
    spread: .018,
    recoil: .022
  },

  shotgun: {
    name: 'BRK-12 SHOTGUN',
    category: 'PRIMARY',
    model: 'shotgun',
    damage: 12,
    head: 1.35,
    rate: 85,
    mag: 8,
    reserve: 48,
    reload: 2.3,
    range: 30,
    spread: .07,
    recoil: .08,
    pellets: 8
  },

  marksman: {
    name: 'M-41 MARKSMAN',
    category: 'PRIMARY',
    model: 'marksman',
    damage: 53,
    head: 1.8,
    rate: 270,
    mag: 12,
    reserve: 60,
    reload: 2.15,
    range: 175,
    spread: .003,
    recoil: .04
  },

  sidearm: {
    name: 'KITE-8 SIDEARM',
    category: 'PISTOL',
    model: 'pistol',
    damage: 31,
    head: 1.7,
    rate: 380,
    mag: 15,
    reserve: 60,
    reload: 1.45,
    range: 72,
    spread: .012,
    recoil: .021
  },

  burst: {
    name: 'R-16 BURST',
    category: 'PISTOL',
    model: 'pistol',
    damage: 24,
    head: 1.65,
    rate: 700,
    mag: 21,
    reserve: 84,
    reload: 1.65,
    range: 75,
    spread: .012,
    recoil: .025
  }
};

const KITS = [
  {
    name: 'RECON',
    primary: 'marksman',
    secondary: 'sidearm',
    tactical: 'flash',
    lethal: 'frag'
  },

  {
    name: 'ASSAULT',
    primary: 'carbine',
    secondary: 'sidearm',
    tactical: 'smoke',
    lethal: 'frag'
  },

  {
    name: 'BREACH',
    primary: 'shotgun',
    secondary: 'burst',
    tactical: 'stun',
    lethal: 'impact'
  },

  {
    name: 'RUNNER',
    primary: 'smg',
    secondary: 'sidearm',
    tactical: 'emp',
    lethal: 'incendiary'
  },

  {
    name: 'RAIDER',
    primary: 'carbine',
    secondary: 'burst',
    tactical: 'smoke',
    lethal: 'frag'
  }
];

let selectedKit = 1;

/* =========================================================
   AUDIO
========================================================= */

class AudioManager {

  constructor() {
    this.ctx = null;
    this.master = null;
    this.ready = false;
  }

  init() {

    if (this.ready) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }

      return;
    }

    this.ctx =
      new (
        window.AudioContext ||
        window.webkitAudioContext
      )();

    this.master =
      this.ctx.createGain();

    this.master.gain.value =
      settings.master;

    this.master.connect(
      this.ctx.destination
    );

    this.ready = true;
  }

  tone(
    frequency,
    duration = .05,
    type = 'square',
    volume = .04
  ) {

    if (!this.ready) {
      return;
    }

    const osc =
      this.ctx.createOscillator();

    const gain =
      this.ctx.createGain();

    osc.type = type;
    osc.frequency.value =
      frequency;

    gain.gain.value =
      volume * settings.master;

    osc.connect(gain);
    gain.connect(this.master);

    osc.start();

    gain.gain.exponentialRampToValueAtTime(
      .0001,
      this.ctx.currentTime + duration
    );

    osc.stop(
      this.ctx.currentTime + duration
    );
  }

  gun() {
    this.tone(65,.055,'sawtooth',.25);
    this.tone(125,.03,'square',.09);
  }

  hit() {
    this.tone(
      1100,
      .045,
      'triangle',
      .06
    );
  }

  headshot() {
    this.tone(
      1450,
      .05,
      'triangle',
      .1
    );

    setTimeout(
      () =>
        this.tone(
          850,
          .05,
          'triangle',
          .05
        ),
      20
    );
  }

  reload() {
    this.tone(
      240,
      .08,
      'triangle',
      .075
    );

    setTimeout(
      () =>
        this.tone(
          400,
          .09,
          'triangle',
          .065
        ),
      140
    );

    setTimeout(
      () =>
        this.tone(
          600,
          .05,
          'triangle',
          .04
        ),
      320
    );
  }

  dry() {
    this.tone(
      175,
      .035,
      'square',
      .045
    );
  }

  switchWeapon() {
    this.tone(
      480,
      .045,
      'sine',
      .025
    );
  }

  step(metal = false) {
    this.tone(
      metal ? 200 : 145,
      .035,
      'triangle',
      .025
    );
  }

  explosion() {
    this.tone(
      42,
      .32,
      'sawtooth',
      .22
    );
  }

  inspect() {
    this.tone(
      520,
      .07,
      'sine',
      .025
    );
  }

  melee() {
    this.tone(
      110,
      .12,
      'sawtooth',
      .08
    );
  }

  ui() {
    this.tone(
      540,
      .045,
      'sine',
      .03
    );
  }
}

const audio =
  new AudioManager();

/* =========================================================
   INPUT
========================================================= */

class InputManager {

  constructor() {

    this.keys =
      new Set();

    this.justPressed =
      new Set();

    this.mouse = {
      dx: 0,
      dy: 0,
      buttons: 0
    };

    this.pointerLocked = false;

    window.addEventListener(
      'keydown',
      e => {

        if (
          !this.keys.has(e.code)
        ) {
          this.justPressed.add(
            e.code
          );
        }

        this.keys.add(
          e.code
        );

        if (
          e.code === 'Space' ||
          e.code === 'Tab'
        ) {
          e.preventDefault();
        }
      }
    );

    window.addEventListener(
      'keyup',
      e => {
        this.keys.delete(
          e.code
        );
      }
    );

    window.addEventListener(
      'mousemove',
      e => {

        if (
          this.pointerLocked
        ) {

          this.mouse.dx +=
            e.movementX;

          this.mouse.dy +=
            e.movementY;
        }
      }
    );

    window.addEventListener(
      'mousedown',
      e => {

        audio.init();

        this.mouse.buttons |=
          1 << e.button;
      }
    );

    window.addEventListener(
      'mouseup',
      e => {

        this.mouse.buttons &=
          ~(1 << e.button);
      }
    );

    window.addEventListener(
      'contextmenu',
      e =>
        e.preventDefault()
    );

    document.addEventListener(
      'pointerlockchange',
      () => {

        this.pointerLocked =
          document.pointerLockElement ===
          document.body;

        if (
          game &&
          game.running
        ) {

          $('capture')
            .classList.toggle(
              'hidden',
              this.pointerLocked
            );

          if (
            !this.pointerLocked &&
            !game.paused &&
            $('death').classList.contains('hidden')
          ) {
            $('capture').classList.remove(
              'hidden'
            );
          }
        }
      }
    );
  }

  down(code) {
    return this.keys.has(
      code
    );
  }

  pressed(code) {
    return this.justPressed.has(
      code
    );
  }

  clearFrame() {

    this.justPressed.clear();

    this.mouse.dx = 0;
    this.mouse.dy = 0;
  }

  lock() {

    audio.init();

    document.body.requestPointerLock?.();
  }

  unlock() {

    document.exitPointerLock?.();
  }
}

const input =
  new InputManager();

/* =========================================================
   MATERIALS / PROCEDURAL MODELING
========================================================= */

class Models {

  static material(
    color,
    roughness = .5,
    metalness = .2
  ) {

    return new THREE.MeshStandardMaterial({
      color,
      roughness,
      metalness
    });
  }

  static box(
    width,
    height,
    depth,
    color,
    roughness = .5,
    metalness = .2
  ) {

    const mesh =
      new THREE.Mesh(
        new THREE.BoxGeometry(
          width,
          height,
          depth
        ),
        this.material(
          color,
          roughness,
          metalness
        )
      );

    mesh.castShadow = true;
    mesh.receiveShadow = true;

    return mesh;
  }

  static cylinder(
    radiusTop,
    radiusBottom,
    height,
    color,
    roughness = .5,
    metalness = .2,
    segments = 16
  ) {

    const mesh =
      new THREE.Mesh(
        new THREE.CylinderGeometry(
          radiusTop,
          radiusBottom,
          height,
          segments
        ),
        this.material(
          color,
          roughness,
          metalness
        )
      );

    mesh.castShadow = true;
    mesh.receiveShadow = true;

    return mesh;
  }

  static humanArms() {

    const root =
      new THREE.Group();

    const fabric =
      this.material(
        0x343b3d,
        .84,
        .02
      );

    const glove =
      this.material(
        0x141819,
        .8,
        .1
      );

    const leftArm =
      new THREE.Mesh(
        new THREE.CapsuleGeometry(
          .09,
          .42,
          7,
          10
        ),
        fabric
      );

    const rightArm =
      new THREE.Mesh(
        new THREE.CapsuleGeometry(
          .09,
          .42,
          7,
          10
        ),
        fabric
      );

    leftArm.position.set(
      -.27,
      -.15,
      -.08
    );

    rightArm.position.set(
      .27,
      -.15,
      -.08
    );

    leftArm.rotation.z =
      -.12;

    rightArm.rotation.z =
      .12;

    root.add(
      leftArm,
      rightArm
    );

    const leftGlove =
      new THREE.Mesh(
        new THREE.SphereGeometry(
          .11,
          14,
          10
        ),
        glove
      );

    const rightGlove =
      new THREE.Mesh(
        new THREE.SphereGeometry(
          .11,
          14,
          10
        ),
        glove
      );

    leftGlove.position.set(
      -.25,
      -.37,
      -.18
    );

    rightGlove.position.set(
      .25,
      -.37,
      -.18
    );

    root.add(
      leftGlove,
      rightGlove
    );

    return root;
  }

  static weapon(
    type
  ) {

    const g =
      new THREE.Group();

    const dark = 0x1c2224;
    const metal = 0x717a7e;
    const rubber = 0x111415;

    if (
      type === 'carbine' ||
      type === 'smg' ||
      type === 'marksman'
    ) {

      const receiver =
        this.box(
          type === 'smg'
            ? .30
            : .36,
          .22,
          type === 'marksman'
            ? 1.22
            : 1.02,
          dark,
          .34,
          .6
        );

      receiver.position.z =
        -.5;

      g.add(receiver);

      const upper =
        this.box(
          .22,
          .07,
          .72,
          metal,
          .28,
          .78
        );

      upper.position.set(
        0,
        .13,
        -.45
      );

      g.add(upper);

      const barrel =
        this.cylinder(
          .047,
          .04,
          type === 'marksman'
            ? 1.08
            : .7,
          metal,
          .23,
          .9,
          14
        );

      barrel.rotation.x =
        Math.PI / 2;

      barrel.position.set(
        0,
        .05,
        -1.25
      );

      g.add(barrel);

      const grip =
        this.box(
          .15,
          .34,
          .15,
          rubber,
          .9,
          .02
        );

      grip.rotation.x =
        -.18;

      grip.position.set(
        0,
        -.20,
        -.08
      );

      g.add(grip);

      const magazine =
        this.box(
          type === 'smg'
            ? .17
            : .20,
          .45,
          .17,
          0x272d2f,
          .72,
          .18
        );

      magazine.rotation.x =
        type === 'smg'
          ? .26
          : -.04;

      magazine.position.set(
        0,
        -.27,
        -.30
      );

      g.add(magazine);

      const stock =
        this.box(
          .19,
          .19,
          .44,
          rubber,
          .88,
          .03
        );

      stock.position.z =
        .10;

      g.add(stock);

      const rail =
        this.box(
          .08,
          .05,
          .46,
          metal,
          .4,
          .7
        );

      rail.position.set(
        0,
        .205,
        -.37
      );

      g.add(rail);

      const optic =
        this.box(
          .09,
          .12,
          .17,
          0x090b0c,
          .7,
          .05
        );

      optic.position.set(
        0,
        .29,
        -.28
      );

      g.add(optic);

    } else if (
      type === 'shotgun'
    ) {

      const receiver =
        this.box(
          .35,
          .24,
          1.12,
          dark,
          .35,
          .55
        );

      receiver.position.z =
        -.46;

      g.add(receiver);

      const barrel =
        this.cylinder(
          .055,
          .06,
          1.12,
          metal,
          .2,
          .86,
          14
        );

      barrel.rotation.x =
        Math.PI / 2;

      barrel.position.set(
        .08,
        .03,
        -1.2
      );

      g.add(barrel);

      const tube =
        this.cylinder(
          .043,
          .045,
          1.04,
          metal,
          .22,
          .84,
          14
        );

      tube.rotation.x =
        Math.PI / 2;

      tube.position.set(
        -.07,
        -.01,
        -1.16
      );

      g.add(tube);

      const stock =
        this.box(
          .19,
          .23,
          .52,
          rubber,
          .9,
          .02
        );

      stock.position.z =
        .25;

      g.add(stock);

      const pump =
        this.box(
          .25,
          .12,
          .34,
          0x303537,
          .58,
          .2
        );

      pump.position.set(
        0,
        -.08,
        -.82
      );

      g.add(pump);

      const grip =
        this.box(
          .15,
          .34,
          .17,
          rubber,
          .9,
          .03
        );

      grip.rotation.x =
        -.2;

      grip.position.set(
        0,
        -.19,
        -.15
      );

      g.add(grip);

    } else {

      const body =
        this.box(
          .27,
          .18,
          .69,
          dark,
          .34,
          .56
        );

      body.position.z =
        -.3;

      g.add(body);

      const slide =
        this.box(
          .23,
          .11,
          .50,
          metal,
          .25,
          .75
        );

      slide.position.set(
        0,
        .10,
        -.31
      );

      g.add(slide);

      const barrel =
        this.cylinder(
          .04,
          .04,
          .36,
          metal,
          .25,
          .82,
          12
        );

      barrel.rotation.x =
        Math.PI / 2;

      barrel.position.set(
        0,
        .05,
        -.75
      );

      g.add(barrel);

      const grip =
        this.box(
          .16,
          .40,
          .19,
          rubber,
          .9,
          .02
        );

      grip.rotation.x =
        -.16;

      grip.position.set(
        0,
        -.22,
        .05
      );

      g.add(grip);
    }

    return g;
  }

  static knife() {

    const g =
      new THREE.Group();

    const grip =
      this.cylinder(
        .045,
        .045,
        .28,
        0x171b1c,
        .9,
        .02,
        12
      );

    grip.rotation.x =
      Math.PI / 2;

    grip.position.z =
      .08;

    g.add(grip);

    const guard =
      this.box(
        .22,
        .04,
        .08,
        0x343a3c,
        .4,
        .5
      );

    guard.position.z =
      -.06;

    g.add(guard);

    const blade =
      this.box(
        .06,
        .08,
        .58,
        0x9ba4a7,
        .17,
        .86
      );

    blade.position.z =
      -.36;

    g.add(blade);

    return g;
  }

  static grenade(
    type
  ) {

    const g =
      new THREE.Group();

    const color =
      type === 'flash'
        ? 0xb7bec0
        : 0x2f3934;

    const body =
      this.cylinder(
        .14,
        .14,
        .33,
        color,
        .62,
        .25,
        18
      );

    g.add(body);

    const cap =
      this.cylinder(
        .08,
        .08,
        .07,
        0x5c6365,
        .5,
        .48,
        12
      );

    cap.position.y =
      .20;

    g.add(cap);

    return g;
  }
}

/* =========================================================
   MAP
========================================================= */

class MapManager {

  constructor(scene) {

    this.scene = scene;
    this.colliders = [];
    this.spawns = [];

    this.build();
  }

  box(
    size,
    position,
    color,
    solid = true
  ) {

    const mesh =
      Models.box(
        size[0],
        size[1],
        size[2],
        color,
        .82,
        .05
      );

    mesh.position.set(
      ...position
    );

    this.scene.add(mesh);

    if (solid) {

      this.colliders.push({
        min:
          new THREE.Vector3(
            position[0] -
              size[0] / 2,
            position[1] -
              size[1] / 2,
            position[2] -
              size[2] / 2
          ),

        max:
          new THREE.Vector3(
            position[0] +
              size[0] / 2,
            position[1] +
              size[1] / 2,
            position[2] +
              size[2] / 2
          ),

        mesh
      });
    }

    return mesh;
  }

  build() {

    const floor =
      this.box(
        [86,1,86],
        [0,-.5,0],
        0x555c5f,
        true
      );

    floor.material =
      new THREE.MeshStandardMaterial({
        color:0x555c5f,
        roughness:.95,
        metalness:.03
      });

    const boundaries = [

      [[86,5,1],[0,2.5,-43]],
      [[86,5,1],[0,2.5,43]],
      [[1,5,86],[-43,2.5,0]],
      [[1,5,86],[43,2.5,0]],

      [[12,3,7],[-20,1.5,-14]],
      [[8,3,16],[18,1.5,-16]],
      [[12,3,7],[18,1.5,17]],
      [[18,3,5],[-18,1.5,21]],
      [[5,3,14],[2,1.5,2]],
      [[12,3,5],[-12,1.5,-2]],
      [[5,3,11],[30,1.5,0]],
      [[10,3,4],[-31,1.5,4]]
    ];

    boundaries.forEach(
      ([size,pos]) =>
        this.box(
          size,
          pos,
          0x30373a,
          true
        )
    );

    const containers = [

      [-27,1.3,-29,10,2.6,3,0x6d5136],
      [24,1.3,29,10,2.6,3,0x3a504a],
      [31,1.3,-28,5,2.6,3,0x665239],
      [-3,1.3,-29,7,2.6,3,0x444d50]

    ];

    containers.forEach(
      c =>
        this.box(
          [c[3],c[4],c[5]],
          [c[0],c[1],c[2]],
          c[6],
          true
        )
    );

    for (
      let i = 0;
      i < 25;
      i++
    ) {

      const x =
        rand(-38,38);

      const z =
        rand(-38,38);

      if (
        Math.hypot(x,z) < 9
      ) {
        continue;
      }

      this.box(
        [
          rand(.5,1.7),
          rand(.4,1.1),
          rand(.5,1.7)
        ],

        [
          x,
          rand(.2,.55),
          z
        ],

        pick([
          0x40494c,
          0x51595b,
          0x635a4b
        ]),

        false
      );
    }

    this.spawns = [

      [34,34],
      [-34,-34],
      [34,-34],
      [-34,34],
      [0,-34],
      [34,0],
      [-34,0],
      [0,34]

    ];

    /* lighting */

    const hemi =
      new THREE.HemisphereLight(
        0xcbd5dc,
        0x181c1e,
        .95
      );

    this.scene.add(
      hemi
    );

    const sunlight =
      new THREE.DirectionalLight(
        0xffe8c7,
        2.1
      );

    sunlight.position.set(
      -18,
      35,
      10
    );

    sunlight.castShadow =
      true;

    sunlight.shadow.mapSize.set(
      2048,
      2048
    );

    sunlight.shadow.camera.left =
      -55;

    sunlight.shadow.camera.right =
      55;

    sunlight.shadow.camera.top =
      55;

    sunlight.shadow.camera.bottom =
      -55;

    this.scene.add(
      sunlight
    );

    const fill =
      new THREE.DirectionalLight(
        0x86aeff,
        .55
      );

    fill.position.set(
      20,
      16,
      -20
    );

    this.scene.add(
      fill
    );

    for (
      let i = 0;
      i < 11;
      i++
    ) {

      const light =
        new THREE.PointLight(
          0xffb16e,
          .65,
          11
        );

      light.position.set(
        rand(-35,35),
        rand(2.2,5),
        rand(-35,35)
      );

      this.scene.add(
        light
      );
    }

    this.scene.background =
      new THREE.Color(
        0x858e91
      );

    this.scene.fog =
      new THREE.FogExp2(
        0x858e91,
        .0095
      );
  }

  collision(
    position,
    radius = .34
  ) {

    for (
      const c of this.colliders
    ) {

      if (
        position.x >
          c.min.x - radius &&
        position.x <
          c.max.x + radius &&

        position.y >
          c.min.y - .9 &&
        position.y <
          c.max.y + .1 &&

        position.z >
          c.min.z - radius &&
        position.z <
          c.max.z + radius
      ) {
        return c;
      }
    }

    return null;
  }

  spawnPosition() {

    const list =
      [...this.spawns]
        .sort(
          () =>
            Math.random() - .5
        );

    for (
      const [x,z] of list
    ) {

      const p =
        new THREE.Vector3(
          x,
          1.01,
          z
        );

      let safe =
        true;

      for (
        const bot of game.bots
      ) {

        if (
          bot.alive &&
          bot.group.position.distanceTo(
            p
          ) < 11
        ) {
          safe = false;
        }
      }

      if (safe) {
        return p;
      }
    }

    const [x,z] =
      pick(this.spawns);

    return new THREE.Vector3(
      x,
      1.01,
      z
    );
  }
}

/* =========================================================
   VFX
========================================================= */

class VFX {

  constructor(scene) {

    this.scene = scene;
    this.tracers = [];
    this.particles = [];
  }

  tracer(
    start,
    end,
    color
  ) {

    const geometry =
      new THREE.BufferGeometry()
        .setFromPoints([
          start,
          end
        ]);

    const material =
      new THREE.LineBasicMaterial({
        color,
        transparent:true,
        opacity:.75
      });

    const line =
      new THREE.Line(
        geometry,
        material
      );

    this.scene.add(
      line
    );

    this.tracers.push({
      object:line,
      time:.05
    });
  }

  particle(
    position,
    color,
    size,
    velocity,
    lifetime
  ) {

    const object =
      Models.box(
        size,
        size,
        size,
        color,
        .55,
        .15
      );

    object.position.copy(
      position
    );

    object.userData.velocity =
      velocity;

    this.scene.add(
      object
    );

    this.particles.push({
      object,
      time:lifetime
    });
  }

  muzzle(
    position
  ) {

    for (
      let i=0;
      i<7;
      i++
    ) {

      this.particle(
        position,
        i % 2
          ? 0xffb04a
          : 0xffffcf,
        .035,
        new THREE.Vector3(
          rand(-1.5,1.5),
          rand(-.4,1.2),
          rand(-1.5,1.5)
        ),
        .2
      );
    }
  }

  impact(
    position,
    head = false
  ) {

    for (
      let i=0;
      i<(head ? 9 : 5);
      i++
    ) {

      this.particle(
        position,
        head
          ? 0xffffcc
          : 0xaeb5b8,
        .04,
        new THREE.Vector3(
          rand(-2.2,2.2),
          rand(.4,2),
          rand(-2.2,2.2)
        ),
        .35
      );
    }
  }

  explosion(
    position
  ) {

    for (
      let i=0;
      i<22;
      i++
    ) {

      this.particle(
        position,
        i%2
          ? 0xff8230
          : 0xffd069,
        .07,
        new THREE.Vector3(
          rand(-5,5),
          rand(1,6),
          rand(-5,5)
        ),
        .65
      );
    }

    audio.explosion();
  }

  update(dt) {

    for (
      let i=this.tracers.length-1;
      i>=0;
      i--
    ) {

      const tracer =
        this.tracers[i];

      tracer.time -=
        dt;

      tracer.object.material.opacity =
        clamp(
          tracer.time/.05,
          0,
          1
        );

      if (
        tracer.time<=0
      ) {

        this.scene.remove(
          tracer.object
        );

        tracer.object.geometry.dispose();
        tracer.object.material.dispose();

        this.tracers.splice(
          i,
          1
        );
      }
    }

    for (
      let i=this.particles.length-1;
      i>=0;
      i--
    ) {

      const particle =
        this.particles[i];

      particle.time -=
        dt;

      particle.object.position.addScaledVector(
        particle.object.userData.velocity,
        dt
      );

      particle.object.userData.velocity.y -=
        8 * dt;

      particle.object.scale.multiplyScalar(
        .97
      );

      if (
        particle.time<=0
      ) {

        this.scene.remove(
          particle.object
        );

        this.particles.splice(
          i,
          1
        );
      }
    }
  }
}

/* =========================================================
   WEAPON MANAGER
========================================================= */

class WeaponManager {

  constructor(game) {

    this.game = game;

    this.currentKey =
      'carbine';

    this.current =
      null;

    this.viewmodel =
      new THREE.Group();

    this.game.camera.add(
      this.viewmodel
    );

    this.ammo = {};

    this.fireCooldown = 0;
    this.reloadTimer = 0;
    this.switchTimer = 0;
    this.inspectTimer = 0;

    this.muzzle =
      null;
  }

  initializeAmmo() {

    this.ammo = {};

    for (
      const key of Object.keys(
        WEAPONS
      )
    ) {

      this.ammo[key] = {
        mag:
          WEAPONS[key].mag,

        reserve:
          WEAPONS[key].reserve
      };
    }
  }

  initialize() {

    this.initializeAmmo();

    this.equip(
      this.currentKey,
      true
    );
  }

  categoryOf(
    key
  ) {

    if (
      key === 'knife'
    ) {
      return 'MELEE';
    }

    if (
      [
        'frag',
        'impact',
        'incendiary'
      ].includes(key)
    ) {
      return 'LETHAL';
    }

    if (
      [
        'flash',
        'smoke',
        'stun',
        'emp'
      ].includes(key)
    ) {
      return 'TACTICAL';
    }

    return WEAPONS[key]?.category ||
      'PRIMARY';
  }

  keyForCategory(
    category
  ) {

    if (
      category === 'PRIMARY'
    ) {
      return this.game.kit.primary;
    }

    if (
      category === 'PISTOL'
    ) {
      return this.game.kit.secondary;
    }

    if (
      category === 'MELEE'
    ) {
      return 'knife';
    }

    if (
      category === 'TACTICAL'
    ) {
      return this.game.kit.tactical;
    }

    if (
      category === 'LETHAL'
    ) {
      return this.game.kit.lethal;
    }

    return null;
  }

  name(
    key
  ) {

    if (
      key === 'knife'
    ) {
      return 'COMBAT KNIFE';
    }

    const grenades = {
      frag:'FRAGMENTATION GRENADE',
      impact:'IMPACT GRENADE',
      incendiary:'INCENDIARY GRENADE',
      flash:'FLASH GRENADE',
      smoke:'SMOKE GRENADE',
      stun:'STUN GRENADE',
      emp:'EMP GRENADE'
    };

    return (
      grenades[key] ||
      WEAPONS[key]?.name ||
      key.toUpperCase()
    );
  }

  buildViewmodel(
    key
  ) {

    const root =
      new THREE.Group();

    root.position.set(
      .37,
      -.41,
      -.71
    );

    /* IMPORTANT:
       only FPS arms,
       not the full character */

    const arms =
      Models.humanArms();

    arms.scale.setScalar(
      .92
    );

    root.add(
      arms
    );

    let weapon;

    if (
      key === 'knife'
    ) {

      weapon =
        Models.knife();

    } else if (
      [
        'frag',
        'impact',
        'incendiary',
        'flash',
        'smoke',
        'stun',
        'emp'
      ].includes(key)
    ) {

      weapon =
        Models.grenade(
          key
        );

    } else {

      weapon =
        Models.weapon(
          WEAPONS[key].model
        );
    }

    weapon.position.set(
      0,
      -.01,
      -.04
    );

    root.add(
      weapon
    );

    this.muzzle =
      new THREE.Mesh(
        new THREE.SphereGeometry(
          .035,
          8,
          8
        ),
        new THREE.MeshBasicMaterial({
          color:0xffffcc,
          transparent:true,
          opacity:0
        })
      );

    this.muzzle.position.set(
      0,
      .035,
      -.67
    );

    root.add(
      this.muzzle
    );

    return root;
  }

  equip(
    key,
    immediate = false
  ) {

    if (
      !immediate &&
      this.switchTimer > 0
    ) {
      return;
    }

    this.reloadTimer = 0;
    this.inspectTimer = 0;

    this.switchTimer =
      immediate
        ? 0
        : .2;

    this.viewmodel.clear();

    this.currentKey =
      key;

    this.current =
      this.buildViewmodel(
        key
      );

    this.viewmodel.add(
      this.current
    );

    this.updateHUD();

    this.game.showWeaponToast(
      `${this.categoryOf(key)} // ${this.name(key)}`
    );

    audio.switchWeapon();
  }

  cycle() {

    const order = [
      'PRIMARY',
      'MELEE',
      'PISTOL',
      'TACTICAL',
      'LETHAL'
    ];

    const current =
      this.categoryOf(
        this.currentKey
      );

    let index =
      order.indexOf(
        current
      );

    index =
      (index + 1) %
      order.length;

    this.equip(
      this.keyForCategory(
        order[index]
      )
    );
  }

  fire() {

    const category =
      this.categoryOf(
        this.currentKey
      );

    if (
      category !== 'PRIMARY' &&
      category !== 'PISTOL'
    ) {
      return;
    }

    if (
      this.reloadTimer > 0 ||
      this.fireCooldown > 0 ||
      this.inspectTimer > 0
    ) {
      return;
    }

    const weapon =
      WEAPONS[
        this.currentKey
      ];

    const ammo =
      this.ammo[
        this.currentKey
      ];

    if (
      ammo.mag <= 0
    ) {

      audio.dry();

      this.reload();

      return;
    }

    ammo.mag--;

    this.fireCooldown =
      60 / weapon.rate;

    this.updateHUD();

    audio.gun();

    if (
      this.muzzle
    ) {

      this.muzzle.material.opacity =
        1;

      setTimeout(
        () => {

          if (
            this.muzzle
          ) {
            this.muzzle.material.opacity =
              0;
          }

        },
        45
      );

      const muzzlePosition =
        new THREE.Vector3();

      this.muzzle.getWorldPosition(
        muzzlePosition
      );

      this.game.vfx.muzzle(
        muzzlePosition
      );
    }

    this.game.player.recoil =
      weapon.recoil;

    const pellets =
      weapon.pellets ||
      1;

    for (
      let i=0;
      i<pellets;
      i++
    ) {

      this.fireRay(
        weapon
      );
    }
  }

  fireRay(
    weapon
  ) {

    const ray =
      new THREE.Raycaster();

    const spread =
      weapon.spread *
      (
        this.game.player.ads
          ? .45
          : 1
      );

    const point =
      new THREE.Vector2(
        rand(-spread,spread),
        rand(-spread,spread)
      );

    ray.setFromCamera(
      point,
      this.game.camera
    );

    const targets = [
      ...this.game.bots
        .filter(
          b => b.alive
        )
        .flatMap(
          b => b.hitMeshes
        ),

      ...this.game.map.colliders
        .map(c => c.mesh)
    ];

    const hit =
      ray.intersectObjects(
        targets,
        false
      )[0];

    const origin =
      ray.ray.origin.clone();

    const destination =
      origin.clone().add(
        ray.ray.direction
          .clone()
          .multiplyScalar(
            hit
              ? hit.distance
              : weapon.range
          )
      );

    this.game.vfx.tracer(
      origin,
      destination,
      0xd7ff5b
    );

    if (!hit) {
      return;
    }

    const bot =
      hit.object.userData.bot;

    if (!bot) {
      return;
    }

    const part =
      hit.object.userData.part ||
      'body';

    const multiplier =
      part === 'head'
        ? weapon.head
        : part === 'limb'
          ? .75
          : 1;

    const damage =
      weapon.damage *
      multiplier;

    const killed =
      bot.takeDamage(
        damage,
        this.game.player
      );

    this.game.hitFeedback(
      part === 'head',
      killed
    );
  }

  reload() {

    if (
      !WEAPONS[
        this.currentKey
      ]
    ) {
      return;
    }

    if (
      this.reloadTimer > 0
    ) {
      return;
    }

    const weapon =
      WEAPONS[
        this.currentKey
      ];

    const ammo =
      this.ammo[
        this.currentKey
      ];

    if (
      ammo.mag >=
      weapon.mag
    ) {
      return;
    }

    if (
      ammo.reserve <= 0
    ) {
      return;
    }

    this.reloadTimer =
      weapon.reload;

    audio.reload();

    $('reloadIndicator')
      .classList.add('on');
  }

  inspect() {

    if (
      this.inspectTimer > 0 ||
      this.reloadTimer > 0
    ) {
      return;
    }

    this.inspectTimer =
      1.6;

    audio.inspect();

    this.game.showWeaponToast(
      `INSPECT // ${this.name(this.currentKey)}`
    );
  }

  melee() {

    if (
      this.categoryOf(
        this.currentKey
      ) !== 'MELEE'
    ) {
      this.equip(
        'knife'
      );

      return;
    }

    audio.melee();

    const ray =
      new THREE.Raycaster();

    ray.setFromCamera(
      new THREE.Vector2(0,0),
      this.game.camera
    );

    for (
      const bot of
      this.game.bots.filter(
        b => b.alive
      )
    ) {

      const hit =
        ray.intersectObjects(
          bot.hitMeshes,
          false
        )[0];

      if (
        hit &&
        hit.distance < 2.5
      ) {

        const killed =
          bot.takeDamage(
            85,
            this.game.player
          );

        this.game.hitFeedback(
          false,
          killed
        );

        break;
      }
    }
  }

  update(
    dt
  ) {

    this.fireCooldown =
      Math.max(
        0,
        this.fireCooldown - dt
      );

    if (
      this.reloadTimer > 0
    ) {

      this.reloadTimer -=
        dt;

      if (
        this.reloadTimer <= 0
      ) {

        const weapon =
          WEAPONS[
            this.currentKey
          ];

        const ammo =
          this.ammo[
            this.currentKey
          ];

        const amount =
          Math.min(
            weapon.mag - ammo.mag,
            ammo.reserve
          );

        ammo.mag +=
          amount;

        ammo.reserve -=
          amount;

        $('reloadIndicator')
          .classList.remove(
            'on'
          );

        this.updateHUD();
      }
    }

    if (
      this.switchTimer > 0
    ) {

      this.switchTimer -=
        dt;
    }

    if (
      this.inspectTimer > 0
    ) {

      this.inspectTimer -=
        dt;
    }

    this.animateViewmodel(
      dt
    );
  }

  animateViewmodel(
    dt
  ) {

    const player =
      this.game.player;

    const moving =
      player.velocity.length() > 1;

    const ads =
      player.ads;

    const time =
      performance.now() *
      .001;

    const walkBob =
      moving
        ? Math.sin(time * 8) * .018
        : 0;

    const targetX =
      ads ? .12 : .37;

    const targetY =
      ads ? -.32 : -.41;

    const targetZ =
      ads ? -.56 : -.71;

    this.viewmodel.position.x =
      lerp(
        this.viewmodel.position.x,
        targetX,
        .09
      );

    this.viewmodel.position.y =
      lerp(
        this.viewmodel.position.y,
        targetY + walkBob,
        .09
      );

    this.viewmodel.position.z =
      lerp(
        this.viewmodel.position.z,
        targetZ,
        .09
      );

    this.viewmodel.rotation.z =
      lerp(
        this.viewmodel.rotation.z,
        moving
          ? Math.sin(time * 8) * .025
          : 0,
        .1
      );

    this.viewmodel.rotation.x =
      lerp(
        this.viewmodel.rotation.x,
        ads
          ? -.025
          : 0,
        .1
      );

    if (
      this.game.player.recoil > 0
    ) {

      this.viewmodel.rotation.x -=
        this.game.player.recoil *
        1.3;
    }

    if (
      this.inspectTimer > 0
    ) {

      const progress =
        this.inspectTimer / 1.6;

      this.viewmodel.rotation.y =
        Math.sin(
          progress * Math.PI * 2
        ) * .45;

      this.viewmodel.rotation.x =
        Math.sin(
          progress * Math.PI
        ) * .18;
    }
  }

  updateHUD() {

    const category =
      this.categoryOf(
        this.currentKey
      );

    const weapon =
      WEAPONS[
        this.currentKey
      ];

    $('weaponCategory')
      .textContent =
      category;

    $('weaponName')
      .textContent =
      this.name(
        this.currentKey
      );

    if (weapon) {

      $('ammoMain')
        .textContent =
        this.ammo[
          this.currentKey
        ].mag;

      $('ammoReserve')
        .textContent =
        this.ammo[
          this.currentKey
        ].reserve;

    } else {

      $('ammoMain')
        .textContent =
        '—';

      $('ammoReserve')
        .textContent =
        '—';
    }
  }
}

/* =========================================================
   PLAYER
========================================================= */

class Player {

  constructor(
    game
  ) {

    this.game =
      game;

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

    this.grounded = true;
    this.crouched = false;
    this.sprinting = false;
    this.ads = false;

    this.recoil = 0;

    this.alive = true;

    this.stepTimer = 0;
    this.bobTimer = 0;
  }

  reset(
    position
  ) {

    this.position.copy(
      position
    );

    this.velocity.set(
      0,
      0,
      0
    );

    this.health = 100;
    this.alive = true;

    this.yaw = 0;
    this.pitch = 0;

    this.ads = false;
    this.crouched = false;
    this.sprinting = false;

    this.updateHUD();
  }

  updateHUD() {

    $('healthValue')
      .textContent =
      Math.ceil(
        Math.max(
          0,
          this.health
        )
      );

    $('healthBar')
      .style.width =
      clamp(
        this.health,
        0,
        100
      ) + '%';
  }

  update(
    dt
  ) {

    if (!this.alive) {
      return;
    }

    const sensitivity =
      (
        this.ads
          ? settings.adsSensitivity
          : settings.sensitivity
      ) * .0019;

    if (
      input.pointerLocked
    ) {

      this.yaw -=
        input.mouse.dx *
        sensitivity;

      this.pitch -=
        input.mouse.dy *
        sensitivity *
        (
          settings.invert
            ? -1
            : 1
        );
    }

    this.pitch =
      clamp(
        this.pitch,
        -1.5,
        1.5
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

    if (
      input.down('KeyW')
    ) {
      wish.add(
        forward
      );
    }

    if (
      input.down('KeyS')
    ) {
      wish.sub(
        forward
      );
    }

    if (
      input.down('KeyD')
    ) {
      wish.add(
        right
      );
    }

    if (
      input.down('KeyA')
    ) {
      wish.sub(
        right
      );
    }

    if (
      wish.lengthSq() > 0
    ) {
      wish.normalize();
    }

    this.crouched =
      input.down('Control');

    this.sprinting =
      (
        input.down('ShiftLeft') ||
        input.down('ShiftRight')
      ) &&
      !this.crouched &&
      !this.ads &&
      wish.lengthSq() > 0;

    const speed =
      this.crouched
        ? 3
        : this.sprinting
          ? 8.8
          : 5.3;

    wish.multiplyScalar(
      speed
    );

    const acceleration =
      this.grounded
        ? 20
        : 8;

    this.velocity.x =
      lerp(
        this.velocity.x,
        wish.x,
        clamp(
          acceleration * dt,
          0,
          1
        )
      );

    this.velocity.z =
      lerp(
        this.velocity.z,
        wish.z,
        clamp(
          acceleration * dt,
          0,
          1
        )
      );

    if (
      this.grounded &&
      input.pressed(
        'Space'
      )
    ) {

      this.velocity.y =
        6.3;

      this.grounded =
        false;
    }

    this.velocity.y -=
      18 * dt;

    const next =
      this.position.clone()
        .addScaledVector(
          this.velocity,
          dt
        );

    if (
      next.y <= 1.01
    ) {

      next.y = 1.01;

      if (
        this.velocity.y < 0
      ) {
        this.velocity.y = 0;
      }

      this.grounded =
        true;

    } else {

      this.grounded =
        false;
    }

    const collision =
      this.game.map.collision(
        new THREE.Vector3(
          next.x,
          next.y - .7,
          next.z
        ),
        .34
      );

    if (!collision) {

      this.position.x =
        next.x;

      this.position.z =
        next.z;

    } else {

      const pushX =
        next.x <
        (
          collision.min.x +
          collision.max.x
        ) / 2
          ? collision.min.x - .35
          : collision.max.x + .35;

      const pushZ =
        next.z <
        (
          collision.min.z +
          collision.max.z
        ) / 2
          ? collision.min.z - .35
          : collision.max.z + .35;

      if (
        Math.abs(
          next.x - pushX
        ) <
        Math.abs(
          next.z - pushZ
        )
      ) {

        this.position.x =
          pushX;

      } else {

        this.position.z =
          pushZ;
      }

      this.velocity.x *=
        .1;

      this.velocity.z *=
        .1;
    }

    this.position.x =
      clamp(
        this.position.x,
        -41.6,
        41.6
      );

    this.position.z =
      clamp(
        this.position.z,
        -41.6,
        41.6
      );

    this.position.y =
      next.y;

    const horizontalSpeed =
      Math.hypot(
        this.velocity.x,
        this.velocity.z
      );

    this.bobTimer +=
      horizontalSpeed * dt;

    const cameraHeight =
      this.crouched
        ? .56
        : .72;

    const bob =
      (
        this.grounded &&
        horizontalSpeed > 1
      )
        ? Math.sin(
            this.bobTimer * 7
          ) * .025
        : 0;

    this.game.camera.position.set(
      this.position.x,
      this.position.y +
        cameraHeight +
        bob,
      this.position.z
    );

    const targetFOV =
      this.ads
        ? settings.fov - 30
        : this.sprinting
          ? settings.fov + 2
          : settings.fov;

    this.game.camera.fov =
      lerp(
        this.game.camera.fov,
        targetFOV,
        .08
      );

    this.recoil =
      lerp(
        this.recoil,
        0,
        .2
      );

    this.stepTimer -=
      dt;

    if (
      this.grounded &&
      horizontalSpeed > 3 &&
      this.stepTimer <= 0
    ) {

      this.stepTimer =
        this.sprinting
          ? .27
          : .43;

      audio.step(false);
    }

    this.ads =
      Boolean(
        input.mouse.buttons & 2
      );

    this.updateHUD();

    this.updateCrosshair();
  }

  updateCrosshair() {

    const crosshair =
      $('crosshair');

    crosshair.classList.toggle(
      'ads',
      this.ads
    );

    const moving =
      this.velocity.length();

    const size =
      clamp(
        1 +
        moving * .5 +
        this.recoil * 25,
        1,
        7
      );

    crosshair.style.transform =
      `translate(-50%,-50%) scale(${size})`;
  }

  takeDamage(
    damage,
    source
  ) {

    if (!this.alive) {
      return;
    }

    this.health -=
      damage;

    this.game.damageFeedback(
      source
    );

    this.updateHUD();

    if (
      this.health <= 0
    ) {
      this.die();
    }
  }

  die() {

    if (!this.alive) {
      return;
    }

    this.alive = false;

    this.game.stats.deaths++;

    this.game.updateScoreboard();

    input.unlock();

    $('death')
      .classList.remove(
        'hidden'
      );

    let countdown =
      2.5;

    const timer =
      setInterval(
        () => {

          countdown -=
            .5;

          $('deathStats')
            .textContent =
            `RESPAWNING IN ${Math.max(
              0,
              countdown
            ).toFixed(1)}s`;

          if (
            countdown <= 0
          ) {

            clearInterval(
              timer
            );

            $('death')
              .classList.add(
                'hidden'
              );

            this.respawn();
          }

        },
        500
      );
  }

  respawn() {

    this.reset(
      this.game.map.spawnPosition()
    );

    this.game.weapon =
      new WeaponManager(
        this.game
      );

    this.game.weapon.initialize();

    input.lock();
  }
}

/* =========================================================
   BOT
========================================================= */

class Bot {

  constructor(
    game,
    id
  ) {

    this.game =
      game;

    this.id =
      id;

    this.group =
      this.makeModel(
        id % 2
      );

    this.group.position.copy(
      game.map.spawnPosition()
    );

    this.game.scene.add(
      this.group
    );

    this.health = 100;
    this.alive = true;

    this.state =
      'PATROL';

    this.target =
      new THREE.Vector3();

    this.fireTimer =
      rand(.4,1.2);

    this.weapon =
      WEAPONS[
        pick([
          'carbine',
          'smg',
          'sidearm'
        ])
      ];

    this.hitMeshes = [];

    this.group.traverse(
      object => {

        if (!object.isMesh) {
          return;
        }

        let part =
          'body';

        if (
          object.position.y >
          1.4
        ) {
          part = 'head';
        } else if (
          object.position.y <
          .8
        ) {
          part = 'limb';
        }

        object.userData.bot =
          this;

        object.userData.part =
          part;

        this.hitMeshes.push(
          object
        );
      }
    );
  }

  makeModel(
    team
  ) {

    const root =
      new THREE.Group();

    const skin =
      Models.material(
        0x8b5d43,
        .96,
        0
      );

    const fabric =
      Models.material(
        team
          ? 0x40494a
          : 0x51483d,
        .86,
        .02
      );

    const armor =
      Models.material(
        0x242a2c,
        .68,
        .12
      );

    const head =
      new THREE.Mesh(
        new THREE.SphereGeometry(
          .22,
          20,
          16
        ),
        skin
      );

    head.position.y =
      1.72;

    head.castShadow =
      true;

    root.add(
      head
    );

    const torso =
      new THREE.Mesh(
        new THREE.CapsuleGeometry(
          .28,
          .62,
          7,
          12
        ),
        fabric
      );

    torso.position.y =
      1.1;

    torso.castShadow =
      true;

    root.add(
      torso
    );

    const vest =
      Models.box(
        .43,
        .5,
        .25,
        0x242a2c,
        .72,
        .12
      );

    vest.position.set(
      0,
      1.12,
      -.02
    );

    root.add(
      vest
    );

    for (
      const side of [-1,1]
    ) {

      const arm =
        new THREE.Mesh(
          new THREE.CapsuleGeometry(
            .10,
            .48,
            5,
            10
          ),
          fabric
        );

      arm.position.set(
        side * .4,
        1.15,
        0
      );

      arm.rotation.z =
        side * .12;

      arm.castShadow =
        true;

      root.add(
        arm
      );

      const leg =
        new THREE.Mesh(
          new THREE.CapsuleGeometry(
            .12,
            .58,
            5,
            10
          ),
          fabric
        );

      leg.position.set(
        side * .14,
        .50,
        0
      );

      leg.castShadow =
        true;

      root.add(
        leg
      );

      const boot =
        Models.box(
          .18,
          .12,
          .30,
          0x15191a,
          .9,
          .04
        );

      boot.position.set(
        side * .14,
        .12,
        -.05
      );

      root.add(
        boot
      );
    }

    return root;
  }

  takeDamage(
    damage,
    attacker
  ) {

    if (
      !this.alive
    ) {
      return false;
    }

    this.health -=
      damage;

    this.game.vfx.impact(
      this.group.position
        .clone()
        .add(
          new THREE.Vector3(
            0,
            1.25,
            0
          )
        ),
      this.health <= 0
    );

    this.state =
      'ATTACK';

    this.target.copy(
      attacker.position
    );

    if (
      this.health <= 0
    ) {

      this.die(
        attacker
      );

      return true;
    }

    return false;
  }

  die(
    killer
  ) {

    this.alive = false;

    this.group.visible =
      false;

    this.game.teamScore[0]++;

    this.game.stats.kills++;

    this.game.addKill(
      `YOU > ${this.codename()}`
    );

    this.game.updateScore();

    setTimeout(
      () => {
        this.respawn();
      },
      rand(3,6) * 1000
    );
  }

  respawn() {

    this.health = 100;

    this.alive = true;

    this.group.position.copy(
      this.game.map.spawnPosition()
    );

    this.group.visible =
      true;

    this.state =
      'PATROL';
  }

  codename() {

    const side =
      this.id % 2
        ? 'RAVEN'
        : 'WARDEN';

    return `${side}-${String(
      this.id + 11
    ).padStart(2,'0')}`;
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

    const target =
      this.game.player.position
        .clone()
        .add(
          new THREE.Vector3(
            0,
            .5,
            0
          )
        );

    const direction =
      target
        .clone()
        .sub(eye);

    const distance =
      direction.length();

    if (
      distance > 42
    ) {
      return false;
    }

    direction.normalize();

    const facing =
      new THREE.Vector3(
        0,
        0,
        -1
      ).applyQuaternion(
        this.group.quaternion
      );

    if (
      facing.dot(direction) <
      .05
    ) {
      return false;
    }

    const ray =
      new THREE.Raycaster(
        eye,
        direction,
        0,
        distance
      );

    const obstacles =
      ray.intersectObjects(
        this.game.map.colliders.map(
          c => c.mesh
        ),
        false
      );

    return obstacles.length === 0;
  }

  update(
    dt
  ) {

    if (
      !this.alive
    ) {
      return;
    }

    const player =
      this.game.player;

    const distance =
      this.group.position.distanceTo(
        player.position
      );

    if (
      this.canSeePlayer()
    ) {

      this.state =
        distance < 34
          ? 'ATTACK'
          : 'SEARCH';

      this.target.copy(
        player.position
      );
    }

    if (
      this.state ===
      'PATROL'
    ) {

      if (
        this.group.position.distanceTo(
          this.target
        ) < 1
      ) {

        this.target.copy(
          this.game.map.spawnPosition()
        );
      }

      this.move(
        this.target,
        dt,
        2.3
      );

    } else if (
      this.state ===
      'SEARCH'
    ) {

      this.move(
        this.target,
        dt,
        2.6
      );

    } else if (
      this.state ===
      'ATTACK'
    ) {

      this.face(
        player.position
      );

      if (
        distance > 16
      ) {

        this.move(
          player.position,
          dt,
          2
        );

      } else {

        const side =
          new THREE.Vector3(
            0,
            0,
            1
          ).applyQuaternion(
            this.group.quaternion
          );

        const strafe =
          Math.sin(
            performance.now() *
            .0012 +
            this.id
          );

        this.move(
          this.group.position
            .clone()
            .addScaledVector(
              side,
              strafe
            ),
          dt,
          .9
        );
      }

      this.fireTimer -=
        dt;

      if (
        this.fireTimer <= 0 &&
        distance < 36
      ) {

        this.fireTimer =
          60 /
          this.weapon.rate +
          rand(.1,.35);

        this.shootPlayer();
      }
    }
  }

  move(
    target,
    dt,
    speed
  ) {

    const direction =
      new THREE.Vector3(
        target.x -
          this.group.position.x,
        0,
        target.z -
          this.group.position.z
      );

    if (
      direction.lengthSq() <
      .01
    ) {
      return;
    }

    direction.normalize();

    const next =
      this.group.position
        .clone()
        .addScaledVector(
          direction,
          speed * dt
        );

    if (
      !this.game.map.collision(
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

    this.face(
      target
    );
  }

  face(
    target
  ) {

    const dx =
      target.x -
      this.group.position.x;

    const dz =
      target.z -
      this.group.position.z;

    this.group.rotation.y =
      Math.atan2(
        -dx,
        -dz
      );
  }

  shootPlayer() {

    const origin =
      this.group.position
        .clone()
        .add(
          new THREE.Vector3(
            0,
            1.42,
            0
          )
        );

    const target =
      this.game.player.position
        .clone()
        .add(
          new THREE.Vector3(
            0,
            .58,
            0
          )
        );

    const direction =
      target
        .sub(origin)
        .normalize();

    direction.x +=
      rand(-.028,.028);

    direction.z +=
      rand(-.028,.028);

    const ray =
      new THREE.Raycaster(
        origin,
        direction,
        0,
        80
      );

    const playerTarget =
      this.game.playerMesh;

    const blockers =
      ray.intersectObjects(
        this.game.map.colliders.map(
          c => c.mesh
        ),
        false
      )[0];

    if (blockers) {
      return;
    }

    this.game.player.takeDamage(
      this.weapon.damage * .48,
      this.group.position
    );
  }
}

/* =========================================================
   GAME
========================================================= */

class Game {

  constructor() {

    this.scene =
      new THREE.Scene();

    this.camera =
      new THREE.PerspectiveCamera(
        settings.fov,
        innerWidth /
          innerHeight,
        .05,
        250
      );

    this.renderer =
      new THREE.WebGLRenderer({
        antialias:true,
        powerPreference:'high-performance'
      });

    this.renderer.setPixelRatio(
      Math.min(
        devicePixelRatio,
        settings.quality === 'high'
          ? 1.7
          : settings.quality === 'medium'
            ? 1.3
            : 1
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

    this.renderer.outputColorSpace =
      THREE.SRGBColorSpace;

    this.renderer.toneMapping =
      THREE.ACESFilmicToneMapping;

    this.renderer.toneMappingExposure =
      1.05;

    const canvas =
      $('game');

    canvas.replaceWith(
      this.renderer.domElement
    );

    this.renderer.domElement.id =
      'game';

    this.camera.position.copy(
      this.scene.position
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

    this.player =
      new Player(
        this
      );

    this.bots = [];

    this.weapon =
      new WeaponManager(
        this
      );

    this.kit =
      KITS[selectedKit];

    this.stats = {
      kills:0,
      deaths:0,
      score:0
    };

    this.teamScore = [
      0,
      0
    ];

    this.matchTime =
      600;

    this.running =
      false;

    this.paused =
      false;

    this.debug =
      false;

    this.lastTime =
      performance.now();

    this.playerMesh =
      new THREE.Group();

    this.scene.add(
      this.playerMesh
    );

    this.bindUI();
  }

  bindUI() {

    document.querySelectorAll(
      '[data-action]'
    ).forEach(
      button => {

        button.addEventListener(
          'click',
          () => {

            audio.init();

            this.action(
              button.dataset.action
            );
          }
        );
      }
    );

    this.buildLoadoutUI();
    this.buildArmoryUI();
    this.bindSettings();

    this.renderer.domElement.addEventListener(
      'click',
      () => {

        if (
          this.running &&
          !this.paused &&
          !input.pointerLocked
        ) {
          input.lock();
        }
      }
    );
  }

  buildLoadoutUI() {

    const container =
      $('loadoutGrid');

    container.innerHTML = '';

    KITS.forEach(
      (kit,index) => {

        const card =
          document.createElement(
            'div'
          );

        card.className =
          'loadout-card' +
          (
            index === selectedKit
              ? ' active'
              : ''
          );

        card.innerHTML = `
          <h3>${kit.name}</h3>

          <div class="primary-name">
            ${WEAPONS[kit.primary].name}
          </div>

          <small>
            ${WEAPONS[kit.secondary].name}
            <br>
            ${kit.tactical.toUpperCase()}
            /
            ${kit.lethal.toUpperCase()}
          </small>
        `;

        card.onclick = () => {

          selectedKit =
            index;

          this.kit =
            kit;

          this.buildLoadoutUI();

          audio.ui();
        };

        container.appendChild(
          card
        );
      }
    );
  }

  buildArmoryUI() {

    const tabs =
      $('weaponTabs');

    tabs.innerHTML = '';

    Object.keys(
      WEAPONS
    ).forEach(
      key => {

        const button =
          document.createElement(
            'button'
          );

        button.textContent =
          WEAPONS[key].name;

        button.onclick =
          () =>
            this.showArmory(
              key
            );

        tabs.appendChild(
          button
        );
      }
    );

    this.showArmory(
      'carbine'
    );
  }

  showArmory(
    key
  ) {

    const weapon =
      WEAPONS[key];

    $('armoryTitle')
      .textContent =
      weapon.name;

    const host =
      $('armoryPreview');

    host.innerHTML = '';

    const scene =
      new THREE.Scene();

    scene.background =
      new THREE.Color(
        0x101618
      );

    const camera =
      new THREE.PerspectiveCamera(
        40,
        2,
        .1,
        20
      );

    camera.position.set(
      2.1,
      1.35,
      3.3
    );

    camera.lookAt(
      0,
      0,
      -.3
    );

    const renderer =
      new THREE.WebGLRenderer({
        antialias:true
      });

    renderer.setSize(
      Math.max(
        300,
        host.clientWidth
      ),
      360
    );

    renderer.setPixelRatio(1);

    host.appendChild(
      renderer.domElement
    );

    const hemi =
      new THREE.HemisphereLight(
        0xd5e0e7,
        0x182024,
        2.1
      );

    scene.add(
      hemi
    );

    const light =
      new THREE.DirectionalLight(
        0xffffff,
        2
      );

    light.position.set(
      3,
      5,
      2
    );

    scene.add(
      light
    );

    const model =
      Models.weapon(
        weapon.model
      );

    model.rotation.y =
      -.7;

    scene.add(
      model
    );

    const render =
      () => {

        if (
          !document.body.contains(
            renderer.domElement
          )
        ) {
          renderer.dispose();
          return;
        }

        model.rotation.y +=
          .006;

        renderer.render(
          scene,
          camera
        );

        requestAnimationFrame(
          render
        );
      };

    render();

    const stats =
      $('armoryStats');

    stats.innerHTML = '';

    const values = [
      [
        'DAMAGE',
        weapon.damage /
        60 * 100
      ],

      [
        'ACCURACY',
        (1 -
          weapon.spread * 5) *
          100
      ],

      [
        'RANGE',
        weapon.range /
        175 *
        100
      ],

      [
        'FIRE RATE',
        weapon.rate /
        1000 *
        100
      ],

      [
        'MOBILITY',
        weapon.category ===
          'PISTOL'
          ? 92
          : weapon.model ===
            'marksman'
              ? 62
              : 78
      ],

      [
        'CONTROL',
        clamp(
          100 -
          weapon.recoil *
          780,
          20,
          96
        )
      ]
    ];

    values.forEach(
      ([label,value]) => {

        const row =
          document.createElement(
            'div'
          );

        row.className =
          'stat-row';

        row.innerHTML = `
          <span>${label}</span>

          <div class="stat-bar">
            <span style="width:${clamp(
              value,
              0,
              100
            )}%"></span>
          </div>

          <b>${Math.round(
            clamp(value,0,100)
          )}</b>
        `;

        stats.appendChild(
          row
        );
      }
    );
  }

  bindSettings() {

    const ranges = [
      ['sens','sensitivity'],
      ['adsSens','adsSensitivity'],
      ['fov','fov'],
      ['masterVol','master']
    ];

    ranges.forEach(
      ([id,key]) => {

        const element =
          $(id);

        element.value =
          settings[key];

        element.addEventListener(
          'input',
          () => {

            settings[key] =
              Number(
                element.value
              );

            this.saveSettings();

            if (
              audio.master
            ) {
              audio.master.gain.value =
                settings.master;
            }
          }
        );
      }
    );

    const others = [
      ['quality','quality'],
      ['invert','invert'],
      ['motion','motion'],
      ['vsync','vsync']
    ];

    others.forEach(
      ([id,key]) => {

        const element =
          $(id);

        if (
          element.type ===
          'checkbox'
        ) {

          element.checked =
            settings[key];

        } else {

          element.value =
            settings[key];
        }

        element.addEventListener(
          'change',
          () => {

            settings[key] =
              element.type ===
              'checkbox'
                ? element.checked
                : element.value;

            this.saveSettings();
          }
        );
      }
    );
  }

  saveSettings() {

    localStorage.setItem(
      'crazeops-settings',
      JSON.stringify(
        settings
      )
    );
  }

  action(
    action
  ) {

    if (
      action === 'play'
    ) {

      this.startMatch();
      return;
    }

    if (
      [
        'loadout',
        'armory',
        'settings',
        'controls'
      ].includes(action)
    ) {

      this.hideScreens();

      $(action)
        .classList.add(
          'active'
        );

      return;
    }

    if (
      action === 'back'
    ) {

      this.hideScreens();

      $('menu')
        .classList.add(
          'active'
        );

      return;
    }

    if (
      action === 'capture'
    ) {

      $('capture')
        .classList.add(
          'hidden'
        );

      input.lock();

      return;
    }

    if (
      action === 'resume'
    ) {

      this.paused =
        false;

      $('pause')
        .classList.add(
          'hidden'
        );

      input.lock();

      return;
    }

    if (
      action === 'mainMenu'
    ) {

      this.stopMatch();

      this.hideScreens();

      $('menu')
        .classList.add(
          'active'
        );
    }
  }

  hideScreens() {

    [
      'menu',
      'loadout',
      'armory',
      'settings',
      'controls'
    ].forEach(
      id => {

        $(id)
          .classList.remove(
            'active'
          );
      }
    );
  }

  startMatch() {

    this.kit =
      KITS[selectedKit];

    this.running =
      true;

    this.paused =
      false;

    this.matchTime =
      600;

    this.stats = {
      kills:0,
      deaths:0,
      score:0
    };

    this.teamScore = [
      0,
      0
    ];

    this.hideScreens();

    $('hud')
      .classList.remove(
        'hidden'
      );

    $('matchEnd')
      .classList.add(
        'hidden'
      );

    this.player.reset(
      this.map.spawnPosition()
    );

    this.weapon =
      new WeaponManager(
        this
      );

    this.weapon.initialize();

    this.spawnBots();

    $('capture')
      .classList.remove(
        'hidden'
      );

    this.updateScore();
    this.updateScoreboard();

    audio.init();
  }

  spawnBots() {

    this.bots.forEach(
      bot =>
        this.scene.remove(
          bot.group
        )
    );

    this.bots = [];

    for (
      let i=0;
      i<9;
      i++
    ) {

      this.bots.push(
        new Bot(
          this,
          i
        )
      );
    }
  }

  stopMatch() {

    this.running =
      false;

    this.paused =
      false;

    input.unlock();

    $('hud')
      .classList.add(
        'hidden'
      );

    $('pause')
      .classList.add(
        'hidden'
      );

    $('capture')
      .classList.add(
        'hidden'
      );

    $('death')
      .classList.add(
        'hidden'
      );

    this.bots.forEach(
      bot =>
        this.scene.remove(
          bot.group
        )
    );

    this.bots = [];
  }

  showWeaponToast(
    text
  ) {

    const toast =
      $('weaponToast');

    toast.textContent =
      text;

    toast.classList.add(
      'on'
    );

    clearTimeout(
      this.toastTimer
    );

    this.toastTimer =
      setTimeout(
        () =>
          toast.classList.remove(
            'on'
          ),
        850
      );
  }

  addKill(
    text
  ) {

    const element =
      document.createElement(
        'div'
      );

    element.className =
      'kill-item';

    element.textContent =
      text;

    $('killFeed')
      .appendChild(
        element
      );

    setTimeout(
      () =>
        element.remove(),
      2800
    );
  }

  hitFeedback(
    head,
    killed
  ) {

    const marker =
      $('hitmarker');

    marker.classList.add(
      'hit'
    );

    setTimeout(
      () =>
        marker.classList.remove(
          'hit'
        ),
      90
    );

    head
      ? audio.headshot()
      : audio.hit();

    if (
      killed
    ) {

      this.showWeaponToast(
        'ELIMINATION +100'
      );
    }
  }

  damageFeedback(
    source
  ) {

    const arrow =
      document.createElement(
        'div'
      );

    arrow.className =
      'damage-arrow';

    arrow.textContent =
      '▼';

    $('damageDir')
      .appendChild(
        arrow
      );

    setTimeout(
      () =>
        arrow.remove(),
      300
    );

    const vignette =
      $('damageVignette');

    vignette.style.opacity =
      '.85';

    setTimeout(
      () =>
        vignette.style.opacity =
          '0',
      180
    );
  }

  throwGrenade(
    type
  ) {

    const grenade =
      Models.grenade(
        type
      );

    grenade.position.copy(
      this.player.position
        .clone()
        .add(
          new THREE.Vector3(
            0,
            .45,
            0
          )
        )
    );

    this.scene.add(
      grenade
    );

    const direction =
      new THREE.Vector3(
        0,
        0,
        -1
      )
        .applyEuler(
          this.camera.rotation
        )
        .normalize();

    grenade.userData.velocity =
      direction
        .multiplyScalar(
          13
        )
        .add(
          new THREE.Vector3(
            0,
            5,
            0
          )
        );

    grenade.userData.timer =
      type === 'flash'
        ? .9
        : type === 'smoke'
          ? 2
          : 1.4;

    const update =
      () => {

        if (
          !grenade.parent
        ) {
          return;
        }

        grenade.userData.timer -=
          .033;

        grenade.userData.velocity.y -=
          9 * .033;

        grenade.position.addScaledVector(
          grenade.userData.velocity,
          .033
        );

        if (
          grenade.position.y <
          .15
        ) {

          grenade.position.y =
            .15;

          grenade.userData.velocity.y *=
            -.45;

          grenade.userData.velocity.x *=
            .78;

          grenade.userData.velocity.z *=
            .78;
        }

        grenade.rotation.x +=
          .12;

        if (
          grenade.userData.timer <=
          0
        ) {

          this.explodeGrenade(
            grenade
          );

          return;
        }

        requestAnimationFrame(
          update
        );
      };

    update();
  }

  explodeGrenade(
    grenade
  ) {

    const position =
      grenade.position.clone();

    const type =
      grenade.userData.type ||
      'frag';

    this.scene.remove(
      grenade
    );

    this.vfx.explosion(
      position
    );

    const radius =
      [
        'frag',
        'impact',
        'incendiary'
      ].includes(type)
        ? 6
        : 4.5;

    for (
      const bot of
      this.bots.filter(
        b => b.alive
      )
    ) {

      const distance =
        bot.group.position.distanceTo(
          position
        );

      if (
        distance < radius
      ) {

        bot.takeDamage(
          (
            1 -
            distance / radius
          ) * 100,
          this.player
        );
      }
    }
  }

  updateScore() {

    $('scoreMini')
      .textContent =
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
      $('scoreRows');

    const entries = [
      {
        name:'YOU',
        kills:this.stats.kills,
        deaths:this.stats.deaths,
        score:this.stats.kills * 100
      }
    ];

    for (
      const bot of
      this.bots
    ) {

      entries.push({
        name:bot.codename(),
        kills:
          Math.floor(
            rand(1,16)
          ),
        deaths:
          Math.floor(
            rand(1,14)
          ),
        score:
          Math.floor(
            rand(200,1700)
          )
      });
    }

    entries.sort(
      (a,b) =>
        b.score -
        a.score
    );

    rows.innerHTML =
      entries.map(
        entry => `
          <div class="score-row ${
            entry.name === 'YOU'
              ? 'you'
              : ''
          }">

            <span>${entry.name}</span>
            <span>${entry.kills}</span>
            <span>${entry.deaths}</span>
            <span>${entry.score}</span>

          </div>
        `
      ).join('');
  }

  endMatch(
    victory
  ) {

    if (
      !this.running
    ) {
      return;
    }

    this.running =
      false;

    input.unlock();

    $('capture')
      .classList.add(
        'hidden'
      );

    $('matchEnd')
      .classList.remove(
        'hidden'
      );

    $('winnerText')
      .textContent =
      victory
        ? 'VICTORY'
        : 'DEFEAT';

    $('finalScore')
      .textContent =
      `${this.teamScore[0]} — ${this.teamScore[1]}`;
  }

  resize() {

    this.camera.aspect =
      innerWidth /
      innerHeight;

    this.camera.updateProjectionMatrix();

    this.renderer.setSize(
      innerWidth,
      innerHeight
    );
  }

  update(
    dt
  ) {

    if (
      !this.running
    ) {
      return;
    }

    if (
      input.pressed(
        'Escape'
      )
    ) {

      this.paused =
        !this.paused;

      $('pause')
        .classList.toggle(
          'hidden',
          !this.paused
        );

      if (
        this.paused
      ) {

        input.unlock();

      } else {

        input.lock();
      }
    }

    if (
      this.paused
    ) {
      return;
    }

    if (
      input.pressed(
        'KeyQ'
      )
    ) {

      this.weapon.cycle();
    }

    if (
      input.pressed(
        'Digit1'
      )
    ) {

      this.weapon.equip(
        this.kit.primary
      );
    }

    if (
      input.pressed(
        'Digit2'
      )
    ) {

      this.weapon.equip(
        this.kit.secondary
      );
    }

    if (
      input.pressed(
        'Digit3'
      )
    ) {

      this.weapon.equip(
        'knife'
      );
    }

    if (
      input.pressed(
        'Digit4'
      )
    ) {

      this.weapon.equip(
        this.kit.tactical
      );
    }

    if (
      input.pressed(
        'Digit5'
      )
    ) {

      this.weapon.equip(
        this.kit.lethal
      );
    }

    if (
      input.pressed(
        'KeyR'
      )
    ) {

      this.weapon.reload();
    }

    if (
      input.pressed(
        'KeyF'
      )
    ) {

      this.weapon.melee();
    }

    if (
      input.pressed(
        'KeyG'
      )
    ) {

      this.throwGrenade(
        this.kit.tactical
      );
    }

    if (
      input.pressed(
        'KeyH'
      )
    ) {

      this.throwGrenade(
        this.kit.lethal
      );
    }

    if (
      input.pressed(
        'KeyI'
      )
    ) {

      this.weapon.inspect();
    }

    if (
      input.pressed(
        'F3'
      )
    ) {

      this.debug =
        !this.debug;

      $('debug')
        .classList.toggle(
          'hidden',
          !this.debug
        );
    }

    if (
      input.pressed(
        'Tab'
      )
    ) {

      $('scoreboard')
        .classList.remove(
          'hidden'
        );

      this.updateScoreboard();

    } else if (
      !input.down(
        'Tab'
      )
    ) {

      $('scoreboard')
        .classList.add(
          'hidden'
        );
    }

    if (
      input.mouse.buttons & 1
    ) {

      this.weapon.fire();
    }

    this.matchTime -=
      dt;

    if (
      this.matchTime <= 0
    ) {

      this.endMatch(
        this.teamScore[0] >=
        this.teamScore[1]
      );

      return;
    }

    this.player.update(
      dt
    );

    this.weapon.update(
      dt
    );

    for (
      const bot of
      this.bots
    ) {

      bot.update(
        dt
      );
    }

    this.vfx.update(
      dt
    );

    const minutes =
      Math.floor(
        this.matchTime / 60
      );

    const seconds =
      Math.floor(
        this.matchTime % 60
      );

    $('timer')
      .textContent =
      `${String(minutes).padStart(
        2,'0'
      )}:${String(seconds).padStart(
        2,'0'
      )}`;

    if (
      this.debug
    ) {

      $('debug')
        .textContent =
        `FPS ${(1/dt).toFixed(0)}
POS ${this.player.position.x.toFixed(1)}, ${this.player.position.y.toFixed(1)}, ${this.player.position.z.toFixed(1)}
VEL ${this.player.velocity.length().toFixed(2)}
WEAPON ${this.weapon.currentKey}
AMMO ${
  WEAPONS[this.weapon.currentKey]
    ? `${this.weapon.ammo[this.weapon.currentKey].mag}/${this.weapon.ammo[this.weapon.currentKey].reserve}`
    : 'N/A'
}
BOTS ${this.bots.filter(
  b => b.alive
).length}`;
    }
  }

  loop(
    now
  ) {

    const dt =
      Math.min(
        .033,
        (now - this.lastTime) /
        1000
      );

    this.lastTime =
      now;

    this.update(
      dt
    );

    this.renderer.render(
      this.scene,
      this.camera
    );

    input.clearFrame();

    requestAnimationFrame(
      time =>
        this.loop(
          time
        )
    );
  }
}

let game;

try {

  $('bootStatus')
    .textContent =
    'LOADING WEBGL COMBAT SYSTEMS...';

  game =
    new Game();

  setTimeout(
    () => {

      $('bootStatus')
        .textContent =
        'READY';

      $('boot').style.opacity =
        '0';

      setTimeout(
        () => {
          $('boot').remove();
        },
        400
      );

    },
    650
  );

  window.addEventListener(
    'resize',
    () =>
      game.resize()
  );

  requestAnimationFrame(
    time =>
      game.loop(time)
  );

} catch (
  error
) {

  console.error(
    error
  );

  $('bootStatus')
    .textContent =
    'INITIALIZATION ERROR — OPEN CONSOLE';
}
