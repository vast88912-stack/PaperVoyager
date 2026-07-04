import React, { useState } from 'react';
import { 
  BookOpen, 
  GitMerge, 
  ShieldCheck, 
  Zap, 
  Info, 
  CheckCircle2, 
  Table, 
  ArrowLeftRight,
  AlertCircle
} from 'lucide-react';

const RotationDiagram = () => (
  <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
    <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
      <div>
        <h4 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <ArrowLeftRight className="w-6 h-6 text-indigo-500" />
          Core Concept: Tree Rotation
        </h4>
        <p className="text-slate-500 mt-1 text-sm">
          The fundamental operation used by AVL, Red-Black, and Treaps to maintain balance.
        </p>
      </div>
      <div className="bg-indigo-50 text-indigo-700 px-4 py-2 rounded-lg text-sm font-medium border border-indigo-100">
        Invariant