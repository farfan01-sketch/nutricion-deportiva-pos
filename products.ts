@tailwind base;
@tailwind components;
@tailwind utilities;

@layer components {
  .btn-primary {
    @apply px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed;
  }
  .btn-secondary {
    @apply px-4 py-2 bg-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed;
  }
  .btn-danger {
    @apply px-4 py-2 bg-rose-600 text-white rounded-lg font-medium hover:bg-rose-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed;
  }
  .input-field {
    @apply w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all;
  }
  .card {
    @apply bg-white p-6 rounded-xl border border-slate-200 shadow-sm;
  }
  .sidebar-item {
    @apply flex items-center space-x-3 px-4 py-3 text-slate-300 hover:bg-slate-800 hover:text-white transition-all cursor-pointer rounded-lg mx-2;
  }
  .sidebar-item.active {
    @apply bg-indigo-600 text-white;
  }
}

/* Custom scrollbar */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
::-webkit-scrollbar-track {
  @apply bg-slate-100;
}
::-webkit-scrollbar-thumb {
  @apply bg-slate-300 rounded-full;
}
::-webkit-scrollbar-thumb:hover {
  @apply bg-slate-400;
}

@media print {
  .no-print {
    display: none !important;
  }
  body {
    background: white !important;
  }
}
