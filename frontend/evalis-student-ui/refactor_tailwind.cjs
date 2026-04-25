const fs = require('fs');
const path = require('path');

const replacements = {
    'bg-slate-950': 'bg-white dark:bg-slate-950',
    'bg-slate-900': 'bg-gray-50 dark:bg-slate-900',
    'bg-slate-800': 'bg-white dark:bg-slate-800',
    'bg-slate-700': 'bg-gray-100 dark:bg-slate-700',
    'text-white': 'text-slate-900 dark:text-white',
    'text-slate-200': 'text-slate-800 dark:text-slate-200',
    'text-slate-300': 'text-slate-700 dark:text-slate-300',
    'text-slate-400': 'text-slate-500 dark:text-slate-400',
    'border-slate-800': 'border-gray-200 dark:border-slate-800',
    'border-slate-700': 'border-gray-300 dark:border-slate-700',
    'hover:bg-slate-800': 'hover:bg-gray-100 dark:hover:bg-slate-800',
    'hover:bg-slate-700': 'hover:bg-gray-200 dark:hover:bg-slate-700',
};

function processFile(filePath) {
   let content = fs.readFileSync(filePath, 'utf8');
   let original = content;

   for (const [darkClass, lightDarkClass] of Object.entries(replacements)) {
       // Regex ensures we only match whole classes and skip those already prefixed with `dark:`
       const regex = new RegExp(`(?<!dark:)\\b${darkClass}\\b(?!-)(?! dark:${darkClass})`, 'g');
       content = content.replace(regex, lightDarkClass);
   }

   if (original !== content) {
       fs.writeFileSync(filePath, content, 'utf8');
       console.log("Updated", filePath);
   }
}

function walkDir(dir) {
    if (!fs.existsSync(dir)) return;
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        if (isDirectory) walkDir(dirPath);
        else if (f.endsWith('.jsx') || f.endsWith('.js')) processFile(dirPath);
    });
}

console.log("Starting Tailwind Refactor...");
walkDir('./src/pages');
walkDir('./src/components');
console.log("Completed Tailwind Refactor.");
