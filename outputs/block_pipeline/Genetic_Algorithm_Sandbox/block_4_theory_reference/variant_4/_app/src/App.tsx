import React, { useState } from 'react';
import { 
  Dna, 
  Leaf, 
  RefreshCcw, 
  Code2, 
  Map as MapIcon, 
  Target, 
  ChevronRight, 
  Info,
  GitBranch,
  Zap
} from 'lucide-react';

const THEORY_TABS = [
  { id: 'intro', title: 'Biological Inspiration', icon: Leaf },
  { id: 'cycle', title: 'The Evolutionary Cycle', icon: RefreshCcw },
  { id: 'code', title: 'Core Logic & Snippets', icon: Code2 },
  { id: 'problems', title: 'Optimization Problems', icon: MapIcon },
];

const CODE_SNIPPETS = {
  selection: `// Tournament Selection
function tournamentSelection(population, tournamentSize) {
  let best = null;
  for (let i = 0; i < tournamentSize; i++) {
    const randomIndex = Math.floor(Math.random() * population.length);
    const candidate = population[randomIndex];
    if (!best || candidate.fitness > best.fitness) {
      best = candidate;
    }
  }
  return best;
}`,
  crossover: `// Single-Point Crossover
function crossover(parentA, parentB) {
  const midpoint = Math.floor(Math.random() * parentA.dna.length);
  const childDNA = [];
  
  for (let i = 0; i < parentA.dna.length; i++) {
    if (i > midpoint) {
      childDNA[i] = parentA.dna[i];
    } else {
      childDNA[i] = parentB.dna[i];
    }
  }
  return new Individual(childDNA);
}`,
  mutation: `// Uniform Mutation
function mutate(individual, mutationRate) {
  for (let i = 0; i < individual.dna.length; i++) {
    if (Math.random() < mutationRate) {
      // Flip bit (for binary DNA) or randomize gene
      individual.dna[i] = 1 - individual.dna[i]; 
    }
  }
}`
};

