import React, { useState } from 'react';

// --- Inline Icons (to avoid external dependencies) ---
const DnaIcon = ({ className = "w-6 h-6" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
  </svg>
);

const BookIcon = ({ className = "w-6 h-6" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
  </svg>
);

const CodeIcon = ({ className = "w-6 h-6" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
  </svg>
);

const TargetIcon = ({ className = "w-6 h-6" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

// --- Data & Content ---
const SECTIONS = [
  { id: 'intro', title: 'Biological Inspiration', icon: DnaIcon },
  { id: 'operators', title: 'Genetic Operators', icon: BookIcon },
  { id: 'problems', title: 'Optimization Problems', icon: TargetIcon },
  { id: 'code', title: 'Algorithm Implementation', icon: CodeIcon },
];

export default function App() {
  const [activeSection, setActiveSection] = useState('intro');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-teal-950 to-emerald-950 text-slate-300 font-sans selection:bg-emerald-500/30">
      
      {/* Header */}
      <header className="border-b border-emerald-500/20 bg-slate-950/50 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-4">
          <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400">
            <DnaIcon className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
              Genetic Algorithm Theory & Reference
            </h1>
            <p className="text-sm text-emerald-200/60">Understanding bio-inspired computing</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-1 md:grid-cols-4 gap-8">
        
        {/* Sidebar Navigation */}
        <nav className="space-y-2 md:col-span-1">
          {SECTIONS.map((section) => {
            const Icon = section.icon;
            const isActive = activeSection === section.id;
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                  isActive 
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.15)]' 
                    : 'hover:bg-white/5 text-slate-400 hover:text-slate-200 border border-transparent'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-emerald-400' : ''}`} />
                <span className="font-medium text-left">{section.title}</span>
              </button>
            );
          })}
        </nav>

        {/* Content Area */}
        <div className="md:col-span-3 bg-slate-900/40 border border-emerald-500/10 rounded-2xl p-6 md:p-8 backdrop-blur-sm shadow-xl">
          {activeSection === 'intro' && <IntroSection />}
          {activeSection === 'operators' && <OperatorsSection />}
          {activeSection === 'problems' && <ProblemsSection />}
          {activeSection === 'code' && <CodeSection />}
        </div>

      </main>
    </div>
  );
}

// --- Section Components ---

function IntroSection() {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h2 className="text-3xl font-bold text-emerald-50">Biological Inspiration</h2>
      <p className="text-lg leading-relaxed text-slate-300">
        Genetic Algorithms (GAs) are search heuristics that mimic the process of natural evolution. 
        They reflect the process of natural selection where the fittest individuals are selected for 
        reproduction in order to produce offspring of the next generation.
      </p>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
        <ConceptCard 
          title="Population" 
          desc="A subset of all the possible (encoded) solutions to the given problem."
          color="from-blue-500/20 to-cyan-500/5"
        />
        <ConceptCard 
          title="Chromosomes" 
          desc="One such solution to the given problem. Often represented as an array or string."
          color="from-emerald-500/20 to-teal-500/5"
        />
        <ConceptCard 
          title="Gene" 
          desc="One element position of a chromosome. Represents a specific trait or variable."
          color="from-teal-500/20 to-emerald-500/5"
        />
        <ConceptCard 
          title="Fitness Function" 
          desc="A function that assigns a score to each chromosome, determining how 'good' the solution is."
          color="from-cyan-500/20 to-blue-500/5"
        />
      </div>

      <div className="mt-8 p-6 bg-emerald-950/30 border border-emerald-500/20 rounded-xl">
        <h3 className="text-xl font-semibold text-emerald-300 mb-4">The Evolutionary Cycle</h3>
        <ol className="list-decimal list-inside space-y-3 text-slate-300 marker:text-emerald-500">
          <li><strong>Initialization:</strong> Generate a random population of chromosomes.</li>
          <li><strong>Evaluation:</strong> Calculate the fitness of each chromosome.</li>
          <li><strong>Selection:</strong> Select the best chromosomes for reproduction.</li>
          <li><strong>Crossover:</strong> Combine pairs of parents to create offspring.</li>
          <li><strong>Mutation:</strong> Randomly alter genes in the offspring to maintain diversity.</li>
          <li><strong>Replacement:</strong> Form a new generation and repeat until a condition is met.</li>
        </ol>
      </div>
    </div>
  );
}

