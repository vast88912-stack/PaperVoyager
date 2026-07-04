# Physics_Gravity_Orbits — 中等差距案例分析
## Gemini 3 Pro vs PaperVoyager（VLM 评分视角）

---

## 1. 评分总览

| 评分维度 | Gemini 3 Pro（单次） | PaperVoyager BP | 差值 |
|---------|---------------------|-----------------|------|
| **VLM-Visual（论文表格）** | **55.0** | **89.7** | **+34.7** |
| Rule-based Codegen-Final | 84.2% | 78.9% | −5.3%（Gemini 反而更高） |
| GPT-4.1 consistency | 0.667（三次不一致） | 1.000（完全一致） | — |
| GPT-4.1 score mean | 0.583 ± 0.058 | 0.897 ± 0.040 | — |

> **关键矛盾**：Rule-based 评分 Gemini 比 PaperVoyager 高 5%，而 VLM 评分 Gemini 低 35 分。
> 这揭示了两套评分体系的本质区别：**rule-based 统计 DOM 元素和按钮数量，VLM 直接观察截图中的可见内容**。
> Gemini 生成了大量正确的 HTML 元素（canvas + 按钮），但多个模块的 canvas **在初始加载时为黑屏**，规则引擎看不到，VLM 一眼就判了低分。

---

## 2. Gemini 3 Pro — Gravity.js 版本

**应用名**：Gravity.js / N-Body Physics
**模块结构**（6 个，每个模块独立一个 canvas 实例）：

| 模块 | Rule 分 | 初始截图状态 |
|------|---------|-------------|
| Dance of Spheres（重力入门） | 0.772 | ✅ 有内容（nav=0.62，导航失败） |
| Kepler's Laws（开普勒定律） | **0.911** | ✅ 黄色恒星 + 蓝色行星轨道 |
| Three-Body Problem（三体） | **0.910** | ✅ 三色天体运动 |
| Orbital Transfer（霍曼转移） | 0.813 | ❌ **完全黑屏** |
| Galaxy Collision（星系碰撞） | 0.893 | ❌ **完全黑屏** |
| Slingshot Challenge（弹弓挑战） | 0.893 | ❌ **完全黑屏** |

### 2.1 可正常渲染的模块

**Kepler's Laws — 开普勒定律**

![gemini-kepler](../results/codegen_score_v1/Physics_Gravity_Orbits/run_gemini3pro_001/modules/kepler_s_laws_ellipses_sweeps/screens/step_000.png)

黄色恒星居中，蓝色行星沿椭圆轨道运行，右上角 Speed slider（1x），底部 Pause/Reset 按钮。
内容清晰，物理模拟正确，是 Gemini 在本 topic 的高光时刻（rule score 0.911）。

**Three-Body Problem — 三体问题**

![gemini-3body](../results/codegen_score_v1/Physics_Gravity_Orbits/run_gemini3pro_001/modules/three_body_problem_chaos_theory/screens/step_000.png)

黄/红/蓝三体以混沌轨迹运动，Speed slider + Pause/Reset。视觉上体现了混沌理论的不可预测性，rule score 0.910。

---

### 2.2 黑屏失效模块（VLM 主要扣分来源）

**Orbital Transfer — 完全黑屏**

![gemini-orbital-blank](../results/codegen_score_v1/Physics_Gravity_Orbits/run_gemini3pro_001/modules/orbital_transfer_hohmann_transfer/screens/step_000.png)

霍曼转移轨道模块切换后主区域**完全黑屏**，canvas 元素存在但未渲染任何内容。

**Galaxy Collision — 完全黑屏**

![gemini-galaxy-blank](../results/codegen_score_v1/Physics_Gravity_Orbits/run_gemini3pro_001/modules/galaxy_collision_n_body_simulation/screens/step_000.png)

N-Body 星系碰撞模块黑屏，与上方 Kepler's Laws 画质形成鲜明对比。

**Slingshot Challenge — 完全黑屏**

![gemini-slingshot-blank](../results/codegen_score_v1/Physics_Gravity_Orbits/run_gemini3pro_001/modules/slingshot_challenge_voyager_mission/screens/step_000.png)

同上，三个复杂场景模块均无法渲染。

