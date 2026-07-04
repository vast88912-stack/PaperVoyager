import React, { useState } from 'react';
import { 
  Dna, 
  Scissors, 
  Dices, 
  Trophy, 
  Map, 
  Briefcase, 
  TrendingUp, 
  BookOpen, 
  Lightbulb,
  ChevronRight,
  ChevronDown
} from 'lucide-react';

// --- Data Models ---

type Category = 'concepts' | 'operators' | 'problems';

interface TheoryItem {
  id: string;
  title: string;
  icon: React.ElementType;
  shortDesc: string;
  fullDesc: React.ReactNode;
  codeSnippet?: string;
}

const THEORY_DATA: Record<Category, TheoryItem[]> = {
  concepts: [
    {
      id: 'c1',
      title: 'The Biological Analogy',
      icon: Dna,
      shortDesc: 'How nature inspires computational optimization.',
      fullDesc: (
        <div className="space-y-3">
          <p>
            Genetic Algorithms (GAs) are search heuristics inspired by Charles Darwin's theory of natural evolution. 
            They reflect the process of natural selection where the fittest individuals are selected for reproduction 
            in order to produce offspring of the next generation.
          </p>
          <ul className="list-disc pl-5 space-y-1 text-emerald-200/80">
            <li><strong className="text-emerald-300">Population:</strong> A set of possible solutions.</li>
            <li><strong className="text-emerald-300">Chromosome:</strong> A single solution (often an array of bits or numbers).</li>
            <li><strong className="text-emerald-300">Gene:</strong> A single element of a chromosome.</li>
            <li><strong className="text-emerald-300">Fitness:</strong> A score determining how good a solution is.</li>
          </ul>
        </div>
      )
    },
    {
      id: 'c2',
      title: 'Fitness Function',
      icon: Trophy,
      shortDesc: 'Evaluating the survival value of a solution.',
      fullDesc: (
        <div className="space-y-3">
          <p>
            The fitness function takes a chromosome as input and returns a numerical score. This score represents 
            how well the chromosome solves the given problem. 
          </p>
          <p>
            In nature, this is equivalent to an organism's ability to survive and reproduce in its environment. 
            In our sandbox, a higher fitness means the solution is closer to the optimal answer.
          </p>
        </div>
      ),
      codeSnippet: `// Example: Maximizing the sum of an array
function calculateFitness(chromosome) {
  return chromosome.reduce((sum, gene) => sum + gene, 0);
}`
    }
  ],
  operators: [
    {
      id: 'o1',
      title: 'Selection',
      icon: Trophy,
      shortDesc: 'Choosing the fittest parents for reproduction.',
      fullDesc: (
        <div className="space-y-3">
          <p>
            Selection determines which individuals get to pass their genes to the next generation. 
            Common methods include:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-emerald-200/80">
            <li><strong className="text-emerald-300">Roulette Wheel:</strong> Probability of selection is proportional to fitness.</li>
            <li><strong className="text-emerald-300">Tournament:</strong> A random subset is chosen, and the best among them wins.</li>
          </ul>
        </div>
      ),
      codeSnippet: `// Tournament Selection
function tournamentSelect(population, tournamentSize) {
  let best = null;
  for(let i=0; i < tournamentSize; i++) {
    const randomInd = population[Math.floor(Math.random() * population.length)];
    if (!best || randomInd.fitness > best.fitness) {
      best = randomInd;
    }
  }
  return best;
}`
    },
    {
      id: 'o2',
      title: 'Crossover (Recombination)',
      icon: Scissors,
      shortDesc: 'Combining genes from two parents to create offspring.',
      fullDesc: (
        <div className="space-y-3">
          <p>
            Crossover mimics biological mating. By combining parts of two good solutions, we hope to create 
            an even better solution. 
          </p>
          <p>
            For binary strings, <strong>Single-Point Crossover</strong> splits the parents at a random index and swaps the tails. 
            For permutation problems (like TSP), special crossovers like <strong>Order-1 (OX1)</strong> are used to prevent duplicate genes.
          </p>
        </div>
      ),
      codeSnippet: `// Single-Point Crossover
function crossover(parentA, parentB) {
  const point = Math.floor(Math.random() * parentA.length);
  const child1 = [...parentA.slice(0, point), ...parentB.slice(point)];
  const child2 = [...parentB.slice(0, point), ...parentA.slice(point)];
  return [child1, child2];
}`
    },
    {
      id: 'o3',
      title: 'Mutation',
      icon: Dices,
      shortDesc: 'Introducing random genetic variations.',
      fullDesc: (
        <div className="space-y-3">
          <p>
            Mutation adds random changes to offspring. This maintains genetic diversity in the population 
            and prevents the algorithm from getting stuck in local optima (a "good enough" solution that isn't the absolute best).
          </p>
          <p>
            The mutation rate is typically kept very low (e.g., 1% to 5%), much like in real biological systems.
          </p>
        </div>
      ),
      codeSnippet: `// Bit-flip Mutation
function mutate(chromosome, mutationRate) {
  return chromosome.map(gene => {
    if (Math.random() < mutationRate) {
      return gene === 0 ? 1 : 0; // Flip bit
    }
    return gene;
  });
}`
    }
  ],
  problems: [
    {
      id: 'p1',
      title: 'The Knapsack Problem',
      icon: Briefcase,
      shortDesc: 'Combinatorial optimization: packing the most value.',
      fullDesc: (
        <div className="space-y-3">
          <p>
            <strong>Scenario:</strong> You have a backpack with a weight limit. You have various items, each with a weight and a value. 
            Which items do you pack to maximize total value without breaking the bag?
          </p>
          <p>
            <strong>GA Encoding:</strong> A binary array where <code>1</code> means "pack the item" and <code>0</code> means "leave it".
          </p>
          <p>
            <strong>Fitness:</strong> Total value of packed items. If total weight exceeds the limit, fitness drops to 0 (or receives a heavy penalty).
          </p>
        </div>
      )
    },
    {
      id: 'p2',
      title: 'Travelling Salesman Problem (TSP)',
      icon: Map,
      shortDesc: 'Permutation optimization: finding the shortest route.',
      fullDesc: (
        <div className="space-y-3">
          <p>
            <strong>Scenario:</strong> A salesperson must visit a set of cities exactly once and return to the start. 
            What is the shortest possible route?
          </p>
          <p>
            <strong>GA Encoding:</strong> An array representing the order of cities (e.g., <code>[3, 1, 4, 2]</code>).
          </p>
          <p>
            <strong>Fitness:</strong> The inverse of the total distance (1 / distance). Shorter distance = higher fitness.
          </p>
          <p className="text-cyan-300/80 text-sm italic">
            Note: Standard crossover/mutation ruins permutations. We must use swap mutations and order-preserving crossovers.
          </p>
        </div>
      )
    },
    {
      id: 'p3',
      title: 'Function Maximization',
      icon: TrendingUp,
      shortDesc: 'Continuous optimization: finding the highest peak.',
      fullDesc: (
        <div className="space-y-3">
          <p>
            <strong>Scenario:</strong> Given a complex mathematical terrain (a 2D or 3D function), find the highest peak (maximum value).
          </p>
          <p>
            <strong>GA Encoding:</strong> Real numbers or binary strings representing X and Y coordinates.
          </p>
          <p>
            <strong>Fitness:</strong> The output value of the mathematical function at those coordinates.
          </p>
        </div>
      )
    }
  ]
};

// --- Components ---

const CodeBlock = ({ code }: { code: string }) => (
  <div className="relative mt-4 bg-[#01161e] rounded-lg border border-emerald-900/50 overflow-hidden shadow-inner">
    <div className="flex items-center px-4 py-2 bg-[#02242e] border-b border-emerald-900/50">
      <div className="flex space-x-2">
        <div className="w-3 h-3 rounded-full bg-rose-500/80"></div>
        <div className="w-3 h-3 rounded-full bg-amber-500/80"></div>
        <div className="w-3 h-3 rounded-full bg-emerald-500/80"></div>
      </div>
      <span className="ml-4 text-xs font-mono text-emerald-400/60">genetic_logic.js</span>
    </div>
    <pre className="p-4 text-sm font-mono text-emerald-300 overflow-x-auto">
      <code>{code}</code>
    </pre>
  </div>
);

const AccordionCard = ({ item, isOpen, onClick }: { item: TheoryItem, isOpen: boolean, onClick: () => void }) => {
  const Icon = item.icon;
  
  return (
    <div 
      className={`
        relative overflow-hidden transition-all duration-500 ease-in-out
        border rounded-xl backdrop-blur-sm
        ${isOpen 
          ? 'bg-emerald-900/20 border-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.1)]' 
          : 'bg-emerald-950/40 border-emerald-800/30 hover:bg-emerald-900/30 hover:border-emerald-600/50 cursor-pointer'}
      `}
    >
      {/* Bio-luminescent glow effect when open */}
      {isOpen && (
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
      )}

      <div 
        className="p-5 flex items-start gap-4 cursor-pointer"
        onClick={onClick}
      >
        <div className={`
          p-3 rounded-lg transition-colors duration-300
          ${isOpen ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-900/50 text-emerald-500'}
        `}>
          <Icon size={24} />
        </div>
        
        <div className="flex-1">
          <div className="flex justify-between items-center">
            <h3 className={`text-lg font-semibold transition-colors duration-300 ${isOpen ? 'text-emerald-100' : 'text-emerald-300'}`}>
              {item.title}
            </h3>
            {isOpen ? <ChevronDown className="text-emerald-500" size={20} /> : <ChevronRight className="text-emerald-600" size={20} />}
          </div>
          <p className="text-sm text-emerald-400/70 mt-1">{item.shortDesc}</p>
        </div>
      </div>

      <div 
        className={`
          grid transition-all duration-500 ease-in-out
          ${isOpen ? 'grid-rows-[1fr] opacity-100 pb-5' : 'grid-rows-[0fr] opacity-0'}
        `}
      >
        <div className="overflow-hidden px-5 ml-[60px]">
          <div className="text-emerald-100/90 leading-relaxed text-sm">
            {item.fullDesc}
            {item.codeSnippet && <CodeBlock code={item.codeSnippet} />}
          </div>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [activeTab, setActiveTab] = useState<Category>('concepts');
  const [openItemId, setOpenItemId] = useState<string | null>('c1');

  const handleTabChange = (tab: Category) => {
    setActiveTab(tab);
    setOpenItemId(THEORY_DATA[tab][0].id); // Auto-open first item in new tab
  };

  return (
    <div className="min-h-screen bg-[#040f16] text-emerald-50 font-sans selection:bg-emerald-500/30 relative overflow-hidden flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8">
      
      {/* Organic Background Patterns */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-900/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-cyan-900/10 rounded-full blur-[120px]"></div>
        <svg className="absolute inset-0 w-full h-full opacity-[0.02]" xmlns="http://www.w3.org/2000/svg">
          <pattern id="hexagons" width="50" height="43.4" patternUnits="userSpaceOnUse" patternTransform="scale(2)">
            <path d="M25 0L50 14.4v28.9L25 57.7L0 43.4V14.4z" fill="none" stroke="#10b981" strokeWidth="1"/>
          </pattern>
          <rect width="100%" height="100%" fill="url(#hexagons)"/>
        </svg>
      </div>

      <div className="relative z-10 w-full max-w-4xl">
        
        {/* Header */}
        <header className="mb-12 text-center">
          <div className="inline-flex items-center justify-center p-3 bg-emerald-950/50 border border-emerald-800/50 rounded-2xl mb-6 shadow-[0_0_20px_rgba(16,185,129,0.15)] relative group">
            <div className="absolute inset-0 bg-emerald-500/20 rounded-2xl blur-md group-hover:bg-emerald-400/30 transition-all duration-500"></div>
            <Dna size={40} className="text-emerald-400 relative z-10 animate-[spin_10s_linear_infinite]" />
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-cyan-300 to-emerald-400 mb-4">
            Evolutionary Codex
          </h1>
          <p className="text-lg text-emerald-200/60 max-w-2xl mx-auto">
            A biological reference manual for understanding Genetic Algorithms, operators, and optimization problems.
          </p>
        </header>

        {/* Navigation Tabs */}
        <nav className="flex justify-center mb-8">
          <div className="inline-flex bg-emerald-950/40 p-1.5 rounded-xl border border-emerald-800/30 backdrop-blur-md">
            {[
              { id: 'concepts', label: 'Core Concepts', icon: BookOpen },
              { id: 'operators', label: 'Genetic Operators', icon: Dna },
              { id: 'problems', label: 'Optimization Problems', icon: Lightbulb }
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id as Category)}
                  className={`
                    flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-300
                    ${isActive 
                      ? 'bg-emerald-600/20 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.2)]' 
                      : 'text-emerald-500/70 hover:text-emerald-400 hover:bg-emerald-900/20'}
                  `}
                >
                  <Icon size={16} />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* Content Area */}
        <main className="space-y-4 min-h-[500px]">
          {THEORY_DATA[activeTab].map((item) => (
            <AccordionCard
              key={item.id}
              item={item}
              isOpen={openItemId === item.id}
              onClick={() => setOpenItemId(openItemId === item.id ? null : item.id)}
            />
          ))}
        </main>

        {/* Footer */}
        <footer className="mt-16 text-center text-emerald-500/40 text-sm flex items-center justify-center gap-2">
          <Dna size={14} />
          <span>Powered by Bio-Inspired Computation</span>
          <Dna size={14} />
        </footer>

      </div>
    </div>
  );
}