export default function App() {
  const [activeTab, setActiveTab] = useState('intro');
  const [activeSnippet, setActiveSnippet] = useState<'selection' | 'crossover' | 'mutation'>('crossover');

  const renderContent = () => {
    switch (activeTab) {
      case 'intro':
        return (
          <div className="space-y-6 animate-fade-in">
            <div className="flex items-center space-x-4 mb-8">
              <div className="p-3 bg-emerald-900/50 rounded-lg border border-emerald-500/30">
                <Dna className="w-8 h-8 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-emerald-50">Genetic Algorithms (GAs)</h2>
                <p className="text-teal-400/80">Darwinian Evolution in Silico</p>
              </div>
            </div>
            
            <div className="prose prose-invert max-w-none">
              <p className="text-teal-100/80 leading-relaxed text-lg">
                A Genetic Algorithm is a search heuristic that is inspired by Charles Darwin's theory of natural evolution. 
                This algorithm reflects the process of natural selection where the fittest individuals are selected for 
                reproduction in order to produce offspring of the next generation.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                <div className="bg-teal-950/40 border border-teal-800/50 p-6 rounded-xl hover:border-emerald-500/50 transition-colors">
                  <h3 className="text-emerald-300 font-semibold mb-3 flex items-center">
                    <Target className="w-5 h-5 mr-2" /> Genotype vs Phenotype
                  </h3>
                  <p className="text-teal-200/70 text-sm leading-relaxed">
                    In nature, DNA is the genotype, and the physical organism is the phenotype. In GAs, an array of bits or numbers is our genotype, and the resulting solution to our problem is the phenotype.
                  </p>
                </div>
                <div className="bg-teal-950/40 border border-teal-800/50 p-6 rounded-xl hover:border-emerald-500/50 transition-colors">
                  <h3 className="text-emerald-300 font-semibold mb-3 flex items-center">
                    <Zap className="w-5 h-5 mr-2" /> Survival of the Fittest
                  </h3>
                  <p className="text-teal-200/70 text-sm leading-relaxed">
                    A "fitness function" evaluates how close a given design solution is to achieving the set aims. Only the highest scoring individuals are allowed to pass their traits to the next generation.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'cycle':
        return (
          <div className="space-y-6 animate-fade-in">
            <h2 className="text-2xl font-bold text-emerald-50 mb-6 flex items-center">
              <RefreshCcw className="w-6 h-6 mr-3 text-emerald-400" />
              The Evolutionary Cycle
            </h2>
            
            <div className="relative border-l-2 border-emerald-800/50 ml-4 space-y-8 pb-4">
              {[
                { title: '1. Initialization', desc: 'A starting population of random individuals is created. This provides the initial genetic diversity.' },
                { title: '2. Fitness Evaluation', desc: 'Every individual is tested against the problem and assigned a fitness score based on their performance.' },
                { title: '3. Selection', desc: 'Individuals are chosen to be parents. Higher fitness means a higher probability of being selected (e.g., Roulette Wheel or Tournament).' },
                { title: '4. Crossover (Recombination)', desc: 'Parents swap genetic material to create offspring. This explores new areas of the solution space by combining good traits.' },
                { title: '5. Mutation', desc: 'Random, small changes are applied to the offspring\'s DNA. This maintains diversity and prevents premature convergence.' },
              ].map((step, idx) => (
                <div key={idx} className="relative pl-8">
                  <div className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full bg-emerald-500 border-4 border-[#0B1E1A]"></div>
                  <h3 className="text-lg font-semibold text-emerald-200">{step.title}</h3>
                  <p className="text-teal-200/60 mt-2 text-sm leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        );

      case 'code':
        return (
          <div className="space-y-6 animate-fade-in h-full flex flex-col">
            <h2 className="text-2xl font-bold text-emerald-50 mb-2 flex items-center">
              <Code2 className="w-6 h-6 mr-3 text-emerald-400" />
              Core Logic & Snippets
            </h2>
            <p className="text-teal-200/70 mb-6">Explore the pure JavaScript implementation of core genetic operators.</p>
            
            <div className="flex space-x-2 mb-4">
              {(['selection', 'crossover', 'mutation'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setActiveSnippet(type)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeSnippet === type 
                      ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/50' 
                      : 'bg-teal-950/30 text-teal-400/50 border border-transparent hover:text-teal-300 hover:bg-teal-900/40'
                  }`}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>

            <div className="flex-1 bg-[#06120F] border border-teal-900/50 rounded-xl overflow-hidden shadow-inner shadow-black/50">
              <div className="flex items-center px-4 py-2 bg-[#091815] border-b border-teal-900/50 text-xs text-teal-500 font-mono">
                <GitBranch className="w-3 h-3 mr-2" />
                {activeSnippet}.js
              </div>
              <pre className="p-6 text-sm font-mono text-emerald-200/90 overflow-x-auto">
                <code>{CODE_SNIPPETS[activeSnippet]}</code>
              </pre>
            </div>
          </div>
        );

      case 'problems':
        return (
          <div className="space-y-6 animate-fade-in">
            <h2 className="text-2xl font-bold text-emerald-50 mb-6 flex items-center">
              <MapIcon className="w-6 h-6 mr-3 text-emerald-400" />
              Optimization Problems
            </h2>
            
            <div className="grid gap-6">
              <div className="bg-gradient-to-r from-teal-950/50 to-transparent border-l-4 border-emerald-500 p-6 rounded-r-xl">
                <h3 className="text-xl font-semibold text-emerald-200 mb-2">The Knapsack Problem</h3>
                <p className="text-teal-200/70 text-sm mb-4">
                  Given a set of items, each with a weight and a value, determine which items to include in a collection so that the total weight is less than or equal to a given limit and the total value is as large as possible.
                </p>
                <div className="bg-[#0B1E1A] p-3 rounded text-xs font-mono text-teal-400/80 border border-teal-900/50">
                  DNA: [1, 0, 1, 1, 0] (1 = Include item, 0 = Exclude)
                </div>
              </div>

              <div className="bg-gradient-to-r from-teal-950/50 to-transparent border-l-4 border-blue-500 p-6 rounded-r-xl">
                <h3 className="text-xl font-semibold text-blue-200 mb-2">Travelling Salesman (TSP)</h3>
                <p className="text-teal-200/70 text-sm mb-4">
                  Given a list of cities and the distances between each pair of cities, what is the shortest possible route that visits each city exactly once and returns to the origin city?
                </p>
                <div className="bg-[#0B1E1A] p-3 rounded text-xs font-mono text-blue-400/80 border border-teal-900/50">
                  DNA: [A, C, D, B, E] (Order of cities to visit)
                </div>
              </div>

              <div className="bg-gradient-to-r from-teal-950/50 to-transparent border-l-4 border-purple-500 p-6 rounded-r-xl">
                <h3 className="text-xl font-semibold text-purple-200 mb-2">Function Maximization</h3>
                <p className="text-teal-200/70 text-sm mb-4">
                  Finding the global maximum (highest point) of a complex, multi-dimensional mathematical function, often escaping local optima where simple hill-climbing algorithms get stuck.
                </p>
                <div className="bg-[#0B1E1A] p-3 rounded text-xs font-mono text-purple-400/80 border border-teal-900/50">
                  DNA: [x, y] coordinates encoded as floating-point or binary.
                </div>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#0B1E1A] text-emerald-50 font-sans selection:bg-emerald-500/30 p-4 md:p-8">
      <div className="max-w-6xl mx-auto h-full flex flex-col md:flex-row gap-8">
        
        {/* Left Sidebar - Navigation */}
        <aside className="w-full md:w-80 flex-shrink-0 flex flex-col space-y-2">
          <div className="mb-8 px-4">
            <h1 className="text-3xl font-black tracking-tight bg-gradient-to-br from-emerald-300 to-teal-600 bg-clip-text text-transparent">
              GA Theory
            </h1>
            <p className="text-teal-400/60 text-sm mt-1 flex items-center">
              <Info className="w-4 h-4 mr-1" /> Reference Material
            </p>
          </div>

          <nav className="flex flex-col space-y-2">
            {THEORY_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center w-full px-4 py-4 rounded-xl text-left transition-all duration-300 group ${
                    isActive 
                      ? 'bg-teal-900/40 border-l-4 border-emerald-400 text-emerald-100 shadow-lg shadow-emerald-900/20' 
                      : 'bg-transparent border-l-4 border-transparent text-teal-400/60 hover:bg-teal-900/20 hover:text-teal-200'
                  }`}
                >
                  <div className={`p-2 rounded-lg mr-3 transition-colors ${isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-teal-950/50 text-teal-500 group-hover:bg-teal-900/50'}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="font-medium flex-1">{tab.title}</span>
                  {isActive && <ChevronRight className="w-4 h-4 text-emerald-500 animate-pulse" />}
                </button>
              );
            })}
          </nav>

          <div className="mt-auto pt-8">
            <div className="bg-[#0d2621] p-4 rounded-xl border border-teal-900/50">
              <div className="flex items-center space-x-2 text-teal-500 mb-2">
                <Dna className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Fun Fact</span>
              </div>
              <p className="text-xs text-teal-200/60 leading-relaxed">
                The first genetic algorithm was introduced by John Holland in the 1960s. He studied how natural adaptation could be imported into computer systems.
              </p>
            </div>
          </div>
        </aside>

        {/* Right Content Area */}
        <main className="flex-1 bg-[#0d2621]/80 backdrop-blur-xl border border-teal-800/30 rounded-3xl p-6 md:p-10 shadow-2xl shadow-black/40 min-h-[600px]">
          {renderContent()}
        </main>

      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}} />
    </div>
  );
}