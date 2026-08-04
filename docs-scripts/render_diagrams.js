const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const diagramsDir = path.join(__dirname, 'diagrams');

fs.readdir(diagramsDir, (err, files) => {
  if (err) throw err;
  
  files.filter(f => f.endsWith('.mmd')).forEach(file => {
    const inputPath = path.join(diagramsDir, file);
    const outputPath = path.join(diagramsDir, file.replace('.mmd', '.png'));
    
    const command = `npx mmdc -i "${inputPath}" -o "${outputPath}" -b transparent`;
    console.log(`Running: ${command}`);
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error rendering ${file}:`, error);
        return;
      }
      console.log(`Successfully rendered ${file}`);
    });
  });
});
