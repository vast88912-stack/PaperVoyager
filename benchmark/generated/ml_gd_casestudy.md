# Case Study: ML_Gradient_Descent
## PaperVoyager vs Gemini 3 Pro Baseline

> **Case Study 选题理由**：本 topic 是 Gemini 基线表现**最强**的 CS 类别之一（VLM=84.0，passed=True，consistency=1.0）。即便在"基线已经很好"的场景下，PaperVoyager 仍以 **92.7 vs 84.0（+8.7）** 的差距胜出——差距来源不是对手失败，而是在 Prompt spec 规定的**每一个相同 block** 上的实现质量更高。

---

## 1. 总体评分对比

| 指标 | Gemini 3 Pro（基线） | PaperVoyager（我们的方法） | 差距 |
|------|---------------------|--------------------------|------|
| **VLM-Visual 分数** | **84.0** | **92.7** | **+8.7** |
| GPT-4.1 passed | ✅ True | ✅ True | — |
| consistency | 1.0 | 1.0 | — |
| spec_adherence（均值） | **0.883** | **0.977** | **+0.094** |
| visual_quality | 0.95 | **0.98** | +0.03 |
| interactivity | 0.87 | **0.89** | +0.02 |

两者均通过 VLM judge，一致性均为 1.0。评分差距来自 Prompt spec 定义的每个 block 在实现质量上的系统性提升。

---

## 2. Prompt Spec 定义的 6 个 Block

Prompt spec 明确规定了以下 6 个模块：

```
Modules: hero intro; function selector (bowl, saddle, Rastrigin); path overlay;
         LR slider; momentum vs Adam comparison; blindfold challenge with only gradient hints.
```

下面逐 block 对比 Gemini 和 PaperVoyager 的具体实现。

---

## Block 1：Hero Intro

**Prompt spec 要求**：hero intro（英雄区介绍，课程导入）

| | Gemini | PaperVoyager |
|-|--------|-------------|
| 实现模块 | `_landing` | `_landing` + `introduction` |
| VLM 得分 | 0.95 | 1.0 / 1.0 |

**Gemini — `_landing`（0.95）**

![gemini-landing](../results/codegen_score_v1/ML_Gradient_Descent/run_gemini3pro_001/modules/_landing/screens/step_000.png)

专业视觉设计，导航清晰，符合 hero intro 定位。作为静态首页得分 0.95，略有扣分：无交互式概念引入。

**PaperVoyager — `_landing` + `introduction`（1.0 + 1.0）**

![pv-landing](../results/codegen_score_v1/ML_Gradient_Descent/run_papervoyager_bp_001/modules/_landing/screens/step_000.png)

PaperVoyager 对 hero intro block 的实现分为两层：`_landing` 提供视觉首页（1.0），`introduction` 提供动画式概念导入（1.0）。

![pv-intro-play](../results/codegen_score_v1/ML_Gradient_Descent/run_papervoyager_bp_001/modules/introduction/screens/after_play_wait.png)

`introduction` 播放后展示梯度下降的动态轨迹动画，将静态概念转化为可视化直觉。GPT-4.1：*"Matches hero/intro spec, visually strong"* — 1.0。

---

## Block 2：Function Selector（bowl, saddle, Rastrigin）

**Prompt spec 要求**：function selector — 支持 bowl、saddle、Rastrigin 三种函数形状

| | Gemini | PaperVoyager |
|-|--------|-------------|
| 实现模块 | `the_loss_landscape_error_surfaces` | `function_explorer` |
| VLM 得分 | **0.80** | **0.90** |

**Gemini — `the_loss_landscape_error_surfaces`（0.80）**

![gemini-loss-step](../results/codegen_score_v1/ML_Gradient_Descent/run_gemini3pro_001/modules/the_loss_landscape_error_surfaces/screens/step_000.png)

误差面可视化存在，3D 渲染效果良好。但 GPT-4.1 判断：*"部分交互响应略弱（如 slider），但整体体验良好"* — 得分 0.80，是 Gemini 得分最低的非游戏模块之一。

![gemini-loss-click](../results/codegen_score_v1/ML_Gradient_Descent/run_gemini3pro_001/modules/the_loss_landscape_error_surfaces/screens/after_button_clicks.png)

点击后函数形状切换可见，但控件响应不够即时，视觉反馈深度有限。

**PaperVoyager — `function_explorer`（0.90）**

