import React, { useState } from 'react';
import { 
  Dna, 
  GitMerge, 
  Shuffle, 
  Target, 
  Award, 
  BookOpen, 
  Code2, 
  Map, 
  Briefcase, 
  Activity,
  ChevronRight,
  Lightbulb
} from 'lucide-react';

// --- Data Models ---

type Concept = {
  id: string;
  title: string;
  icon: React.ElementType;
  analogy: string;
  description: string;
  codeSnippet: string;
  color: string;
};

type Problem = {
  id: string;
  title: string;
  icon: React.ElementType;
  description: string;
  fitness: string;
};

const GA_CONCEPTS: Concept[] = [
  {
    id: 'init',
    title: 'Initialization',
    icon: Dna,
    color: 'text-emerald-400',
    analogy: 'The primordial soup. Creating the first generation of random organisms.',
    description: 'Before evolution begins, we need a starting population. This involves generating a set of random individuals (chromosomes), each representing a potential solution to our problem. Diversity here is key to exploring the search space effectively.',
    codeSnippet: `// Initialize population with random binary genes
function initPopulation(popSize, chromosomeLength) {
  return Array.from({ length: popSize }, () => 
    Array.from({ length: chromosomeLength }, () => 
      Math.random() > 0.5 ? 1 : 0
    )
  );
}`
  },
  {
    id: 'fitness',
    title: 'Fitness Evaluation',
    icon: Target,
    color: 'text-cyan-400',
    analogy: 'Survival of the fittest. How well an organism adapts to its environment.',
    description: 'Every individual is tested against the problem environment and assigned a fitness score. Higher scores indicate better solutions. This score determines the probability of the individual surviving and reproducing.',
    codeSnippet: `// Example: Maximize the number of 1s (OneMax problem)
function calculateFitness(individual) {
  let score = 0;
  for (let gene of individual) {
    if (gene === 1) score++;
  }
  return score;
}`
  },
  {
    id: 'selection',
    title: 'Selection',
    icon: Award,
    color: 'text-teal-400',
    analogy: 'Natural selection. Choosing the strongest parents to breed the next generation.',
    description: 'We select individuals to become parents based on their fitness. Common methods include Roulette Wheel Selection (probability proportional to fitness) and Tournament Selection (picking the best among a random subset).',
    codeSnippet: `// Tournament Selection
function selectParent(population, fitnesses, tournamentSize = 3) {
  let bestIdx = Math.floor(Math.random() * population.length);
  for (let i = 1; i < tournamentSize; i++) {
    let idx = Math.floor(Math.random() * population.length);
    if (fitnesses[idx] > fitnesses[bestIdx]) {
      bestIdx = idx;
    }
  }
  return population[bestIdx];
}`
  },
  {
    id: 'crossover',
    title: 'Crossover (Recombination)',
    icon: GitMerge,
    color: 'text-blue-400',
    analogy: 'Mating. Combining DNA from two parents to create unique offspring.',
    description: 'Crossover merges the genetic information of two parents to produce a new offspring. Single-point crossover picks a random midpoint and swaps the tails of the parent chromosomes.',
    codeSnippet: `// Single-point Crossover
function crossover(parent1, parent2) {
  const point = Math.floor(Math.random() * parent1.length);
  const child = [
    ...parent1.slice(0, point),
    ...parent2.slice(point)
  ];
  return child;
}`
  },
  {
    id: 'mutation',
    title: 'Mutation',
    icon: Shuffle,
    color: 'text-indigo-400',
    analogy: 'Genetic mutation. Random changes in DNA that introduce new traits.',
    description: 'Mutation randomly alters some genes in an offspring. This maintains genetic diversity and prevents the algorithm from getting stuck in local optima (sub-optimal solutions).',
    codeSnippet: `// Bit-flip Mutation
function mutate(individual, mutationRate = 0.01) {
  return individual.map(gene => 
    Math.random() < mutationRate ? (gene === 1 ? 0 : 1) : gene
  );
}`
  }
];

