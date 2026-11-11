/* ============================================================================
   方寸之境 · 第__CN__境 · __NAME__

   这是一块能直接跑起来的空白地：一座缓丘、一片草、几朵云。
   按《造境方案.md》把它改成这一境；写法和工具见技能的 references/制作与避坑.md。
   坐标：x、z 都在 [-5, 5]，镜头默认从 +x +z 方向俯看，所以高的东西放后面（z 为负），水和细节放前面。
   容器是钟罩或球时地块是圆的：重要的东西放在离中心 3.8 以内；自己写循环撒东西时用 F.inFoot(x, z) 判断在不在地块里。
   ============================================================================ */
const WORLD = {
  meta: {
    no: __NO__, name: '__NAME__',
    tagline: '',            // 一句话写这一境的气质，显示在标题下
    seed: __SEED__,         // 换一个数，随机撒的东西就换一套
    ground: -2.4,           // 地表基准高度：山高就放低（-2.8），地势平就抬高（-1.6）
    startHour: 7.2,         // 开场时辰：选这一境最好看的时刻
    look: { container: '__CONTAINER__', backdrop: '__BACKDROP__', glow: '__GLOW__' },   // 外观预设，见 制作与避坑.md 第三节。纯色背景另写 backdropColor: '#10131a'
    // title: '方寸之境',    // 想用自己的系列名就改这里
  },

  // 需要时微调这一境的天色（不需要就删掉）：k.sunrise / k.noon / k.sunset / k.night … 见 制作与避坑.md
  // sky(k){ k.noon.sky = '#d8ecff'; },

  build(F){
    const { THREE, G, R, pick, rand, C, gs, smooth, clamp, n2, fbm, ridged, kit } = F;

    /* ---------- 一、地貌：返回每个位置相对地表基准的高度 ---------- */
    const base = (x, z) => 0.5 + 0.25 * fbm(x * 0.35, z * 0.35, 4) + 1.2 * gs(x + 1.5, z + 2.0, 2.2);
    const T = F.terrain({
      base,
      // rivers: [{ points: [[x, z], ...], lake: 0 }],   // 从高到低画一条线，水位和瀑布自动算
      // lakes:  [{ x, z, rx, rz }],
      // sea:    { level: 0.3 },                         // 海面：低于它的地方全是水
      // pads:   [{ x, z, r: 0.6 }],                     // 给建筑平整一块地
    });

    /* ---------- 二、上色与水 ---------- */
    const grassA = C('#86b84c'), grassB = C('#5f9c3d'), rock = C('#8b8178'), tmp = new THREE.Color();
    F.ground({
      color(c, x, z, h, slope){
        c.copy(grassB).lerp(grassA, smooth(-0.3, 0.4, fbm(x * 0.9, z * 0.9, 3)));
        c.lerp(F.strata(h, x, z, tmp), smooth(0.34, 0.6, slope));      // 陡处露出岩层
      },
    });
    F.water();

    /* ---------- 三、植被 ---------- */
    kit.grass({
      max: 6000,
      accept: (x, z, h) => T.slopeAt(x, z) < 0.42 && T.isDry(x, z, 0.02),
      color: (x, z) => C('#6fae45').lerp(C('#a6c95a'), smooth(-0.4, 0.5, n2(x * 1.7, z * 1.7))),
    });

    /* ---------- 四、人迹（一处小建筑） ---------- */

    /* ---------- 五、生灵（这一境的主角要新做，不用 kit 里的） ---------- */

    /* ---------- 六、一奇（这一境里那件不可能、却很安静的事） ---------- */

    /* ---------- 七、云、雾、萤火 ---------- */
    F.clouds({ count: 5 });
    kit.mistLayer({ count: 40, accept: (x, z, h) => h < 1.0 && T.isDry(x, z, 0) });
  },
};
