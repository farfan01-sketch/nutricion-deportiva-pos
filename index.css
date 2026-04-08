@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
@import "tailwindcss";

@theme {
  --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, SFMono-Regular, monospace;
}

@layer base {
  body {
    @apply font-sans bg-slate-50 text-slate-900;
  }
}

@layer components {
  .card {
    @apply bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden;
  }
  
  .btn-primary {
    @apply px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium disabled:opacity-50;
  }
  
  .btn-secondary {
    @apply px-4 py-2 bg-white text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors font-medium;
  }

  .input-field {
    @apply w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all;
  }
}

/* Print Styles for 80mm Ticket */
@media print {
  @page {
    size: 80mm auto;
    margin: 0;
  }
  body * {
    visibility: hidden;
  }
  #ticket-print, #ticket-print * {
    visibility: visible;
  }
  #ticket-print {
    position: absolute;
    left: 0;
    top: 0;
    width: 80mm;
    padding: 5mm;
    font-family: 'Courier New', Courier, monospace;
    font-size: 12px;
  }
  .no-print {
    display: none !important;
  }
}