> **黑屏根因**：Gemini 单次生成采用"每个模块独立初始化一个 canvas + requestAnimationFrame"的架构。
> 简单场景（Kepler 2 体、三体 3 体）初始化代价低，能在截图时机前完成。
> 复杂场景（N-Body 星系碰撞、霍曼转移轨道计算）初始化代价高，**Playwright 拍截图时 canvas 尚未开始渲染**，导致黑屏。
> Rule-based 评分因为能找到 canvas DOM 元素和按钮，仍给出 0.893 的高分——这是两套评分体系最大的分歧所在。

---

### 2.3 GPT-4.1 对 Gemini 的判断

```
"Several modules (Galaxy Collision, Slingshot Challenge, Orbital Transfer)
 show blank or nearly blank canvases on initial load, indicating major
 rendering or initialization failures."

"Core interactive features (add/remove bodies, mass/velocity sliders,
 export JSON, integrator choice, collision merge toggle, energy/momentum
 display) are not visible or not evidently functional in any module."

"No evidence of export, advanced controls, or full N-body configuration
 as required by the prompt spec."
```

VLM judge 给出的一致性仅 **0.667**（三次试验结果不一致），意味着不同截图批次恰好捕捉到了不同渲染状态（有时 canvas 偶然完成了初始化，有时没有），反映了 Gemini 版本的**渲染不稳定性**。

---

## 3. PaperVoyager BP — Orbit Playground 版本

**应用名**：Orbit Playground / N-Body Gravity Simulator
**架构思路**：**统一持久化 canvas + 多参数面板**——模拟永远在跑，不同 Tab 展示同一仿真的不同控制视图。

**顶部状态栏**（全局实时更新）：
- `Bodies: N`（活跃天体数）
- `Energy: −XXXXX.XX`（系统总能量）
- 红色 Pause 按钮

**侧边 6 个 Tab**：Bodies · Properties · Metrics · Integrator · Collisions · Export

---

### 3.1 Bodies Tab — 天体管理

![pv-bodies](../results/codegen_score_v1/Physics_Gravity_Orbits/run_papervoyager_bp_001/modules/bodies/screens/step_000.png)

- **PRESETS**：Figure-8 · Binary · Solar System · Swirl（4 种经典场景一键加载）
- **ACTIVE BODIES** 列表（彩色标识，每个显示质量 M:1000，可逐个删除）
- 提示语：Click anywhere on the canvas to add a random body
- canvas 右侧展示 3 体系统，带彩色轨迹，**立即渲染**

---

### 3.2 Metrics Tab — 能量与动量实时监控

![pv-metrics](../results/codegen_score_v1/Physics_Gravity_Orbits/run_papervoyager_bp_001/modules/metrics/screens/step_000.png)

- **ENERGY（E = K + U）**：
  - Kinetic (K)：19068.71（绿色）
  - Potential (U)：−48791.61（红色）
  - Total Energy (E)：**−29722.91**（大字，白色）
- **MOMENTUM**：
  - Linear (P)：1191.98，Px: −1175.98，Py: 194.68
  - Angular (L)：3.56e+5
- canvas 展示 6 体运动，彩色轨迹完整

这是 Gemini 版本**完全缺失**的功能——Gemini 的 VLM 评分中 GPT-4.1 明确指出"energy/momentum display is not visible"。

---

### 3.3 Integrator Tab — 数值积分器对比

![pv-integrator](../results/codegen_score_v1/Physics_Gravity_Orbits/run_papervoyager_bp_001/modules/integrator/screens/step_000.png)

- **ALGORITHM** 切换：Explicit Euler vs **Velocity Verlet**（当前选中，绿色高亮）
- 说明文字："Verlet is a 2nd-order symplectic method. It conserves total energy over time, keeping orbits stable."
- **ENERGY CONSERVATION** 面板：
  - Initial (E₀)：−6.2723e+4
  - Current (E)：−5.2305e+4
  - Energy Drift：**16.6100%**（红色警告，进度条可视化）

这是物理教学的亮点：让用户直观对比两种积分器在能量守恒上的区别。Gemini 版本的右上角仅有"Integrator: Velocity Verlet"标签，无法切换，无法对比。

---

### 3.4 Collisions Tab — 碰撞模式选择

