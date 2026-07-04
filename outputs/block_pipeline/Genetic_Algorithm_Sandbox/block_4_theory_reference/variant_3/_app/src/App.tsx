import React, { useState, useEffect } from 'react';

// --- Icons ---
const DnaIcon = ({ className = "w-6 h-6" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 15c6.667-6 13.333 0 20-6" />
    <path d="M9 22c1.798-1.998 2.518-3.995 2.807-5.993" />
    <path d="M15 2c-1.798 1.998-2.518 3.995-2.807 5.993" />
    <path d="m17 6-2.5-2.5" />
    <path d="m14 8-1-1" />
    <path d="m7 18 2.5 2.5" />
    <path d="m3.5 14.5.5.5" />
    <path d="m20 9 .5.5" />
    <path d="m6.5 12.5 1 1" />
    <path d="m16.5 10.5 1 1" />
    <path d="m10 16 1.5 1.5" />
  </svg>
);

const LeafIcon = ({ className = "w-6 h-6" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
    <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
  </svg>
);

const GitMergeIcon = ({ className = "w-6 h-6" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="18" cy="18" r="3" />
    <circle cx="6" cy="6" r="3" />
    <path d="M6 21V9a9 9 0 0 0 9 9" />
  </svg>
);

const ZapIcon = ({ className = "w-6 h-6" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z" />
  </svg>
);

const TargetIcon = ({ className = "w-6 h-6" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="2" />
  </svg>
);

const CodeIcon = ({ className = "w-6 h-6" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="16 18 22 12 16 6" />
    <polyline points="8 6 2 12 8 18" />
  </svg>
);

// --- Content Data ---
const THEORY_TOPICS = [
  {
    id: 'overview',
    title: 'The Evolutionary Cycle',
    icon: LeafIcon,
    description: 'Genetic Algorithms (GAs) are search heuristics inspired by Charles Darwin\'s theory of natural evolution. They reflect the process of natural selection where the fittest individuals are selected for reproduction to produce offspring of the next generation.',
    details: [
      {
        subtitle: 'Biological Analogy',
        text: 'In nature, environmental pressures eliminate the weak, while the strong survive to pass on their beneficial traits. GAs simulate this by evolving an array of data structures (the population) toward better solutions.'
      },
      {
        subtitle: 'The 5 Phases',
        text: '1. Initial Population\n2. Fitness Function\n3. Selection\n4. Crossover (Recombination)\n5. Mutation'
      }
    ],
    code: {
      label: 'Main Algorithm Loop',
      language: 'javascript',
      snippet: `function runGeneticAlgorithm(popSize, maxGens) {
  let population = initializePopulation(popSize);
  
  for (let gen = 0; gen < maxGens; gen++) {
    // 1. Evaluate fitness for all individuals
    population.forEach(ind => ind.fitness = evaluate(ind));
    
    // 2. Sort to find the best (elitism)
    population.sort((a, b) => b.fitness - a.fitness);
    let newPopulation = [population[0]]; // Keep the best
    
    // 3. Evolve the rest of the generation
    while (newPopulation.length < popSize) {
      let parentA = select(population);
      let parentB = select(population);
      
      let child = crossover(parentA, parentB);
      child = mutate(child);
      
      newPopulation.push(child);
    }
    population = newPopulation;
  }
  return population[0]; // Return best solution
}`
    }
  },
  {
    id: 'selection',
    title: 'Selection Mechanisms',
    icon: TargetIcon,
    description: 'Selection is the process of choosing the fittest individuals from a population to serve as parents for the next generation. It dictates how strong the evolutionary pressure is.',
    details: [
      {
        subtitle: 'Roulette Wheel Selection',
        text: 'Parents are selected with a probability proportional to their fitness. Like a roulette wheel where the slots are sized according to fitness. Good for general variance but suffers from premature convergence if one individual dominates.'
      },
      {
        subtitle: 'Tournament Selection',
        text: 'A random subset of individuals is chosen, and the best among them becomes a parent. It is computationally efficient and provides an adjustable selection pressure (via tournament size).'
      }
    ],
    code: {
      label: 'Tournament Selection',
      language: 'javascript',
      snippet: `function tournamentSelection(population, tournamentSize = 3) {
  let best = null;
  for (let i = 0; i < tournamentSize; i++) {
    // Pick a random individual
    const randomIndex = Math.floor(Math.random() * population.length);
    const candidate = population[randomIndex];
    
    // Keep the one with highest fitness
    if (!best || candidate.fitness > best.fitness) {
      best = candidate;
    }
  }
  return best;
}`
    }
  },
  {
    id: 'crossover',
    title: 'Crossover (Recombination)',
    icon: GitMergeIcon,
    description: 'Crossover mimics biological mating, combining the genetic information of two parents to generate new offspring. The goal is to combine the good traits of both parents.',
    details: [
      {
        subtitle: 'Single-Point Crossover (Knapsack/Binary)',
        text: 'A random point on the genetic sequence is chosen. Genes before the point come from Parent A, and genes after the point come from Parent B.'
      },
      {
        subtitle: 'Order Crossover - OX1 (TSP)',
        text: 'Used for permutation-based problems like the Travelling Salesman where duplicates are not allowed. It copies a sub-segment from Parent A and fills the rest in the order they appear in Parent B.'
      }
    ],
    code: {
      label: 'Single-Point Crossover',
      language: 'javascript',
      snippet: `function singlePointCrossover(parentA, parentB) {
  const crossoverPoint = Math.floor(Math.random() * parentA.genes.length);
  const childGenes = [];
  
  for (let i = 0; i < parentA.genes.length; i++) {
    if (i < crossoverPoint) {
      childGenes.push(parentA.genes[i]);
    } else {
      childGenes.push(parentB.genes[i]);
    }
  }
  
  return { genes: childGenes };
}`
    }
  },
  {
    id: 'mutation',
    title: 'Mutation Strategies',
    icon: ZapIcon,
    description: 'Mutation introduces random variations into the population. It is crucial for maintaining genetic diversity and preventing the algorithm from getting stuck in local optima.',
    details: [
      {
        subtitle: 'Bit-Flip Mutation',
        text: 'Used in binary string representations. Iterates through the genes and flips a bit (0 to 1, or 1 to 0) based on a small mutation probability.'
      },
      {
        subtitle: 'Swap Mutation',
        text: 'Used in permutation problems (like TSP). Two random positions in the genome are chosen, and their values are swapped.'
      }
    ],
    code: {
      label: 'Swap Mutation',
      language: 'javascript',
      snippet: `function swapMutation(individual, mutationRate) {
  // Only mutate if probability hits
  if (Math.random() > mutationRate) return individual;
  
  const genes = [...individual.genes];
  const idx1 = Math.floor(Math.random() * genes.length);
  const idx2 = Math.floor(Math.random() * genes.length);
  
  // Swap the genes at idx1 and idx2
  const temp = genes[idx1];
  genes[idx1] = genes[idx2];
  genes[idx2] = temp;
  
  return { genes };
}`
    }
  },
  {
    id: 'problems',
    title: 'Optimization Problems',
    icon: DnaIcon,
    description: 'Genetic Algorithms can be mapped to a wide variety of optimization problems by changing how the "genes" are encoded and how the "fitness" is calculated.',
    details: [
      {
        subtitle: '0/1 Knapsack Problem',
        text: 'Encoding: Binary string (1 = include item, 0 = exclude).\nFitness: Sum of included item values. If total weight exceeds capacity, fitness is heavily penalized or set to 0.'
      },
      {
        subtitle: 'Travelling Salesman Problem (TSP)',
        text: 'Encoding: Permutation of city indices (e.g., [3, 1, 4, 2]).\nFitness: 1 / (Total distance of the route). Shorter routes yield higher fitness scores.'
      },
      {
        subtitle: 'Function Maximization',
        text: 'Encoding: Real-valued numbers or binary strings converted to floats.\nFitness: The output value of the mathematical function f(x, y) being optimized.'
      }
    ],
    code: {
      label: 'Knapsack Fitness Evaluation',
      language: 'javascript',
      snippet: `function evaluateKnapsack(individual, items, maxWeight) {
  let totalWeight = 0;
  let totalValue = 0;
  
  for (let i = 0; i < individual.genes.length; i++) {
    if (individual.genes[i] === 1) {
      totalWeight += items[i].weight;
      totalValue += items[i].value;
    }
  }
  
  // Penalize if overweight
  if (totalWeight > maxWeight) {
    return 0; // Or a heavily reduced value
  }
  return totalValue;
}`
    }
  }
];


// --- Components ---

const CodeBlock = ({ label, code, language }) => {
  return (
    <div className="rounded-lg overflow-hidden border border-emerald-800/50 bg-[#0d1117] shadow-xl shadow-emerald-900/10 mt-6">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900/80 border-b border-emerald-900/50">
        <div className="flex items-center space-x-2 text-emerald-400 text-xs font-mono uppercase tracking-wider">
          <CodeIcon className="w-4 h-4" />
          <span>{label}</span>
        </div>
        <div className="text-slate-500 text-xs font-mono lowercase">{language}</div>
      </div>
      <div className="p-4 overflow-x-auto text-sm font-mono text-emerald-100/90 leading-relaxed">
        <pre className="whitespace-pre">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
};

const CycleDiagram = () => {
  const steps = ['Initialize', 'Evaluate', 'Select', 'Crossover', 'Mutate'];
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % steps.length);
    }, 2500);
    return () => clearInterval(timer);
  }, [steps.length]);

  return (
    <div className="relative w-full aspect-square max-w-[280px] mx-auto my-8 flex items-center justify-center">
      {/* Central DNA / Nucleus */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-24 h-24 rounded-full bg-emerald-900/30 border border-emerald-500/30 flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.2)]">
          <DnaIcon className="w-10 h-10 text-emerald-400 opacity-80" />
        </div>
      </div>

      {/* Orbiting Steps */}
      {steps.map((step, index) => {
        const angle = (index / steps.length) * Math.PI * 2 - Math.PI / 2;
        const radius = 110; // Distance from center
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        const isActive = activeStep === index;

        return (
          <div
            key={step}
            className={`absolute flex flex-col items-center justify-center transition-all duration-500`}
            style={{
              transform: `translate(${x}px, ${y}px)`,
              opacity: isActive ? 1 : 0.4,
              scale: isActive ? 1.1 : 0.9,
            }}
          >
            <div className={`w-3 h-3 rounded-full mb-2 shadow-lg transition-colors duration-300 ${isActive ? 'bg-emerald-400 shadow-emerald-400/50' : 'bg-slate-600'}`} />
            <span className={`text-xs font-semibold tracking-wider uppercase transition-colors duration-300 ${isActive ? 'text-emerald-300' : 'text-slate-500'}`}>
              {step}
            </span>
          </div>
        );
      })}
      
      {/* Connecting Ring */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: -1 }}>
         <circle cx="50%" cy="50%" r="110" fill="none" stroke="rgba(16, 185, 129, 0.15)" strokeWidth="1" strokeDasharray="4 4" />
      </svg>
    </div>
  );
};

