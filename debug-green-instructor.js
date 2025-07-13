// Browser console debugging script to identify which instructor is green
// Paste this into your browser's developer console while viewing the schedule

// Function to find all schedule slots with green color
const findGreenSlots = () => {
  const greenColor = '#10B981';
  const slots = document.querySelectorAll('[style*="background-color"]');
  
  console.log('=== GREEN INSTRUCTOR FINDER ===');
  console.log('Looking for color:', greenColor);
  console.log('Total slots found:', slots.length);
  
  const greenSlots = [];
  
  slots.forEach((slot, index) => {
    const bgColor = slot.style.backgroundColor;
    const rgb = window.getComputedStyle(slot).backgroundColor;
    
    // Convert hex to RGB for comparison
    const hexToRgb = (hex) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : null;
    };
    
    const targetRgb = hexToRgb(greenColor);
    const targetRgbString = `rgb(${targetRgb.r}, ${targetRgb.g}, ${targetRgb.b})`;
    
    if (bgColor === greenColor || rgb === targetRgbString) {
      const textContent = slot.textContent.trim();
      const lines = textContent.split('\n').map(line => line.trim()).filter(line => line);
      
      greenSlots.push({
        element: slot,
        textContent: textContent,
        lines: lines,
        student: lines[0] || 'Unknown',
        teacher: lines[1] || 'Unknown',
        lessonType: lines[2] || 'Unknown'
      });
      
      console.log(`Green slot ${greenSlots.length}:`, {
        student: lines[0] || 'Unknown',
        teacher: lines[1] || 'Unknown', 
        lessonType: lines[2] || 'Unknown',
        backgroundColor: bgColor,
        computedColor: rgb
      });
    }
  });
  
  if (greenSlots.length === 0) {
    console.log('No green slots found. Let me check all colors...');
    
    // Show all unique colors in use
    const colorMap = new Map();
    slots.forEach(slot => {
      const bgColor = slot.style.backgroundColor;
      const rgb = window.getComputedStyle(slot).backgroundColor;
      const color = bgColor || rgb;
      
      if (color && color !== 'rgba(0, 0, 0, 0)' && color !== 'transparent') {
        const textContent = slot.textContent.trim();
        const lines = textContent.split('\n').map(line => line.trim()).filter(line => line);
        const teacher = lines[1] || 'Unknown';
        
        if (!colorMap.has(color)) {
          colorMap.set(color, []);
        }
        colorMap.get(color).push(teacher);
      }
    });
    
    console.log('All colors in use:');
    colorMap.forEach((teachers, color) => {
      const uniqueTeachers = [...new Set(teachers)];
      console.log(`${color}: ${uniqueTeachers.join(', ')}`);
    });
  } else {
    console.log(`\nFound ${greenSlots.length} green slots!`);
    const greenTeachers = [...new Set(greenSlots.map(slot => slot.teacher))];
    console.log('Green teachers:', greenTeachers);
  }
  
  return greenSlots;
};

// Also create a function to highlight green slots
const highlightGreenSlots = () => {
  const greenSlots = findGreenSlots();
  greenSlots.forEach(slot => {
    slot.element.style.border = '3px solid red';
    slot.element.style.boxShadow = '0 0 10px red';
  });
  
  setTimeout(() => {
    greenSlots.forEach(slot => {
      slot.element.style.border = '';
      slot.element.style.boxShadow = '';
    });
  }, 3000);
};

console.log('=== GREEN INSTRUCTOR DEBUGGING TOOLS ===');
console.log('Run findGreenSlots() to find green instructors');
console.log('Run highlightGreenSlots() to highlight green slots for 3 seconds');

// Auto-run the finder
findGreenSlots();