![pv-func-step](../results/codegen_score_v1/ML_Gradient_Descent/run_papervoyager_bp_001/modules/function_explorer/screens/step_000.png)

Function Explorer 首屏即展示完整的函数曲面 + 超参数控制面板。函数选择（bowl/saddle/Rastrigin）、学习率、初始点均可调节，交互响应清晰。GPT-4.1：*"Visually excellent, function selector and hyperparameter controls present"* — 得分 0.90。

![pv-func-click](../results/codegen_score_v1/ML_Gradient_Descent/run_papervoyager_bp_001/modules/function_explorer/screens/after_button_clicks.png)

切换函数后曲面即时更新，梯度路径随之重绘，交互闭环完整。

**差距分析（+0.10）**：两者均实现了函数选择功能，但 PaperVoyager 的超参数控制面板更完整，首屏内容更丰富，控件响应更直接，spec_adherence 更高。

---

## Block 3：Path Overlay（梯度路径叠加）

**Prompt spec 要求**：path overlay（在函数面上叠加优化器梯度路径）

| | Gemini | PaperVoyager |
|-|--------|-------------|
| 实现模块 | `the_descent_learning_is_sliding_downhill` | `optimizer_paths` |
| VLM 得分 | **0.90** | **0.90** |

**Gemini — `the_descent_learning_is_sliding_downhill`（0.90）**

![gemini-descent-step](../results/codegen_score_v1/ML_Gradient_Descent/run_gemini3pro_001/modules/the_descent_learning_is_sliding_downhill/screens/step_000.png)

下降动画丰富，交互有效，视觉美观。GPT-4.1：*"动画与可视化丰富，交互有效，内容与规格高度一致"* — 0.90。

![gemini-descent-play](../results/codegen_score_v1/ML_Gradient_Descent/run_gemini3pro_001/modules/the_descent_learning_is_sliding_downhill/screens/after_play_wait.png)

**PaperVoyager — `optimizer_paths`（0.90）**

![pv-paths-step](../results/codegen_score_v1/ML_Gradient_Descent/run_papervoyager_bp_001/modules/optimizer_paths/screens/step_000.png)

Optimizer Paths 同样展示路径叠加，可视化效果与 Gemini 相当。GPT-4.1：*"Path overlay and optimizer comparison present, animation and controls work"* — 0.90。

**结论**：此 block 两者持平（均 0.90），Gemini 单次生成在 path overlay 上的实现质量与 PaperVoyager 相当。

---

## Block 4：LR Slider（学习率滑块）

**Prompt spec 要求**：LR slider（学习率调节，展示 overshooting 效果）

| | Gemini | PaperVoyager |
|-|--------|-------------|
| 实现模块 | `steps_learning_rate_overshooting` | `learning_rate` |
| VLM 得分 | **0.85** | **0.90** |

**Gemini — `steps_learning_rate_overshooting`（0.85）**

![gemini-lr-step](../results/codegen_score_v1/ML_Gradient_Descent/run_gemini3pro_001/modules/steps_learning_rate_overshooting/screens/step_000.png)

学习率调节可用，overshooting 动画存在，整体功能完整。GPT-4.1：*"交互和动画均有明显响应，视觉效果佳，功能完整"* — 0.85。

![gemini-lr-play](../results/codegen_score_v1/ML_Gradient_Descent/run_gemini3pro_001/modules/steps_learning_rate_overshooting/screens/after_play_wait.png)

**PaperVoyager — `learning_rate`（0.90）**

![pv-lr-step](../results/codegen_score_v1/ML_Gradient_Descent/run_papervoyager_bp_001/modules/learning_rate/screens/step_000.png)

Learning Rate 模块首屏即展示滑块 + 实时路径可视化，参数与轨迹联动清晰。GPT-4.1：*"Learning rate slider and visualization present"* — 0.90。

![pv-lr-click](../results/codegen_score_v1/ML_Gradient_Descent/run_papervoyager_bp_001/modules/learning_rate/screens/after_button_clicks.png)

**差距分析（+0.05）**：两者均实现了 LR slider 功能，PaperVoyager 得分略高（0.90 vs 0.85），主要体现在首屏内容更丰富、轨迹与参数的视觉联动更清晰。

---

## Block 5：Momentum vs Adam Comparison（优化器对比）

**Prompt spec 要求**：momentum vs Adam comparison（明确对比 Momentum 和 Adam 两种优化器）