function OperatorsSection() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h2 className="text-3xl font-bold text-emerald-50">Genetic Operators</h2>
      
      {/* Selection */}
      <div className="space-y-4">
        <h3 className="text-2xl font-semibold text-emerald-400 border-b border-emerald-500/20 pb-2">1. Selection</h3>
        <p className="text-slate-300">
          The goal of selection is to highlight the fittest individuals and pass their genes to the next generation.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
            <h4 className="font-bold text-cyan-300 mb-2">Roulette Wheel Selection</h4>
            <p className="text-sm text-slate-400">Probability of selection is proportional to fitness. Imagine a roulette wheel where fitter individuals get larger slices.</p>
          </div>
          <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
            <h4 className="font-bold text-cyan-300 mb-2">Tournament Selection</h4>
            <p className="text-sm text-slate-400">Pick <code className="text-emerald-300">k</code> individuals randomly and select the best among them. Excellent for controlling selection pressure.</p>
          </div>
        </div>
      </div>

      {/* Crossover */}
      <div className="space-y-4">
        <h3 className="text-2xl font-semibold text-emerald-400 border-b border-emerald-500/20 pb-2">2. Crossover (Recombination)</h3>
        <p className="text-slate-300">
          Crossover is the process of combining the genetic information of two parents to generate new offspring.
        </p>
        
        <div className="bg-slate-950/50 p-6 rounded-xl border border-slate-800">
          <h4 className="font-bold text-slate-200 mb-4 text-center">Single-Point Crossover Visualization</h4>
          <div className="flex flex-col items-center gap-2 font-mono text-sm">
            <div className="flex items-center gap-4">
              <span className="w-20 text-right text-cyan-400">Parent A</span>
              <div className="flex gap-1">
                {[1,1,0,1, 0,0,1,1].map((g, i) => (
                  <span key={i} className={`w-8 h-8 flex items-center justify-center rounded ${i < 4 ? 'bg-cyan-900 text-cyan-200' : 'bg-cyan-900/40 text-cyan-500'}`}>{g}</span>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="w-20 text-right text-emerald-400">Parent B</span>
              <div className="flex gap-1">
                {[0,0,1,0, 1,1,0,0].map((g, i) => (
                  <span key={i} className={`w-8 h-8 flex items-center justify-center rounded ${i < 4 ? 'bg-emerald-900/40 text-emerald-500' : 'bg-emerald-900 text-emerald-200'}`}>{g}</span>
                ))}
              </div>
            </div>
            <div className="w-full h-px bg-slate-700 my-2 relative">
              <div className="absolute left-[calc(50%-0.5rem)] -top-3 text-slate-500 text-xs">Crossover Point</div>
              <div className="absolute left-1/2 -top-4 bottom-[-40px] w-px bg-dashed bg-slate-500 border-l border-dashed border-slate-500"></div>
            </div>
            <div className="flex items-center gap-4">
              <span className="w-20 text-right text-purple-400">Offspring</span>
              <div className="flex gap-1">
                {[1,1,0,1, 1,1,0,0].map((g, i) => (
                  <span key={i} className={`w-8 h-8 flex items-center justify-center rounded ${i < 4 ? 'bg-cyan-900 text-cyan-200' : 'bg-emerald-900 text-emerald-200'}`}>{g}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mutation */}
      <div className="space-y-4">
        <h3 className="text-2xl font-semibold text-emerald-400 border-b border-emerald-500/20 pb-2">3. Mutation</h3>
        <p className="text-slate-300">
          Mutation introduces random tweaks to the chromosome to maintain genetic diversity and prevent premature convergence to local optima.
        </p>
        <div className="flex items-center justify-center gap-2 font-mono text-sm bg-slate-950/50 p-6 rounded-xl border border-slate-800">
          <div className="flex gap-1">
            {[1,1,0,1,1,1,0,0].map((g, i) => (
              <span key={i} className={`w-8 h-8 flex items-center justify-center rounded transition-all duration-1000 ${i === 2 ? 'bg-amber-500/20 text-amber-300 border border-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]' : 'bg-slate-800 text-slate-400'}`}>
                {i === 2 ? '1' : g}
              </span>
            ))}
          </div>
          <span className="ml-4 text-amber-400 text-xs uppercase tracking-wider animate-pulse">Bit Flipped!</span>
        </div>
      </div>
    </div>
  );
}

function ProblemsSection() {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h2 className="text-3xl font-bold text-emerald-50">Optimization Problems</h2>
      <p className="text-lg text-slate-300">
        Genetic Algorithms can be adapted to solve various types of problems by changing how the chromosome is encoded and how fitness is calculated.
      </p>

      <div className="space-y-6 mt-6">
        {/* Knapsack */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-6 rounded-xl border-l-4 border-emerald-500 shadow-lg">
          <h3 className="text-xl font-bold text-emerald-300 mb-2">0/1 Knapsack Problem</h3>
          <p className="text-slate-400 mb-4">
            Given a set of items, each with a weight and a value, determine which items to include in a collection so that the total weight is less than or equal to a given limit and the total value is as large as possible.
          </p>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="bg-slate-950/50 p-3 rounded">
              <span className="block text-slate-500 mb-1">Encoding</span>
              <code className="text-emerald-200">Binary Array [1, 0, 1, 1, 0]</code>
              <p className="text-xs text-slate-400 mt-1">1 = item included, 0 = excluded</p>
            </div>
            <div className="bg-slate-950/50 p-3 rounded">
              <span className="block text-slate-500 mb-1">Fitness</span>
              <code className="text-emerald-200">Sum of Values</code>
              <p className="text-xs text-slate-400 mt-1">Penalty applied if weight &gt; limit</p>
            </div>
          </div>
        </div>

        {/* TSP */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-6 rounded-xl border-l-4 border-cyan-500 shadow-lg">
          <h3 className="text-xl font-bold text-cyan-300 mb-2">Travelling Salesman Problem (TSP)</h3>
          <p className="text-slate-400 mb-4">
            Given a list of cities and the distances between each pair of cities, what is the shortest possible route that visits each city exactly once and returns to the origin city?
          </p>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="bg-slate-950/50 p-3 rounded">
              <span className="block text-slate-500 mb-1">Encoding</span>
              <code className="text-cyan-200">Permutation [3, 1, 4, 2, 0]</code>
              <p className="text-xs text-slate-400 mt-1">Order of cities visited</p>
            </div>
            <div className="bg-slate-950/50 p-3 rounded">
              <span className="block text-slate-500 mb-1">Fitness</span>
              <code className="text-cyan-200">1 / Total Distance</code>
              <p className="text-xs text-slate-400 mt-1">Shorter distance = higher fitness</p>
            </div>
          </div>
        </div>

        {/* Function Max */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-6 rounded-xl border-l-4 border-purple-500 shadow-lg">
          <h3 className="text-xl font-bold text-purple-300 mb-2">Function Maximization</h3>
          <p className="text-slate-400 mb-4">
            Finding the global maximum of a complex mathematical function, often with multiple local peaks where traditional gradient descent might get stuck.
          </p>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="bg-slate-950/50 p-3 rounded">
              <span className="block text-slate-500 mb-1">Encoding</span>
              <code className="text-purple-200">Float Array [x, y]</code>
              <p className="text-xs text-slate-400 mt-1">Real-valued coordinates</p>
            </div>
            <div className="bg-slate-950/50 p-3 rounded">
              <span className="block text-slate-500 mb-1">Fitness</span>
              <code className="text-purple-200">f(x, y)</code>
              <p className="text-xs text-slate-400 mt-1">The output of the function</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CodeSection() {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-emerald-50">Algorithm Implementation</h2>
        <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 text-xs font-mono rounded-full border border-emerald-500/20">
          Pure JavaScript
        </span>
      </div>
      <p className="text-lg text-slate-300">
        Below are standard implementations for the core genetic operators used in binary-encoded problems (like the Knapsack problem).
      </p>

      <div className="space-y-6">
        <CodeBlock 
          title="1. Single-Point Crossover"
          code={`function crossover(parentA, parentB) {
  // Select a random crossover point
  const point = Math.floor(Math.random() * parentA.length);
  
  // Slice and combine arrays
  const child1 = [
    ...parentA.slice(0, point), 
    ...parentB.slice(point)
  ];
  
  const child2 = [
    ...parentB.slice(0, point), 
    ...parentA.slice(point)
  ];
  
  return [child1, child2];
}`}
        />

        <CodeBlock 
          title="2. Bit-Flip Mutation"
          code={`function mutate(chromosome, mutationRate) {
  return chromosome.map(gene => {
    // Flip the bit if random value is below mutation rate
    if (Math.random() < mutationRate) {
      return gene === 1 ? 0 : 1;
    }
    return gene; // Keep original gene
  });
}`}
        />

        <CodeBlock 
          title="3. Tournament Selection"
          code={`function tournamentSelection(population, tournamentSize = 3) {
  let best = null;
  
  for (let i = 0; i < tournamentSize; i++) {
    // Pick a random individual from the population
    const randomIndex = Math.floor(Math.random() * population.length);
    const candidate = population[randomIndex];
    
    // Keep the one with the highest fitness
    if (!best || candidate.fitness > best.fitness) {
      best = candidate;
    }
  }
  
  return best;
}`}
        />
      </div>
    </div>
  );
}

// --- Helper Components ---

function ConceptCard({ title, desc, color }: { title: string, desc: string, color: string }) {
  return (
    <div className={`p-5 rounded-xl bg-gradient-to-br ${color} border border-white/5 backdrop-blur-sm hover:border-white/10 transition-colors`}>
      <h4 className="text-lg font-bold text-white mb-2">{title}</h4>
      <p className="text-sm text-slate-300">{desc}</p>
    </div>
  );
}

function CodeBlock({ title, code }: { title: string, code: string }) {
  return (
    <div className="rounded-xl overflow-hidden border border-slate-700 shadow-2xl">
      <div className="bg-slate-900 px-4 py-2 border-b border-slate-800 flex items-center justify-between">
        <span className="text-sm font-medium text-slate-300">{title}</span>
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-rose-500/20 border border-rose-500/50"></div>
          <div className="w-3 h-3 rounded-full bg-amber-500/20 border border-amber-500/50"></div>
          <div className="w-3 h-3 rounded-full bg-emerald-500/20 border border-emerald-500/50"></div>
        </div>
      </div>
      <div className="bg-[#0d1117] p-4 overflow-x-auto">
        <pre className="text-sm font-mono leading-relaxed">
          <code className="text-emerald-300/90">
            {code.split('\n').map((line, i) => {
              // Extremely basic syntax highlighting simulation for visual appeal
              const highlightedLine = line
                .replace(/(function|const|let|return|if)/g, '<span class="text-purple-400">$1</span>')
                .replace(/(Math\.random|Math\.floor)/g, '<span class="text-cyan-300">$1</span>')
                .replace(/(\/\/.*)/g, '<span class="text-slate-500 italic">$1</span>')
                .replace(/([0-9]+)/g, '<span class="text-amber-300">$1</span>');
              
              return (
                <div key={i} className="table-row">
                  <span className="table-cell text-slate-600 select-none pr-4 text-right w-8">{i + 1}</span>
                  <span className="table-cell" dangerouslySetInnerHTML={{ __html: highlightedLine }} />
                </div>
              );
            })}
          </code>
        </pre>
      </div>
    </div>
  );
}