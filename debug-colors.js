// Debug script to identify teacher color assignments
// This matches the getTeacherColor function from StudioManager.tsx

const getTeacherColor = (teacherName, darker = false) => {
  if (!teacherName || teacherName.trim() === '') {
    return darker ? '#374151' : '#6B7280'; // Light gray for empty/null teacher
  }
  
  // Check for blocked slots (common blocked slot indicators)
  const blockedIndicators = ['blocked', 'block', 'unavailable', 'closed', 'x', 'xxx'];
  if (blockedIndicators.some(indicator => teacherName.toLowerCase().includes(indicator))) {
    return darker ? '#1F2937' : '#374151'; // Dark gray for blocked slots
  }
  
  // Use a consistent color based on teacher name
  const colors = {
    'light': [
      '#F59E0B', // Amber
      '#EF4444', // Red
      '#10B981', // Emerald (GREEN!)
      '#3B82F6', // Blue
      '#8B5CF6', // Violet
      '#F97316', // Orange
      '#06B6D4', // Cyan
      '#84CC16', // Lime
      '#EC4899', // Pink
      '#14B8A6', // Teal
      '#F472B6', // Rose
      '#A78BFA'  // Purple
    ],
    'dark': [
      '#D97706', // Amber dark
      '#DC2626', // Red dark
      '#059669', // Emerald dark (GREEN!)
      '#2563EB', // Blue dark
      '#7C3AED', // Violet dark
      '#EA580C', // Orange dark
      '#0891B2', // Cyan dark
      '#65A30D', // Lime dark
      '#DB2777', // Pink dark
      '#0F766E', // Teal dark
      '#E11D48', // Rose dark
      '#9333EA'  // Purple dark
    ]
  };
  
  const colorSet = darker ? colors.dark : colors.light;
  let hash = 0;
  for (let i = 0; i < teacherName.length; i++) {
    hash = teacherName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colorSet.length;
  return colorSet[index];
};

// Test some common teacher names to see which one gets green
const testTeachers = [
  'John Smith',
  'Jane Doe', 
  'Michael Johnson',
  'Sarah Williams',
  'David Brown',
  'Emily Davis',
  'Robert Miller',
  'Jennifer Wilson',
  'William Moore',
  'Jessica Taylor',
  'James Anderson',
  'Ashley Thomas'
];

console.log('Teacher Color Assignments:');
console.log('========================');

testTeachers.forEach(teacher => {
  const color = getTeacherColor(teacher);
  const colorName = color === '#10B981' ? 'GREEN (Emerald)' : color;
  console.log(`${teacher.padEnd(20)} -> ${colorName}`);
});

console.log('\nGreen color code: #10B981 (Emerald)');
console.log('Green color index: 2 in the light colors array');

// Function to find which teacher name would generate green
const findGreenTeacher = (possibleNames) => {
  return possibleNames.filter(name => getTeacherColor(name) === '#10B981');
};

console.log('\nTeachers that would get GREEN color:');
const greenTeachers = findGreenTeacher(testTeachers);
greenTeachers.forEach(teacher => {
  console.log(`- ${teacher}`);
});