export default function App() {
  const [activeTopicId, setActiveTopicId] = useState(THEORY_TOPICS[0].id);
  const activeTopic = THEORY_TOPICS.find(t => t.id === activeTopicId);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 font-sans flex flex-col selection:bg-emerald-900/50 selection:text-emerald-200">
      
      {/* Header */}
      <header className="relative z-10 border-b border-emerald-900/40 bg-slate-950/80 backdrop-blur-md px-6 py-5 flex items-center justify-between shadow-md shadow-emerald-950/20">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-emerald-900/30 rounded-lg border border-emerald-500/20">
            <DnaIcon className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400 tracking-tight">
              Genetic Algorithm Sandbox
            </h1>
            <p className="text-xs font-medium text-emerald-600/80 uppercase tracking-widest mt-0.5">
              Theory & Reference Guide
            </p>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex flex-1 overflow-hidden relative">
        
        {/* Decorative Background Elements */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-900/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[40%] bg-cyan-900/10 rounded-full blur-[100px] pointer-events-none" />

        {/* Sidebar Navigation */}
        <aside className="w-80 border-r border-emerald-900/30 bg-slate-900/30 backdrop-blur-sm z-10 flex flex-col h-full overflow-y-auto custom-scrollbar">
          <div className="p-6">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Core Concepts</h2>
            <nav className="space-y-2">
              {THEORY_TOPICS.map((topic) => {
                const Icon = topic.icon;
                const isActive = activeTopicId === topic.id;
                return (
                  <button
                    key={topic.id}
                    onClick={() => setActiveTopicId(topic.id)}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-300 text-left group
                      ${isActive 
                        ? 'bg-emerald-900/40 border border-emerald-500/30 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.1)]' 
                        : 'border border-transparent text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 hover:border-slate-700'
                      }`}
                  >
                    <Icon className={`w-5 h-5 transition-colors duration-300 ${isActive ? 'text-emerald-400' : 'text-slate-500 group-hover:text-emerald-500/70'}`} />
                    <span className="font-medium text-sm">{topic.title}</span>
                  </button>
                );
              })}
            </nav>
          </div>
          
          <div className="mt-auto p-6 border-t border-emerald-900/20 bg-emerald-950/10">
            <div className="flex items-center space-x-3 text-emerald-500/60 mb-2">
              <LeafIcon className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-widest">Bio-Inspired Computing</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Algorithms modeled after natural evolution, adapting and optimizing solutions across vast search spaces.
            </p>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-8 lg:p-12 z-10 custom-scrollbar relative">
          <div className="max-w-4xl mx-auto">
            
            {/* Header / Title */}
            <div className="mb-10 animate-fade-in-up">
              <div className="flex items-center space-x-4 mb-4">
                <div className="p-3 bg-slate-900 rounded-2xl border border-emerald-500/20 shadow-inner">
                  {activeTopic && <activeTopic.icon className="w-8 h-8 text-emerald-400" />}
                </div>
                <h2 className="text-3xl font-bold text-slate-100 tracking-tight">
                  {activeTopic?.title}
                </h2>
              </div>
              <p className="text-lg text-slate-400 leading-relaxed max-w-3xl">
                {activeTopic?.description}
              </p>
            </div>

            {/* Split Content: Details & Visual/Code */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
              
              {/* Left Column: Text Details */}
              <div className="space-y-8">
                {activeTopic?.details.map((detail, idx) => (
                  <div key={idx} className="relative pl-6 before:absolute before:left-0 before:top-2 before:w-1 before:h-full before:bg-gradient-to-b before:from-emerald-500 before:to-transparent before:rounded-full">
                    <h3 className="text-md font-semibold text-emerald-300 mb-2 tracking-wide uppercase text-sm">
                      {detail.subtitle}
                    </h3>
                    <p className="text-slate-300 text-sm leading-loose whitespace-pre-wrap">
                      {detail.text}
                    </p>
                  </div>
                ))}

                {/* Specific UI for 'overview' */}
                {activeTopicId === 'overview' && (
                  <div className="mt-8 p-6 bg-emerald-950/20 border border-emerald-900/30 rounded-xl">
                    <h3 className="text-emerald-400 text-sm font-semibold uppercase tracking-wider mb-2">Did you know?</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      GAs don't guarantee the absolute perfect solution (global optimum). Instead, they are excellent at finding "good enough" solutions extremely quickly in complex environments where calculating every possibility would take millennia.
                    </p>
                  </div>
                )}
              </div>

              {/* Right Column: Code & Diagrams */}
              <div className="space-y-8">
                
                {/* Visual Diagram for Overview */}
                {activeTopicId === 'overview