| | Gemini | PaperVoyager |
|-|--------|-------------|
| 实现模块 | `optimizers_momentum_vs_sgd` | `momentum_vs_adam` |
| VLM 得分 | **0.90** | **1.0** |
| spec 覆盖 | ⚠️ Momentum + SGD（**缺 Adam**） | ✅ Momentum + **Adam** |

**Gemini — `optimizers_momentum_vs_sgd`（0.90）**

![gemini-opt-step](../results/codegen_score_v1/ML_Gradient_Descent/run_gemini3pro_001/modules/optimizers_momentum_vs_sgd/screens/step_000.png)

对比动画流畅，参数调节可用，视觉效果优秀，得分 0.90。但 **Prompt spec 明确要求 "momentum vs Adam"，Gemini 将其实现为 "Momentum vs SGD"，Adam 优化器完全缺失**。

GPT-4.1 judge 在三次评估中均注意到此问题：
> *"未见 Adam 优化器的显式对比，仅有 Momentum vs SGD，spec 覆盖略有缺失"*

![gemini-opt-play](../results/codegen_score_v1/ML_Gradient_Descent/run_gemini3pro_001/modules/optimizers_momentum_vs_sgd/screens/after_play_wait.png)

动画展示了两条路径（Momentum 和 SGD），spec 要求的第三条 Adam 路径从未出现。

**PaperVoyager — `momentum_vs_adam`（1.0）**

![pv-adam-step](../results/codegen_score_v1/ML_Gradient_Descent/run_papervoyager_bp_001/modules/momentum_vs_adam/screens/step_000.png)

PaperVoyager 严格按照 spec 实现了 **Momentum vs Adam** 的对比。两种优化器的路径以不同颜色叠加，参数面板可独立调节各优化器的超参数。

![pv-adam-play](../results/codegen_score_v1/ML_Gradient_Descent/run_papervoyager_bp_001/modules/momentum_vs_adam/screens/after_play_wait.png)

动画播放后两条路径清晰可见，Adam 的自适应学习率优势在 Rastrigin 函数上直观体现。GPT-4.1：*"Distinct visual, clear comparison, interactive controls and animation work as expected"* — **1.0**。

**差距分析（+0.10）**：Gemini 在 monolithic 生成中将 Adam 替换为 SGD（更简单实现），导致 spec_adherence 明显下降。PaperVoyager 的 Block Pipeline 使每个 block 单独聚焦规格，Adam 的实现有完整的生成上下文，不存在被简化的压力。

---

## Block 6：Blindfold Challenge（遮眼挑战）

**Prompt spec 要求**：blindfold challenge with only gradient hints（只给梯度方向提示的盲调参挑战）

| | Gemini | PaperVoyager |
|-|--------|-------------|
| 实现模块 | `blind_climber_find_the_min` | `blindfold_challenge` |
| VLM 得分 | **0.80** | **1.0** |
| 初始渲染 | ⚠️ 空白（需操作触发） | ✅ 立即渲染 |

**Gemini — `blind_climber_find_the_min`（0.80）**

![gemini-blind-step](../results/codegen_score_v1/ML_Gradient_Descent/run_gemini3pro_001/modules/blind_climber_find_the_min/screens/step_000.png)

**初始进入时画布完全空白**——Playwright 截图捕获到的是 canvas 尚未完成异步初始化的状态。GPT-4.1：*"初始空白，需操作后才有内容，交互和动画丰富但初始体验略弱"*

![gemini-blind-click](../results/codegen_score_v1/ML_Gradient_Descent/run_gemini3pro_001/modules/blind_climber_find_the_min/screens/after_button_clicks.png)

点击后内容出现，功能本身可用（梯度提示 + 参数调节），但初始空白直接影响 VLM 对"首屏可用性"的评分。得分 0.80。

**PaperVoyager — `blindfold_challenge`（1.0）**

![pv-blind-step](../results/codegen_score_v1/ML_Gradient_Descent/run_papervoyager_bp_001/modules/blindfold_challenge/screens/step_000.png)

首屏立即渲染完整内容：损失面被遮罩隐藏，仅显示梯度方向箭头，用户需根据梯度提示调节参数找到最小值。完全符合 spec 的 "only gradient hints" 设计。

![pv-blind-click](../results/codegen_score_v1/ML_Gradient_Descent/run_papervoyager_bp_001/modules/blindfold_challenge/screens/after_button_clicks.png)

