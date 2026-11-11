/* ============================================================================
   方寸之境 · 第一境 · 雪山河谷（示范境）

   这份文件只用来学手法：地形函数怎么叠、河怎么定线、生灵怎么用基本体捏、
   怎么登记每帧动作和夜晚灯火。做新的一境时不要照搬这里的山、河、鹿、木屋。
   ============================================================================ */
const WORLD = {
  meta: {
    no: 1, name: '雪山河谷',
    tagline: '雪线化水，越崖成瀑，绕过草甸入湖',
    seed: 20261109, noiseSeeds: [7, 13],
    ground: -2.4,        // 地表基准：山高就把地面放低，给天空留地方
    startHour: 7.2,      // 开场时辰：晨光斜照，光柱最明显
  },

  build(F){
    const { THREE, G, R, pick, rand, C, gs, smooth, clamp, n2, fbm, ridged, kit } = F;

    /* ---------- 一、地貌：后排雪山，中间一道断崖，前面是河谷 ---------- */
    const cliffZ = x => -0.42 + 0.5 * Math.sin(x * 0.62 + 0.4) + 0.16 * n2(x * 0.45, 7.3);
    const base = (x, z) => {
      let h = 0.45 + 0.24 * fbm(x * 0.33 + 3.1, z * 0.33 - 1.7, 4);                                      // 河谷的缓起伏
      h += 0.85 * gs(x + 3.4, z - 3.1, 1.5) + 0.45 * gs(x + 0.9, z - 4.3, 1.2) + 0.35 * gs(x - 4.2, z - 3.9, 1.1);   // 前景小丘
      const cz = cliffZ(x), soft = 0.085 + 1.0 * smooth(-2.0, -4.8, x) + 0.7 * smooth(3.3, 5.2, x);      // 中段陡成崖，两头缓成坡
      h += smooth(cz + soft, cz - soft, z) * (1.3 + 0.22 * fbm(x * 0.5 - 6, z * 0.5 + 2, 3));             // 崖后的高台
      let m = 2.35 * gs(x + 2.6, z + 3.7, 1.3) + 2.75 * gs(x - 0.75, z + 4.05, 1.25) + 2.05 * gs(x - 3.1, z + 3.35, 1.2)
            + 1.25 * gs(x + 4.3, z + 2.5, 1.05) + 0.9 * gs(x - 4.45, z + 1.5, 0.95);                      // 五座峰
      m *= 0.82 + 0.36 * fbm(x * 0.7 + 11, z * 0.7, 3);
      m += smooth(-0.9, -4.2, z) * ridged(x * 0.48 + 2, z * 0.48 - 5, 5) * 1.05;                          // 山脊纹理
      return h + m;
    };
    const CABIN = { x: 3.72, z: 0.92 };
    const T = F.terrain({
      base,
      // 河：两峰之间的雪线发源 → 高台上绕两个弯 → 在断崖处落下 → 河谷里再绕 → 入湖
      rivers: [{ points: [[-0.95, -3.75], [-0.55, -3.05], [-1.05, -2.3], [-0.45, -1.6], [0.25, -1.1], [0.42, -0.5], [0.46, 0.25], [-0.2, 0.85], [-0.8, 1.5], [-0.45, 2.35], [0.4, 2.8], [1.2, 2.5], [2.35, 2.35]], lake: 0 }],
      lakes: [{ x: 2.35, z: 2.35, rx: 1.3, rz: 1.0 }],
      pads: [{ x: CABIN.x, z: CABIN.z, r: 0.6 }],
    });
    const river = T.rivers[0], lake = T.lakes[0];

    // 森林密度：既决定地面颜色，也决定树种在哪。给鹿、兔、羊和木屋留出空地
    const forest = (x, z) => {
      let f = fbm(x * 0.42 + 10, z * 0.42 - 4, 3);
      const cz = cliffZ(x);
      f += smooth(cz + 0.2, cz - 0.6, z) * (1 - smooth(-2.4, -3.8, z)) * 0.32 + smooth(-1.6, -3.2, x) * smooth(-0.2, 0.6, z) * 0.38 - 0.05;
      f -= gs(x + 1.7, z - 1.2, 0.95) * 0.6 + gs(x - 1.3, z - 1.0, 0.9) * 0.55 + gs(x - 2.3, z + 1.4, 0.9) * 0.7 + gs(x - CABIN.x, z - CABIN.z, 0.7) * 0.8;
      return smooth(0.0, 0.32, f);
    };

    /* ---------- 二、地表上色 ---------- */
    const P = { grassA: C('#86b84c'), grassB: C('#5f9c3d'), grassC: C('#b3bd5c'), forest: C('#3c6a2f'), alpine: C('#8f9160'), rock: C('#8b8178'), rockDark: C('#5e5852'), snow: C('#f3f6fa') };
    const t2 = new THREE.Color();
    F.ground({
      color(c, x, z, h, slope){
        const nA = fbm(x * 0.9 + 20, z * 0.9, 3), nB = n2(x * 3.1, z * 3.1);
        c.copy(P.grassB).lerp(P.grassA, smooth(-0.3, 0.4, nA));
        c.lerp(P.grassC, smooth(0.15, 0.6, n2(x * 0.5 + 9, z * 0.5 - 3)) * 0.55);
        c.lerp(P.forest, forest(x, z) * 0.75);
        c.lerp(P.alpine, smooth(2.5, 3.3, h) * 0.65);
        const steep = smooth(0.34, 0.6, slope + nB * 0.05);          // 陡处露出岩层：崖壁跟四面剖面用同一套色带
        if (steep > 0){ if (h < 2.7) F.strata(h + nB * 0.02, x, z, t2); else t2.copy(P.rock).lerp(P.rockDark, nB * 0.5 + 0.5); c.lerp(t2, steep); }
        c.lerp(t2.copy(P.rock).lerp(P.rockDark, nB * 0.5 + 0.5), smooth(3.0, 3.7, h + nA * 0.3) * 0.8);
        c.lerp(P.snow, smooth(3.5, 3.9, h + nA * 0.45) * (1 - smooth(0.55, 0.82, slope)));   // 雪只积在高处的缓坡上
      },
    });
    F.water({ shallow: '#7fd6c6', deep: '#1e5a78' });

    /* ---------- 三、植被 ---------- */
    const DECID = ['#4f8f3a', '#5fa040', '#3f7a33', '#77ad48', '#8bbf55', '#336f36', '#6aa24a'].map(C), AUTUMN = ['#d38a3a', '#cfa142', '#c4643a'].map(C);
    const CONIF = ['#2f6b4a', '#2a5e45', '#3b7a52', '#24533f', '#356a4c'].map(C), FROST = C('#d6e6e2');
    const decid = [], conif = [];
    for (let i = 0; i < 26000 && (decid.length < 430 || conif.length < 560); i++){
      const x = R(-4.72, 4.72), z = R(-4.72, 4.72), h = T.getH(x, z), sl = T.slopeAt(x, z);
      if (!F.inFoot(x, z) || !T.isDry(x, z, 0.06) || Math.hypot(x - CABIN.x, z - CABIN.z) < 0.5) continue;      // inFoot：换成钟罩或球时，不种到地块外面去
      if (h < 2.35 && sl < 0.38){                       // 河谷与高台：阔叶林，高台上混一点针叶
        if (rand() < forest(x, z) * 0.85 + 0.015){
          if (h > 1.4 && rand() < 0.22){ if (conif.length < 560) conif.push([x, z, h]); }
          else if (decid.length < 430) decid.push([x, z, h]);
        }
      } else if (h >= 2.35 && h < 3.6 && sl < 0.55){   // 山坡：针叶林，越靠近雪线越稀
        const p = (0.25 + 0.6 * smooth(-0.3, 0.3, fbm(x * 0.6 - 3, z * 0.6 + 8, 3))) * (1 - smooth(3.2, 3.6, h) * 0.6);
        if (rand() < p && conif.length < 560) conif.push([x, z, h]);
      }
    }
    kit.trees(decid, kit.treeGeo('broadleaf'), () => (rand() < 0.05 ? pick(AUTUMN) : pick(DECID)).clone().multiplyScalar(R(0.85, 1.1)), [0.26, 0.42]);
    kit.trees(conif, kit.treeGeo('conifer'), (x, z, h) => pick(CONIF).clone().lerp(FROST, smooth(2.9, 3.55, h) * 0.55).multiplyScalar(R(0.85, 1.1)), [0.3, 0.52]);

    const GA = C('#6fae45'), GB = C('#a6c95a'), GD = C('#3f7533'), GY = C('#b9b268');
    kit.grass({
      max: 9500,
      accept: (x, z, h) => h < 3.25 && T.slopeAt(x, z) < 0.42 && T.isDry(x, z, 0.02) && rand() < 0.75 - forest(x, z) * 0.35,
      color: (x, z, h) => GA.clone().lerp(GB, smooth(-0.4, 0.5, n2(x * 1.7, z * 1.7))).lerp(GD, forest(x, z) * 0.6).lerp(GY, smooth(2.4, 3.2, h) * 0.6),
    });
    kit.flowers({ max: 1100, accept: (x, z, h) => h < 2.6 && T.slopeAt(x, z) < 0.3 && T.isDry(x, z, 0.04) && forest(x, z) < 0.35 && n2(x * 1.4 + 40, z * 1.4) > -0.15 });

    // 石头：河岸、瀑布脚下、山坡
    const rocks = [];
    for (let i = 0; i < 70; i++){
      const k = Math.floor(R(30, river.PS - 60)), p0 = river.pts[k - 1], p1 = river.pts[k + 1];
      let tx = p1.x - p0.x, tz = p1.z - p0.z; const l = Math.hypot(tx, tz); tx /= l; tz /= l;
      const off = river.wid[k] * R(1.05, 1.9) * (rand() < 0.5 ? 1 : -1);
      rocks.push([river.pts[k].x - tz * off, river.pts[k].z + tx * off, R(0.03, 0.07)]);
    }
    for (let i = 0; i < 14; i++){ const a = R(0, 6.28), r = R(0.08, 0.35); rocks.push([river.fallBase.x + Math.cos(a) * r, river.fallBase.z + Math.sin(a) * r * 0.7, R(0.04, 0.09)]); }
    for (let i = 0; i < 3000 && rocks.length < 190; i++){
      const x = R(-4.8, 4.8), z = R(-4.8, 4.8), sl = T.slopeAt(x, z), h = T.getH(x, z); if (!F.inFoot(x, z, 0.2)) continue;
      if (sl > 0.25 && sl < 0.6 && h > 1.0 && rand() < 0.5) rocks.push([x, z, R(0.05, 0.13)]);
      else if (rand() < 0.02 && T.isDry(x, z)) rocks.push([x, z, R(0.03, 0.06)]);
    }
    kit.rocks(rocks);

    /* ---------- 四、人迹：湖边木屋、栈桥、小船 ---------- */
    const clay = F.clay;
    const windowMat = new THREE.MeshStandardMaterial({ color: 0x3a2a1c, emissive: 0xffb860, emissiveIntensity: 0, roughness: 0.4 });
    const cabinLight = new THREE.PointLight(0xffb060, 0, 1.6, 2);
    const cabinY = T.getY(CABIN.x, CABIN.z), cabinAng = Math.atan2(-(lake.z - CABIN.z), lake.x - CABIN.x);
    {
      const g = new THREE.Group();
      const walls = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.15, 0.24), clay('#b98457')); walls.position.y = 0.075; g.add(walls);
      const sh = new THREE.Shape(); sh.moveTo(-0.115, 0); sh.lineTo(0.115, 0); sh.lineTo(0, 0.11); sh.closePath();
      const roof = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.29, bevelEnabled: false }).translate(0, 0, -0.145), clay('#8a3d2c')); roof.position.y = 0.15; g.add(roof);
      const chim = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.09, 0.035), clay('#8b8580')); chim.position.set(0.035, 0.22, -0.06); g.add(chim);
      const win = new THREE.Mesh(new THREE.PlaneGeometry(0.045, 0.04), windowMat); win.position.set(0.0905, 0.09, 0.05); win.rotation.y = Math.PI / 2; g.add(win);
      const win2 = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.04), windowMat); win2.position.set(0, 0.09, 0.1205); g.add(win2);
      const door = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.08, 0.045), clay('#5a3a26')); door.position.set(0.091, 0.04, -0.05); g.add(door);
      const step = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.012, 0.07), clay('#9c8a78')); step.position.set(0.11, 0.006, -0.05); g.add(step);
      for (let i = 0; i < 5; i++){ const l = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.06, 6), clay('#7a5236')); l.rotation.x = Math.PI / 2; l.position.set(-0.1 - (i % 2) * 0.004, 0.009 + Math.floor(i / 2) * 0.014, -0.04 + (i % 3) * 0.018); g.add(l); }
      cabinLight.position.set(0.18, 0.11, 0.08); g.add(cabinLight);
      g.position.set(CABIN.x, cabinY, CABIN.z); g.rotation.y = cabinAng;
      F.root.add(F.shadowAll(g));
    }
    F.onLight(L => { windowMat.emissiveIntensity = L.night * 3.2; cabinLight.intensity = L.night * 0.45; });   // 入夜亮灯
    {
      let dx = lake.x - CABIN.x, dz = lake.z - CABIN.z; const l = Math.hypot(dx, dz); dx /= l; dz /= l;
      let t = 0; while (t < 3 && T.lakeE(lake, CABIN.x + dx * t, CABIN.z + dz * t) > 1.04) t += 0.02;      // 沿屋→湖方向走到岸边
      const sx = CABIN.x + dx * (t - 0.12), sz = CABIN.z + dz * (t - 0.12);
      const dock = new THREE.Group();
      const deck = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.012, 0.085), clay('#a07a55')); deck.position.set(0.25, 0, 0); dock.add(deck);
      for (let i = 0; i < 4; i++) for (const sd of [-1, 1]){ const post = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.12, 6), clay('#6e4f36')); post.position.set(0.05 + i * 0.14, -0.05, sd * 0.038); dock.add(post); }
      dock.position.set(sx, G + lake.level + 0.04, sz); dock.rotation.y = Math.atan2(-dz, dx);
      F.root.add(F.shadowAll(dock));
      const boat = new THREE.Group();
      const hull = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), clay('#c46a45')); hull.scale.set(1.6, 0.55, 0.7); boat.add(hull);
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.006, 0.07), clay('#e8d6b8')); seat.position.y = -0.004; boat.add(seat);
      const by = G + lake.level + 0.012;
      boat.position.set(sx + dx * 0.55 - dz * 0.12, by, sz + dz * 0.55 + dx * 0.12); boat.rotation.y = 0.6;
      F.root.add(F.shadowAll(boat));
      F.life(t => { boat.position.y = by + Math.sin(t * 1.3) * 0.004; boat.rotation.z = Math.sin(t * 1.1) * 0.05; });
    }

    /* ---------- 五、生灵：都用基本体捏，个头故意放大一点才看得见 ---------- */
    function makeDeer(stag){
      const g = new THREE.Group(), fur = clay(stag ? '#9a6440' : '#b07a4f'), dark = clay('#4e3322'), light = clay('#f1e5d2');
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 0.07, 4, 10), fur); body.rotation.z = Math.PI / 2; body.position.y = 0.085; g.add(body);
      const legG = new THREE.CylinderGeometry(0.0075, 0.0055, 0.075, 6);
      for (const [lx, lz] of [[0.04, 0.017], [0.04, -0.017], [-0.04, 0.017], [-0.04, -0.017]]){ const l = new THREE.Mesh(legG, dark); l.position.set(lx, 0.0375, lz); g.add(l); }
      const pivot = new THREE.Group(); pivot.position.set(0.048, 0.098, 0); g.add(pivot);        // 脖子根：转它就是低头吃草
      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.0105, 0.015, 0.065, 8), fur); neck.position.set(0.012, 0.028, 0); neck.rotation.z = -0.42; pivot.add(neck);
      const head = new THREE.Group(); head.position.set(0.027, 0.06, 0); pivot.add(head);
      const skull = new THREE.Mesh(new THREE.SphereGeometry(0.017, 12, 10), fur); skull.scale.set(1.15, 0.95, 0.88); head.add(skull);
      const snout = new THREE.Mesh(new THREE.ConeGeometry(0.0105, 0.03, 8), fur); snout.rotation.z = -Math.PI / 2; snout.position.set(0.022, -0.006, 0); head.add(snout);
      const nose = new THREE.Mesh(new THREE.SphereGeometry(0.0045, 8, 6), dark); nose.position.set(0.037, -0.006, 0); head.add(nose);
      for (const sd of [-1, 1]){
        const ear = new THREE.Mesh(new THREE.ConeGeometry(0.0065, 0.022, 6), fur); ear.position.set(-0.006, 0.016, sd * 0.012); ear.rotation.set(sd * 0.7, 0, 0.3); head.add(ear);
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.0028, 6, 6), dark); eye.position.set(0.01, 0.004, sd * 0.0135); head.add(eye);
        if (stag){
          const a1 = new THREE.Mesh(new THREE.CylinderGeometry(0.0022, 0.003, 0.05, 5), clay('#e2d2b4')); a1.position.set(-0.004, 0.038, sd * 0.012); a1.rotation.set(sd * 0.35, 0, 0.25); head.add(a1);
          const a2 = new THREE.Mesh(new THREE.CylinderGeometry(0.0018, 0.0022, 0.022, 5), clay('#e2d2b4')); a2.position.set(0.006, 0.05, sd * 0.02); a2.rotation.set(sd * 0.2, 0, -0.6); head.add(a2);
        }
      }
      const tail = new THREE.Mesh(new THREE.SphereGeometry(0.009, 8, 6), light); tail.position.set(-0.068, 0.098, 0); g.add(tail);
      g.scale.setScalar(1.25); g.userData = { pivot, tail, phase: R(0, 20) };
      return F.shadowAll(g);
    }
    function makeSheep(){
      const g = new THREE.Group(), wool = clay('#f4f0e6', { roughness: 0.95 }), dark = clay('#3a3230');
      for (let i = 0; i < 9; i++){ const s = new THREE.Mesh(new THREE.IcosahedronGeometry(R(0.022, 0.03), 2), wool); s.position.set(R(-0.035, 0.035), 0.065 + R(-0.012, 0.016), R(-0.02, 0.02)); g.add(s); }
      for (const [lx, lz] of [[0.025, 0.015], [0.025, -0.015], [-0.025, 0.015], [-0.025, -0.015]]){ const l = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.045, 5), dark); l.position.set(lx, 0.022, lz); g.add(l); }
      const pivot = new THREE.Group(); pivot.position.set(0.05, 0.07, 0); g.add(pivot);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.015, 10, 8), dark); head.scale.set(1.3, 1, 0.9); head.position.set(0.012, 0, 0); pivot.add(head);
      for (const sd of [-1, 1]){ const ear = new THREE.Mesh(new THREE.SphereGeometry(0.006, 6, 5), dark); ear.scale.set(1, 0.5, 1.8); ear.position.set(0.004, 0.006, sd * 0.016); pivot.add(ear); }
      const top = new THREE.Mesh(new THREE.IcosahedronGeometry(0.011, 1), wool); top.position.set(0.006, 0.012, 0); pivot.add(top);
      g.scale.setScalar(1.15); g.userData = { pivot, phase: R(0, 20) };
      return F.shadowAll(g);
    }
    function makeRabbit(){
      const g = new THREE.Group(), fur = clay(pick(['#d9c8b4', '#c7ad8f', '#f2ede6'])), white = clay('#ffffff');
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.022, 12, 10), fur); body.scale.set(1.25, 1, 1); body.position.y = 0.022; g.add(body);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.014, 10, 8), fur); head.position.set(0.024, 0.04, 0); g.add(head);
      for (const sd of [-1, 1]){ const ear = new THREE.Mesh(new THREE.CapsuleGeometry(0.004, 0.02, 3, 6), fur); ear.position.set(0.018, 0.064, sd * 0.006); ear.rotation.set(sd * 0.2, 0, 0.35); g.add(ear); }
      const tail = new THREE.Mesh(new THREE.SphereGeometry(0.007, 8, 6), white); tail.position.set(-0.028, 0.03, 0); g.add(tail);
      g.scale.setScalar(1.15);
      return F.shadowAll(g);
    }
    function makeDuck(){
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.024, 12, 10), clay('#b9a58c')); body.scale.set(1.45, 0.75, 1); g.add(body);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.013, 10, 8), clay('#2f6b47', { roughness: 0.45 })); head.position.set(0.026, 0.024, 0); g.add(head);
      const beak = new THREE.Mesh(new THREE.ConeGeometry(0.005, 0.016, 6), clay('#f0a23a')); beak.rotation.z = -Math.PI / 2; beak.position.set(0.042, 0.022, 0); g.add(beak);
      const tail = new THREE.Mesh(new THREE.ConeGeometry(0.008, 0.02, 6), clay('#3d3a36')); tail.rotation.z = Math.PI / 2 + 0.5; tail.position.set(-0.035, 0.01, 0); g.add(tail);
      return F.shadowAll(g);
    }

    // 鹿：河边草甸，隔一阵低头吃草
    for (let i = 0; i < 4; i++){
      const [x, z] = F.findSpot(-1.7 + R(-0.4, 0.4), 1.2 + R(-0.4, 0.4), 0.25), d = makeDeer(i === 0);
      F.place(d, x, z); d.rotation.y = R(0, 6.28); F.root.add(d);
      F.life(t => {
        const u = d.userData, cyc = (t * 0.22 + u.phase) % 6, down = smooth(0.3, 1.0, cyc) * (1 - smooth(4.2, 5.0, cyc));
        u.pivot.rotation.z = -down * 1.25 + Math.sin(t * 3 + u.phase) * 0.04 * down;
        u.tail.position.y = 0.098 + Math.max(0, Math.sin(t * 7 + u.phase)) * 0.006;
      });
    }
    // 羊：高台上慢慢挪
    for (let i = 0; i < 6; i++){
      const [x0, z0] = F.findSpot(2.2 + R(-0.5, 0.5), -1.4 + R(-0.35, 0.35), 0.2), sp = makeSheep(); F.root.add(sp);
      const r = R(0.05, 0.12), w = R(0.02, 0.05) * (rand() < 0.5 ? 1 : -1), a0 = R(0, 6.28);
      F.life(t => {
        const a = a0 + t * w, x = x0 + Math.cos(a) * r, z = z0 + Math.sin(a) * r;
        sp.position.set(x, T.getY(x, z), z); sp.rotation.y = -a - Math.sign(w) * Math.PI / 2;
        sp.userData.pivot.rotation.z = -0.6 - 0.35 * Math.sin(t * 0.8 + sp.userData.phase);
      });
    }
    // 兔子：湖畔草地，跳一下歇一下
    for (let i = 0; i < 5; i++){
      const [cx, cz] = F.findSpot(1.25 + R(-0.4, 0.4), 1.0 + R(-0.3, 0.3), 0.2), rb = makeRabbit(); F.root.add(rb);
      const r = R(0.1, 0.22), ph = R(0, 10), rate = R(0.5, 0.9), dir = rand() < 0.5 ? 1 : -1;
      F.life(t => {
        const cyc = t * rate + ph, k = Math.floor(cyc), hf = clamp((cyc - k) / 0.35, 0, 1);
        const a = dir * (k + smooth(0, 1, hf)) * 0.55, x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
        rb.position.set(x, T.getY(x, z) + Math.sin(hf * Math.PI) * 0.035, z);
        rb.rotation.y = -a - dir * Math.PI / 2; rb.rotation.z = (hf > 0 && hf < 1) ? Math.cos(hf * Math.PI) * 0.35 : 0;
      });
    }
    // 鸭子：湖面上绕圈
    for (let i = 0; i < 4; i++){
      const dk = makeDuck(); F.root.add(dk);
      const r = R(0.25, 0.7), w = R(0.04, 0.08) * (i % 2 ? 1 : -1), a0 = R(0, 6.28), ph = R(0, 10);
      F.life(t => {
        const a = a0 + t * w;
        dk.position.set(lake.x + Math.cos(a) * r * lake.rx * 0.9, G + lake.level + 0.008 + Math.sin(t * 1.6 + ph) * 0.0025, lake.z + Math.sin(a) * r * lake.rz * 0.9);
        dk.rotation.y = -a - Math.sign(w) * Math.PI / 2;
      });
    }
    kit.birds(8, { center: [0.4, 0.6], r: [1.4, 2.6], y: [0.9, 1.9] });
    const spots = []; for (let i = 0; i < 14; i++) spots.push(F.findSpot(pick([-1.6, 1.2, 0.4, 2.4]) + R(-0.5, 0.5), pick([1.2, 1.0, 2.0, -1.3]) + R(-0.4, 0.4), 0.3));
    kit.butterflies(spots);

    /* ---------- 六、云、雾、萤火 ---------- */
    F.clouds({ count: 7, y: [2.5, 3.7], r: [1.2, 3.0], scale: [1.25, 1.75] });
    kit.mistLayer({ count: 80, accept: (x, z, h) => z > -0.4 && h < 1.15 && T.lakeDist(x, z) > 1.5 && T.isDry(x, z, 0) });                         // 河谷晨雾（避开水面）
    kit.mistLayer({ count: 32, accept: (x, z, h) => z < -1.0 && h > 1.6 && h < 3.7, lift: [0.15, 0.55], size: [0.8, 1.5], alpha: [0.1, 0.2] });   // 山腰云气
    for (let i = 0; i < 10; i++){ const a = R(0, 6.28), r = R(0, 0.8); F.mist(lake.x + Math.cos(a) * r * lake.rx, G + lake.level + R(0.1, 0.22), lake.z + Math.sin(a) * r * lake.rz, R(0.7, 1.1), R(0.05, 0.1)); }   // 湖面只留很薄的一层
    kit.plume(new THREE.Vector3(river.fallBase.x, river.fallBase.y + 0.06, river.fallBase.z), { count: 30 });                                       // 瀑布水雾
    const c = Math.cos(cabinAng), s = Math.sin(cabinAng);
    kit.plume(new THREE.Vector3(CABIN.x + 0.035 * c - 0.06 * s, cabinY + 0.27, CABIN.z - 0.035 * s - 0.06 * c), { count: 12, spread: [0, 0], size: [0.1, 0.2], alpha: [0.3, 0.45], rise: [0.45, 0.65], tint: 1 });   // 炊烟
    kit.fireflies({ max: 170, accept: (x, z, h) => h < 2.3 && T.isDry(x, z, 0.02) && rand() < 0.3 + forest(x, z) * 0.5 + (T.lakeDist(x, z) < 1.6 ? 0.4 : 0) });
  },
};