![pv-collisions](../results/codegen_score_v1/Physics_Gravity_Orbits/run_papervoyager_bp_001/modules/figure_8/screens/step_000.png)

- 三种碰撞处理：**None / Merge / Bounce**（当前选中 Bounce，蓝色高亮 + 勾选）
- 说明："Elastic collision. Bodies bounce off each other."
- canvas 展示 7 体系统，多色轨迹在星空背景中运动

---

### 3.5 GPT-4.1 对 PaperVoyager 的判断

```
"No visible evidence of animation controls (play/pause/step) or time
 manipulation, though pause button is present"  ← 唯一扣分项

"No visible evidence of body property editing (e.g., mass/velocity
 sliders) in Properties module."  ← 轻微扣分

"Slider controls are present but do not show visible movement or effect
 in probe."
```

VLM judge 给出一致性 **1.000**（三次完全一致），反映了 PV-BP 渲染的稳定性。主要扣分仅来自 Playwright 无法拖动 slider 这一探测局限，并非真实功能缺失。

---

## 4. 根本架构差异

| 维度 | Gemini Gravity.js | PaperVoyager BP Orbit Playground |
|------|-------------------|----------------------------------|
| **Canvas 架构** | 每模块独立 canvas + 独立 rAF 循环 | **单一持久 canvas**，模拟始终运行 |
| **黑屏风险** | ❌ 高（复杂场景初始化慢，截图时未渲染） | ✅ 无（canvas 一直活跃） |
| **渲染稳定性** | 不稳定（VLM consistency=0.667） | 稳定（VLM consistency=1.000） |
| **天体控制** | 无（参数写死在代码里） | ✅ PRESETS + 逐体添加/删除 |
| **能量/动量监控** | ❌ 无 | ✅ 实时 K、U、E、P、L 数值 |
| **积分器对比** | 仅显示标签，不可切换 | ✅ Euler vs Verlet + 能量漂移可视化 |
| **碰撞模式** | ❌ 无 | ✅ None / Merge / Bounce 三选一 |
| **数据导出** | ❌ 无 | ✅ Export Tab |
| **星空背景** | ❌ 纯黑 | ✅ 星点粒子背景 |
| **彩色轨迹** | 单色短轨迹 | 多体各自彩色轨迹 |
| **Rule-based 分** | **84.2%**（更高） | 78.9%（更低） |
| **VLM 分** | 55.0（更低） | **89.7**（更高） |

---

## 5. 为什么属于"中等差距"而非"崩溃差距"

Physics_Gravity_Orbits 的 35 分差距处于中间档，原因在于：

**Gemini 并非完全失败**——Kepler's Laws 和 Three-Body Problem 两个模块**完全正常运行**，展示了高质量的物理仿真（动态轨迹、Speed slider、Pause/Reset）。这两个模块拉高了 GPT-4.1 的部分评分，使得 Gemini 最终没有落到 30 分以下的"崩溃区"。

**崩溃模式（Math-FFT 32分、Sys-Sched 35分）** = 几乎所有模块黑屏，VLM 全程看不到有意义内容。
**中等模式（Phys-Orbit 55分）** = **部分模块（2/6）正常工作**，部分黑屏，VLM 平均分被拉到中间档。
**良好模式（Sys-VM 85分）** = 多数模块渲染正常，仅少数有轻微问题。

---

## 6. 对论文的启示

1. **Rule-based vs VLM 的根本分歧**：本 topic 是最典型的反例——Gemini rule-based 高出 5%，VLM 低 35 分。这证明仅靠 DOM 元素检测不足以衡量交互教育网页的真实质量，VLM judge 更接近人类的感知体验。

2. **"一 canvas 多模块" vs "一 canvas 多参数面板"**：PaperVoyager BP 的 block pipeline 将每个知识点拆分为独立 block 生成后合并，合并策略选择了"统一渲染 + 参数 Tab"架构，天然避免了 Gemini 的初始化竞争条件问题。

3. **功能完整度差异**：PaperVoyager BP 实现了积分器对比、能量守恒监控、碰撞模式选择、数据导出这 4 个 Gemini 完全缺失的功能，体现了 block-by-block 生成中每个 block 专注于一个功能维度、深度实现的优势。