交互触发后 loss 值和梯度反馈即时更新，用户操作与视觉反馈形成完整闭环。GPT-4.1：*"Unique challenge, interactive, loss/gradient feedback, clear visual updates after actions"* — **1.0**。

**差距分析（+0.20）**：这是本 topic 中**差距最大的单个 block**（0.80 vs 1.0，+0.20）。根因是 Gemini 的异步 canvas 初始化在 Playwright 截图时尚未完成，而 PaperVoyager 的 block 独立生成策略使每个 block 有充足的生成预算来正确处理初始渲染逻辑。

---

## 3. 逐 Block 得分汇总

| Spec Block | Gemini 实现（得分） | PaperVoyager 实现（得分） | 差距 |
|-----------|------------------|--------------------------|------|
| Hero Intro | `_landing` (0.95) | `_landing` + `introduction` (1.0) | +0.05 |
| Function Selector | `loss_landscape` (0.80) | `function_explorer` (0.90) | **+0.10** |
| Path Overlay | `the_descent` (0.90) | `optimizer_paths` (0.90) | 0（持平） |
| LR Slider | `learning_rate_steps` (0.85) | `learning_rate` (0.90) | +0.05 |
| Momentum vs Adam | `momentum_vs_sgd` ⚠️ (0.90) | `momentum_vs_adam` ✅ (1.0) | **+0.10** |
| Blindfold Challenge | `blind_climber` ⚠️ (0.80) | `blindfold_challenge` ✅ (1.0) | **+0.20** |
| **整体均值** | **0.867** | **0.950** | **+0.083** |

Path Overlay 两者持平（均 0.90），其余 5 个 block PaperVoyager 均胜出或持平。

---

## 4. 优势来源分析

### 4.1 规格遗漏：Adam 优化器

Gemini 在 monolithic 单次生成（~10k 行 TSX）时，"momentum vs Adam comparison" block 在生成过程中被简化为更易实现的 "Momentum vs SGD"。这是一个典型的**生成压缩现象**：当单次 prompt 需要同时覆盖 6 个交互丰富的模块时，模型倾向于在局部简化复杂要求。

PaperVoyager 的 Block Pipeline 将"optimizer comparison"作为**独立 block** 生成，生成时 prompt 仅关注"实现 Momentum vs Adam 对比"，规格需求聚焦，Adam 的实现有完整的 token 预算，不存在被压缩的风险。

### 4.2 初始渲染：异步 canvas 竞争条件

Gemini 的 Blindfold Challenge 出现初始空白（0.80），根本原因是 canvas 初始化通过 `useEffect` + `requestAnimationFrame` 异步调度，Playwright 截图时渲染循环尚未启动。

PaperVoyager 的 block 独立生成使每个 block 的渲染逻辑足够简单，能够在首次挂载时完成同步初始状态绘制，消除了竞争条件。

### 4.3 spec_adherence 的量化差距

| Trial | Gemini spec_adherence | PaperVoyager spec_adherence |
|-------|-----------------------|-----------------------------|
| 0 | 0.95 | 0.95 |
| 1 | 0.85 | **0.98** |
| 2 | 0.85 | **1.00** |
| **均值** | **0.883** | **0.977** |

PaperVoyager 在规格对齐上系统性高出 +0.094，在 GPT-4.1 judge 三次中有 2 次达到 0.98–1.0，反映了 Block Pipeline 对规格覆盖的精准把控。

---

## 5. 结论

ML_Gradient_Descent 案例展示了一个重要命题：**即使 Gemini 单次生成已达到较高质量（84.0），PaperVoyager 仍能在相同 spec 定义的每个 block 上系统性地提升质量（92.7）**。

差距来源清晰可量化：
- **Block 5（Optimizer 对比）+0.10**：Gemini 遗漏了 Adam，PaperVoyager 严格实现了 spec 要求的 Momentum vs Adam
- **Block 6（Blindfold Challenge）+0.20**：Gemini 初始空白（异步渲染竞争），PaperVoyager 首屏立即可用
- **Block 2（Function Selector）+0.10**：PaperVoyager 超参控制面板更完整，首屏内容更丰富
- **Block 3（Path Overlay）0**：两者持平，证明 Gemini 在某些 block 上本身已达到竞争力水平

这表明 PaperVoyager 的优势是结构性的：通过将复杂应用分解为独立 block 分别生成，每个 block 获得更充分的生成资源和更精准的规格对齐，从而在多个维度上稳定超越单次 monolithic 生成。