const PROBLEM_DOMAINS: Problem[] = [
  {
    id: 'knapsack',
    title: '0/1 Knapsack',
    icon: Briefcase,
    description: 'Given a set of items, each with a weight and a value, determine which items to include in a collection so that the total weight is less than or equal to a given limit and the total value is as large as possible.',
    fitness: 'Sum of values (if total weight <= capacity, else penalty)'
  },
  {
    id: 'tsp',
    title: 'Travelling Salesman',
    icon: Map,
    description: 'Given a list of cities and the distances between each pair, what is the shortest possible route that visits each city exactly once and returns to the origin city?',
    fitness: '1 / Total distance of the route'
  },
  {
    id: 'functionmax',
    title: 'Function Maximization',
    icon: Activity,
    description: 'Finding the inputs that yield the highest possible output for a complex mathematical function, often visualizing a terrain with multiple peaks and valleys.',
    fitness: 'f(x, y) value directly'
  }
];

// --- Components ---

export default function App() {
  const [activeConceptId, setActiveConceptId] = useState<string>('init');
  const [viewMode, setViewMode] = useState<'theory' | 'code'>('theory');

  const activeConcept = GA_CONCEPTS.find(c => c.id === activeConceptId) || GA_CONCEPTS[0];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 font-sans p-6 selection:bg-emerald-500/30">
      
      {/* Header */}
      <header className="max-w-6xl mx-auto mb-10 text-center">
        <div className="inline-flex items-center justify-center p-3 bg-emerald-900/30 rounded-full mb-4 ring-1 ring-emerald-500/50">
          <Dna className="w-8 h-8 text-emerald-400" />
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 tracking-tight">
          Evolutionary Computing
        </h1>
        <p className="mt-3 text-lg text-slate-400 max-w-2xl mx-auto">
          Explore the biological principles that power Genetic Algorithms. Understand how selection, crossover, and mutation solve complex optimization problems.
        </p>
      </header>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Evolutionary Pipeline */}
        <div className="lg:col-span-4 space-y-4 relative">
          <div className="absolute left-6 top-10 bottom-10 w-0.5 bg-slate-800 -z-10"></div>
          
          <h2 className="text-xl font-bold text-slate-100 mb-6 flex items-center gap-2 uppercase tracking-wider text-sm">
            <Activity className="w-5 h-5 text-emerald-500" />
            The GA Pipeline
          </h2>

          <div className="space-y-3">
            {GA_CONCEPTS.map((concept, index) => {
              const Icon = concept.icon;
              const isActive = activeConceptId === concept.id;
              return (
                <button
                  key={concept.id}
                  onClick={() => setActiveConceptId(concept.id)}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl transition-all duration-300 text-left relative overflow-hidden ${
                    isActive 
                      ? 'bg-slate-800/80 ring-1 ring-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.1)]' 
                      : 'hover:bg-slate-800/40 hover:ring-1 hover:ring-slate-700'
                  }`}
                >
                  {isActive && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]"></div>
                  )}
                  <div className={`p-2 rounded-lg ${isActive ? 'bg-slate-900' : 'bg-slate-900/50'}`}>
                    <Icon className={`w-6 h-6 ${isActive ? concept.color : 'text-slate-500'}`} />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs text-slate-500 font-mono mb-1">Step 0{index + 1}</div>
                    <div className={`font-semibold ${isActive ? 'text-slate-100' : 'text-slate-400'}`}>
                      {concept.title}
                    </div>
                  </div>
                  <ChevronRight className={`w-5 h-5 transition-transform duration-300 ${isActive ? 'text-emerald-500 translate-x-1' : 'text-slate-600'}`} />
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Concept Details & Code */}
        <div className="lg:col-span-8 flex flex-col">
          <div className="bg-slate-900 rounded-2xl ring-1 ring-slate-800 overflow-hidden flex-1 flex flex-col relative shadow-2xl">
            
            {/* Background organic glow */}
            <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-900/20 rounded-full blur-3xl pointer-events-none"></div>

            {/* View Toggle */}
            <div className="flex border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm z-10 relative">
              <button
                onClick={() => setViewMode('theory')}
                className={`flex-1 flex items-center justify-center gap-2 py-4 font-medium transition-colors ${
                  viewMode === 'theory' 
                    ? 'text-emerald-400 border-b-2 border-emerald-400 bg-slate-800/30' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/20'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                Theory & Analogy
              </button>
              <button
                onClick={() => setViewMode('code')}
                className={`flex-1 flex items-center justify-center gap-2 py-4 font-medium transition-colors ${
                  viewMode === 'code' 
                    ? 'text-cyan-400 border-b-2 border-cyan-400 bg-slate-800/30' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/20'
                }`}
              >
                <Code2 className="w-4 h-4" />
                JS Implementation
              </button>
            </div>

            {/* Content Area */}
            <div className="p-8 flex-1 flex flex-col z-10">
              
              <div className="flex items-center gap-4 mb-6">
                <div className={`p-3 rounded-xl bg-slate-950 ring-1 ring-slate-800 ${activeConcept.color}`}>
                  <activeConcept.icon className="w-8 h-8" />
                </div>
                <h2 className="text-3xl font-bold text-slate-100">{activeConcept.title}</h2>
              </div>

              {viewMode === 'theory' ? (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="bg-emerald-950/30 border border-emerald-900/50 rounded-xl p-5 flex gap-4 items-start">
                    <Lightbulb className="w-6 h-6 text-emerald-400 shrink-0 mt-1" />
                    <div>
                      <h3 className="text-emerald-400 font-semibold mb-1">Biological Analogy</h3>
                      <p className="text-emerald-100/80 leading-relaxed">{activeConcept.analogy}</p>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-slate-300 font-semibold mb-3 flex items-center gap-2">
                      <Target className="w-4 h-4 text-slate-500" />
                      Algorithmic Role
                    </h3>
                    <p className="text-slate-400 leading-relaxed text-lg">
                      {activeConcept.description}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500 h-full">
                  <div className="flex items-center justify-between mb-3 px-1">
                    <span className="text-sm font-mono text-slate-500">logic.js</span>
                    <span className="text-xs px-2 py-1 rounded bg-slate-800 text-slate-400 uppercase tracking-wider">JavaScript</span>
                  </div>
                  <div className="bg-[#0d1117] border border-slate-800 rounded-xl p-6 overflow-x-auto flex-1 group relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-xl"></div>
                    <pre className="font-mono text-sm leading-relaxed">
                      <code className="text-cyan-300">
                        {activeConcept.codeSnippet.split('\n').map((line, i) => {
                          // Very basic syntax highlighting simulation
                          let formattedLine = line;
                          if (line.startsWith('//')) {
                            return <span key={i} className="text-slate-500 block">{line}</span>;
                          }
                          formattedLine = formattedLine.replace(/function/g, '<span class="text-emerald-400">function</span>');
                          formattedLine = formattedLine.replace(/return/g, '<span class="text-emerald-400">return</span>');
                          formattedLine = formattedLine.replace(/const|let/g, '<span class="text-indigo-400">$&</span>');
                          formattedLine = formattedLine.replace(/Math.random|Math.floor/g, '<span class="text-teal-300">$&</span>');
                          
                          return (
                            <span key={i} className="block" dangerouslySetInnerHTML={{ __html: formattedLine || ' ' }} />
                          );
                        })}
                      </code>
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section: Problem Domains */}
      <div className="max-w-6xl mx-auto mt-12">
        <h2 className="text-xl font-bold text-slate-100 mb-6 flex items-center gap-2 uppercase tracking-wider text-sm border-b border-slate-800 pb-4">
          <Target className="w-5 h-5 text-cyan-500" />
          Classic Problem Domains
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PROBLEM_DOMAINS.map(problem => {
            const Icon = problem.icon;
            return (
              <div key={problem.id} className="bg-slate-900 rounded-xl p-6 ring-1 ring-slate-800 hover:ring-cyan-500/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-cyan-900/20 group">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 rounded-lg bg-slate-800 group-hover:bg-cyan-950 transition-colors">
                    <Icon className="w-6 h-6 text-cyan-400" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-200 group-hover:text-cyan-300 transition-colors">{problem.title}</h3>
                </div>
                <p className="text-sm text-slate-400 mb-4 h-24 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-700">
                  {problem.description}
                </p>
                <div className="pt-4 border-t border-slate-800">
                  <div className="text-xs text-slate-500 uppercase tracking-wider mb-1 font-semibold">Fitness Function</div>
                  <div className="text-sm font-mono text-emerald-400 bg-emerald-950/30 py-2 px-3 rounded-md break-words">
                    {problem.fitness}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}